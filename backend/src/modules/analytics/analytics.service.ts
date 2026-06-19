import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RequestUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminAnalytics(user: RequestUser) {
    const resellerIds = await this.prisma.user
      .findMany({ where: this.resellerScope(user), select: { id: true } })
      .then((u) => u.map((x) => x.id));

    const [requests, servers, resellers] = await Promise.all([
      this.prisma.creditRequest.findMany({
        where: { resellerId: { in: resellerIds }, status: 'recharged' },
        select: {
          id: true,
          serverId: true,
          serverSnapshot: true,
          supplierSnapshot: true,
          requestedCredits: true,
          totalValue: true,
          createdAt: true,
          resellerId: true,
        },
      }),
      this.prisma.server.findMany({ select: { id: true, name: true, costPerCredit: true } }),
      this.prisma.user.findMany({
        where: this.resellerScope(user),
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

    const serverMap = new Map(servers.map((s) => [s.id, s]));

    const profitByServer = new Map<string, { name: string; revenue: number; cost: number; profit: number; credits: number }>();

    for (const req of requests) {
      const snap = req.serverSnapshot as Record<string, unknown>;
      const sid = (snap?.id as string) || req.serverId || 'unknown';
      const sname = (snap?.name as string) || 'Desconhecido';
      const revenue = Number(req.totalValue);
      const serverData = serverMap.get(sid);
      const supplierSnap = req.supplierSnapshot as Record<string, unknown> | null;
      const costPerCredit = Number(
        supplierSnap?.costPerCredit ??
          supplierSnap?.cost_per_credit ??
          (serverData ? serverData.costPerCredit : 0),
      );
      const cost = costPerCredit * req.requestedCredits;

      if (!profitByServer.has(sid)) {
        profitByServer.set(sid, { name: sname, revenue: 0, cost: 0, profit: 0, credits: 0 });
      }
      const entry = profitByServer.get(sid)!;
      entry.revenue += revenue;
      entry.cost += cost;
      entry.profit += revenue - cost;
      entry.credits += req.requestedCredits;
    }

    const revenueByMonth = this.groupByMonth(requests, 12);

    const topResellers = resellerIds
      .map((id) => {
        const reqs = requests.filter((r) => r.resellerId === id);
        const total = reqs.reduce((s, r) => s + Number(r.totalValue), 0);
        const reseller = resellers.find((u) => u.id === id);
        return { id, name: reseller?.name ?? id, total, count: reqs.length };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const dailyTrend = this.groupByDay(requests, 14);

    const allRequests = await this.prisma.creditRequest.findMany({
      where: { resellerId: { in: resellerIds } },
      select: { status: true },
    });
    const statusCounts = { pending: 0, analyzing: 0, recharged: 0, rejected: 0, canceled: 0 };
    for (const r of allRequests) {
      const s = r.status as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    }

    const totalRevenue = requests.reduce((s, r) => s + Number(r.totalValue), 0);
    const totalCost = [...profitByServer.values()].reduce((s, v) => s + v.cost, 0);
    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const approvalRate =
      allRequests.length > 0 ? (statusCounts.recharged / allRequests.length) * 100 : 0;
    const avgTicket = requests.length > 0 ? totalRevenue / requests.length : 0;

    const growthByMonth = this.groupResellersByMonth(resellers, 6);

    return {
      profitByServer: [...profitByServer.values()].sort((a, b) => b.profit - a.profit),
      revenueByMonth,
      topResellers,
      dailyTrend,
      statusCounts,
      businessHealth: { margin, approvalRate, avgTicket, totalRevenue, totalCost },
      resellerGrowth: growthByMonth,
    };
  }

  private groupByMonth(
    requests: { createdAt: Date; totalValue: unknown; requestedCredits: number }[],
    months: number,
  ) {
    const result: Record<string, { month: string; revenue: number; credits: number }> = {};
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result[key] = { month: key, revenue: 0, credits: 0 };
    }
    for (const r of requests) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (result[key]) {
        result[key].revenue += Number(r.totalValue);
        result[key].credits += r.requestedCredits;
      }
    }
    return Object.values(result);
  }

  private groupByDay(
    requests: { createdAt: Date; totalValue: unknown; requestedCredits: number }[],
    days: number,
  ) {
    const result: Record<string, { date: string; revenue: number; credits: number; count: number }> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result[key] = { date: key, revenue: 0, credits: 0, count: 0 };
    }
    for (const r of requests) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      if (result[key]) {
        result[key].revenue += Number(r.totalValue);
        result[key].credits += r.requestedCredits;
        result[key].count++;
      }
    }
    return Object.values(result);
  }

  private groupResellersByMonth(
    resellers: { createdAt: Date }[],
    months: number,
  ) {
    const result: Record<string, { month: string; count: number }> = {};
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result[key] = { month: key, count: 0 };
    }
    for (const r of resellers) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (result[key]) result[key].count++;
    }
    return Object.values(result);
  }

  private resellerScope(user: RequestUser) {
    if (user.role === 'dev') return { role: UserRole.reseller };
    return {
      OR: [
        { role: UserRole.reseller, parentId: user.sub },
        { role: UserRole.reseller, parentId: null },
      ],
    };
  }
}
