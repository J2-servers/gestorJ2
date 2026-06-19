import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, NotificationType, PaymentType, RequestStatus, UserRole } from '@prisma/client';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

const PROOF_URL_RE = /^\/api\/uploads\/[a-f0-9-]{36}\.(jpg|png|gif|pdf)$/;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async list(user: RequestUser) {
    if (user.role === 'reseller') {
      return this.prisma.invoice.findMany({
        where: { resellerId: user.sub },
        include: { requests: { select: { id: true, requestedCredits: true, totalValue: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const where =
      user.role === 'admin'
        ? { reseller: { role: UserRole.reseller, OR: [{ parentId: user.sub }, { parentId: null }] } }
        : {};

    return this.prisma.invoice.findMany({
      where,
      include: {
        reseller: { select: { id: true, name: true, email: true, phone: true } },
        requests: { select: { id: true, requestedCredits: true, totalValue: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(user: RequestUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        reseller: { select: { id: true, name: true, email: true, phone: true, parentId: true } },
        requests: true,
      },
    });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada');
    await this.assertResellerScope(user, invoice.resellerId, invoice.reseller.parentId ?? null);
    return invoice;
  }

  async generate(user: RequestUser, resellerId: string) {
    const reseller = await this.prisma.user.findUnique({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Revendedor nao encontrado');
    if (reseller.role !== UserRole.reseller) throw new BadRequestException('Faturas so podem ser geradas para revendedores');
    if (reseller.paymentType !== PaymentType.postpaid) {
      throw new BadRequestException('Fatura so pode ser gerada para revendedor pos-pago');
    }
    await this.assertResellerScope(user, resellerId, reseller.parentId ?? null);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const pendingRequests = await tx.creditRequest.findMany({
        where: { resellerId, status: RequestStatus.recharged, invoiceId: null },
      });
      if (!pendingRequests.length) {
        throw new BadRequestException('Nenhum pedido aprovado pendente de faturamento para este revendedor');
      }

      const totalValue = pendingRequests.reduce((sum, request) => sum + Number(request.totalValue), 0);
      const created = await tx.invoice.create({
        data: {
          resellerId,
          totalValue,
          dueDate,
          status: InvoiceStatus.pending,
        },
      });

      const changed = await tx.creditRequest.updateMany({
        where: {
          id: { in: pendingRequests.map((request) => request.id) },
          resellerId,
          status: RequestStatus.recharged,
          invoiceId: null,
        },
        data: { invoiceId: created.id },
      });

      if (changed.count !== pendingRequests.length) {
        throw new BadRequestException('Pedidos mudaram durante a geracao da fatura. Atualize e tente novamente.');
      }

      return { ...created, totalValueNumber: totalValue };
    });

    await this.notifications.create({
      userId: resellerId,
      message: `Nova fatura gerada: R$ ${invoice.totalValueNumber.toFixed(2)} com vencimento em ${dueDate.toLocaleDateString('pt-BR')}.`,
      type: NotificationType.invoice,
      relatedEntityId: invoice.id,
      highPriority: true,
      url: '/Financeiro',
    });

    if (reseller.phone) {
      await this.whatsapp.enqueue({
        phone: reseller.phone,
        relatedEntityId: invoice.id,
        message: `Ola ${reseller.name}, sua fatura foi gerada no valor de R$ ${invoice.totalValueNumber.toFixed(2)} com vencimento em ${dueDate.toLocaleDateString('pt-BR')}.`,
      });
    }

    const { totalValueNumber, ...response } = invoice;
    return response;
  }

  async markPaid(user: RequestUser, invoiceId: string, proofUrl?: string) {
    if (proofUrl && !PROOF_URL_RE.test(proofUrl)) {
      throw new BadRequestException('Comprovante invalido. Envie o arquivo pelo endpoint de uploads.');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { reseller: { select: { id: true, name: true, phone: true, parentId: true } } },
    });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada');
    await this.assertResellerScope(user, invoice.resellerId, invoice.reseller.parentId ?? null);
    if (invoice.status === InvoiceStatus.paid) throw new BadRequestException('Fatura ja foi paga');
    if (invoice.status === InvoiceStatus.canceled) throw new BadRequestException('Fatura cancelada nao pode ser paga');

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.invoice.updateMany({
        where: { id: invoiceId, status: { in: [InvoiceStatus.pending, InvoiceStatus.overdue] } },
        data: { status: InvoiceStatus.paid, paidAt: new Date(), proofUrl },
      });
      if (changed.count !== 1) {
        throw new BadRequestException('Fatura mudou de status. Atualize e tente novamente.');
      }
      return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    });

    await this.notifications.create({
      userId: invoice.resellerId,
      message: `Pagamento da fatura R$ ${Number(invoice.totalValue).toFixed(2)} confirmado. Obrigado!`,
      type: NotificationType.invoice,
      relatedEntityId: invoiceId,
      highPriority: true,
      url: '/Financeiro',
    });

    if (invoice.reseller.phone) {
      await this.whatsapp.enqueue({
        phone: invoice.reseller.phone,
        relatedEntityId: invoiceId,
        message: `Ola ${invoice.reseller.name}! Confirmamos o recebimento do pagamento da sua fatura no valor de R$ ${Number(invoice.totalValue).toFixed(2)}. Obrigado pela parceria!`,
      });
    }

    return updated;
  }

  async resend(user: RequestUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { reseller: { select: { name: true, phone: true, parentId: true } } },
    });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada');
    await this.assertResellerScope(user, invoice.resellerId, invoice.reseller.parentId ?? null);
    if (!invoice.reseller.phone) throw new BadRequestException('Revendedor sem WhatsApp cadastrado');

    const label =
      invoice.status === InvoiceStatus.paid
        ? `paga de R$ ${Number(invoice.totalValue).toFixed(2)}`
        : `pendente de R$ ${Number(invoice.totalValue).toFixed(2)}`;

    await this.whatsapp.enqueue({
      phone: invoice.reseller.phone,
      relatedEntityId: invoiceId,
      message: `Ola ${invoice.reseller.name}! Segue o resumo da sua fatura ${label}. Entre em contato se tiver duvidas.`,
    });

    return { sent: true };
  }

  async markOverdue() {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.pending, dueDate: { lt: now } },
      include: { reseller: { select: { id: true, name: true, phone: true } } },
    });
    if (invoices.length === 0) return 0;

    const result = await this.prisma.invoice.updateMany({
      where: { id: { in: invoices.map((invoice) => invoice.id) }, status: InvoiceStatus.pending },
      data: { status: InvoiceStatus.overdue },
    });

    if (result.count > 0) {
      await Promise.allSettled(
        invoices.map(async (invoice) => {
          await this.notifications.create({
            userId: invoice.resellerId,
            message: `Sua fatura de R$ ${Number(invoice.totalValue).toFixed(2)} venceu. Regularize para manter seu controle em dia.`,
            type: NotificationType.invoice,
            relatedEntityId: invoice.id,
            highPriority: true,
            url: '/Financeiro',
          });

          if (invoice.reseller.phone) {
            await this.whatsapp.enqueue({
              phone: invoice.reseller.phone,
              relatedEntityId: invoice.id,
              message: `Ola ${invoice.reseller.name}, sua fatura de R$ ${Number(invoice.totalValue).toFixed(2)} venceu. Regularize para manter seu controle em dia.`,
            });
          }
        }),
      );
    }

    return result.count;
  }

  private async assertResellerScope(user: RequestUser, resellerId: string, resellerParentId: string | null) {
    if (user.role === 'reseller' && user.sub !== resellerId) {
      throw new ForbiddenException('Acesso negado');
    }
    if (user.role === 'admin' && resellerParentId && resellerParentId !== user.sub) {
      throw new ForbiddenException('Fatura fora do escopo');
    }
    if (user.role === 'admin' && !resellerParentId) {
      await this.prisma.user.update({ where: { id: resellerId }, data: { parentId: user.sub } }).catch(() => {});
    }
  }
}
