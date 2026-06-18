import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppProcessor } from './whatsapp.processor';
import { WhatsAppService } from './whatsapp.service';
import { WHATSAPP_QUEUE } from './whatsapp.constants';
import { disabledWhatsAppQueueProvider, isRedisDisabled } from './whatsapp-queue-fallback';

// Re-export para compatibilidade com imports existentes
export { WHATSAPP_QUEUE } from './whatsapp.constants';

@Module({
  imports: isRedisDisabled() ? [] : [BullModule.registerQueue({ name: WHATSAPP_QUEUE })],
  controllers: [WhatsAppController],
  providers: isRedisDisabled()
    ? [disabledWhatsAppQueueProvider, WhatsAppService]
    : [WhatsAppService, WhatsAppProcessor],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
