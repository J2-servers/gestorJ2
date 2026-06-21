import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateResellerServerDto {
  @IsOptional()
  @IsString()
  resellerId?: string;

  @IsString()
  serverId!: string;

  @IsString()
  @MaxLength(120)
  login!: string;

  @IsNumber()
  @Min(0)
  valuePerCredit!: number;

  @IsOptional()
  @IsString()
  serverFornecedorId?: string | null;

  // legado: mantido somente para compatibilidade com vinculos antigos
  @IsOptional()
  @IsString()
  supplierId?: string | null;
}

export class UpdateResellerServerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  login?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valuePerCredit?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // vinculo (oculto ao revendedor) ao fornecedor; null desvincula
  @IsOptional()
  @IsString()
  supplierId?: string | null;

  // novo vinculo recomendado: Fornecedor -> ServerFornecedor -> ResellerServer
  @IsOptional()
  @IsString()
  serverFornecedorId?: string | null;
}
