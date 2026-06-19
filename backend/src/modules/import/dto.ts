import { IsObject, IsOptional, IsString } from 'class-validator';

export class ImportOrdersDto {
  @IsString()
  csv!: string;

  // Mapa de unificacao: nome cru (limpo) -> nome canonico do servidor.
  @IsOptional()
  @IsObject()
  mapping?: Record<string, string>;

  // Custo por credito de cada servidor canonico (para a margem).
  @IsOptional()
  @IsObject()
  costs?: Record<string, number>;
}
