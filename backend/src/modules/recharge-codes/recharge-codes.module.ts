import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RechargeCodesController } from './recharge-codes.controller';
import { RechargeCodePaymentWebhooksController } from './recharge-code-payment-webhooks.controller';
import { RechargeCodesService } from './recharge-codes.service';

@Module({
  controllers: [RechargeCodesController, RechargeCodePaymentWebhooksController],
  providers: [PrismaService, RechargeCodesService],
})
export class RechargeCodesModule {}
