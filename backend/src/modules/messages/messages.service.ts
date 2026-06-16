import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

    const message = await this.prisma.requestMessage.create({
      data: { creditRequestId, authorId: user.sub, content },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    const isReseller = user.role === 'reseller';
    const targetUserId = isReseller ? request.reseller.parentId : request.resellerId;

    if (targetUserId) {
      await this.notifications.create({
        userId: targetUserId,
        message: `Nova mensagem no pedido #${creditRequestId.slice(-6).toUpperCase()}.`,
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
    if (user.role === 'admin' && request.reseller.parentId !== user.sub) {
      throw new ForbiddenException('Pedido fora do escopo');
    }
    return request;
  }
}
