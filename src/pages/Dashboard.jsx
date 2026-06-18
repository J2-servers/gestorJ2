import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  MessageCircle,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import PhoneRequiredBanner from "../components/layout/PhoneRequiredBanner";
import PixKeysDisplay from "../components/dashboard/PixKeysDisplay";
import { getCurrentBrasiliaDateTime } from "../components/utils/dateHelper";

const PERIODS = [
  { id: "12h", label: "12h" },
  { id: "24h", label: "24h" },
  { id: "48h", label: "48h" },
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
];

const STATUS = {
  pending: { label: "Pendente", color: "#f5b942" },
  analyzing: { label: "Em analise", color: "#ff7540" },
  recharged: { label: "Aprovado", color: "#ff8a4a" },
  approved: { label: "Aprovado", color: "#ff8a4a" },
  rejected: { label: "Rejeitado", color: "#ff5b5b" },
  cancelled: { label: "Cancelado", color: "#67615c" },
};

const emptyStats = {
  credits12h: 0,
  value12h: 0,
  previous12hCredits: 0,
  previous12hValue: 0,
  credits24h: 0,
  value24h: 0,
  previous24hCredits: 0,
  previous24hValue: 0,
  credits48h: 0,
  value48h: 0,
  previous48hCredits: 0,
  previous48hValue: 0,
  todayCredits: 0,
  todayValue: 0,
  yesterdayCredits: 0,
  yesterdayValue: 0,
  weekCredits: 0,
  weekValue: 0,
  lastWeekCredits: 0,
  lastWeekValue: 0,
  monthCredits: 0,
  monthValue: 0,
  lastMonthCredits: 0,
  lastMonthValue: 0,
  pendingRequests: 0,
  analyzingRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  totalRequests: 0,
  unpaidPostpaidValue: 0,
  unpaidPostpaidCount: 0,
};

const fmt = (value = 0) => Number(value || 0).toLocaleString("pt-BR");

const fmtShort = (value = 0) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("pt-BR");
};

const fmtCurrency = (value = 0) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function createChartSkeleton() {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const key = format(subMonths(now, i), "MMM/yy", { locale: ptBR });
    months.push({ name: key, creditos: 0, valor: 0 });
  }
  return months;
}

function sum(list, key) {
  return list.reduce((acc, item) => acc + Number(item?.[key] || 0), 0);
}

function range(list, from, to) {
  return list.filter((item) => {
    const d = new Date(item.created_date || item.createdAt || 0);
    if (Number.isNaN(d.getTime())) return false;
    return d >= from && (!to || d < to);
  });
}

function percent(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (!p && !c) return "0%";
  if (!p) return "+100%";
  const result = ((c - p) / p) * 100;
  return `${result >= 0 ? "+" : ""}${result.toFixed(1)}%`;
}

