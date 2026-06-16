import { ConfigService } from '@nestjs/config';

const numberFromConfig = (config: ConfigService, key: string, fallback: number) => {
  const value = Number(config.get<string>(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const getWhatsAppThrottleConfig = (config: ConfigService) => {
  const minDelayMs = numberFromConfig(config, 'WHATSAPP_MIN_DELAY_MS', 15_000);
  const maxDelayMs = Math.max(numberFromConfig(config, 'WHATSAPP_MAX_DELAY_MS', 75_000), minDelayMs);
  const retryBaseDelayMs = numberFromConfig(config, 'WHATSAPP_RETRY_BASE_DELAY_MS', 120_000);
  const minSendIntervalMs = numberFromConfig(config, 'WHATSAPP_MIN_SEND_INTERVAL_MS', 20_000);
  const maxPerMinute = Math.max(numberFromConfig(config, 'WHATSAPP_MAX_PER_MINUTE', 3), 1);

  return {
    minDelayMs,
    maxDelayMs,
    retryBaseDelayMs,
    minSendIntervalMs,
    maxPerMinute,
  };
};

export const randomDelay = (minDelayMs: number, maxDelayMs: number) => {
  if (maxDelayMs <= minDelayMs) return minDelayMs;
  return Math.floor(minDelayMs + Math.random() * (maxDelayMs - minDelayMs));
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
