import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertRechargeCodeProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  serverId?: string;

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