function normalizeRequestList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function calculateDashboard(requests) {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const now = new Date();
  const atHours = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const lastWeekStart = new Date(now.getTime() - 14 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const approved = safeRequests.filter((r) => r.status === "recharged" || r.status === "approved");

  const r12 = range(approved, atHours(12));
  const p12 = range(approved, atHours(24), atHours(12));
  const r24 = range(approved, atHours(24));
  const p24 = range(approved, atHours(48), atHours(24));
  const r48 = range(approved, atHours(48));
  const p48 = range(approved, atHours(96), atHours(48));
  const today = range(approved, todayStart);
  const yesterday = range(approved, yesterdayStart, todayStart);
  const week = range(approved, weekStart);
  const lastWeek = range(approved, lastWeekStart, weekStart);
  const month = range(approved, monthStart);
  const lastMonth = range(approved, lastMonthStart, monthStart);
  const unbilled = approved.filter((r) => r.payment_type === "postpaid" && !r.invoice_id);

  const monthlyMap = {};
  createChartSkeleton().forEach((item) => {
    monthlyMap[item.name] = item;
  });

  approved.forEach((request) => {
    const createdAt = new Date(request.created_date || request.createdAt || 0);
    if (Number.isNaN(createdAt.getTime())) return;
    const key = format(createdAt, "MMM/yy", { locale: ptBR });
    if (monthlyMap[key]) {
      monthlyMap[key].creditos += Number(request.requested_credits || 0);
      monthlyMap[key].valor += Number(request.total_value || 0);
    }
  });

  return {
    stats: {
      credits12h: sum(r12, "requested_credits"),
      value12h: sum(r12, "total_value"),
      previous12hCredits: sum(p12, "requested_credits"),
      previous12hValue: sum(p12, "total_value"),
      credits24h: sum(r24, "requested_credits"),
      value24h: sum(r24, "total_value"),
      previous24hCredits: sum(p24, "requested_credits"),
      previous24hValue: sum(p24, "total_value"),
      credits48h: sum(r48, "requested_credits"),
      value48h: sum(r48, "total_value"),
      previous48hCredits: sum(p48, "requested_credits"),
      previous48hValue: sum(p48, "total_value"),
      todayCredits: sum(today, "requested_credits"),
      todayValue: sum(today, "total_value"),
      yesterdayCredits: sum(yesterday, "requested_credits"),
      yesterdayValue: sum(yesterday, "total_value"),
      weekCredits: sum(week, "requested_credits"),
      weekValue: sum(week, "total_value"),
      lastWeekCredits: sum(lastWeek, "requested_credits"),
      lastWeekValue: sum(lastWeek, "total_value"),
      monthCredits: sum(month, "requested_credits"),
      monthValue: sum(month, "total_value"),
      lastMonthCredits: sum(lastMonth, "requested_credits"),
      lastMonthValue: sum(lastMonth, "total_value"),
      pendingRequests: safeRequests.filter((r) => r.status === "pending").length,
      analyzingRequests: safeRequests.filter((r) => r.status === "analyzing").length,
      approvedRequests: approved.length,
      rejectedRequests: safeRequests.filter((r) => r.status === "rejected").length,
      totalRequests: safeRequests.length,
      unpaidPostpaidValue: sum(unbilled, "total_value"),
      unpaidPostpaidCount: unbilled.length,
    },
    chartData: Object.values(monthlyMap),
  };
}

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <span key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.dataKey === "valor" ? fmtCurrency(entry.value) : fmt(entry.value)}
        </span>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, change, tone = "default" }) {
  return (
    <div className={`dash-metric ${tone === "strong" ? "strong" : ""}`}>
      <div className="dash-icon-well">
        <Icon size={18} />
      </div>
      <div className="dash-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{change}</small>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to }) {
  return (
    <Link className="dash-action" to={to}>
      <span>
        <Icon size={16} />
      </span>
      <b>{label}</b>
      <ChevronRight size={15} />
    </Link>
  );
}

function StatusPill({ status }) {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <span className="dash-status" style={{ "--status-color": cfg.color }}>
      {cfg.label}
    </span>
  );
}

function RecentRequestCard({ request }) {
  return (
    <Link className="dash-row" to={createPageUrl("CreditRequests")}>
      <div>
        <strong>{request.server_snapshot?.name || request.server_name || "Servidor"}</strong>
        <span>
          {request.login || "Sem login"} - {fmt(request.requested_credits)} creditos
        </span>
      </div>
      <div className="dash-row-right">
        <StatusPill status={request.status} />
        <b>{fmtCurrency(request.total_value)}</b>
      </div>
    </Link>
  );
}

function ServerLine({ server }) {
  return (
    <div className="dash-row static">
      <span className="dash-row-icon">
        <Server size={15} />
      </span>
      <div>
        <strong>{server.name || "Servidor"}</strong>
        <span>{server.username ? `Login: ${server.username}` : "Servidor global"}</span>
      </div>
      <b>{server.value_per_credit ? fmtCurrency(server.value_per_credit) : "Painel"}</b>
    </div>
  );
}

function ResellerLine({ reseller, stats, onClick }) {
  const label = reseller.full_name || reseller.name || reseller.email || "Revendedor";
  return (
    <button className="dash-row static button" onClick={onClick}>
      <span className="dash-avatar">{label.slice(0, 1).toUpperCase()}</span>
      <div>
        <strong>{label}</strong>
        <span>{stats?.count || 0} pedidos</span>
      </div>
      <b>{fmtCurrency(stats?.total || 0)}</b>
    </button>
  );
}

