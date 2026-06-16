import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../../invoices/invoices.service';

export type RepairCategory =
  | 'dados'
  | 'seguranca'
  | 'notificacoes'
  | 'fila'
  | 'config'
  | 'banco';

export type DangerLevel = 'low' | 'medium' | 'high';

/** Dependências disponíveis para cada script. */
export interface RepairContext {
  prisma: PrismaService;
  config: ConfigService;
  invoices: InvoicesService;
}

export interface DiagnoseResult {
  /** Quantos registros/itens seriam afetados pela correção. */
  affectedCount: number;
  /** Amostra (até ~10) do que seria alterado, para o admin revisar. */
  samples: unknown[];
  /** Mensagem legível com o resultado do diagnóstico. */
  message: string;
}

export interface ApplyResult {
  /** Quantos registros foram efetivamente alterados. */
  changed: number;
  /** Mensagem legível com o resultado da correção. */
  message: string;
}

export interface RepairScript {
  id: string;
  name: string;
  description: string;
  category: RepairCategory;
  danger: DangerLevel;
  diagnose(ctx: RepairContext): Promise<DiagnoseResult>;
  apply(ctx: RepairContext): Promise<ApplyResult>;
}

/** Metadados expostos ao frontend (sem as funções). */
export type RepairScriptMeta = Pick<
  RepairScript,
  'id' | 'name' | 'description' | 'category' | 'danger'
>;
