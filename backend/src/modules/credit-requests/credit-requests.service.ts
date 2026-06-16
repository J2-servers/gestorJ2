import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, PaymentType, RequestStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { TemplatesService } from '../templates/templates.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateCreditRequestDto } from './dto';

@Injectable()
export class CreditRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly whatsapp: WhatsAppService,
    private readonly templates: TemplatesService,
  ) {}

  async list(user: RequestUser, cursor?: string, limit = 50) {
    const take = Math.min(limit, 200);
    const where =
      user.role === 'reseller'
        ? { resellerId: user.sub }
        : user.role === 'admin'
          ? { reseller: { parentId: user.sub } }
          : {};

    const results = await this.prisma.creditRequest.findMany({
      where,
      include: { reseller: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = results.length > take;
    const data = hasMore ? results.slice(0, take) : results;
    return { data, nextCursor: hasMore ? data[data.length - 1]?.id : null };
  }

  async getOne(user: RequestUser, id: string) {
    const request = await this.prisma.creditRequest.findUnique({
      where: { id },
      include: {
        reseller: { select: { id: true, name: true, email: true, phone: true, parentId: true } },
        approvalStages: { include: { approver: { select: { id: true, name: true } } } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
        messages: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!request) throw new NotFoundException('Pedido nao encontrado');
    if (user.role === 'reseller' && request.resellerId !== user.sub) {
      throw new ForbiddenException('Acesso negado');
    }
    if (user.role === 'admin' && request.reseller.parentId !== user.sub) {
      throw new ForbiddenException('Pedido fora do escopo deste admin');
    }
    return request;
  }

  async create(resellerId: string, dto: CreateCreditRequestDto) {
    const reseller = await this.prisma.user.findUnique({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Revendedor nao encontrado');
    if (!reseller.phone) throw new BadRequestException('WhatsApp obrigatorio para criar pedidos');

    const resellerServer = await this.prisma.resellerServer.findFirst({
      where: { resellerId, serverId: dto.serverId, active: true },
      include: { server: true },
    });
    if (!resellerServer) throw new ForbiddenException('Revendedor nao vinculado a este servidor');

    if (dto.paymentType === PaymentType.prepaid && !dto.proofUrl) {
      throw new BadRequestException('Comprovante obrigatorio para pedido pre-pago');
    }
    if (dto.proofUrl && !/^\/api\/uploads\/[a-f0-9-]{36}\.(jpg|png|gif|pdf)$/.test(dto.proofUrl)) {
      throw new BadRequestException('Comprovante invalido. Envie o arquivo pelo endpoint de uploads.');
    }

    const totalValue = Number(resellerServer.valuePerCredit) * dto.requestedCredits;

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.creditRequest.create({
        data: {
          resellerId,
          serverId: dto.serverId,
          serverSnapshot: {
            id: resellerServer.server.id,
            name: resellerServer.server.name,
            panelLink: resellerServer.server.panelLink,
            valuePerCredit: resellerServer.valuePerCredit,
          },
          requestedCredits: dto.requestedCredits,
          login: dto.login.trim(),
          totalValue,
          proofUrl: dto.proofUrl,
          notes: dto.notes,
          status: RequestStatus.pending,
          paymentType: dto.paymentType,
          currentStage: 2,
        },
      });

      await tx.approvalStage.create({
        data: {
          creditRequestId: created.id,
          stageNumber: 2,
          approverRole: UserRole.admin,
          status: 'pending',
          createdById: resellerId,
        },
      });

      await tx.auditLog.create({
        data: {
          creditRequestId: created.id,
          userId: resellerId,
          userName: reseller.name,
          action: 'Pedido Criado',
          details: `${dto.paymentType}: ${dto.requestedCredits} creditos - R$ ${totalValue.toFixed(2)}`,
        },
      });

      return created;
    });

    await this.notifications.create({
      userId: resellerId,
      message: `Pedido #${request.id.slice(-6).toUpperCase()} entrou na fila de recarga.`,
      type: NotificationType.queue,
      relatedEntityId: request.id,
      creditRequestId: request.id,
    });

    if (reseller.parentId) {
      await this.notifications.create({
        userId: reseller.parentId,
        message: `Novo pedido #${request.id.slice(-6).toUpperCase()} aguardando aprovacao.`,
        type: NotificationType.new_request,
        relatedEntityId: request.id,
        creditRequestId: request.id,
      });
    }

    await this.whatsapp.enqueue({
      phone: reseller.phone,
      relatedEntityId: request.id,
      creditRequestId: request.id,
      message: `Pedido #${request.id.slice(-6).toUpperCase()} entrou na fila de recarga. Aguarde, sua recarga sera efetuada em breve.`,
    });

    return request;
  }

  async cancel(user: RequestUser, id: string) {
    const request = await this.prisma.creditRequest.findUnique({
      where: { id },
      include: { reseller: { select: { parentId: true } } },
    });
    if (!request) throw new NotFoundException('Pedido nao encontrado');
    if (user.role === 'reseller' && request.resellerId !== user.sub) {
      throw new ForbiddenException('Acesso negado');
    }
    if (request.status !== RequestStatus.pending) {
      throw new BadRequestException('Apenas pedidos pendentes podem ser cancelados');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.creditRequest.update({
        where: { id },
        data: { status: RequestStatus.canceled },
      });
      await tx.approvalStage.updateMany({
        where: { creditRequestId: id, status: 'pending' },
        data: { status: 'rejected', decidedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          creditRequestId: id,
          userId: user.sub,
          userName: 'Revendedor',
          action: 'Pedido Cancelado',
          details: 'Cancelado pelo revendedor',
        },
      });

      if (request.reseller.parentId) {
        await this.notifications.create({
          userId: request.reseller.parentId,
          message: `Pedido #${id.slice(-6).toUpperCase()} foi cancelado pelo revendedor.`,
          type: NotificationType.system,
          creditRequestId: id,
          relatedEntityId: id,
        });
      }

      return updated;
    });
  }

  async markAnalyzing(user: RequestUser, id: string) {
    return this.updateStatusWithAudit(user, id, RequestStatus.analyzing, 'Analise Iniciada');
  }

  async approve(user: RequestUser, id: string, notes?: string) {
    const request = await this.getRequestForAction(id);
    const reseller = await this.prisma.user.findUnique({ where: { id: request.resellerId } });
    const adminParentId = reseller?.parentId;

    const template = adminParentId
      ? await this.templates.findActive(adminParentId, 'approval')
      : null;

    const updated = await this.updateStatusWithAudit(user, id, RequestStatus.recharged, 'Pedido Aprovado', notes);

    if (reseller?.phone) {
      const snap = request.serverSnapshot as Record<string, unknown>;
      const defaultMsg = `Pedido #${request.id.slice(-6).toUpperCase()} aprovado. Sua recarga foi feita e os creditos ja estao disponiveis no painel para uso.`;
      const message = template
        ? this.templates.applyVariables(template.content, {
            resellerName: reseller.name,
            requestId: request.id.slice(-6).toUpperCase(),
            serverName: (snap?.name as string) ?? '',
            login: request.login,
            credits: String(request.requestedCredits),
            value: Number(request.totalValue).toFixed(2),
          })
        : defaultMsg;

      await this.notifications.create({
        userId: reseller.id,
        message: `Pedido #${request.id.slice(-6).toUpperCase()} aprovado. Creditos disponiveis no painel.`,
        type: NotificationType.approval,
        relatedEntityId: request.id,
        creditRequestId: request.id,
      });
      await this.whatsapp.enqueue({
        phone: reseller.phone,
        relatedEntityId: request.id,
        creditRequestId: request.id,
        message,
      });
    }

    return updated;
  }

  async reject(user: RequestUser, id: string, reason: string, rejectionImageUrl?: string) {
    const request = await this.getRequestForAction(id);
    const reseller = await this.prisma.user.findUnique({ where: { id: request.resellerId } });
    const adminParentId = reseller?.parentId;

    const template = adminParentId
      ? await this.templates.findActive(adminParentId, 'rejection')
      : null;

    const auditDetails = rejectionImageUrl ? `${reason}\nImagem anexada: ${rejectionImageUrl}` : reason;
    const updated = await this.updateStatusWithAudit(
      user,
      id,
      RequestStatus.rejected,
      'Pedido Rejeitado',
      reason,
      auditDetails,
    );

    if (reseller?.phone) {
      const snap = request.serverSnapshot as Record<string, unknown>;
      const defaultMsg = `Pedido #${request.id.slice(-6).toUpperCase()} foi rejeitado. Motivo: ${reason}`;
      const message = template
        ? this.templates.applyVariables(template.content, {
            resellerName: reseller.name,
            requestId: request.id.slice(-6).toUpperCase(),
            serverName: (snap?.name as string) ?? '',
            login: request.login,
            credits: String(request.requestedCredits),
            value: Number(request.totalValue).toFixed(2),
            rejectionReason: reason,
          })
        : defaultMsg;

      await this.notifications.create({
        userId: reseller.id,
        message: `Pedido #${request.id.slice(-6).toUpperCase()} rejeitado. Motivo: ${reason}`,
        type: NotificationType.rejection,
        relatedEntityId: request.id,
        creditRequestId: request.id,
      });
      await this.whatsapp.enqueue({
        phone: reseller.phone,
        relatedEntityId: request.id,
        creditRequestId: request.id,
        message,
      });
    }

    return updated;
  }

  private async getRequestForAction(id: string) {
    const req = await this.prisma.creditRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Pedido nao encontrado');
    return req;
  }

  private async updateStatusWithAudit(
    user: RequestUser,
    id: string,
    status: RequestStatus,
    action: string,
    details?: string,
    auditDetails = details,
  ) {
    const current = await this.prisma.creditRequest.findUnique({
      where: { id },
      include: { reseller: { select: { parentId: true } } },
    });
    if (!current) throw new NotFoundException('Pedido nao encontrado');
    if (user.role === 'admin' && current.reseller.parentId !== user.sub) {
      throw new ForbiddenException('Pedido fora do escopo deste admin');
    }
    if (!([RequestStatus.pending, RequestStatus.analyzing] as RequestStatus[]).includes(current.status)) {
      throw new BadRequestException('Pedido nao pode ser processado neste status');
    }

    const admin = await this.prisma.user.findUnique({ where: { id: user.sub } });
    const data = status === RequestStatus.rejected ? { status, rejectionReason: details } : { status };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.creditRequest.update({ where: { id }, data });
      await tx.approvalStage.updateMany({
        where: { creditRequestId: id, status: 'pending' },
        data: {
          status: status === RequestStatus.recharged ? 'approved' : 'rejected',
          approverId: user.sub,
          notes: details,
          decidedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          creditRequestId: id,
          userId: user.sub,
          userName: admin?.name || 'Admin',
          action,
          details: auditDetails,
        },
      });
      return updated;
    });
  }
}
