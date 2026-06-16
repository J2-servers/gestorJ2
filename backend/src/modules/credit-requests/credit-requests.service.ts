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
          ? { OR: [{ reseller: { parentId: user.sub } }, { reseller: { role: UserRole.reseller, parentId: null } }] }
          : {};

    const results = await this.prisma.creditRequest.findMany({
      where,
      include: { reseller: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = results.length > take;
    const sliced = hasMore ? results.slice(0, take) : results;
    const isStaff = user.role === 'admin' || user.role === 'dev';
    const data = isStaff
      ? await this.withSuppliers(sliced)
      : sliced.map(({ supplierSnapshot, ...rest }) => rest); // oculta fornecedor do revendedor
    return { data, nextCursor: hasMore ? data[data.length - 1]?.id : null };
  }

  // Resolve, para cada pedido, o fornecedor que deve atender (painel a recarregar).
  // Prioriza o vinculo ATUAL (chave exata revendedor+servidor+login) e cai para
  // o snapshot imutavel salvo no pedido. Apenas para admin/dev.
  private async withSuppliers<T extends { resellerId: string; serverId: string | null; login: string; supplierSnapshot: unknown }>(requests: T[]) {
    const pairs: { resellerId: string; serverId: string }[] = [];
    const seen = new Set<string>();
    for (const r of requests) {
      if (r.serverId) {
        const k = `${r.resellerId}|${r.serverId}`;
        if (!seen.has(k)) { seen.add(k); pairs.push({ resellerId: r.resellerId, serverId: r.serverId }); }
      }
    }
    const links = pairs.length
      ? await this.prisma.resellerServer.findMany({ where: { OR: pairs }, include: { supplier: true } })
      : [];
    const byExact = new Map<string, unknown>();
    const byPair = new Map<string, unknown>();
    for (const l of links) {
      if (!l.supplier) continue;
      byExact.set(`${l.resellerId}|${l.serverId}|${l.login}`, l.supplier);
      if (!byPair.has(`${l.resellerId}|${l.serverId}`)) byPair.set(`${l.resellerId}|${l.serverId}`, l.supplier);
    }
    return requests.map((r) => {
      const live =
        byExact.get(`${r.resellerId}|${r.serverId}|${r.login}`) ??
        byPair.get(`${r.resellerId}|${r.serverId}`) ??
        null;
      return { ...r, supplier: live ?? r.supplierSnapshot ?? null };
    });
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
    if (user.role === 'admin' && request.reseller.parentId && request.reseller.parentId !== user.sub) {
      throw new ForbiddenException('Pedido fora do escopo deste admin');
    }
    const isStaff = user.role === 'admin' || user.role === 'dev';
    if (isStaff) return (await this.withSuppliers([request]))[0];
    const { supplierSnapshot, ...rest } = request; // oculta fornecedor do revendedor
    return rest;
  }

  async create(resellerId: string, dto: CreateCreditRequestDto) {
    const reseller = await this.prisma.user.findUnique({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Revendedor nao encontrado');
    if (!reseller.phone) throw new BadRequestException('WhatsApp obrigatorio para criar pedidos');

    // Resolucao PRECISA do vinculo: prioriza o login exato (chave unica
    // resellerId+serverId+login); cai para o primeiro vinculo ativo do par.
    const resellerServer =
      (await this.prisma.resellerServer.findFirst({
        where: { resellerId, serverId: dto.serverId, active: true, login: dto.login.trim() },
        include: { server: true, supplier: true },
      })) ||
      (await this.prisma.resellerServer.findFirst({
        where: { resellerId, serverId: dto.serverId, active: true },
        include: { server: true, supplier: true },
      }));
    if (!resellerServer) throw new ForbiddenException('Revendedor nao vinculado a este servidor');

    // Snapshot IMUTAVEL do fornecedor no momento do pedido (auditoria).
    const supplierSnapshot = resellerServer.supplier
      ? {
          id: resellerServer.supplier.id,
          name: resellerServer.supplier.name,
          panelLogin: resellerServer.supplier.panelLogin,
          panelLink: resellerServer.supplier.panelLink ?? null,
          costPerCredit: Number(resellerServer.supplier.costPerCredit),
        }
      : undefined;

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
          supplierSnapshot,
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

    // Resolve o admin alvo: o pai do revendedor OU o admin operacional.
    // Auto-cura revendedores orfaos (parentId nulo) vinculando-os ao admin,
    // garantindo que o pedido apareca para aprovacao e a notificacao chegue.
    let adminId = reseller.parentId;
    if (!adminId) {
      const admin = await this.prisma.user.findFirst({
        where: { role: UserRole.admin },
        orderBy: { createdAt: 'asc' },
      });
      adminId = admin?.id ?? null;
      if (adminId) {
        await this.prisma.user.update({ where: { id: reseller.id }, data: { parentId: adminId } }).catch(() => {});
      }
    }
    if (adminId) {
      await this.notifications.create({
        userId: adminId,
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
    if (user.role === 'admin' && current.reseller.parentId && current.reseller.parentId !== user.sub) {
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
