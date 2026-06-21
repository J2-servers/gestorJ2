import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateServerFornecedorDto {
  @IsString()
  serverId!: string;

  @IsString()
  fornecedorId!: string;

  @IsNumber()
  @Min(0)
  costPerCredit!: number;

  @IsString()
  @MaxLength(200)
  panelLogin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  panelLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  panelPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateServerFornecedorDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerCredit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  panelLogin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  panelLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  panelPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
