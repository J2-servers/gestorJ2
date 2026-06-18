import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEventsService } from './notification-events.service';

const PUSH_TITLES: Record<string, string> = {
  approval:         '✅ Pedido aprovado',
  rejection:        '❌ Pedido recusado',
  payment:          '💰 Pagamento confirmado',
  message:          '💬 Nova mensagem',
  payment_reminder: '⚠️ Fatura pendente',
  system:           'Gestor J2',
};

const HIGH_PRIORITY_TYPES = new Set(['approval', 'rejection', 'payment']);

@Injectable()
export class NotificationsService {
  private readonly vapidReady: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: NotificationEventsService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.config.get<string>('VAPID_SUBJECT') || 'mailto:admin@gestorj2.local';
    this.vapidReady = !!(publicKey && privateKey);
    if (this.vapidReady) {
      webpush.setVapidDetails(subject, publicKey!, privateKey!);
    }
  }

  async create(data: {
    userId: string;
    message: string;
    type?: NotificationType;
    relatedEntityId?: string;
    creditRequestId?: string;
    title?: string;         // titulo customizado do push (ex.: chat)
    highPriority?: boolean; // forca requireInteraction (notificacao chamativa)
    url?: string;           // destino ao tocar
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        message: data.message,
        type: data.type || NotificationType.system,
        relatedEntityId: data.relatedEntityId,
        creditRequestId: data.creditRequestId,
      },
    });

    // 1. Real-time delivery via SSE (browser tab open) — best-effort.
    try {
      this.events.emit(data.userId, notification as any);
    } catch { /* SSE nunca pode derrubar a criacao da notificacao */ }

    // 2. Background delivery via Web Push (device-level, works when tab is closed).
    // FALLBACK: push e best-effort. A notificacao ja esta no banco (sino in-app) e
    // ja foi para o SSE; uma falha de push NUNCA pode quebrar a operacao de negocio
    // (criar pedido, aprovar, chat). Por isso engolimos qualquer erro aqui.
    const typeKey = (data.type as string) || 'system';
    const highPriority = data.highPriority ?? HIGH_PRIORITY_TYPES.has(typeKey);
    try {
      await this.sendPush(data.userId, {
        title: data.title ?? PUSH_TITLES[typeKey] ?? 'Gestor J2',
        body: data.message,
        icon: '/icon-192.png',
        badge: '/badge-96.png',
        tag: data.relatedEntityId || `notif-${notification.id}`,
        data: {
          url: data.url ?? (data.creditRequestId ? '/CreditRequests' : '/'),
          notificationId: notification.id,
          type: typeKey,
        },
        // Notificacao chamativa: vibracao forte para eventos importantes.
        vibrate: highPriority ? [500, 200, 500, 200, 500] : [300, 150, 300],
        requireInteraction: highPriority,
        actions: [
          { action: 'view', title: 'Abrir' },
          { action: 'dismiss', title: 'Dispensar' },
        ],
      });
    } catch { /* push best-effort — DB + SSE garantem a entrega in-app */ }

    return notification;
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async savePushSubscription(
    userId: string,
    input: { endpoint: string; keys: unknown; userAgent?: string },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        keys: input.keys as object,
        userAgent: input.userAgent,
      },
      update: {
        userId,
        keys: input.keys as object,
        userAgent: input.userAgent,
      },
    });
  }

  getVapidPublicKey(): string | null {
    return this.vapidReady ? (this.config.get<string>('VAPID_PUBLIC_KEY') ?? null) : null;
  }

  private async sendPush(userId: string, payload: Record<string, unknown>) {
    if (!this.vapidReady) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const staleIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys as webpush.PushSubscription['keys'],
            },
            JSON.stringify(payload),
            { TTL: 3600 },
          );
        } catch (err: any) {
          // 410 Gone or 404 = subscription expired → remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleIds.push(sub.id);
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await this.prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    }
  }
}

