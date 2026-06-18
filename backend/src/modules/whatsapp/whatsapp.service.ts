import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppLogStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WHATSAPP_QUEUE } from './whatsapp.constants';
import { getWhatsAppThrottleConfig, randomDelay } from './whatsapp-throttle';
import { isRedisDisabled } from './whatsapp-queue-fallback';

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

    // FALLBACK 1: Redis desabilitado por config — nao ha fila/worker. Envia
    // DIRETO pela Evolution API (fire-and-forget) para a mensagem nunca sumir.
    if (isRedisDisabled()) {
      void this.sendDirect(log.id, job.phone, job.message);
      return { ...log, viaDirect: true };
    }

    const throttle = getWhatsAppThrottleConfig(this.config);
    const delay = randomDelay(throttle.minDelayMs, throttle.maxDelayMs);

    // RESILIENCIA: enfileirar nao pode bloquear/derrubar a operacao de negocio
    // (criar pedido, aprovar, etc.). Se o Redis estiver fora, caimos no envio
    // direto (FALLBACK 2) — o pedido continua valido e a mensagem ainda sai.
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
    } catch {
      // Redis indisponivel em runtime: envia direto em vez de descartar.
      void this.sendDirect(log.id, job.phone, job.message);
    }

    return { ...log, scheduledDelayMs: delay };
  }

  // Envio DIRETO pela Evolution API, sem fila. Usado como fallback quando o
  // Redis/BullMQ nao esta disponivel — garante que a mensagem de pedido/recarga
  // nunca seja perdida. Best-effort: registra sent/failed no log e nunca lanca.
  private async sendDirect(logId: string, phone: string, message: string) {
    const started = Date.now();
    try {
      const settings = await this.prisma.settings.findFirst();
      const apiUrl = settings?.evolutionApiUrl || this.config.get<string>('EVOLUTION_API_URL');
      const apiKey = settings?.evolutionApiKeyRef || this.config.get<string>('EVOLUTION_API_KEY');
      const instance = settings?.evolutionInstance || this.config.get<string>('EVOLUTION_INSTANCE');
      if (!apiUrl || !apiKey || !instance) throw new Error('Evolution API nao configurada');

      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/message/sendText/${instance}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: phone, text: message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Evolution API ${response.status}: ${JSON.stringify(data)}`);

      await this.prisma.whatsAppLog
        .update({
          where: { id: logId },
          data: { status: WhatsAppLogStatus.sent, responseData: data, executionTimeMs: Date.now() - started },
        })
        .catch(() => {});
    } catch (err) {
      await this.prisma.whatsAppLog
        .update({
          where: { id: logId },
          data: {
            status: WhatsAppLogStatus.failed,
            responseData: { error: err instanceof Error ? err.message : String(err), via: 'direct-fallback' },
            executionTimeMs: Date.now() - started,
          },
        })
        .catch(() => {});
    }
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
