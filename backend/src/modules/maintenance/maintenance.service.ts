import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, RequestStatus, UserRole } from '@prisma/client';
import { Queue } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from '../invoices/invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { WHATSAPP_QUEUE } from '../whatsapp/whatsapp.constants';
import { REPAIR_SCRIPTS } from './repair-scripts/registry';
import { RepairContext, RepairScriptMeta } from './repair-scripts/repair-script.types';

const execAsync = promisify(exec);
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly invoices: InvoicesService,
    @InjectQueue(WHATSAPP_QUEUE) private readonly queue: Queue,
  ) {}

  private get ctx(): RepairContext {
    return { prisma: this.prisma, config: this.config, invoices: this.invoices };
  }

  // ───────── Scripts ─────────
  listScripts(): RepairScriptMeta[] {
    return [...REPAIR_SCRIPTS.values()].map(({ id, name, description, category, danger }) => ({
      id,
      name,
      description,
      category,
      danger,
    }));
  }

  async diagnose(id: string) {
    const script = REPAIR_SCRIPTS.get(id);
    if (!script) throw new NotFoundException(`Script "${id}" não encontrado.`);
    return { id, ...(await script.diagnose(this.ctx)) };
  }

  async apply(id: string, actor: RequestUser) {
    const script = REPAIR_SCRIPTS.get(id);
    if (!script) throw new NotFoundException(`Script "${id}" não encontrado.`);
    const result = await script.apply(this.ctx);
    await this.prisma.auditLog.create({
      data: {
        userId: actor.sub,
        userName: actor.email,
        action: `maintenance.${id}`,
        details: `${result.message} (changed=${result.changed})`.slice(0, 1000),
      },
    });
    this.logger.log(`[manutenção] ${actor.email} executou ${id}: ${result.message}`);
    return { id, ...result };
  }

  // ───────── Erros ─────────
  listErrors(limit = 100) {
    return this.prisma.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }

  resolveError(id: string) {
    return this.prisma.errorLog.update({ where: { id }, data: { resolved: true } });
  }

  async clearErrors(actor: RequestUser) {
    const res = await this.prisma.errorLog.deleteMany({});
    await this.prisma.auditLog.create({
      data: {
        userId: actor.sub,
        userName: actor.email,
        action: 'maintenance.clear_errors',
        details: `${res.count} erro(s) removido(s).`,
      },
    });
    return { changed: res.count };
  }

  // ───────── Fila WhatsApp ─────────
  async whatsappQueue() {
    const counts = await this.queue.getJobCounts().catch(() => null);
    const failedJobs = await this.queue.getFailed(0, 20).catch(() => []);
    return {
      counts,
      failed: failedJobs.map((j) => ({
        id: j.id,
        name: j.name,
        attemptsMade: j.attemptsMade,
        failedReason: j.failedReason,
        phone: (j.data as any)?.phone,
        preview: ((j.data as any)?.message ?? '').slice(0, 80),
      })),
    };
  }

  async retryWhatsapp(actor: RequestUser) {
    const failed = await this.queue.getFailed();
    let retried = 0;
    for (const job of failed) {
      try {
        await job.retry();
        retried += 1;
      } catch {
        /* job pode ter sido removido entre a leitura e o retry */
      }
    }
    await this.prisma.auditLog.create({
      data: {
        userId: actor.sub,
        userName: actor.email,
        action: 'maintenance.retry_whatsapp',
        details: `${retried} job(s) reenfileirado(s).`,
      },
    });
    return { retried };
  }

  // ───────── Migrations ─────────
  async migrationsStatus() {
    try {
      const { stdout } = await execAsync('npx prisma migrate status', {
        cwd: process.cwd(),
        env: process.env,
      });
      return { pending: /not yet been applied/i.test(stdout), output: stdout };
    } catch (e: any) {
      // `migrate status` retorna exit 1 quando há pendências (ou DB indisponível)
      const output = `${e.stdout ?? ''}${e.stderr ?? ''}` || e.message;
      return { pending: /not yet been applied/i.test(output), output };
    }
  }

  async migrationsDeploy(actor: RequestUser) {
    try {
      const { stdout } = await execAsync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: process.env,
      });
      await this.prisma.auditLog.create({
        data: {
          userId: actor.sub,
          userName: actor.email,
          action: 'maintenance.migrate_deploy',
          details: stdout.slice(0, 1000),
        },
      });
      return { success: true, output: stdout };
    } catch (e: any) {
      return { success: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` || e.message };
    }
  }

  // ───────── Visão geral ─────────
  // Dimensao real do sistema: contagens agregadas de todas as entidades.
  async systemOverview() {
    const toMap = (arr: Array<Record<string, unknown>>, key: string) =>
      Object.fromEntries(arr.map((x) => [String(x[key]), Number((x as { _count: number })._count)]));

    const [
      totalUsers, usersByRole, usersByStatus,
      servers, suppliers, resellerServers,
      reqByStatus, invByStatus, waByStatus,
      unresolvedErrors, totalErrors, revenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.user.groupBy({ by: ['status'], _count: true }),
      this.prisma.server.count(),
      this.prisma.supplier.count({ where: { active: true } }),
      this.prisma.resellerServer.count({ where: { active: true } }),
      this.prisma.creditRequest.groupBy({ by: ['status'], _count: true }),
      this.prisma.invoice.groupBy({ by: ['status'], _count: true, _sum: { totalValue: true } }),
      this.prisma.whatsAppLog.groupBy({ by: ['status'], _count: true }),
      this.prisma.errorLog.count({ where: { resolved: false } }),
      this.prisma.errorLog.count(),
      this.prisma.creditRequest.aggregate({ _sum: { totalValue: true }, where: { status: RequestStatus.recharged } }),
    ]);

    return {
      users: { total: totalUsers, byRole: toMap(usersByRole, 'role'), byStatus: toMap(usersByStatus, 'status') },
      catalog: { servers, suppliers, resellerServers },
      requests: { byStatus: toMap(reqByStatus, 'status'), revenueRecharged: Number(revenue._sum.totalValue ?? 0) },
      invoices: invByStatus.map((x) => ({ status: x.status, count: Number(x._count), total: Number(x._sum.totalValue ?? 0) })),
      whatsapp: toMap(waByStatus, 'status'),
      errors: { unresolved: unresolvedErrors, total: totalErrors },
      generatedAt: new Date().toISOString(),
    };
  }

  async overview() {
    const dbOk = await this.prisma
      .$queryRaw`SELECT 1`.then(() => true)
      .catch(() => false);

    let redisOk = false;
    try {
      const client = await this.queue.client;
      await (client as unknown as { ping: () => Promise<unknown> }).ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }

    const queueCounts = await this.queue.getJobCounts().catch(() => null);
    const vapidConfigured = !!(
      this.config.get('VAPID_PUBLIC_KEY') && this.config.get('VAPID_PRIVATE_KEY')
    );
    const evolutionConfigured = !!this.config.get('EVOLUTION_API_URL');

    const [
      stuckRequests,
      overdueInvoices,
      orphanResellers,
      danglingInvoices,
      expiredTokens,
      stalePush,
    ] = await Promise.all([
      this.prisma.creditRequest.count({
        where: { status: RequestStatus.analyzing, updatedAt: { lt: daysAgo(7) } },
      }),
      this.prisma.invoice.count({
        where: { status: InvoiceStatus.pending, dueDate: { lt: new Date() } },
      }),
      this.prisma.user.count({ where: { role: UserRole.reseller, parentId: null } }),
      this.prisma.creditRequest.count({ where: { invoiceId: { not: null }, invoice: { is: null } } }),
      this.prisma.refreshToken.count({ where: { expiresAt: { lt: new Date() } } }),
      this.prisma.pushSubscription.count({ where: { updatedAt: { lt: daysAgo(90) } } }),
    ]);

    const unresolvedErrors = await this.prisma.errorLog.count({ where: { resolved: false } });

    return {
      health: {
        database: dbOk,
        redis: redisOk,
        queue: queueCounts,
        vapidConfigured,
        evolutionConfigured,
      },
      issues: {
        stuckRequests,
        overdueInvoices,
        orphanResellers,
        danglingInvoices,
        expiredTokens,
        stalePushSubscriptions: stalePush,
        unresolvedErrors,
      },
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
