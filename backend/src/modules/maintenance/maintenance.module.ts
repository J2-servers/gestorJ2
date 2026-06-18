import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvoicesModule } from '../invoices/invoices.module';
import { WHATSAPP_QUEUE } from '../whatsapp/whatsapp.constants';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { disabledWhatsAppQueueProvider, isRedisDisabled } from '../whatsapp/whatsapp-queue-fallback';

@Module({
  imports: [
    ConfigModule,
    InvoicesModule,
    ...(isRedisDisabled() ? [] : [BullModule.registerQueue({ name: WHATSAPP_QUEUE })]),
  ],
  controllers: [MaintenanceController],
  providers: isRedisDisabled() ? [disabledWhatsAppQueueProvider, MaintenanceService] : [MaintenanceService],
})
export class MaintenanceModule {}
