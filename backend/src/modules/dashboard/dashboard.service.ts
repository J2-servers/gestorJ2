import { Injectable } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async adminDashboard(adminId: string) {
    const resellerIds = await this.prisma.user
      .findMany({ where: { parentId: adminId }, select: { id: true } })
      .then((u) => u.map((x) => x.id));

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pendingCount, recentRequests, dayRequests, weekRequests, monthRequests] = await Promise.all([
      this.prisma.creditRequest.count({
        where: { resellerId: { in: resellerIds }, status: { in: [RequestStatus.pending, RequestStatus.analyzing] } },
      }),
      this.prisma.creditRequest.findMany({
        where: { resellerId: { in: resellerIds } },
        include: { reseller: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.creditRequest.findMany({
        where: { resellerId: { in: resellerIds }, status: RequestStatus.recharged, createdAt: { gte: startOfDay } },
        select: { totalValue: true },
      }),
      this.prisma.creditRequest.findMany({
        where: { resellerId: { in: resellerIds }, status: RequestStatus.recharged, createdAt: { gte: startOfWeek } },
        select: { totalValue: true },
      }),
      this.prisma.creditRequest.findMany({
        where: { resellerId: { in: resellerIds }, status: RequestStatus.recharged, createdAt: { gte: startOfMonth } },
        select: { totalValue: true },
      }),
    ]);

    return {
      pendingCount,
      recentRequests,
      todayRevenue: dayRequests.reduce((s, r) => s + Number(r.totalValue), 0),
      weekRevenue: weekRequests.reduce((s, r) => s + Number(r.totalValue), 0),
      monthRevenue: monthRequests.reduce((s, r) => s + Number(r.totalValue), 0),
    };
  }

  async resellerDashboard(resellerId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const reseller = await this.prisma.user.findUnique({ where: { id: resellerId }, select: { paymentType: true } });

    const [pendingCount, dayRequests, weekRequests, monthRequests, resellerServers, debtBalance] =
      await Promise.all([
        this.prisma.creditRequest.count({
          where: { resellerId, status: { in: [RequestStatus.pending, RequestStatus.analyzing] } },
        }),
        this.prisma.creditRequest.findMany({
          where: { resellerId, status: RequestStatus.recharged, createdAt: { gte: startOfDay } },
          select: { totalValue: true },
        }),
        this.prisma.creditRequest.findMany({
          where: { resellerId, status: RequestStatus.recharged, createdAt: { gte: startOfWeek } },
          select: { totalValue: true },
        }),
        this.prisma.creditRequest.findMany({
          where: { resellerId, status: RequestStatus.recharged, createdAt: { gte: startOfMonth } },
          select: { totalValue: true },
        }),
        this.prisma.resellerServer.findMany({
          where: { resellerId, active: true },
          include: { server: { select: { name: true, panelLink: true } } },
        }),
        reseller?.paymentType === 'postpaid'
          ? this.prisma.invoice
              .findMany({ where: { resellerId, status: { in: ['pending', 'overdue'] } }, select: { totalValue: true } })
              .then((inv) => inv.reduce((s, i) => s + Number(i.totalValue), 0))
          : Promise.resolve(0),
      ]);

    return {
      pendingCount,
      todayRevenue: dayRequests.reduce((s, r) => s + Number(r.totalValue), 0),
      weekRevenue: weekRequests.reduce((s, r) => s + Number(r.totalValue), 0),
      monthRevenue: monthRequests.reduce((s, r) => s + Number(r.totalValue), 0),
      availableServers: resellerServers.length,
      debtBalance,
    };
  }
}
