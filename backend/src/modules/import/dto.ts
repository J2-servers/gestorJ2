import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

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

  // Status das movimentacoes importadas:
  //  - 'keep'      : preserva o status do CSV (pode entupir a fila/nao contar lucro)
  //  - 'recharged' : marca todas como efetivadas (contam como receita/lucro realizado)
  @IsOptional()
  @IsIn(['keep', 'recharged'])
  statusMode?: 'keep' | 'recharged';
}
