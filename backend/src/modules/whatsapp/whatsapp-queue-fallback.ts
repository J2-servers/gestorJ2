import { getQueueToken } from '@nestjs/bullmq';
import { Provider } from '@nestjs/common';
import { WHATSAPP_QUEUE } from './whatsapp.constants';

export const isRedisDisabled = () =>
  /^(1|true|yes|on)$/i.test(String(process.env.REDIS_DISABLED ?? ''));

class DisabledWhatsAppQueue {
  async add() {
    return { id: `redis-disabled-${Date.now()}`, retry: async () => undefined };
  }

  async getWaitingCount() { return 0; }
  async getDelayedCount() { return 0; }
  async getActiveCount() { return 0; }
  async getFailedCount() { return 0; }
  async getCompletedCount() { return 0; }
  async isPaused() { return true; }
  async getFailed() { return []; }
  async drain() { return undefined; }
  async getJobCounts() {
    return {
      waiting: 0,
      delayed: 0,
      active: 0,
      failed: 0,
      completed: 0,
      paused: 1,
    };
  }

  get client() {
    return Promise.reject(new Error('Redis desativado por REDIS_DISABLED=true'));
  }
}

export const disabledWhatsAppQueueProvider: Provider = {
  provide: getQueueToken(WHATSAPP_QUEUE),
  useValue: new DisabledWhatsAppQueue(),
};
