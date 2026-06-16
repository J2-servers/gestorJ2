import { PaymentType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCreditRequestDto {
  @IsString()
  serverId!: string;

  @IsInt()
  @Min(1)
  @Max(1000000)
  requestedCredits!: number;

  @IsString()
  login!: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(PaymentType)
  paymentType!: PaymentType;
}

export class DecisionDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  rejectionImageUrl?: string;
}
