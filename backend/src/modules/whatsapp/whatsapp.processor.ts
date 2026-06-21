import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { WhatsAppLogStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WHATSAPP_QUEUE } from './whatsapp.constants';
import { getWhatsAppThrottleConfig, sleep } from './whatsapp-throttle';

function normalizeWhatsAppNumber(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return digits;
  if (digits.startsWith('55')) return digits;
  return digits.length >= 10 && digits.length <= 11 ? `55${digits}` : digits;
}

@Processor(WHATSAPP_QUEUE, { concurrency: 1 })
export class WhatsAppProcessor extends WorkerHost {
  private lastSentAt = 0;
  private sentAtWindow: number[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ logId: string; phone: string; message: string }>) {
    const started = Date.now();
    // Le a config da Evolution do banco (configurada pelo admin na UI),
    // com fallback para variaveis de ambiente. Sem isso, o admin configura
    // pela tela mas o envio usava env vazio e nunca enviava.
    const settings = await this.prisma.settings.findFirst();
    const apiUrl = settings?.evolutionApiUrl || this.config.get<string>('EVOLUTION_API_URL');
    const apiKey = settings?.evolutionApiKeyRef || this.config.get<string>('EVOLUTION_API_KEY');
    const instance = settings?.evolutionInstance || this.config.get<string>('EVOLUTION_INSTANCE');
    const throttle = getWhatsAppThrottleConfig(this.config);

    try {
      if (!apiUrl || !apiKey || !instance) {
        throw new Error('Evolution API nao configurada');
      }

      const elapsedSinceLastSend = Date.now() - this.lastSentAt;
      if (this.lastSentAt && elapsedSinceLastSend < throttle.minSendIntervalMs) {
        await sleep(throttle.minSendIntervalMs - elapsedSinceLastSend);
      }

      const now = Date.now();
      this.sentAtWindow = this.sentAtWindow.filter((sentAt) => now - sentAt < 60_000);
      if (this.sentAtWindow.length >= throttle.maxPerMinute) {
        const oldest = this.sentAtWindow[0];
        await sleep(Math.max(60_000 - (now - oldest), throttle.minSendIntervalMs));
        const afterWait = Date.now();
        this.sentAtWindow = this.sentAtWindow.filter((sentAt) => afterWait - sentAt < 60_000);
      }

      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: normalizeWhatsAppNumber(job.data.phone),
          text: job.data.message,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Evolution API ${response.status}: ${JSON.stringify(data)}`);
      this.lastSentAt = Date.now();
      this.sentAtWindow.push(this.lastSentAt);

      await this.prisma.whatsAppLog.update({
        where: { id: job.data.logId },
        data: {
          status: WhatsAppLogStatus.sent,
          attempts: job.attemptsMade + 1,
          responseData: data,
          executionTimeMs: Date.now() - started,
        },
      });
    } catch (error) {
      await this.prisma.whatsAppLog.update({
        where: { id: job.data.logId },
        data: {
          status: WhatsAppLogStatus.failed,
          attempts: job.attemptsMade + 1,
          responseData: { error: error instanceof Error ? error.message : String(error) },
          executionTimeMs: Date.now() - started,
        },
      });
      throw error;
    }
  }
}
