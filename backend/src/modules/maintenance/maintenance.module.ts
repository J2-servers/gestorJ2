import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvoicesModule } from '../invoices/invoices.module';
import { WHATSAPP_QUEUE } from '../whatsapp/whatsapp.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [
    ConfigModule,
    InvoicesModule,
    BullModule.registerQueue({ name: WHATSAPP_QUEUE }),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
