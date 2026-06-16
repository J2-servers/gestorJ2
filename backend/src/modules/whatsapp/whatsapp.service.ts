import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppLogStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WHATSAPP_QUEUE } from './whatsapp.module';
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

    await this.queue.add('send-text', { ...job, logId: log.id }, {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: throttle.retryBaseDelayMs },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });

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
