import { Injectable } from '@nestjs/common';
import { PaymentType, Prisma, RequestStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const FALLBACK_EMAIL = 'historico-importado@gestorj2.local';

type RawRow = {
  id: string;
  date: Date | null;
  rawServer: string; // ja limpo (trim + espacos colapsados)
  login: string;
  credits: number;
  value: number;
  status: RequestStatus;
};

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers de limpeza ────────────────────────────────────────────────
  private clean(name: string): string {
    return (name || '').replace(/\s+/g, ' ').trim();
  }

  private statusOf(raw: string): RequestStatus {
    const s = (raw || '').trim().toLowerCase();
    const map: Record<string, RequestStatus> = {
      pending: RequestStatus.pending,
      pendente: RequestStatus.pending,
      analyzing: RequestStatus.analyzing,
      analise: RequestStatus.analyzing,
      recharged: RequestStatus.recharged,
      aprovado: RequestStatus.recharged,
      approved: RequestStatus.recharged,
      rejected: RequestStatus.rejected,
      rejeitado: RequestStatus.rejected,
      canceled: RequestStatus.canceled,
      cancelled: RequestStatus.canceled,
      cancelado: RequestStatus.canceled,
    };
    return map[s] ?? RequestStatus.pending;
  }

  private parseDate(raw: string): Date | null {
    // formato: "19/06/2026, 13:03:13"
    const m = (raw || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{2}):(\d{2}):(\d{2}))?/);
    if (!m) return null;
    const [, dd, mm, yyyy, hh = '0', mi = '0', ss = '0'] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return isNaN(d.getTime()) ? null : d;
  }

  private hash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // Parser de CSV que respeita aspas (o campo Data tem virgula dentro).
  private parseCsv(text: string): { rows: RawRow[]; errors: number } {
    const lines = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim().length);
    if (lines.length === 0) return { rows: [], errors: 0 };

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          out.push(cur); cur = '';
        } else cur += c;
      }
      out.push(cur);
      return out.map((v) => v.trim());
    };

    const header = parseLine(lines[0]).map((h) => h.toLowerCase());
    const idx = (names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
    const iId = idx(['id']);
    const iData = idx(['data', 'date']);
    const iServer = idx(['servidor', 'server']);
    const iLogin = idx(['login']);
    const iCred = idx(['créditos', 'creditos', 'credits']);
    const iVal = idx(['valor', 'value']);
    const iStatus = idx(['status']);

    const rows: RawRow[] = [];
    let errors = 0;
    for (let i = 1; i < lines.length; i++) {
      const c = parseLine(lines[i]);
      const rawServer = this.clean(iServer >= 0 ? c[iServer] : '');
      const value = Number(String(iVal >= 0 ? c[iVal] : '0').replace(',', '.')) || 0;
      const credits = parseInt(String(iCred >= 0 ? c[iCred] : '0'), 10) || 0;
      if (!rawServer) { errors++; continue; }
      const login = (iLogin >= 0 ? c[iLogin] : '').trim();
      const idRaw = (iId >= 0 ? c[iId] : '').trim();
      rows.push({
        id: idRaw || `imp_${this.hash(`${c[iData]}|${login}|${rawServer}|${value}|${credits}`)}`,
        date: this.parseDate(iData >= 0 ? c[iData] : ''),
        rawServer,
        login,
        credits,
        value,
        status: this.statusOf(iStatus >= 0 ? c[iStatus] : ''),
      });
    }
    return { rows, errors };
  }

  private canonicalFor(rawClean: string, mapping?: Record<string, string>): string {
    const mapped = mapping?.[rawClean];
    return this.clean(mapped || rawClean);
  }

  // ── PREVIEW (somente leitura) ─────────────────────────────────────────
  async preview(csv: string, mapping?: Record<string, string>, costs?: Record<string, number>) {
    const { rows, errors } = this.parseCsv(csv);

    // Servidores crus distintos (para a UI montar o de->para).
    const rawMap = new Map<string, { raw: string; orders: number; totalValue: number }>();
    for (const r of rows) {
      const e = rawMap.get(r.rawServer) || { raw: r.rawServer, orders: 0, totalValue: 0 };
      e.orders++; e.totalValue += r.value; rawMap.set(r.rawServer, e);
    }

    // Agrupamento canonico (aplicando o mapping).
    const groups = new Map<string, { canonical: string; variants: Set<string>; orders: number; totalCredits: number; totalValue: number }>();
    for (const r of rows) {
      const canonical = this.canonicalFor(r.rawServer, mapping);
      const g = groups.get(canonical) || { canonical, variants: new Set(), orders: 0, totalCredits: 0, totalValue: 0 };
      g.variants.add(r.rawServer); g.orders++; g.totalCredits += r.credits; g.totalValue += r.value;
      groups.set(canonical, g);
    }

    const canonicalGroups = [...groups.values()].map((g) => {
      const cost = Number(costs?.[g.canonical] ?? 0);
      const valuePerCredit = g.totalCredits > 0 ? g.totalValue / g.totalCredits : 0;
      const margin = g.totalValue - g.totalCredits * cost;
      return {
        canonical: g.canonical,
        variants: [...g.variants],
        orders: g.orders,
        totalCredits: g.totalCredits,
        totalValue: Number(g.totalValue.toFixed(2)),
        valuePerCredit: Number(valuePerCredit.toFixed(4)),
        cost,
        margin: Number(margin.toFixed(2)),
        marginPct: g.totalValue > 0 ? Number(((margin / g.totalValue) * 100).toFixed(1)) : 0,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    // Casamento de revendedor pelo login.
    const logins = [...new Set(rows.map((r) => r.login.toLowerCase()).filter(Boolean))];
    const links = logins.length
      ? await this.prisma.resellerServer.findMany({ where: {}, select: { login: true, resellerId: true } })
      : [];
    const loginToReseller = new Map(links.map((l) => [l.login.toLowerCase(), l.resellerId]));
    let matched = 0;
    const unmatchedLogins = new Set<string>();
    for (const r of rows) {
      if (r.login && loginToReseller.has(r.login.toLowerCase())) matched++;
      else if (r.login) unmatchedLogins.add(r.login);
    }

    const statusBreakdown: Record<string, number> = {};
    for (const r of rows) statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;

    return {
      totalRows: rows.length,
      parseErrors: errors,
      rawServers: [...rawMap.values()].sort((a, b) => b.totalValue - a.totalValue),
      canonicalGroups,
      reseller: {
        matched,
        unmatched: rows.length - matched,
        sampleUnmatched: [...unmatchedLogins].slice(0, 20),
      },
      statusBreakdown,
      totals: {
        servers: canonicalGroups.length,
        totalValue: Number(canonicalGroups.reduce((s, g) => s + g.totalValue, 0).toFixed(2)),
        totalMargin: Number(canonicalGroups.reduce((s, g) => s + g.margin, 0).toFixed(2)),
      },
    };
  }

  // ── COMMIT (grava — idempotente via id do CSV) ────────────────────────
  async commit(
    adminId: string,
    csv: string,
    mapping?: Record<string, string>,
    costs?: Record<string, number>,
    statusMode: 'keep' | 'recharged' = 'recharged',
  ) {
    const { rows } = this.parseCsv(csv);
    if (rows.length === 0) return { ordersCreated: 0, serversUpserted: 0, message: 'Nenhuma linha valida no CSV.' };

    // 1) Agrupa por canonico e calcula custo/valor por credito.
    const groups = new Map<string, { canonical: string; totalCredits: number; totalValue: number }>();
    for (const r of rows) {
      const canonical = this.canonicalFor(r.rawServer, mapping);
      const g = groups.get(canonical) || { canonical, totalCredits: 0, totalValue: 0 };
      g.totalCredits += r.credits; g.totalValue += r.value; groups.set(canonical, g);
    }

    // 2) Upsert dos servidores canonicos (cria ou atualiza custo). Retorna id por nome.
    const serverIdByCanonical = new Map<string, string>();
    let serversUpserted = 0;
    for (const g of groups.values()) {
      const cost = Number(costs?.[g.canonical] ?? 0);
      const valuePerCredit = g.totalCredits > 0 ? g.totalValue / g.totalCredits : 0;
      const existing = await this.prisma.server.findFirst({
        where: { name: { equals: g.canonical, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.server.update({
          where: { id: existing.id },
          data: { costPerCredit: cost, ...(valuePerCredit > 0 ? { valuePerCredit } : {}) },
        });
        serverIdByCanonical.set(g.canonical, existing.id);
      } else {
        const created = await this.prisma.server.create({
          data: {
            name: g.canonical,
            costPerCredit: cost,
            valuePerCredit: valuePerCredit > 0 ? valuePerCredit : cost,
            ownerId: adminId,
            active: true,
          },
          select: { id: true },
        });
        serverIdByCanonical.set(g.canonical, created.id);
      }
      serversUpserted++;
    }

    // 3) Revendedor de cada pedido pelo login; fallback "Historico (Importado)".
    const links = await this.prisma.resellerServer.findMany({ select: { login: true, resellerId: true } });
    const loginToReseller = new Map(links.map((l) => [l.login.toLowerCase(), l.resellerId]));

    const hasUnmatched = rows.some((r) => !r.login || !loginToReseller.has(r.login.toLowerCase()));
    let fallbackId: string | null = null;
    if (hasUnmatched) {
      const fb = await this.prisma.user.upsert({
        where: { email: FALLBACK_EMAIL },
        update: {},
        create: {
          email: FALLBACK_EMAIL,
          name: 'Historico (Importado)',
          role: UserRole.reseller,
          status: UserStatus.active,
          paymentType: PaymentType.prepaid,
          parentId: adminId,
        },
        select: { id: true },
      });
      fallbackId = fb.id;
    }

    // 4) Monta os pedidos e insere em lote (skipDuplicates => idempotente por id).
    const data: Prisma.CreditRequestCreateManyInput[] = rows.map((r) => {
      const canonical = this.canonicalFor(r.rawServer, mapping);
      const serverId = serverIdByCanonical.get(canonical)!;
      const resellerId = (r.login && loginToReseller.get(r.login.toLowerCase())) || fallbackId!;
      const valuePerCredit = r.credits > 0 ? r.value / r.credits : 0;
      return {
        id: r.id,
        resellerId,
        serverId,
        serverSnapshot: { name: canonical, valuePerCredit } as Prisma.InputJsonValue,
        requestedCredits: r.credits,
        login: r.login || '-',
        totalValue: r.value,
        status: statusMode === 'recharged' ? RequestStatus.recharged : r.status,
        paymentType: PaymentType.prepaid,
        ...(r.date ? { createdAt: r.date } : {}),
      };
    });

    const result = await this.prisma.creditRequest.createMany({ data, skipDuplicates: true });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        userName: 'Importacao CSV',
        action: 'import.orders',
        details: `Importadas ${result.count} movimentacoes; ${serversUpserted} servidores unificados/atualizados.`,
      },
    }).catch(() => {});

    return {
      ordersCreated: result.count,
      ordersInCsv: rows.length,
      serversUpserted,
      usedFallbackReseller: hasUnmatched,
      message: `${result.count} movimentacoes importadas em ${serversUpserted} servidores. ${rows.length - result.count} ja existiam (ignoradas).`,
    };
  }
}
