import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppProcessor } from './whatsapp.processor';
import { WhatsAppService } from './whatsapp.service';
import { WHATSAPP_QUEUE } from './whatsapp.constants';

// Re-export para compatibilidade com imports existentes
export { WHATSAPP_QUEUE } from './whatsapp.constants';

@Module({
  imports: [BullModule.registerQueue({ name: WHATSAPP_QUEUE })],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppProcessor],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
