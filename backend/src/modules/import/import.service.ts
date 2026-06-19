import { Injectable } from '@nestjs/common';
import { PaymentType, Prisma, RequestStatus, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const FALLBACK_EMAIL = 'historico-importado@gestorj2.local';
const DEFAULT_IMPORTED_RESELLER_PASSWORD = '102030Ab';

type RawRow = {
  id: string;
  date: Date | null;
  rawServer: string; // ja limpo (trim + espacos colapsados)
  resellerName?: string;
  login: string;
  credits: number;
  value: number;
  status: RequestStatus;
  paymentType: PaymentType;
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

  private paymentTypeOf(raw: string): PaymentType {
    const s = this.headerKey(raw || '');
    if (s.includes('pos') || s.includes('post')) return PaymentType.postpaid;
    return PaymentType.prepaid;
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

  private importedEmailForName(name: string): string {
    return `import-${this.hash(this.headerKey(name))}@gestorj2.local`;
  }

  private headerKey(value: string): string {
    return this.clean(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private serverKey(value: string): string {
    return this.headerKey(value).replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private canonicalServerName(rawClean: string): string {
    const clean = this.clean(rawClean);
    const key = this.serverKey(clean);
    const compact = key.replace(/\s+/g, '');

    const rules: Array<[RegExp, string]> = [
      [/blade/, 'BLADE'],
      [/(uniplay|uni\s*play)/, 'UNIPLAY'],
      [/(unitv|uni\s*tv)/, 'UNITV'],
      [/(xprime|x\s*prime)/, 'XPRIME'],
      [/warez/, 'WAREZ'],
      [/(playon|play\s*on)/, 'PLAYON'],
      [/genial/, 'GENIAL'],
      [/(five|p2braz)/, 'FIVE'],
      [/fast/, 'FAST'],
      [/now/, 'NOW'],
      [/nobre/, 'NOBRE TV'],
      [/club/, 'CLUB'],
      [/new\s*tvs/, 'NEW TVS'],
      [/tvs\s*original/, 'TVS ORIGINAL'],
    ];

    for (const [pattern, canonical] of rules) {
      if (pattern.test(key) || pattern.test(compact)) return canonical;
    }

    return clean.toUpperCase();
  }

  private countOutsideQuotes(line: string, needle: string): number {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') i++;
        else inQuotes = !inQuotes;
      } else if (c === needle && !inQuotes) {
        count++;
      }
    }
    return count;
  }

  // Parser de CSV que respeita aspas (o campo Data tem virgula dentro).
  private parseCsv(text: string): { rows: RawRow[]; errors: number } {
    const lines = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim().length);
    if (lines.length === 0) return { rows: [], errors: 0 };

    const firstLine = lines[0] || '';
    const delimiter = this.countOutsideQuotes(firstLine, ';') > this.countOutsideQuotes(firstLine, ',') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (c === delimiter && !inQuotes) {
          out.push(cur); cur = '';
        } else cur += c;
      }
      out.push(cur);
      return out.map((v) => v.trim());
    };

    const header = parseLine(lines[0]).map((h) => this.headerKey(h));
    const idx = (names: string[], contains: string[] = []) => {
      const normalizedNames = names.map((name) => this.headerKey(name));
      return header.findIndex((h) => normalizedNames.includes(h) || contains.some((fragment) => h.includes(fragment)));
    };
    const iId = idx(['id']);
    const iData = idx(['data', 'date']);
    const iServer = idx(['servidor', 'server']);
    const iReseller = idx(['revendedor', 'reseller', 'cliente', 'user']);
    const iLogin = idx(['login']);
    const iCred = idx(['créditos', 'creditos', 'credits'], ['dito']);
    const iVal = idx(['valor', 'value']);
    const iStatus = idx(['status']);
    const iPayment = idx(['tipo pgto', 'tipo pagamento', 'pagamento', 'payment type', 'payment']);

    const rows: RawRow[] = [];
    let errors = 0;
    for (let i = 1; i < lines.length; i++) {
      const c = parseLine(lines[i]);
      const rawServer = this.clean(iServer >= 0 ? c[iServer] : '');
      const value = Number(String(iVal >= 0 ? c[iVal] : '0').replace(',', '.')) || 0;
      const credits = parseInt(String(iCred >= 0 ? c[iCred] : '0'), 10) || 0;
      if (!rawServer) { errors++; continue; }
      if (credits <= 0 && value <= 0) { errors++; continue; }
      const login = (iLogin >= 0 ? c[iLogin] : '').trim();
      const resellerName = this.clean(iReseller >= 0 ? c[iReseller] : '');
      const idRaw = (iId >= 0 ? c[iId] : '').trim();
      rows.push({
        id: idRaw || `imp_${this.hash(`${i}|${c[iData]}|${resellerName}|${login}|${rawServer}|${value}|${credits}|${c[iStatus]}|${c[iPayment]}`)}`,
        date: this.parseDate(iData >= 0 ? c[iData] : ''),
        rawServer,
        resellerName,
        login,
        credits,
        value,
        status: this.statusOf(iStatus >= 0 ? c[iStatus] : ''),
        paymentType: this.paymentTypeOf(iPayment >= 0 ? c[iPayment] : ''),
      });
    }
    return { rows, errors };
  }

  private canonicalFor(rawClean: string, mapping?: Record<string, string>): string {
    const mapped = mapping?.[rawClean];
    return this.canonicalServerName(mapped || rawClean);
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

    // Casamento de revendedor pelo login ou pelo nome vindo do CSV.
    const logins = [...new Set(rows.map((r) => r.login.toLowerCase()).filter(Boolean))];
    const links = logins.length
      ? await this.prisma.resellerServer.findMany({ where: {}, select: { login: true, resellerId: true } })
      : [];
    const loginToReseller = new Map(links.map((l) => [l.login.toLowerCase(), l.resellerId]));
    const resellerNames = [...new Set(rows.map((r) => this.clean(r.resellerName || '')).filter(Boolean))];
    const existingResellers = resellerNames.length
      ? await this.prisma.user.findMany({
          where: { role: UserRole.reseller },
          select: { name: true },
        })
      : [];
    const existingResellerNames = new Set(existingResellers.map((u) => this.headerKey(u.name)));
    let matched = 0;
    const unmatchedLogins = new Set<string>();
    const resellerNamesToCreate = new Set<string>();
    for (const r of rows) {
      if (r.resellerName && existingResellerNames.has(this.headerKey(r.resellerName))) matched++;
      else if (r.resellerName) {
        matched++;
        resellerNamesToCreate.add(r.resellerName);
      } else if (r.login && loginToReseller.has(r.login.toLowerCase())) matched++;
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
        willCreate: resellerNamesToCreate.size,
        sampleWillCreate: [...resellerNamesToCreate].slice(0, 20),
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
    statusMode: 'keep' | 'recharged' = 'keep',
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

    // 2) Upsert dos servidores canonicos. Custo/fornecedor ficam internos e podem ser preenchidos depois.
    const serverIdByCanonical = new Map<string, string>();
    let serversUpserted = 0;
    for (const g of groups.values()) {
      const hasProvidedCost = Object.prototype.hasOwnProperty.call(costs ?? {}, g.canonical);
      const cost = Number(costs?.[g.canonical] ?? 0);
      const valuePerCredit = g.totalCredits > 0 ? g.totalValue / g.totalCredits : 0;
      const existing = await this.prisma.server.findFirst({
        where: { name: { equals: g.canonical, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.server.update({
          where: { id: existing.id },
          data: {
            ...(hasProvidedCost ? { costPerCredit: cost } : {}),
            ...(valuePerCredit > 0 ? { valuePerCredit } : {}),
            active: true,
          },
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

    // 3) Revendedor de cada pedido pelo login ou pelo nome; fallback "Historico (Importado)".
    const links = await this.prisma.resellerServer.findMany({ select: { login: true, resellerId: true } });
    const loginToReseller = new Map(links.map((l) => [l.login.toLowerCase(), l.resellerId]));

    const existingResellers = await this.prisma.user.findMany({
      where: { role: UserRole.reseller },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
    const nameToReseller = new Map(existingResellers.map((u) => [this.headerKey(u.name), u.id]));
    const resellerNamesInCsv = new Set(rows.map((r) => this.headerKey(r.resellerName || '')).filter(Boolean));
    const namesToCreate = [...new Set(rows.map((r) => this.clean(r.resellerName || '')).filter(Boolean))]
      .filter((name) => !nameToReseller.has(this.headerKey(name)));
    let resellersCreated = 0;
    let resellerPasswordsApplied = 0;
    const defaultPasswordHash = await bcrypt.hash(DEFAULT_IMPORTED_RESELLER_PASSWORD, 12);

    for (const reseller of existingResellers) {
      if (!reseller.passwordHash && resellerNamesInCsv.has(this.headerKey(reseller.name))) {
        await this.prisma.user.update({
          where: { id: reseller.id },
          data: { passwordHash: defaultPasswordHash },
        });
        resellerPasswordsApplied++;
      }
    }

    for (const name of namesToCreate) {
      const firstRow = rows.find((r) => this.headerKey(r.resellerName || '') === this.headerKey(name));
      const email = this.importedEmailForName(name);
      const alreadyByEmail = await this.prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
      const reseller = await this.prisma.user.upsert({
        where: { email },
        update: {
          name,
          ...(alreadyByEmail && !alreadyByEmail.passwordHash ? { passwordHash: defaultPasswordHash } : {}),
        },
        create: {
          email,
          name,
          passwordHash: defaultPasswordHash,
          role: UserRole.reseller,
          status: UserStatus.active,
          paymentType: firstRow?.paymentType ?? PaymentType.prepaid,
          parentId: adminId,
        },
        select: { id: true },
      });
      if (!alreadyByEmail) {
        resellersCreated++;
        resellerPasswordsApplied++;
      } else if (!alreadyByEmail.passwordHash) {
        resellerPasswordsApplied++;
      }
      nameToReseller.set(this.headerKey(name), reseller.id);
    }

    const hasUnmatched = rows.some(
      (r) =>
        !(r.resellerName && nameToReseller.has(this.headerKey(r.resellerName))) &&
        !(r.login && loginToReseller.has(r.login.toLowerCase())),
    );
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

    const resolveResellerId = (r: RawRow) =>
      (r.resellerName && nameToReseller.get(this.headerKey(r.resellerName))) ||
      (r.login && loginToReseller.get(r.login.toLowerCase())) ||
      fallbackId!;

    const resellerServerLinks = new Map<string, {
      resellerId: string;
      serverId: string;
      login: string;
      valuePerCredit: number;
      lastSeen: number;
    }>();

    // 4) Monta os pedidos e os vinculos revendedor+servidor+login.
    const data: Prisma.CreditRequestCreateManyInput[] = rows.map((r) => {
      const canonical = this.canonicalFor(r.rawServer, mapping);
      const serverId = serverIdByCanonical.get(canonical)!;
      const resellerId = resolveResellerId(r);
      const valuePerCredit = r.credits > 0 ? r.value / r.credits : 0;
      const login = this.clean(r.login || '-');
      const linkKey = JSON.stringify([resellerId, serverId, login]);
      const lastSeen = r.date?.getTime() ?? 0;
      const currentLink = resellerServerLinks.get(linkKey);
      if (!currentLink || lastSeen >= currentLink.lastSeen) {
        resellerServerLinks.set(linkKey, { resellerId, serverId, login, valuePerCredit, lastSeen });
      }
      return {
        id: r.id,
        resellerId,
        serverId,
        serverSnapshot: { name: canonical, valuePerCredit } as Prisma.InputJsonValue,
        requestedCredits: r.credits,
        login,
        totalValue: r.value,
        status: statusMode === 'recharged' ? RequestStatus.recharged : r.status,
        paymentType: r.paymentType,
        ...(r.date ? { createdAt: r.date } : {}),
      };
    });

    const result = await this.prisma.creditRequest.createMany({ data, skipDuplicates: true });
    let resellerServerLinksCreated = 0;
    let resellerServerLinksUpdated = 0;

    for (const link of resellerServerLinks.values()) {
      const existing = await this.prisma.resellerServer.findUnique({
        where: {
          resellerId_serverId_login: {
            resellerId: link.resellerId,
            serverId: link.serverId,
            login: link.login,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.resellerServer.update({
          where: { id: existing.id },
          data: {
            valuePerCredit: link.valuePerCredit,
            active: true,
          },
        });
        resellerServerLinksUpdated++;
      } else {
        await this.prisma.resellerServer.create({
          data: {
            resellerId: link.resellerId,
            serverId: link.serverId,
            login: link.login,
            valuePerCredit: link.valuePerCredit,
            active: true,
          },
        });
        resellerServerLinksCreated++;
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        userName: 'Importacao CSV',
        action: 'import.orders',
        details: `Importadas ${result.count} movimentacoes; ${serversUpserted} servidores unificados/atualizados; ${resellerServerLinks.size} vinculos revendedor-servidor processados.`,
      },
    }).catch(() => {});

    return {
      ordersCreated: result.count,
      ordersInCsv: rows.length,
      serversUpserted,
      resellersCreated,
      resellerPasswordsApplied,
      defaultPassword: DEFAULT_IMPORTED_RESELLER_PASSWORD,
      resellerServerLinksCreated,
      resellerServerLinksUpdated,
      resellerServerLinksTotal: resellerServerLinks.size,
      usedFallbackReseller: hasUnmatched,
      message: `${result.count} movimentacoes importadas em ${serversUpserted} servidores; ${resellersCreated} revendedores criados; ${resellerServerLinks.size} vinculos de acesso preparados. ${rows.length - result.count} ja existiam (ignoradas).`,
    };
  }
}
