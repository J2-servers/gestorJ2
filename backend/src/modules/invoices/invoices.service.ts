import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, NotificationType, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';

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

    const where = user.role === 'admin'
      ? { reseller: { parentId: user.sub } }
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
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    this.assertAccess(user, invoice.resellerId, invoice.reseller.parentId ?? null);
    return invoice;
  }

  async generate(adminId: string, resellerId: string) {
    const reseller = await this.prisma.user.findUnique({ where: { id: resellerId } });
    if (!reseller) throw new NotFoundException('Revendedor não encontrado');
    if (reseller.parentId !== adminId) throw new ForbiddenException('Revendedor fora do escopo');

    const pendingRequests = await this.prisma.creditRequest.findMany({
      where: { resellerId, status: RequestStatus.recharged, invoiceId: null },
    });
    if (!pendingRequests.length) {
      throw new BadRequestException('Nenhum pedido aprovado pendente de faturamento para este revendedor');
    }

    const totalValue = pendingRequests.reduce((sum, r) => sum + Number(r.totalValue), 0);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          resellerId,
          totalValue,
          dueDate,
          status: InvoiceStatus.pending,
        },
      });
      await tx.creditRequest.updateMany({
        where: { id: { in: pendingRequests.map((r) => r.id) } },
        data: { invoiceId: inv.id },
      });
      return inv;
    });

    await this.notifications.create({
      userId: resellerId,
      message: `Nova fatura gerada: R$ ${totalValue.toFixed(2)} com vencimento em ${dueDate.toLocaleDateString('pt-BR')}.`,
      type: NotificationType.invoice,
      relatedEntityId: invoice.id,
    });

    if (reseller.phone) {
      await this.whatsapp.enqueue({
        phone: reseller.phone,
        relatedEntityId: invoice.id,
        message: `Olá ${reseller.name}, sua fatura foi gerada no valor de R$ ${totalValue.toFixed(2)} com vencimento em ${dueDate.toLocaleDateString('pt-BR')}. Entre em contato para mais informações.`,
      });
    }

    return invoice;
  }

  async markPaid(adminId: string, invoiceId: string, proofUrl?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { reseller: { select: { id: true, name: true, phone: true, parentId: true } } },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (invoice.reseller.parentId !== adminId) throw new ForbiddenException('Fatura fora do escopo');
    if (invoice.status === InvoiceStatus.paid) throw new BadRequestException('Fatura já foi paga');

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.paid, paidAt: new Date(), proofUrl },
    });

    if (invoice.reseller.phone) {
      await this.notifications.create({
        userId: invoice.resellerId,
        message: `Pagamento da fatura R$ ${Number(invoice.totalValue).toFixed(2)} confirmado. Obrigado!`,
        type: NotificationType.invoice,
        relatedEntityId: invoiceId,
      });
      await this.whatsapp.enqueue({
        phone: invoice.reseller.phone,
        relatedEntityId: invoiceId,
        message: `Olá ${invoice.reseller.name}! Confirmamos o recebimento do pagamento da sua fatura no valor de R$ ${Number(invoice.totalValue).toFixed(2)}. Obrigado pela parceria!`,
      });
    }

    return updated;
  }

  async resend(adminId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { reseller: { select: { name: true, phone: true, parentId: true } } },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    if (invoice.reseller.parentId !== adminId) throw new ForbiddenException('Fatura fora do escopo');
    if (!invoice.reseller.phone) throw new BadRequestException('Revendedor sem WhatsApp cadastrado');

    const label = invoice.status === InvoiceStatus.paid
      ? `paga de R$ ${Number(invoice.totalValue).toFixed(2)}`
      : `pendente de R$ ${Number(invoice.totalValue).toFixed(2)}`;

    await this.whatsapp.enqueue({
      phone: invoice.reseller.phone,
      relatedEntityId: invoiceId,
      message: `Olá ${invoice.reseller.name}! Segue o resumo da sua fatura ${label}. Entre em contato se tiver dúvidas.`,
    });

    return { sent: true };
  }

  async markOverdue() {
    const now = new Date();
    const result = await this.prisma.invoice.updateMany({
      where: { status: InvoiceStatus.pending, dueDate: { lt: now } },
      data: { status: InvoiceStatus.overdue },
    });
    return result.count;
  }

  private assertAccess(user: RequestUser, resellerId: string, resellerParentId: string | null) {
    if (user.role === 'reseller' && user.sub !== resellerId) {
      throw new ForbiddenException('Acesso negado');
    }
    if (user.role === 'admin' && resellerParentId !== user.sub) {
      throw new ForbiddenException('Fatura fora do escopo');
    }
  }
}
