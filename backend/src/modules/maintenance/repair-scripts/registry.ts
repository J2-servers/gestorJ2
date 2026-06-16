import { ApprovalStatus, InvoiceStatus, RequestStatus, UserRole } from '@prisma/client';
import * as webpush from 'web-push';
import { RepairContext, RepairScript } from './repair-script.types';

const DAY = 24 * 60 * 60 * 1000;
const STUCK_DAYS = 7;
const PUSH_STALE_DAYS = 90;
const WA_LOG_KEEP_DAYS = 30;
const TOKEN_REVOKED_KEEP_DAYS = 30;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

/** Catálogo de scripts de correção. Para adicionar um novo conserto, basta
 *  registrar mais um objeto aqui — a página Dev o exibe automaticamente. */
const SCRIPTS: RepairScript[] = [
  // ───────────── DADOS ─────────────
  {
    id: 'unstick_analyzing_requests',
    name: 'Destravar pedidos presos em análise',
    description: `Pedidos parados em "analyzing" há mais de ${STUCK_DAYS} dias voltam para "pending" para reavaliação.`,
    category: 'dados',
    danger: 'medium',
    async diagnose({ prisma }: RepairContext) {
      const where = { status: RequestStatus.analyzing, updatedAt: { lt: daysAgo(STUCK_DAYS) } };
      const [affectedCount, samples] = await Promise.all([
        prisma.creditRequest.count({ where }),
        prisma.creditRequest.findMany({
          where,
          select: { id: true, login: true, requestedCredits: true, updatedAt: true },
          take: 10,
          orderBy: { updatedAt: 'asc' },
        }),
      ]);
      return { affectedCount, samples, message: `${affectedCount} pedido(s) preso(s) em análise.` };
    },
    async apply({ prisma }: RepairContext) {
      const res = await prisma.creditRequest.updateMany({
        where: { status: RequestStatus.analyzing, updatedAt: { lt: daysAgo(STUCK_DAYS) } },
        data: { status: RequestStatus.pending },
      });
      return { changed: res.count, message: `${res.count} pedido(s) devolvido(s) para "pending".` };
    },
  },
  {
    id: 'mark_overdue_invoices',
    name: 'Marcar faturas vencidas',
    description: 'Faturas pendentes com vencimento no passado passam para "overdue".',
    category: 'dados',
    danger: 'low',
    async diagnose({ prisma }: RepairContext) {
      const where = { status: InvoiceStatus.pending, dueDate: { lt: new Date() } };
      const [affectedCount, samples] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          select: { id: true, resellerId: true, totalValue: true, dueDate: true },
          take: 10,
          orderBy: { dueDate: 'asc' },
        }),
      ]);
      return { affectedCount, samples, message: `${affectedCount} fatura(s) vencida(s).` };
    },
    async apply({ invoices }: RepairContext) {
      const changed = await invoices.markOverdue();
      return { changed, message: `${changed} fatura(s) marcada(s) como vencida(s).` };
    },
  },
  {
    id: 'reassign_orphan_resellers',
    name: 'Reatribuir revendedores órfãos',
    description: 'Revendedores sem admin vinculado (parentId nulo) são vinculados ao admin operacional.',
    category: 'dados',
    danger: 'medium',
    async diagnose({ prisma }: RepairContext) {
      const where = { role: UserRole.reseller, parentId: null };
      const [affectedCount, samples] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({ where, select: { id: true, name: true, email: true }, take: 10 }),
      ]);
      return { affectedCount, samples, message: `${affectedCount} revendedor(es) órfão(s).` };
    },
    async apply({ prisma }: RepairContext) {
      const admin = await prisma.user.findFirst({
        where: { role: UserRole.admin },
        orderBy: { createdAt: 'asc' },
      });
      if (!admin) {
        return { changed: 0, message: 'Nenhum admin operacional encontrado para vincular.' };
      }
      const res = await prisma.user.updateMany({
        where: { role: UserRole.reseller, parentId: null },
        data: { parentId: admin.id },
      });
      return { changed: res.count, message: `${res.count} revendedor(es) vinculado(s) a ${admin.email}.` };
    },
  },
  {
    id: 'realign_approval_stages',
    name: 'Realinhar etapas de aprovação divergentes',
    description: 'Pedidos já finalizados (recharged/rejected) cujas etapas ficaram em pending/analyzing são corrigidas.',
    category: 'dados',
    danger: 'medium',
    async diagnose({ prisma }: RepairContext) {
      const requests = await prisma.creditRequest.findMany({
        where: {
          status: { in: [RequestStatus.recharged, RequestStatus.rejected] },
          approvalStages: { some: { status: { in: [ApprovalStatus.pending, ApprovalStatus.analyzing] } } },
        },
        select: {
          id: true,
          status: true,
          login: true,
          approvalStages: {
            where: { status: { in: [ApprovalStatus.pending, ApprovalStatus.analyzing] } },
            select: { id: true },
          },
        },
        take: 200,
      });
      const affectedCount = requests.reduce((sum, r) => sum + r.approvalStages.length, 0);
      const samples = requests.slice(0, 10).map((r) => ({
        creditRequestId: r.id,
        login: r.login,
        requestStatus: r.status,
        stagesToFix: r.approvalStages.length,
      }));
      return { affectedCount, samples, message: `${affectedCount} etapa(s) divergente(s) em ${requests.length} pedido(s).` };
    },
    async apply({ prisma }: RepairContext) {
      const requests = await prisma.creditRequest.findMany({
        where: {
          status: { in: [RequestStatus.recharged, RequestStatus.rejected] },
          approvalStages: { some: { status: { in: [ApprovalStatus.pending, ApprovalStatus.analyzing] } } },
        },
        select: { id: true, status: true },
        take: 500,
      });
      let changed = 0;
      for (const r of requests) {
        const target =
          r.status === RequestStatus.recharged ? ApprovalStatus.approved : ApprovalStatus.rejected;
        const res = await prisma.approvalStage.updateMany({
          where: {
            creditRequestId: r.id,
            status: { in: [ApprovalStatus.pending, ApprovalStatus.analyzing] },
          },
          data: { status: target, decidedAt: new Date() },
        });
        changed += res.count;
      }
      return { changed, message: `${changed} etapa(s) realinhada(s).` };
    },
  },
  {
    id: 'fix_dangling_invoice_refs',
    name: 'Corrigir referências de fatura inexistente',
    description: 'Pedidos apontando para uma fatura que não existe mais têm o vínculo (invoiceId) limpo.',
    category: 'dados',
    danger: 'low',
    async diagnose({ prisma }: RepairContext) {
      const where = { invoiceId: { not: null }, invoice: { is: null } };
      const [affectedCount, samples] = await Promise.all([
        prisma.creditRequest.count({ where }),
        prisma.creditRequest.findMany({
          where,
          select: { id: true, login: true, invoiceId: true },
          take: 10,
        }),
      ]);
      return { affectedCount, samples, message: `${affectedCount} pedido(s) com fatura inexistente.` };
    },
    async apply({ prisma }: RepairContext) {
      const res = await prisma.creditRequest.updateMany({
        where: { invoiceId: { not: null }, invoice: { is: null } },
        data: { invoiceId: null },
      });
      return { changed: res.count, message: `${res.count} vínculo(s) de fatura limpo(s).` };
    },
  },

  // ───────────── SEGURANÇA ─────────────
  {
    id: 'clean_expired_refresh_tokens',
    name: 'Limpar refresh tokens expirados/revogados',
    description: `Remove tokens já expirados e os revogados há mais de ${TOKEN_REVOKED_KEEP_DAYS} dias.`,
    category: 'seguranca',
    danger: 'low',
    async diagnose({ prisma }: RepairContext) {
      const where = {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: daysAgo(TOKEN_REVOKED_KEEP_DAYS) } },
        ],
      };
      const affectedCount = await prisma.refreshToken.count({ where });
      return { affectedCount, samples: [], message: `${affectedCount} token(s) para remover.` };
    },
    async apply({ prisma }: RepairContext) {
      const res = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { lt: daysAgo(TOKEN_REVOKED_KEEP_DAYS) } },
          ],
        },
      });
      return { changed: res.count, message: `${res.count} token(s) removido(s).` };
    },
  },
  {
    id: 'revoke_all_sessions',
    name: 'Revogar TODAS as sessões ativas (emergência)',
    description: 'Encerra todas as sessões de todos os usuários. Todos precisarão fazer login novamente.',
    category: 'seguranca',
    danger: 'high',
    async diagnose({ prisma }: RepairContext) {
      const affectedCount = await prisma.refreshToken.count({ where: { revokedAt: null } });
      return { affectedCount, samples: [], message: `${affectedCount} sessão(ões) ativa(s) serão encerradas.` };
    },
    async apply({ prisma }: RepairContext) {
      const res = await prisma.refreshToken.updateMany({
        where: { revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { changed: res.count, message: `${res.count} sessão(ões) revogada(s).` };
    },
  },

  // ───────────── NOTIFICAÇÕES ─────────────
  {
    id: 'clean_stale_push_subscriptions',
    name: 'Limpar inscrições de push antigas',
    description: `Remove inscrições de notificação não atualizadas há mais de ${PUSH_STALE_DAYS} dias.`,
    category: 'notificacoes',
    danger: 'low',
    async diagnose({ prisma }: RepairContext) {
      const where = { updatedAt: { lt: daysAgo(PUSH_STALE_DAYS) } };
      const affectedCount = await prisma.pushSubscription.count({ where });
      return { affectedCount, samples: [], message: `${affectedCount} inscrição(ões) antiga(s).` };
    },
    async apply({ prisma }: RepairContext) {
      const res = await prisma.pushSubscription.deleteMany({
        where: { updatedAt: { lt: daysAgo(PUSH_STALE_DAYS) } },
      });
      return { changed: res.count, message: `${res.count} inscrição(ões) removida(s).` };
    },
  },
  {
    id: 'vapid_generate',
    name: 'Gerar chaves VAPID (push)',
    description: 'Diagnostica se o push está configurado. Se não, gera um par de chaves VAPID para você colar no .env (exige reiniciar o backend).',
    category: 'notificacoes',
    danger: 'low',
    async diagnose({ config }: RepairContext) {
      const has = !!(config.get('VAPID_PUBLIC_KEY') && config.get('VAPID_PRIVATE_KEY'));
      return {
        affectedCount: has ? 0 : 1,
        samples: [],
        message: has
          ? 'VAPID já configurado — push habilitado.'
          : 'VAPID NÃO configurado — push com tela apagada desabilitado. Use "Corrigir" para gerar chaves.',
      };
    },
    async apply({ config }: RepairContext) {
      const has = !!(config.get('VAPID_PUBLIC_KEY') && config.get('VAPID_PRIVATE_KEY'));
      if (has) return { changed: 0, message: 'VAPID já configurado — nada a fazer.' };
      const keys = webpush.generateVAPIDKeys();
      return {
        changed: 0,
        message:
          'Chaves geradas. Cole no .env e REINICIE o backend:\n' +
          `VAPID_PUBLIC_KEY=${keys.publicKey}\n` +
          `VAPID_PRIVATE_KEY=${keys.privateKey}`,
      };
    },
  },

  // ───────────── FILA ─────────────
  {
    id: 'archive_old_whatsapp_logs',
    name: 'Arquivar logs antigos de WhatsApp',
    description: `Remove registros de envio de WhatsApp com mais de ${WA_LOG_KEEP_DAYS} dias.`,
    category: 'fila',
    danger: 'low',
    async diagnose({ prisma }: RepairContext) {
      const where = { createdAt: { lt: daysAgo(WA_LOG_KEEP_DAYS) } };
      const affectedCount = await prisma.whatsAppLog.count({ where });
      return { affectedCount, samples: [], message: `${affectedCount} log(s) antigo(s).` };
    },
    async apply({ prisma }: RepairContext) {
      const res = await prisma.whatsAppLog.deleteMany({
        where: { createdAt: { lt: daysAgo(WA_LOG_KEEP_DAYS) } },
      });
      return { changed: res.count, message: `${res.count} log(s) removido(s).` };
    },
  },

  // ───────────── CONFIG ─────────────
  {
    id: 'recreate_missing_settings',
    name: 'Recriar configurações ausentes do admin',
    description: 'Cria uma linha de Settings padrão para admins que estejam sem configuração.',
    category: 'config',
    danger: 'low',
    async diagnose({ prisma }: RepairContext) {
      const admins = await prisma.user.findMany({ where: { role: UserRole.admin }, select: { id: true, email: true } });
      const missing: { id: string; email: string }[] = [];
      for (const a of admins) {
        const s = await prisma.settings.findUnique({ where: { adminId: a.id } });
        if (!s) missing.push(a);
      }
      return { affectedCount: missing.length, samples: missing, message: `${missing.length} admin(s) sem configuração.` };
    },
    async apply({ prisma }: RepairContext) {
      const admins = await prisma.user.findMany({ where: { role: UserRole.admin }, select: { id: true } });
      let changed = 0;
      for (const a of admins) {
        const s = await prisma.settings.findUnique({ where: { adminId: a.id } });
        if (!s) {
          await prisma.settings.create({ data: { adminId: a.id } });
          changed += 1;
        }
      }
      return { changed, message: `${changed} configuração(ões) criada(s).` };
    },
  },
];

export const REPAIR_SCRIPTS = new Map<string, RepairScript>(SCRIPTS.map((s) => [s.id, s]));
