import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  serverId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(200)
  panelLogin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  panelLink?: string;

  @IsNumber()
  @Min(0)
  costPerCredit!: number;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  panelLogin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  panelLink?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerCredit?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
