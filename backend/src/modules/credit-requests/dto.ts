import { PaymentType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCreditRequestDto {
  @IsString()
  serverId!: string;

  @IsInt()
  @Min(1)
  @Max(1000000)
  requestedCredits!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  login?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  proofUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;
}

export class UpdateCreditRequestDto extends CreateCreditRequestDto {}

export class DecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  rejectionImageUrl?: string;
}
