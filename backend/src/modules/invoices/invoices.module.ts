import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesCron } from './invoices.cron';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [NotificationsModule, WhatsAppModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesCron],
  exports: [InvoicesService],
})
export class InvoicesModule {}
