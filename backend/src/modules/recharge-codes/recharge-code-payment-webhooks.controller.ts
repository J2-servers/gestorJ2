import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { RechargeCodesService } from './recharge-codes.service';

@Controller('payment-webhooks/recharge-codes')
export class RechargeCodePaymentWebhooksController {
  constructor(private readonly rechargeCodes: RechargeCodesService) {}

  @Post(':provider')
  handle(@Param('provider') provider: string, @Body() body: unknown, @Headers() headers: Record<string, string>, @Req() req: Request & { rawBody?: string }) {
    return this.rechargeCodes.handlePaymentWebhook(provider, body, headers, req.rawBody);
  }
}
