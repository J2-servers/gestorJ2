import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RechargeCodesController } from './recharge-codes.controller';
import { RechargeCodesService } from './recharge-codes.service';

@Module({
  controllers: [RechargeCodesController],
  providers: [PrismaService, RechargeCodesService],
})
export class RechargeCodesModule {}
