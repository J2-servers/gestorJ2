import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: RequestUser, creditRequestId: string) {
    await this.assertAccess(user, creditRequestId);
    return this.prisma.requestMessage.findMany({
      where: { creditRequestId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(user: RequestUser, creditRequestId: string, content: string) {
    const request = await this.assertAccess(user, creditRequestId);
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('Mensagem vazia');
    if (text.length > 2000) throw new BadRequestException('Mensagem muito longa');

    const message = await this.prisma.requestMessage.create({
      data: { creditRequestId, authorId: user.sub, content: text },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    const isReseller = user.role === 'reseller';
    // destinatario: revendedor -> seu admin (ou admin operacional se orfao);
    // admin -> o revendedor do pedido.
    let targetUserId = isReseller ? request.reseller.parentId : request.resellerId;
    if (isReseller && !targetUserId) {
      const admin = await this.prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' } });
      targetUserId = admin?.id ?? null;
    }

    if (targetUserId) {
      const who = message.author?.name || (isReseller ? 'Revendedor' : 'Admin');
      await this.notifications.create({
        userId: targetUserId,
        message: `Nova mensagem de ${who} no pedido #${creditRequestId.slice(-6).toUpperCase()}.`,
        type: NotificationType.system,
        creditRequestId,
        relatedEntityId: creditRequestId,
      });
    }

    return message;
  }

  private async assertAccess(user: RequestUser, creditRequestId: string) {
    const request = await this.prisma.creditRequest.findUnique({
      where: { id: creditRequestId },
      include: { reseller: { select: { parentId: true } } },
    });
    if (!request) throw new NotFoundException('Pedido não encontrado');
    if (user.role === 'reseller' && request.resellerId !== user.sub) {
      throw new ForbiddenException('Acesso negado');
    }
    // parentId nulo (revendedor orfao) = pertence ao admin operacional
    if (user.role === 'admin' && request.reseller.parentId && request.reseller.parentId !== user.sub) {
      throw new ForbiddenException('Pedido fora do escopo');
    }
    return request;
  }
}
