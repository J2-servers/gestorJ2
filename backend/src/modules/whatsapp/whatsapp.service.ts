import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppLogStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WHATSAPP_QUEUE } from './whatsapp.constants';
import { getWhatsAppThrottleConfig, randomDelay } from './whatsapp-throttle';

type WhatsAppJob = {
  logId?: string;
  phone: string;
  message: string;
  relatedEntityId?: string;
  creditRequestId?: string;
};

@Injectable()
export class WhatsAppService {
  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly queue: Queue<WhatsAppJob>,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async enqueue(job: WhatsAppJob) {
    // Liga/desliga global: se o admin desativou envios de WhatsApp, nao enfileira.
    // (A operacao de negocio que chamou — pedido/chat — segue normalmente.)
    const settings = await this.prisma.settings.findFirst({ select: { whatsappEnabled: true } });
    if (settings && settings.whatsappEnabled === false) {
      return { skipped: true, reason: 'whatsapp_disabled' };
    }

    const log = await this.prisma.whatsAppLog.create({
      data: {
        phone: job.phone,
        messagePreview: job.message.slice(0, 180),
        status: WhatsAppLogStatus.queued,
        relatedEntityId: job.relatedEntityId,
        creditRequestId: job.creditRequestId,
      },
    });

    const throttle = getWhatsAppThrottleConfig(this.config);
    const delay = randomDelay(throttle.minDelayMs, throttle.maxDelayMs);

    // RESILIENCIA: enfileirar nao pode bloquear/derrubar a operacao de negocio
    // (criar pedido, aprovar, etc.). Se o Redis estiver fora, registramos a
    // falha no log e seguimos — o pedido continua valido.
    try {
      await Promise.race([
        this.queue.add('send-text', { ...job, logId: log.id }, {
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: throttle.retryBaseDelayMs },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('enqueue timeout (Redis indisponivel)')), 3000)),
      ]);
    } catch (err) {
      await this.prisma.whatsAppLog
        .update({
          where: { id: log.id },
          data: {
            status: WhatsAppLogStatus.failed,
            responseData: { error: err instanceof Error ? err.message : String(err) },
          },
        })
        .catch(() => {});
    }

    return { ...log, scheduledDelayMs: delay };
  }

  async queueStatus() {
    const [waiting, delayed, active, failed, completed, paused] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getDelayedCount(),
      this.queue.getActiveCount(),
      this.queue.getFailedCount(),
      this.queue.getCompletedCount(),
      this.queue.isPaused(),
    ]);

    const throttle = getWhatsAppThrottleConfig(this.config);
    return { waiting, delayed, active, failed, completed, paused, throttle };
  }

  async retryFailed() {
    const failedJobs = await this.queue.getFailed(0, 100);
    await Promise.all(failedJobs.map((job) => job.retry()));
    return { retried: failedJobs.length };
  }

  async clearPending() {
    await this.queue.drain(true);
    return { cleared: true };
  }
}
