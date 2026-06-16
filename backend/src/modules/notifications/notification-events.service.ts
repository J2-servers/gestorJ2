import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface NotificationPayload {
  id: string;
  userId: string;
  message: string;
  type: string;
  relatedEntityId?: string | null;
  creditRequestId?: string | null;
  isRead: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationEventsService implements OnModuleDestroy {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Support many concurrent SSE connections without Node.js warnings
    this.emitter.setMaxListeners(500);
  }

  emit(userId: string, notification: NotificationPayload) {
    this.emitter.emit(`user:${userId}`, notification);
  }

  subscribe(userId: string, handler: (n: NotificationPayload) => void): () => void {
    this.emitter.on(`user:${userId}`, handler);
    return () => this.emitter.off(`user:${userId}`, handler);
  }

  onModuleDestroy() {
    this.emitter.removeAllListeners();
  }
}
