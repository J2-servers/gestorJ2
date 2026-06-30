import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class UpsertRechargeCodeProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  serverId?: string;

  @IsOptional()
  @IsString()
  modalityId?: string;

  @IsInt()
  @Min(1)
  denomination!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costValue?: number;

  @IsNumber()
  @Min(0)
  saleValue!: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertPlanModalityDto {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ImportRechargeCodesDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsOptional()
  @IsString()
  codeColumn?: string;

  @IsOptional()
  @IsString()
  pinColumn?: string;

  @IsOptional()
  @IsString()
  serialColumn?: string;

  @IsOptional()
  @IsString()
  expiresAtColumn?: string;

  @IsOptional()
  @IsString()
  serverColumn?: string;

  @IsOptional()
  @IsString()
  modalityColumn?: string;

  @IsOptional()
  @IsString()
  costColumn?: string;

  @IsOptional()
  @IsString()
  batchColumn?: string;

  @IsOptional()
  @IsString()
  supplierColumn?: string;

  @IsOptional()
  @IsString()
  noteColumn?: string;
}

export class SellRechargeCodeDto {
  @IsOptional()
  @IsString()
  resellerId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;
}

export class VoidRechargeCodeDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RechargeCodeCartItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}

export class CreateRechargeCodeOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RechargeCodeCartItemDto)
  items!: RechargeCodeCartItemDto[];

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  payerTaxNumber?: string;
}

export class ApproveRechargeCodePaymentDto {
  @IsOptional()
  @IsString()
  providerRef?: string;
}
