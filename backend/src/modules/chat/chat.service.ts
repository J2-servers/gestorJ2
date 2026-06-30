import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { NotificationType, Prisma, UserRole } from '@prisma/client';
import { gzipSync, gunzipSync } from 'zlib';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly gateway: ChatGateway,
  ) {}

  private isStaff(user: RequestUser) {
    return user.role === 'admin' || user.role === 'dev';
  }

  // Garante que o usuario pode acessar a thread daquele revendedor.
  private async assertThreadAccess(user: RequestUser, resellerId: string) {
    if (!this.isStaff(user)) {
      // Revendedor: SO a propria thread. Isolamento total.
      if (resellerId !== user.sub) throw new ForbiddenException('Acesso negado');
      return;
    }
    // Admin/dev: no modelo atual existe um admin operacional; ele atende todos
    // os revendedores reais do sistema, inclusive cadastros migrados/orfaos.
    const reseller = await this.prisma.user.findUnique({ where: { id: resellerId } });
    if (!reseller || reseller.role !== UserRole.reseller) throw new NotFoundException('Revendedor nao encontrado');
  }

  // Lista as threads (para o admin) ou a propria (para o revendedor).
  async threads(user: RequestUser) {
    if (!this.isStaff(user)) {
      const last = await this.prisma.chatMessage.findFirst({
        where: { resellerId: user.sub },
        orderBy: { createdAt: 'desc' },
      });
      const unread = await this.prisma.chatMessage.count({
        where: { resellerId: user.sub, readByReseller: false, authorRole: { not: 'reseller' } },
      });
      const me = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { name: true, email: true, profileImageUrl: true },
      });
      const admin = await this.prisma.user.findFirst({
        where: { role: UserRole.admin },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, profileImageUrl: true },
      });
      return [{
        resellerId: user.sub,
        name: admin?.name ?? 'Admin',
        email: admin?.email ?? null,
        profileImageUrl: me?.profileImageUrl ?? null,
        counterpartImageUrl: admin?.profileImageUrl ?? null,
        lastMessage: last?.content ?? null,
        lastAt: last?.createdAt ?? null,
        unread,
      }];
    }

    // Admin/dev: todos os revendedores reais do sistema, mesmo sem mensagens.
    const resellers = await this.prisma.user.findMany({
      where: { role: UserRole.reseller },
      select: { id: true, name: true, email: true, phone: true, profileImageUrl: true, status: true, paymentType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const ids = resellers.map((r) => r.id);
    if (ids.length === 0) return [];

    // ESCALA: ultima mensagem por thread via DISTINCT ON (nao carrega historico).
    const lasts = await this.prisma.$queryRaw<Array<{ resellerId: string; content: string; createdAt: Date }>>`
      SELECT DISTINCT ON ("resellerId") "resellerId", "content", "createdAt"
      FROM "ChatMessage"
      WHERE "resellerId" IN (${Prisma.join(ids)})
      ORDER BY "resellerId", "createdAt" DESC
    `;
    const lastByReseller = new Map(lasts.map((m) => [m.resellerId, m]));

    const unreadGroups = await this.prisma.chatMessage.groupBy({
      by: ['resellerId'],
      where: { resellerId: { in: ids }, readByAdmin: false, authorRole: 'reseller' },
      _count: true,
    });
    const unreadByReseller = new Map(unreadGroups.map((g) => [g.resellerId, Number(g._count)]));

    return resellers
      .map((r) => {
        const lm = lastByReseller.get(r.id);
        return {
          resellerId: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          profileImageUrl: r.profileImageUrl,
          status: r.status,
          paymentType: r.paymentType,
          createdAt: r.createdAt,
          lastMessage: lm?.content ?? null,
          lastAt: lm?.createdAt ?? null,
          unread: unreadByReseller.get(r.id) ?? 0,
        };
      })
      .sort((a, b) => (b.lastAt ? new Date(b.lastAt).getTime() : 0) - (a.lastAt ? new Date(a.lastAt).getTime() : 0));
  }

  async messages(user: RequestUser, resellerId: string) {
    const target = this.isStaff(user) ? resellerId : user.sub;
    await this.assertThreadAccess(user, target);

    // marca como lidas as mensagens da outra parte
    if (this.isStaff(user)) {
      const updated = await this.prisma.chatMessage.updateMany({
        where: { resellerId: target, readByAdmin: false, authorRole: 'reseller' },
        data: { readByAdmin: true },
      });
      if (updated.count > 0) this.gateway.emitRead(target, 'admin');
    } else {
      const updated = await this.prisma.chatMessage.updateMany({
        where: { resellerId: target, readByReseller: false, authorRole: { not: 'reseller' } },
        data: { readByReseller: true },
      });
      if (updated.count > 0) this.gateway.emitRead(target, 'reseller');
    }

    const messages = await this.prisma.chatMessage.findMany({ where: { resellerId: target }, orderBy: { createdAt: 'asc' } });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(messages.map((m) => m.authorId))] } },
      select: { id: true, profileImageUrl: true },
    });
    const imageByUser = new Map(users.map((u) => [u.id, u.profileImageUrl]));
    return messages.map((message) => ({ ...message, authorImageUrl: imageByUser.get(message.authorId) ?? null }));
  }

  async send(user: RequestUser, resellerId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('Mensagem vazia');
    if (text.length > 2000) throw new BadRequestException('Mensagem muito longa');
    const target = this.isStaff(user) ? resellerId : user.sub;
    await this.assertThreadAccess(user, target);

    const author = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { name: true, role: true, profileImageUrl: true } });
    const isReseller = !this.isStaff(user);

    const message = await this.prisma.chatMessage.create({
      data: {
        resellerId: target,
        authorId: user.sub,
        authorName: author?.name ?? (isReseller ? 'Revendedor' : 'Admin'),
        authorRole: isReseller ? 'reseller' : 'admin',
        content: text,
        readByAdmin: !isReseller,
        readByReseller: isReseller,
      },
    });

    // Notifica o destinatario
    let recipientId: string | null;
    if (isReseller) {
      const reseller = await this.prisma.user.findUnique({ where: { id: target }, select: { parentId: true } });
      recipientId = reseller?.parentId ?? null;
      if (!recipientId) {
        const admin = await this.prisma.user.findFirst({ where: { role: UserRole.admin }, orderBy: { createdAt: 'asc' } });
        recipientId = admin?.id ?? null;
      }
    } else {
      recipientId = target; // admin -> revendedor
    }
    if (recipientId) {
      await this.notifications.create({
        userId: recipientId,
        title: `Chat - ${message.authorName}`,
        message: text,
        type: NotificationType.system,
        relatedEntityId: `chat:${target}`,
        url: '/chat',
        highPriority: true,
      });
    }

    const result = { ...message, authorImageUrl: author?.profileImageUrl ?? null };
    this.gateway.emitNewMessage(target, result);
    return result;
  }

  // Empacota (gzip) a conversa atual da thread e LIMPA as mensagens vivas,
  // mantendo o historico permanente sem sobrecarregar o chat ativo.
  async archive(user: RequestUser, resellerId: string) {
    const target = this.isStaff(user) ? resellerId : user.sub;
    await this.assertThreadAccess(user, target);

    const messages = await this.prisma.chatMessage.findMany({
      where: { resellerId: target },
      orderBy: { createdAt: 'asc' },
    });
    if (messages.length === 0) throw new NotFoundException('Nao ha mensagens para empacotar');

    const gzip = gzipSync(Buffer.from(JSON.stringify(messages), 'utf8'));

    const archive = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatArchive.create({
        data: {
          resellerId: target,
          messageCount: messages.length,
          fromDate: messages[0].createdAt,
          toDate: messages[messages.length - 1].createdAt,
          gzipData: gzip,
          createdById: user.sub,
        },
        select: { id: true, messageCount: true, fromDate: true, toDate: true, createdAt: true },
      });
      await tx.chatMessage.deleteMany({ where: { resellerId: target } });
      return created;
    });

    return archive;
  }

  async listArchives(user: RequestUser, resellerId: string) {
    const target = this.isStaff(user) ? resellerId : user.sub;
    await this.assertThreadAccess(user, target);
    return this.prisma.chatArchive.findMany({
      where: { resellerId: target },
      select: { id: true, messageCount: true, fromDate: true, toDate: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArchive(user: RequestUser, id: string) {
    const archive = await this.prisma.chatArchive.findUnique({ where: { id } });
    if (!archive) throw new NotFoundException('Pacote nao encontrado');
    await this.assertThreadAccess(user, archive.resellerId); // isolamento
    const json = gunzipSync(Buffer.from(archive.gzipData)).toString('utf8');
    return { id: archive.id, resellerId: archive.resellerId, messageCount: archive.messageCount, messages: JSON.parse(json) };
  }
}
