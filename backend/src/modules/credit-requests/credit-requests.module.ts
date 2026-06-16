import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { TemplatesModule } from '../templates/templates.module';
import { CreditRequestsController } from './credit-requests.controller';
import { CreditRequestsService } from './credit-requests.service';

@Module({
  imports: [NotificationsModule, WhatsAppModule, TemplatesModule],
  controllers: [CreditRequestsController],
  providers: [CreditRequestsService],
})
export class CreditRequestsModule {}