function MonthProgress({ item, max }) {
  const width = Math.min(100, Math.round((Number(item.creditos || 0) / Math.max(max, 1)) * 100));
  return (
    <div className="dash-month">
      <div>
        <span>{item.name}</span>
        <strong>{fmtShort(item.creditos)} cr</strong>
      </div>
      <div className="dash-progress">
        <i style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ResellerModal({ reseller, requests, onClose }) {
  const label = reseller.full_name || reseller.name || reseller.email || "Revendedor";
  const reqs = requests.filter((request) => request.reseller_id === reseller.id);
  const approved = reqs.filter((request) => request.status === "recharged" || request.status === "approved");

  return (
    <div className="dash-modal" onClick={onClose}>
      <div className="dash-modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="dash-modal-close" onClick={onClose} aria-label="Fechar">
          x
        </button>
        <span className="dash-avatar large">{label.slice(0, 1).toUpperCase()}</span>
        <h3>{label}</h3>
        <p>{reseller.email}</p>
        <div className="dash-modal-grid">
          <div>
            <strong>{reqs.length}</strong>
            <span>Pedidos</span>
          </div>
          <div>
            <strong>{fmt(sum(approved, "requested_credits"))}</strong>
            <span>Creditos</span>
          </div>
          <div>
            <strong>{fmtCurrency(sum(approved, "total_value"))}</strong>
            <span>Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(authUser || null);
  const [stats, setStats] = useState(emptyStats);
  const [requests, setRequests] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [servers, setServers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [pixKeys, setPixKeys] = useState([]);
  const [chartData, setChartData] = useState(() => createChartSkeleton());
  const [activePeriod, setActivePeriod] = useState("today");
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedReseller, setSelectedReseller] = useState(null);

  useEffect(() => {
    if (authUser) setUser(authUser);
  }, [authUser]);

  const loadData = useCallback(
    async (silent = false) => {
      setRefreshing(true);
      if (!silent) setLoadError("");

      try {
        const currentUser =
          authUser ||
          (await withTimeout(remoteClient.auth.me(), 6000, null).catch(() => null));

        if (currentUser) setUser(currentUser);

        const role = currentUser?.role || "user";
        let loadedRequests = [];

        if (role === "admin" || role === "dev") {
          const [usersResult, requestsResult, serversResult] = await Promise.all([
            withTimeout(remoteClient.users.list(), 7000, []).catch(() => []),
            withTimeout(remoteClient.creditRequests.list(null, 2000), 7000, { data: [] }).catch(() => ({ data: [] })),
            withTimeout(remoteClient.servers.list(), 7000, []).catch(() => []),
          ]);

          loadedRequests = normalizeRequestList(requestsResult);
          setResellers((usersResult || []).filter((item) => item.role === "user"));
          setServers(Array.isArray(serversResult) ? serversResult : []);
          setPixKeys([]);
        } else {
          const [requestsResult, settingsResult, resellerServers] = await Promise.all([
            withTimeout(remoteClient.creditRequests.list(null, 400), 7000, { data: [] }).catch(() => ({ data: [] })),
            withTimeout(remoteClient.settings.getPublic(), 7000, null).catch(() => null),
            withTimeout(remoteClient.resellerServers.list(), 7000, []).catch(() => []),
          ]);

          loadedRequests = normalizeRequestList(requestsResult);
          setPixKeys((settingsResult?.pix_keys || []).filter((key) => key.is_active));
          setResellers([]);
          setServers(
            (resellerServers || []).map((item) => ({
              id: item.server?.id || item.server_id,
              name: item.server?.name || item.server_name || "Servidor",
              panel_link: item.server?.panel_link || "",
              value_per_credit: item.value_per_credit,
              username: item.login,
            })),
          );
        }

        const sortedRequests = [...loadedRequests].sort(
          (a, b) => new Date(b.created_date || b.createdAt || 0) - new Date(a.created_date || a.createdAt || 0),
        );
        const calculated = calculateDashboard(sortedRequests);

        setRequests(sortedRequests);
        setRecentRequests(sortedRequests.slice(0, 8));
        setStats(calculated.stats);
        setChartData(calculated.chartData);
      } catch (error) {
        console.error("[Dashboard] loadData:", error?.message || error);
        setLoadError("Nao foi possivel sincronizar agora. A tela continua operavel com os ultimos dados.");
      } finally {
        setInitialized(true);
        setRefreshing(false);
      }
    },
    [authUser],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAdmin = user?.role === "admin" || user?.role === "dev";

  const periodStats = useMemo(() => {
    const map = {
      "12h": {
        credits: stats.credits12h,
        value: stats.value12h,
        previousCredits: stats.previous12hCredits,
        previousValue: stats.previous12hValue,
        label: "12h",
      },
      "24h": {
        credits: stats.credits24h,
        value: stats.value24h,
        previousCredits: stats.previous24hCredits,
        previousValue: stats.previous24hValue,
        label: "24h",
      },
      "48h": {
        credits: stats.credits48h,
        value: stats.value48h,
        previousCredits: stats.previous48hCredits,
        previousValue: stats.previous48hValue,
        label: "48h",
      },
      today: {
        credits: stats.todayCredits,
        value: stats.todayValue,
        previousCredits: stats.yesterdayCredits,
        previousValue: stats.yesterdayValue,
        label: "Hoje",
      },
      week: {
        credits: stats.weekCredits,
        value: stats.weekValue,
        previousCredits: stats.lastWeekCredits,
        previousValue: stats.lastWeekValue,
        label: "Semana",
      },
      month: {
        credits: stats.monthCredits,
        value: stats.monthValue,
        previousCredits: stats.lastMonthCredits,
        previousValue: stats.lastMonthValue,
        label: "Mes",
      },
    };
    return map[activePeriod] || map.today;
  }, [activePeriod, stats]);

  const resellerStats = useMemo(() => {
    const map = {};
    requests.forEach((request) => {
      const key = request.reseller_id || request.resellerId;
      if (!key) return;
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count += 1;
      if (request.status === "recharged" || request.status === "approved") {
        map[key].total += Number(request.total_value || 0);
      }
    });
    return map;
  }, [requests]);

  const maxCredits = useMemo(
    () => Math.max(...chartData.map((item) => Number(item.creditos || 0)), 1),
    [chartData],
  );
  const latestMonths = useMemo(() => [...chartData].reverse().slice(0, 5), [chartData]);
  const firstName = (user?.full_name || user?.name || user?.email || "Gestor J2").split(" ")[0];
  const queueCount = stats.pendingRequests + stats.analyzingRequests;

  return (
    <div className="dash-page">
      <div className="dash-shell">
        <div className="dash-addon-slot">
          <PhoneRequiredBanner user={user} />
          {!isAdmin && pixKeys.length > 0 && <PixKeysDisplay keys={pixKeys} />}
        </div>

        <section className="dash-hero">
          <div className="dash-hero-copy">
            <span>Gestor J2</span>
            <h1>Dashboard</h1>
            <p>
              Ola, {firstName}. {isAdmin ? "Operacao geral das revendas" : "Seu painel de recargas"}
            </p>
          </div>

          <div className="dash-hero-tools">
            <div className="dash-search" aria-label="Busca visual">
              <Search size={16} />
              <span>Buscar pedido, servidor ou revendedor</span>
            </div>
            <button onClick={() => loadData(true)} aria-label="Atualizar dashboard" type="button">
              <RefreshCw size={18} className={refreshing ? "dash-spin" : ""} />
            </button>
          </div>
        </section>

        {(refreshing || loadError) && (
          <div className={`dash-sync ${loadError ? "error" : ""}`}>
            <Activity size={15} className={refreshing ? "dash-spin" : ""} />
            <span>{loadError || "Sincronizando dados reais do sistema..."}</span>
          </div>
        )}

        <section className="dash-metrics">
          <MetricCard
            icon={Zap}
            label={`Creditos ${periodStats.label}`}
            value={fmtShort(periodStats.credits)}
            change={percent(periodStats.credits, periodStats.previousCredits)}
            tone="strong"
          />
          <MetricCard
            icon={DollarSign}
            label={`Receita ${periodStats.label}`}
            value={fmtCurrency(periodStats.value)}
            change={percent(periodStats.value, periodStats.previousValue)}
            tone="strong"
          />
          <MetricCard icon={Clock} label="Fila aberta" value={fmt(queueCount)} change="pedidos aguardando" />
          <MetricCard icon={CheckCircle2} label="Aprovados" value={fmtShort(stats.approvedRequests)} change={`${fmt(stats.totalRequests)} total`} />
        </section>

        <section className="dash-main-grid">
          <div className="dash-panel dash-chart-panel">
            <div className="dash-section-head">
              <div>
                <strong>Performance operacional</strong>
                <span>Creditos e receita dos ultimos meses</span>
              </div>
              <div className="dash-periods" aria-label="Periodo da dashboard">
                {PERIODS.map((period) => (
                  <button
                    key={period.id}
                    className={period.id === activePeriod ? "active" : ""}
                    onClick={() => setActivePeriod(period.id)}
                    type="button"
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dash-chart-badge">
              <span>{periodStats.label}</span>
              <strong>{fmtCurrency(periodStats.value)}</strong>
            </div>

            <div className="dash-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashCredits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4b12" stopOpacity={0.46} />
                      <stop offset="95%" stopColor="#ff4b12" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8f1608" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#8f1608" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                  <XAxis dataKey="name" tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Area type="monotone" dataKey="creditos" name="Creditos" stroke="#ff4b12" strokeWidth={3} fill="url(#dashCredits)" dot={false} />
                  <Area type="monotone" dataKey="valor" name="Valor" stroke="#9f1c0a" strokeWidth={2} fill="url(#dashValue)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <aside className="dash-action-stack">
            <div className="dash-action-card">
              <span>Fila aberta</span>
              <strong>{queueCount}</strong>
              <Link to={createPageUrl("CreditRequests")} aria-label="Abrir fila">
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="dash-action-card">
              <span>Concluidos</span>
              <strong>{fmt(stats.approvedRequests)}</strong>
              <Link to={createPageUrl("CreditRequests")} aria-label="Abrir pedidos concluidos">
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="dash-action-card">
              <span>Receita do mes</span>
              <strong>{fmtCurrency(stats.monthValue)}</strong>
              <Link to={isAdmin ? createPageUrl("Analytics") : createPageUrl("Management")} aria-label="Abrir analise">
                <ArrowRight size={16} />
              </Link>
            </div>
          </aside>
        </section>

        <section className="dash-mini-grid">
          <MetricCard icon={Sparkles} label="Creditos mes" value={fmtShort(stats.monthCredits)} change="volume mensal" />
          <MetricCard icon={Activity} label="Creditos semana" value={fmtShort(stats.weekCredits)} change="ultimos 7 dias" />
          <MetricCard icon={TrendingUp} label="Crescimento" value={percent(stats.monthValue, stats.lastMonthValue)} change="contra mes anterior" />
          <MetricCard icon={CalendarClock} label="Pos-pago aberto" value={stats.unpaidPostpaidCount} change={fmtCurrency(stats.unpaidPostpaidValue)} />
        </section>

        <section className="dash-bottom-grid">
          <div className="dash-panel">
            <div className="dash-section-head compact">
              <div>
                <strong>Pedidos recentes</strong>
                <span>Ultimas movimentacoes</span>
              </div>
              <Link to={createPageUrl("CreditRequests")}>Ver todos</Link>
            </div>
            <div className="dash-list">
              {recentRequests.length ? (
                recentRequests.map((request) => <RecentRequestCard key={request.id} request={request} />)
              ) : (
                <div className="dash-empty">Nenhum pedido recente.</div>
              )}
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-section-head compact">
              <div>
                <strong>{isAdmin ? "Servidores" : "Meus servidores"}</strong>
                <span>{servers.length} registros</span>
              </div>
              <Link to={createPageUrl(isAdmin ? "AdminServers" : "Servers")}>Gerenciar</Link>
            </div>
            <div className="dash-list">
              {servers.slice(0, 6).map((server) => (
                <ServerLine key={`${server.id}-${server.username || ""}`} server={server} />
              ))}
              {!servers.length && <div className="dash-empty">Nenhum servidor cadastrado.</div>}
            </div>
          </div>

          <div className="dash-panel">
            <div className="dash-section-head compact">
              <div>
                <strong>{isAdmin ? "Revendedores" : "Atalhos"}</strong>
                <span>{isAdmin ? `${resellers.length} ativos` : "Acoes rapidas"}</span>
              </div>
              <Link to={createPageUrl(isAdmin ? "Users" : "CreditRequests")}>{isAdmin ? "Abrir" : "Pedir"}</Link>
            </div>
            {isAdmin ? (
              <div className="dash-list">
                {resellers.slice(0, 6).map((reseller) => (
                  <ResellerLine
                    key={reseller.id}
                    reseller={reseller}
                    stats={resellerStats[reseller.id]}
                    onClick={() => setSelectedReseller(reseller)}
                  />
                ))}
                {!resellers.length && <div className="dash-empty">Nenhum revendedor encontrado.</div>}
              </div>
            ) : (
              <div className="dash-quick-grid">
                <QuickAction icon={CreditCard} label="Novo pedido" to={createPageUrl("CreditRequests")} />
                <QuickAction icon={Server} label="Servidores" to={createPageUrl("Servers")} />
                <QuickAction icon={MessageCircle} label="Chat" to={createPageUrl("Chat")} />
              </div>
            )}
          </div>

          <div className="dash-panel">
            <div className="dash-section-head compact">
              <div>
                <strong>Credito por mes</strong>
                <span>Comparativo recente</span>
              </div>
              <BarChart3 size={17} />
            </div>
            <div className="dash-month-list">
              {latestMonths.map((month) => (
                <MonthProgress key={month.name} item={month} max={maxCredits} />
              ))}
            </div>
          </div>
        </section>

        <footer className="dash-footer">Atualizado em {getCurrentBrasiliaDateTime()}</footer>
      </div>

      {selectedReseller && <ResellerModal reseller={selectedReseller} requests={requests} onClose={() => setSelectedReseller(null)} />}
      <style>{dashboardCss}</style>
    </div>
  );
}

const dashboardCss = `
@keyframes dashSpin { to { transform: rotate(360deg); } }
.dash-spin { animation: dashSpin .8s linear infinite; }
.dash-page {
  --dash-bg: #030404;
  --dash-bg-soft: #080909;
  --dash-surface: rgba(6, 7, 7, .96);
  --dash-surface-2: rgba(9, 10, 10, .96);
  --dash-sunken-bg: rgba(3, 4, 4, .76);
  --dash-text: #fff8f2;
  --dash-muted: #a3a09b;
  --dash-faint: #67615c;
  --dash-accent: #ff4b12;
  --dash-accent-deep: #8f1608;
  --dash-neu: 8px 10px 22px rgba(0,0,0,.44), -4px -4px 12px rgba(255,255,255,.016), inset 1px 1px 0 rgba(255,255,255,.014);
  --dash-neu-soft: 5px 6px 14px rgba(0,0,0,.32), -2px -2px 8px rgba(255,255,255,.014);
  --dash-sunken: inset 3px 3px 8px rgba(0,0,0,.34), inset -2px -2px 6px rgba(255,255,255,.016);
  width: 100%;
  min-width: 0;
  min-height: 100dvh;
  background: linear-gradient(135deg, var(--dash-bg), var(--dash-bg-soft) 52%, #010202);
  color: var(--dash-text);
  overflow-x: clip;
}
.dash-page *,
.dash-page *::before,
.dash-page *::after {
  box-sizing: border-box;
  letter-spacing: 0;
}
.dash-shell {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.5vw, 22px);
}
.dash-addon-slot:empty {
  display: none;
}
.dash-addon-slot > * {
  margin-bottom: 12px;
}
.dash-hero,
.dash-panel,
.dash-metric,
.dash-action-card,
.dash-sync {
  background: var(--dash-surface);
  border: 0;
  box-shadow: var(--dash-neu);
}
.dash-hero {
  border-radius: 26px;
  padding: clamp(18px, 2.2vw, 30px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
}
.dash-hero-copy span {
  color: var(--dash-accent);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.dash-hero h1 {
  margin: 4px 0 6px;
  color: var(--dash-text);
  font-size: clamp(38px, 5.8vw, 76px);
  line-height: .9;
  font-weight: 950;
}
.dash-hero p {
  margin: 0;
  color: var(--dash-muted);
}
.dash-hero-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dash-search {
  min-height: 46px;
  min-width: min(380px, 35vw);
  border-radius: 16px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--dash-faint);
  background: var(--dash-sunken-bg);
  box-shadow: var(--dash-sunken);
}
.dash-search span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dash-hero-tools button,
.dash-periods button,
.dash-action-card a {
  border: 0;
  cursor: pointer;
}
.dash-hero-tools button {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--dash-surface-2);
  color: var(--dash-accent);
  box-shadow: var(--dash-neu-soft);
}
.dash-sync {
  min-height: 44px;
  border-radius: 16px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--dash-muted);
  font-size: 12px;
  font-weight: 800;
}
.dash-sync svg {
  color: var(--dash-accent);
}
.dash-sync.error {
  color: #ffb4a4;
}
.dash-metrics,
.dash-mini-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.dash-metric {
  min-width: 0;
  min-height: 118px;
  border-radius: 20px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
}
.dash-metric.strong strong {
  color: var(--dash-accent);
}
.dash-icon-well,
.dash-row-icon {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: var(--dash-accent);
  background: var(--dash-sunken-bg);
  box-shadow: var(--dash-sunken);
  flex: 0 0 auto;
}
.dash-metric-copy {
  min-width: 0;
}
.dash-metric span,
.dash-section-head span {
  display: block;
  color: var(--dash-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.dash-metric strong {
  display: block;
  margin-top: 4px;
  color: var(--dash-text);
  font-size: clamp(19px, 2.3vw, 28px);
  line-height: 1;
  overflow-wrap: anywhere;
}
.dash-metric small {
  color: var(--dash-faint);
  font-size: 11px;
}
.dash-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(230px, 300px);
  gap: 16px;
  align-items: stretch;
}
.dash-panel {
  min-width: 0;
  border-radius: 24px;
  padding: clamp(14px, 1.5vw, 20px);
}
.dash-section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}
.dash-section-head strong {
  display: block;
  color: var(--dash-text);
  font-size: 16px;
}
.dash-section-head a,
.dash-section-head svg {
  color: var(--dash-accent);
  font-weight: 900;
  font-size: 12px;
  text-decoration: none;
}
.dash-periods {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.dash-periods button {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--dash-surface-2);
  color: var(--dash-muted);
  font-size: 11px;
  font-weight: 850;
  box-shadow: var(--dash-neu-soft);
}
.dash-periods button.active {
  color: var(--dash-accent);
  background: var(--dash-sunken-bg);
  box-shadow: var(--dash-sunken);
}
.dash-chart-panel {
  position: relative;
  min-height: 420px;
}
.dash-chart-badge {
  position: absolute;
  top: 84px;
  right: clamp(18px, 3vw, 80px);
  z-index: 2;
  min-width: 118px;
  border-radius: 18px;
  padding: 12px 16px;
  text-align: center;
  background: rgba(18, 8, 5, .92);
  box-shadow: var(--dash-neu);
}
.dash-chart-badge span {
  display: block;
  color: var(--dash-muted);
  font-size: 11px;
  font-weight: 900;
}
.dash-chart-badge strong {
  color: var(--dash-text);
  font-size: 15px;
}
.dash-chart {
  width: 100%;
  height: 330px;
  margin-top: 8px;
}
.dash-tooltip {
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(6,7,7,.96);
  box-shadow: var(--dash-neu);
}
.dash-tooltip strong,
.dash-tooltip span {
  display: block;
  font-size: 12px;
}
.dash-action-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dash-action-card {
  min-height: 108px;
  border-radius: 20px;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: center;
  gap: 12px;
}
.dash-action-card span {
  display: block;
  color: var(--dash-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.dash-action-card strong {
  display: block;
  margin-top: 5px;
  color: var(--dash-accent);
  font-size: 22px;
}
.dash-action-card a {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--dash-accent), var(--dash-accent-deep));
  box-shadow: var(--dash-neu-soft);
}
.dash-bottom-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.dash-list,
.dash-month-list,
.dash-quick-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dash-row,
.dash-action {
  border: 0;
  width: 100%;
  min-height: 58px;
  border-radius: 16px;
  padding: 11px 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  text-decoration: none;
  color: inherit;
  background: var(--dash-sunken-bg);
  box-shadow: var(--dash-sunken);
}
.dash-row.static {
  grid-template-columns: 46px minmax(0, 1fr) auto;
}
.dash-row.button {
  cursor: pointer;
  text-align: left;
}
.dash-row strong,
.dash-action b {
  display: block;
  color: var(--dash-text);
  font-size: 13px;
}
.dash-row span {
  display: block;
  color: var(--dash-muted);
  font-size: 12px;
}
.dash-row b {
  color: var(--dash-accent);
  font-size: 12px;
}
.dash-row > div,
.dash-row-right {
  min-width: 0;
}
.dash-row-right {
  display: grid;
  justify-items: end;
  gap: 5px;
}
.dash-status {
  display: inline-flex !important;
  width: max-content;
  min-height: 22px;
  border-radius: 999px;
  align-items: center;
  padding: 0 9px;
  color: var(--status-color);
  background: rgba(255,255,255,.03);
  font-size: 11px !important;
  font-weight: 900;
}
.dash-avatar {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--dash-accent), var(--dash-accent-deep));
  font-weight: 950;
}
.dash-avatar.large {
  width: 58px;
  height: 58px;
  margin: 0 auto 12px;
}
.dash-action {
  grid-template-columns: 42px minmax(0, 1fr) 18px;
}
.dash-action span {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--dash-accent);
  background: var(--dash-surface-2);
  box-shadow: var(--dash-neu-soft);
}
.dash-month > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}
.dash-month span {
  color: var(--dash-muted);
  font-size: 12px;
}
.dash-month strong {
  color: var(--dash-text);
  font-size: 12px;
}
.dash-progress {
  height: 9px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--dash-sunken-bg);
  box-shadow: var(--dash-sunken);
}
.dash-progress i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--dash-accent), var(--dash-accent-deep));
}
.dash-empty {
  min-height: 92px;
  display: grid;
  place-items: center;
  color: var(--dash-muted);
  font-weight: 800;
  text-align: center;
}
.dash-footer {
  color: var(--dash-faint);
  font-size: 12px;
  text-align: right;
}
.dash-modal {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0,0,0,.78);
}
.dash-modal-card {
  position: relative;
  width: min(460px, 100%);
  border-radius: 24px;
  padding: 24px;
  text-align: center;
  background: var(--dash-surface);
  box-shadow: var(--dash-neu);
}
.dash-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 0;
  background: var(--dash-sunken-bg);
  color: var(--dash-muted);
  cursor: pointer;
}
.dash-modal-card h3 {
  margin: 0;
  color: var(--dash-text);
}
.dash-modal-card p {
  margin: 4px 0 16px;
  color: var(--dash-muted);
}
.dash-modal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.dash-modal-grid div {
  border-radius: 16px;
  padding: 12px;
  background: var(--dash-sunken-bg);
  box-shadow: var(--dash-sunken);
}
.dash-modal-grid strong {
  display: block;
  color: var(--dash-accent);
}
.dash-modal-grid span {
  color: var(--dash-muted);
  font-size: 11px;
}
@media (max-width: 1280px) {
  .dash-metrics,
  .dash-mini-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dash-main-grid {
    grid-template-columns: 1fr;
  }
  .dash-action-stack {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 820px) {
  .dash-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }
  .dash-hero {
    border-radius: 22px;
    grid-template-columns: 1fr;
  }
  .dash-hero h1 {
    font-size: clamp(38px, 16vw, 58px);
  }
  .dash-hero-tools {
    display: grid;
    grid-template-columns: 1fr 46px;
  }
  .dash-search {
    min-width: 0;
  }
  .dash-metrics,
  .dash-mini-grid,
  .dash-action-stack,
  .dash-bottom-grid {
    grid-template-columns: 1fr;
  }
  .dash-section-head {
    flex-direction: column;
  }
  .dash-periods {
    justify-content: flex-start;
  }
  .dash-chart-panel {
    min-height: 390px;
  }
  .dash-chart {
    height: 300px;
  }
  .dash-chart-badge {
    position: static;
    width: max-content;
    margin: 6px 0 0;
  }
  .dash-row.static {
    grid-template-columns: 42px minmax(0, 1fr);
  }
  .dash-row.static > b {
    grid-column: 2;
    justify-self: start;
  }
  .dash-row {
    grid-template-columns: 1fr;
  }
  .dash-row-right {
    justify-items: start;
  }
}
`;
