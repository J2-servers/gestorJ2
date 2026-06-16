import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppProcessor } from './whatsapp.processor';
import { WhatsAppService } from './whatsapp.service';

export const WHATSAPP_QUEUE = 'whatsapp';

@Module({
  imports: [BullModule.registerQueue({ name: WHATSAPP_QUEUE })],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppProcessor],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
