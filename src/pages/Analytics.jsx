import React, { useCallback, useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Calculator,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  Flame,
  Layers,
  LineChart as LineChartIcon,
  RefreshCw,
  Target,
  Timer,
  TrendingUp,
  UserX,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBrasiliaDate } from "../components/utils/dateHelper";

const STATUS = {
  pending: { label: "Pendente", color: "#f5b942" },
  analyzing: { label: "Analise", color: "#ff7540" },
  recharged: { label: "Aprovado", color: "#ff8a4a" },
  approved: { label: "Aprovado", color: "#ff8a4a" },
  rejected: { label: "Rejeitado", color: "#ff5b5b" },
  canceled: { label: "Cancelado", color: "#67615c" },
  cancelled: { label: "Cancelado", color: "#67615c" },
};

const emptyStats = {
  totalRevenue: 0,
  totalRevenueAllTime: 0,
  totalCredits: 0,
  totalResellers: 0,
  totalServers: 0,
  totalRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  pendingRequests: 0,
  approvalRate: 0,
  avgTicket: 0,
  avgCreditsPerRequest: 0,
  totalCost: 0,
  totalProfit: 0,
  profitMargin: 0,
};

const fmtR = (value = 0) => {
  const n = typeof value === "number" ? value : Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const fmtNum = (value = 0) => Number(value || 0).toLocaleString("pt-BR");

const safeDate = (value) => {
  const d = new Date(value || 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

const initialsOf = (name = "?") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

function percentage(current, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (Number(current || 0) / Number(total || 1)) * 100));
}

function periodLabel(period) {
  if (period === "7d") return "7 dias";
  if (period === "90d") return "90 dias";
  return "30 dias";
}

function buildDayKey(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function buildMonthKey(date, mode = "short") {
  return date.toLocaleDateString("pt-BR", mode === "full" ? { month: "short", year: "2-digit" } : { month: "short" });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}
        </span>
      ))}
    </div>
  );
}

function Avatar({ name, size = 34 }) {
  return (
    <span className="analytics-avatar" style={{ width: size, height: size, borderRadius: Math.max(10, size / 2.8) }}>
      {initialsOf(name)}
    </span>
  );
}

function PageHeader({ period, setPeriod, onExport, onRefresh, refreshing }) {
  return (
    <section className="analytics-hero">
      <div>
        <span>Gestor J2</span>
        <h1>Analytics</h1>
        <p>Visao financeira, revendedores, margem, churn e operacao em uma tela.</p>
      </div>

      <div className="analytics-toolbar">
        <button className="analytics-secondary" onClick={onExport} type="button">
          <Download size={15} />
          Exportar CSV
        </button>
        <button className="analytics-icon-btn" onClick={onRefresh} type="button" aria-label="Atualizar analytics">
          <RefreshCw size={16} className={refreshing ? "analytics-spin" : ""} />
        </button>
        <div className="analytics-periods">
          {["7d", "30d", "90d"].map((item) => (
            <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)} type="button">
              {periodLabel(item)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone = "default" }) {
  return (
    <article className={`analytics-stat ${tone}`}>
      <span className="analytics-icon">
        <Icon size={18} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {detail && <em>{detail}</em>}
      </div>
    </article>
  );
}

function Panel({ title, subtitle, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`analytics-panel ${className}`}>
      <div className="analytics-panel-head">
        <div className="analytics-panel-title">
          {Icon && (
            <span className="analytics-icon small">
              <Icon size={15} />
            </span>
          )}
          <div>
            <strong>{title}</strong>
            {subtitle && <small>{subtitle}</small>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return <div className="analytics-empty">{children}</div>;
}

function StatusPill({ status }) {
  const cfg = STATUS[status] || { label: status || "Status", color: "#a3a09b" };
  return (
    <span className="analytics-status" style={{ "--status-color": cfg.color }}>
      {cfg.label}
    </span>
  );
}

function RankingRow({ rank, title, detail, value, meta, danger, onClick, avatar }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`analytics-row ${danger ? "danger" : ""} ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <span className="analytics-rank">{rank}</span>
      {avatar && <Avatar name={title} size={34} />}
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <b>{value}</b>
      {meta && <em>{meta}</em>}
    </Tag>
  );
}

function ProgressLine({ label, value, percent, tone = "default" }) {
  return (
    <div className="analytics-progress-item">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="analytics-progress">
        <i className={tone} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [period, setPeriod] = useState("30d");
  const [loadError, setLoadError] = useState("");

  const [stats, setStats] = useState(emptyStats);
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [topResellers, setTopResellers] = useState([]);
  const [allResellerStats, setAllResellerStats] = useState([]);
  const [serverProfit, setServerProfit] = useState([]);
  const [serverLoss, setServerLoss] = useState([]);
  const [serverSales, setServerSales] = useState([]);
  const [categoryProfitData, setCategoryProfitData] = useState([]);
  const [dailyTrendData, setDailyTrendData] = useState([]);
  const [resellerGrowthData, setResellerGrowthData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [churnResellers, setChurnResellers] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [resellerScores, setResellerScores] = useState([]);

  const [meta, setMeta] = useState(() => {
    try {
      const value = parseFloat(localStorage.getItem("analytics_meta") || "0");
      return Number.isNaN(value) ? 0 : Math.max(0, value);
    } catch {
      return 0;
    }
  });
  const [metaInput, setMetaInput] = useState("");
  const [showMetaEdit, setShowMetaEdit] = useState(false);

  const [simCredits, setSimCredits] = useState(100);
  const [simSalePrice, setSimSalePrice] = useState(5);
  const [simCostPrice, setSimCostPrice] = useState(3);

  const [selectedReseller, setSelectedReseller] = useState(null);
  const [resellerHistory, setResellerHistory] = useState([]);
  const [showAllResellers, setShowAllResellers] = useState(false);
  const [selectedLossServer, setSelectedLossServer] = useState(null);
  const [serverLossDetails, setServerLossDetails] = useState({});

  const loadAnalytics = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setLoadError("");

      try {
        const currentUser = await remoteClient.auth.me();
        setUser(currentUser);
        if (currentUser.role !== "admin" && currentUser.role !== "dev") return;

        const [allUsers, requestsResult, allServers] = await Promise.all([
          remoteClient.users.list(),
          remoteClient.creditRequests.list(null, 3000),
          remoteClient.servers.list(),
        ]);

        const resellers = (allUsers || []).filter((item) => item?.role === "user");
        const resellerIds = new Set(resellers.map((item) => item.id));
        const resellerById = Object.fromEntries(resellers.map((item) => [item.id, item]));
        const serverCostMap = {};

        (allServers || []).forEach((server) => {
          if (server?.name) {
            serverCostMap[server.name.trim().toLowerCase()] = Number(server.value_per_credit || server.cost_per_credit || 0);
          }
        });

        const allRequests = (requestsResult?.data || [])
          .filter((request) => resellerIds.has(request?.reseller_id))
          .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

        const now = new Date();
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const periodStart = new Date(now.getTime() - days * 86400000);
        const periodRequests = allRequests.filter((request) => {
          const date = safeDate(request.created_date);
          return date && date >= periodStart;
        });
        const approvedPeriod = periodRequests.filter((request) => request.status === "recharged" || request.status === "approved");
        const approvedAllTime = allRequests.filter((request) => request.status === "recharged" || request.status === "approved");

        const totalRevenue = approvedPeriod.reduce((sum, request) => sum + Number(request.total_value || 0), 0);
        const totalRevenueAllTime = approvedAllTime.reduce((sum, request) => sum + Number(request.total_value || 0), 0);
        const totalCredits = approvedPeriod.reduce((sum, request) => sum + Number(request.requested_credits || 0), 0);
        const approvedRequests = approvedPeriod.length;
        const rejectedRequests = periodRequests.filter((request) => request.status === "rejected").length;
        const pendingRequests = periodRequests.filter((request) => ["pending", "analyzing"].includes(request.status)).length;
        const totalRequests = periodRequests.length;

        const serverStats = {};
        const serverPurchases = {};

        approvedPeriod.forEach((request) => {
          const name = request.server_snapshot?.name || "Sem servidor";
          const key = name.trim().toLowerCase();
          const credits = Number(request.requested_credits || 0);
          const revenue = Number(request.total_value || 0);
          const costPerCredit = Number(serverCostMap[key] || 0);
          const cost = credits * costPerCredit;
          const profit = revenue - cost;
          const reseller = resellerById[request.reseller_id];

          if (!serverStats[name]) {
            serverStats[name] = { name, revenue: 0, cost: 0, profit: 0, credits: 0, requests: 0, purchases: [] };
          }

          serverStats[name].revenue += revenue;
          serverStats[name].cost += cost;
          serverStats[name].profit += profit;
          serverStats[name].credits += credits;
          serverStats[name].requests += 1;

          if (!serverPurchases[name]) serverPurchases[name] = [];
          serverPurchases[name].push({
            id: request.id,
            created_date: request.created_date,
            reseller_name: reseller?.full_name || reseller?.name || reseller?.email || "?",
            login: request.login,
            credits,
            revenue,
            cost,
            profit,
            costPerCredit,
          });
        });

        Object.keys(serverStats).forEach((name) => {
          serverStats[name].purchases = serverPurchases[name] || [];
        });

        const allServerStats = Object.values(serverStats);
        const totalCost = allServerStats.reduce((sum, item) => sum + item.cost, 0);
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        setStats({
          totalRevenue,
          totalRevenueAllTime,
          totalCredits,
          totalResellers: resellers.length,
          totalServers: allServerStats.length,
          totalRequests,
          approvedRequests,
          rejectedRequests,
          pendingRequests,
          approvalRate: totalRequests ? (approvedRequests / totalRequests) * 100 : 0,
          avgTicket: approvedRequests ? totalRevenue / approvedRequests : 0,
          avgCreditsPerRequest: approvedRequests ? totalCredits / approvedRequests : 0,
          totalCost,
          totalProfit,
          profitMargin,
        });

        setServerLossDetails(serverStats);
        setServerProfit([...allServerStats].sort((a, b) => b.profit - a.profit).slice(0, 8));
        setServerLoss([...allServerStats].filter((item) => item.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 8));
        setServerSales([...allServerStats].sort((a, b) => b.credits - a.credits).slice(0, 8));
        setCategoryProfitData([...allServerStats].sort((a, b) => b.profit - a.profit).slice(0, 10));

        const dailyMap = {};
        for (let i = 13; i >= 0; i -= 1) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const key = buildDayKey(date);
          dailyMap[key] = { day: key, receita: 0, custo: 0, lucro: 0, pedidos: 0 };
        }

        approvedAllTime.forEach((request) => {
          const date = safeDate(request.created_date);
          if (!date) return;
          const diff = Math.floor((now - date) / 86400000);
          if (diff > 13) return;
          const key = buildDayKey(date);
          if (!dailyMap[key]) return;
          const serverKey = (request.server_snapshot?.name || "").trim().toLowerCase();
          const cost = Number(request.requested_credits || 0) * Number(serverCostMap[serverKey] || 0);
          const revenue = Number(request.total_value || 0);
          dailyMap[key].receita += revenue;
          dailyMap[key].custo += cost;
          dailyMap[key].lucro += revenue - cost;
          dailyMap[key].pedidos += 1;
        });
        setDailyTrendData(Object.values(dailyMap));

        const monthlyMap = {};
        for (let i = 5; i >= 0; i -= 1) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = buildMonthKey(date);
          monthlyMap[key] = { month: key, receita: 0, custo: 0, lucro: 0, pedidos: 0 };
        }

        const growthMap = {};
        for (let i = 5; i >= 0; i -= 1) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = buildMonthKey(date, "full");
          growthMap[key] = { month: key, novos: 0, ativos: 0, receita: 0 };
        }

        resellers.forEach((reseller) => {
          const date = safeDate(reseller.created_date);
          if (!date) return;
          const key = buildMonthKey(date, "full");
          if (growthMap[key]) growthMap[key].novos += 1;
        });

        approvedAllTime.forEach((request) => {
          const date = safeDate(request.created_date);
          if (!date) return;
          const monthKey = buildMonthKey(date);
          const growthKey = buildMonthKey(date, "full");
          const serverKey = (request.server_snapshot?.name || "").trim().toLowerCase();
          const cost = Number(request.requested_credits || 0) * Number(serverCostMap[serverKey] || 0);
          const revenue = Number(request.total_value || 0);

          if (monthlyMap[monthKey]) {
            monthlyMap[monthKey].receita += revenue;
            monthlyMap[monthKey].custo += cost;
            monthlyMap[monthKey].lucro += revenue - cost;
            monthlyMap[monthKey].pedidos += 1;
          }

          if (growthMap[growthKey]) {
            growthMap[growthKey].ativos += 1;
            growthMap[growthKey].receita += revenue;
          }
        });
        setMonthlyData(Object.values(monthlyMap));
        setResellerGrowthData(Object.values(growthMap));

        const weeklyMap = {};
        for (let i = 3; i >= 0; i -= 1) {
          const key = `Sem ${4 - i}`;
          weeklyMap[key] = { week: key, pedidos: 0, receita: 0 };
        }
        approvedAllTime.forEach((request) => {
          const date = safeDate(request.created_date);
          if (!date) return;
          const weekAge = Math.floor((now - date) / (7 * 86400000));
          if (weekAge >= 0 && weekAge < 4) {
            const key = `Sem ${4 - weekAge}`;
            weeklyMap[key].pedidos += 1;
            weeklyMap[key].receita += Number(request.total_value || 0);
          }
        });
        setWeeklyData(Object.values(weeklyMap));

        setStatusData([
          { name: "Aprovados", value: approvedRequests, color: "#ff8a4a" },
          { name: "Pendentes", value: pendingRequests, color: "#f5b942" },
          { name: "Rejeitados", value: rejectedRequests, color: "#ff5b5b" },
        ]);

        const resellerStats = {};
        approvedPeriod.forEach((request) => {
          const reseller = resellerById[request.reseller_id];
          if (!resellerStats[request.reseller_id]) {
            resellerStats[request.reseller_id] = {
              id: request.reseller_id,
              name: reseller?.full_name || reseller?.name || reseller?.email || "?",
              totalValue: 0,
              totalCredits: 0,
              requestCount: 0,
              lastRequest: null,
            };
          }
          resellerStats[request.reseller_id].totalValue += Number(request.total_value || 0);
          resellerStats[request.reseller_id].totalCredits += Number(request.requested_credits || 0);
          resellerStats[request.reseller_id].requestCount += 1;
          const date = safeDate(request.created_date);
          if (date && (!resellerStats[request.reseller_id].lastRequest || date > resellerStats[request.reseller_id].lastRequest)) {
            resellerStats[request.reseller_id].lastRequest = date;
          }
        });

        const sortedResellers = Object.values(resellerStats).sort((a, b) => b.totalValue - a.totalValue);
        setTopResellers(sortedResellers.slice(0, 5));
        setAllResellerStats(sortedResellers);

        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        const maxValue = Math.max(...sortedResellers.map((item) => item.totalValue), 1);
        const maxRequests = Math.max(...sortedResellers.map((item) => item.requestCount), 1);
        setResellerScores(
          sortedResellers
            .map((item) => ({
              ...item,
              score: Math.round((item.totalValue / maxValue) * 40 + (item.requestCount / maxRequests) * 30 + (item.lastRequest >= thirtyDaysAgo ? 30 : 0)),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 8),
        );

        const allTimeResellerMap = {};
        approvedAllTime.forEach((request) => {
          const reseller = resellerById[request.reseller_id];
          if (!allTimeResellerMap[request.reseller_id]) {
            allTimeResellerMap[request.reseller_id] = {
              id: request.reseller_id,
              name: reseller?.full_name || reseller?.name || reseller?.email || "?",
              lastRequest: null,
              totalValue: 0,
            };
          }
          const date = safeDate(request.created_date);
          allTimeResellerMap[request.reseller_id].totalValue += Number(request.total_value || 0);
          if (date && (!allTimeResellerMap[request.reseller_id].lastRequest || date > allTimeResellerMap[request.reseller_id].lastRequest)) {
            allTimeResellerMap[request.reseller_id].lastRequest = date;
          }
        });
        setChurnResellers(
          Object.values(allTimeResellerMap)
            .filter((item) => item.lastRequest && item.lastRequest < thirtyDaysAgo)
            .map((item) => ({ ...item, daysIdle: Math.floor((now - item.lastRequest) / 86400000) }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 8),
        );

        const hourMap = {};
        for (let h = 0; h < 24; h += 1) hourMap[h] = { hora: `${String(h).padStart(2, "0")}h`, pedidos: 0, receita: 0 };
        approvedAllTime.forEach((request) => {
          const date = safeDate(request.created_date);
          if (!date) return;
          const hour = date.getHours();
          hourMap[hour].pedidos += 1;
          hourMap[hour].receita += Number(request.total_value || 0);
        });
        setHourlyData(Object.values(hourMap));

        setRecentActivity(
          periodRequests.slice(0, 12).map((request) => {
            const reseller = resellerById[request.reseller_id];
            const costPerCredit = Number(serverCostMap[(request.server_snapshot?.name || "").trim().toLowerCase()] || 0);
            return {
              ...request,
              reseller_name: reseller?.full_name || reseller?.name || reseller?.email || "?",
              _costPerCredit: costPerCredit,
            };
          }),
        );
      } catch (error) {
        console.error("[Analytics] load:", error?.message || error);
        setLoadError("Nao foi possivel sincronizar o Analytics agora.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period],
  );

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleResellerClick = async (reseller) => {
    if (!reseller?.id) return;
    setSelectedReseller(reseller);
    setResellerHistory([]);
    try {
      const result = await remoteClient.creditRequests.list(null, 2000);
      setResellerHistory((result?.data || []).filter((request) => request.reseller_id === reseller.id));
    } catch (error) {
      console.error("[Analytics] reseller history:", error?.message || error);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Servidor", "Creditos", "Receita", "Custo", "Lucro", "Pedidos"],
      ...serverProfit.map((item) => [item.name, item.credits, item.revenue.toFixed(2), item.cost.toFixed(2), item.profit.toFixed(2), item.requests]),
    ];
    const csv = rows.map((row) => row.map((cell) => String(cell).replace(/;/g, ",")).join(";")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics_servidores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveMeta = () => {
    const value = Math.max(0, parseFloat(metaInput) || 0);
    setMeta(value);
    try {
      localStorage.setItem("analytics_meta", String(value));
    } catch (error) {
      console.warn("[Analytics] meta:", error?.message || error);
    }
    setShowMetaEdit(false);
    setMetaInput("");
  };

  const totalResellerValue = useMemo(() => topResellers.reduce((sum, reseller) => sum + Number(reseller.totalValue || 0), 0), [topResellers]);
  const metaPct = meta > 0 ? percentage(stats.totalRevenue, meta) : 0;
  const simRevenue = Number(simCredits || 0) * Number(simSalePrice || 0);
  const simCost = Number(simCredits || 0) * Number(simCostPrice || 0);
  const simProfit = simRevenue - simCost;
  const simMargin = simRevenue ? (simProfit / simRevenue) * 100 : 0;

  if (loading) {
    return (
      <div className="analytics-page analytics-loading">
        <style>{analyticsCss}</style>
        <div className="analytics-loader" />
        <p>Carregando Analytics...</p>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "dev")) {
    return (
      <div className="analytics-page analytics-denied">
        <style>{analyticsCss}</style>
        <XCircle size={34} />
        <h1>Acesso negado</h1>
        <p>Esta area e exclusiva para administradores.</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <style>{analyticsCss}</style>
      <div className="analytics-shell">
        <PageHeader
          period={period}
          setPeriod={setPeriod}
          onExport={exportCSV}
          onRefresh={() => loadAnalytics(true)}
          refreshing={refreshing}
        />

        {loadError && (
          <div className="analytics-sync error">
            <AlertTriangle size={15} />
            {loadError}
          </div>
        )}

        <section className="analytics-kpis">
          <StatCard icon={DollarSign} label="Receita no periodo" value={fmtR(stats.totalRevenue)} detail={periodLabel(period)} tone="accent" />
          <StatCard icon={TrendingUp} label="Lucro liquido" value={fmtR(stats.totalProfit)} detail={`Margem ${Number(stats.profitMargin).toFixed(1)}%`} tone={stats.totalProfit >= 0 ? "success" : "danger"} />
          <StatCard icon={Layers} label="Custo total" value={fmtR(stats.totalCost)} detail="Custo por servidor" />
          <StatCard icon={Zap} label="Creditos vendidos" value={fmtNum(stats.totalCredits)} detail={`${stats.approvedRequests} pedidos`} />
          <StatCard icon={Activity} label="Taxa aprovacao" value={`${Number(stats.approvalRate).toFixed(1)}%`} detail={`${stats.approvedRequests}/${stats.totalRequests}`} />
          <StatCard icon={Users} label="Revendedores" value={stats.totalResellers} detail="ativos no sistema" />
          <StatCard icon={Target} label="Ticket medio" value={fmtR(stats.avgTicket)} detail="por pedido aprovado" />
          <StatCard icon={Award} label="Receita historica" value={fmtR(stats.totalRevenueAllTime)} detail="acumulado total" tone="accent" />
        </section>

        <section className="analytics-main-grid">
          <Panel title="Receita x lucro mensal" subtitle="Ultimos 6 meses" icon={LineChartIcon} className="analytics-chart-panel">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyData} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4b12" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#ff4b12" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="analyticsProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff8a4a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#ff8a4a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="month" tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<CustomTooltip />} />
                <Area dataKey="receita" name="Receita" type="monotone" stroke="#ff4b12" strokeWidth={3} fill="url(#analyticsRevenue)" dot={false} />
                <Area dataKey="lucro" name="Lucro" type="monotone" stroke="#ff8a4a" strokeWidth={2.4} fill="url(#analyticsProfit)" dot={false} />
                <Area dataKey="custo" name="Custo" type="monotone" stroke="#ff5b5b" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="5 4" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <aside className="analytics-side-stack">
            <Panel title="Status" subtitle={`${stats.totalRequests} pedidos`} icon={CreditCard}>
              <div className="analytics-status-grid">
                <StatCard icon={CheckCircle} label="Aprovados" value={stats.approvedRequests} tone="success" />
                <StatCard icon={Clock} label="Pendentes" value={stats.pendingRequests} />
                <StatCard icon={XCircle} label="Rejeitados" value={stats.rejectedRequests} tone="danger" />
              </div>
            </Panel>

            <Panel
              title="Meta mensal"
              subtitle={meta > 0 ? `${metaPct.toFixed(1)}% atingido` : "Nao definida"}
              icon={Target}
              action={
                <button
                  className="analytics-link-btn"
                  onClick={() => {
                    setMetaInput(String(meta || ""));
                    setShowMetaEdit(true);
                  }}
                  type="button"
                >
                  Definir
                </button>
              }
            >
              <strong className="analytics-big-value">{meta > 0 ? fmtR(meta) : "Sem meta"}</strong>
              <ProgressLine label="Progresso" value={meta > 0 ? fmtR(stats.totalRevenue) : "Aguardando meta"} percent={metaPct} tone="accent" />
            </Panel>
          </aside>
        </section>

        <section className="analytics-triple">
          <Panel title="Servidores com mais lucro" subtitle="Receita menos custo" icon={TrendingUp}>
            {serverProfit.length ? (
              serverProfit.slice(0, 6).map((server, index) => (
                <RankingRow
                  key={server.name}
                  rank={index + 1}
                  title={server.name}
                  detail={`${fmtNum(server.credits)} creditos - ${server.requests} pedidos`}
                  value={fmtR(server.profit)}
                  meta={`Receita ${fmtR(server.revenue)}`}
                />
              ))
            ) : (
              <EmptyState>Configure custo por credito para ver lucro.</EmptyState>
            )}
          </Panel>

          <Panel title="Servidores com prejuizo" subtitle="Clique para diagnostico" icon={AlertTriangle}>
            {serverLoss.length ? (
              serverLoss.slice(0, 6).map((server, index) => (
                <RankingRow
                  key={server.name}
                  rank={index + 1}
                  title={server.name}
                  detail={`${fmtNum(server.credits)} creditos - custo ${fmtR(server.cost)}`}
                  value={fmtR(server.profit)}
                  danger
                  onClick={() => setSelectedLossServer(serverLossDetails[server.name] || server)}
                />
              ))
            ) : (
              <EmptyState>Nenhum servidor com prejuizo no periodo.</EmptyState>
            )}
          </Panel>

          <Panel title="Servidores que mais vendem" subtitle="Volume de creditos" icon={Flame}>
            {serverSales.length ? (
              serverSales.slice(0, 6).map((server, index) => (
                <RankingRow
                  key={server.name}
                  rank={index + 1}
                  title={server.name}
                  detail={`${server.requests} pedidos`}
                  value={`${fmtNum(server.credits)} cr`}
                  meta={fmtR(server.revenue)}
                />
              ))
            ) : (
              <EmptyState>Sem vendas aprovadas no periodo.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="analytics-two">
          <Panel title="Tendencia diaria" subtitle="Receita, lucro e pedidos nos ultimos 14 dias" icon={Activity}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyTrendData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="day" tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#ff4b12" strokeWidth={2.6} dot={false} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#ff8a4a" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="#f5b942" strokeWidth={1.7} dot={false} strokeDasharray="5 4" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Saude da operacao" subtitle="Indicadores de qualidade" icon={Award}>
            <div className="analytics-health">
              <ProgressLine label="Margem de lucro" value={`${Number(stats.profitMargin).toFixed(1)}%`} percent={Math.abs(Number(stats.profitMargin || 0))} tone={stats.totalProfit >= 0 ? "success" : "danger"} />
              <ProgressLine label="Taxa aprovacao" value={`${Number(stats.approvalRate).toFixed(1)}%`} percent={Number(stats.approvalRate || 0)} tone="success" />
              <ProgressLine label="Ticket medio" value={fmtR(stats.avgTicket)} percent={Math.min((stats.avgTicket / 500) * 100, 100)} tone="accent" />
              <ProgressLine label="Creditos por pedido" value={fmtNum(Math.round(stats.avgCreditsPerRequest))} percent={Math.min((stats.avgCreditsPerRequest / 1000) * 100, 100)} tone="accent" />
            </div>
          </Panel>
        </section>

        <section className="analytics-two">
          <Panel
            title="Top revendedores"
            subtitle={`Total ${fmtR(totalResellerValue)}`}
            icon={Users}
            action={
              allResellerStats.length > 5 ? (
                <button className="analytics-link-btn" onClick={() => setShowAllResellers(true)} type="button">
                  Ver todos
                </button>
              ) : null
            }
          >
            {topResellers.length ? (
              topResellers.map((reseller, index) => (
                <RankingRow
                  key={reseller.id}
                  rank={index + 1}
                  title={reseller.name}
                  detail={`${reseller.requestCount} pedidos - ${fmtNum(reseller.totalCredits)} creditos`}
                  value={fmtR(reseller.totalValue)}
                  avatar
                  onClick={() => handleResellerClick(reseller)}
                />
              ))
            ) : (
              <EmptyState>Sem revendedores com compras aprovadas.</EmptyState>
            )}
          </Panel>

          <Panel title="Crescimento de revendedores" subtitle="Novos, pedidos e receita" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={resellerGrowthData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="month" tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="novos" name="Novos" stroke="#ff7540" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="ativos" name="Pedidos" stroke="#f5b942" strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#ff4b12" strokeWidth={2.2} dot={false} strokeDasharray="5 4" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </section>

        <section className="analytics-two">
          <Panel title="Score de revendedores" subtitle="Volume + regularidade + recencia" icon={Award}>
            {resellerScores.length ? (
              resellerScores.map((reseller, index) => (
                <div className="analytics-score-row" key={reseller.id}>
                  <span>{index + 1}</span>
                  <Avatar name={reseller.name} size={32} />
                  <div>
                    <strong>{reseller.name}</strong>
                    <div className="analytics-progress">
                      <i className="accent" style={{ width: `${reseller.score}%` }} />
                    </div>
                  </div>
                  <b>{reseller.score}</b>
                </div>
              ))
            ) : (
              <EmptyState>Sem pontuacao no periodo.</EmptyState>
            )}
          </Panel>

          <Panel title="Revendedores inativos" subtitle="Sem pedidos ha mais de 30 dias" icon={UserX}>
            {churnResellers.length ? (
              churnResellers.map((reseller) => (
                <RankingRow
                  key={reseller.id}
                  rank={reseller.daysIdle}
                  title={reseller.name}
                  detail={`Historico ${fmtR(reseller.totalValue)}`}
                  value={`${reseller.daysIdle}d`}
                  danger
                  avatar
                />
              ))
            ) : (
              <EmptyState>Todos os revendedores com historico estao ativos.</EmptyState>
            )}
          </Panel>
        </section>

        <section className="analytics-two">
          <Panel title="Horario de pico" subtitle="Pedidos aprovados por hora" icon={Timer}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="hora" tick={{ fill: "#a3a09b", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: "#a3a09b", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pedidos" name="Pedidos" radius={[5, 5, 0, 0]}>
                  {hourlyData.map((item) => (
                    <Cell key={item.hora} fill={item.pedidos > 2 ? "#ff5b5b" : item.pedidos > 0 ? "#ff4b12" : "#24110c"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Simulador de margem" subtitle="Calcule lucro antes de precificar" icon={Calculator}>
            <div className="analytics-simulator">
              {[
                { label: "Creditos", value: simCredits, set: setSimCredits, max: 5000, step: 10 },
                { label: "Preco venda", value: simSalePrice, set: setSimSalePrice, max: 20, step: 0.25 },
                { label: "Custo", value: simCostPrice, set: setSimCostPrice, max: 20, step: 0.25 },
              ].map((field) => (
                <label key={field.label}>
                  <span>{field.label}</span>
                  <strong>{field.value}</strong>
                  <input type="range" min="0" max={field.max} step={field.step} value={field.value} onChange={(event) => field.set(parseFloat(event.target.value))} />
                </label>
              ))}
              <div className="analytics-sim-result">
                <div>
                  <span>Receita</span>
                  <b>{fmtR(simRevenue)}</b>
                </div>
                <div>
                  <span>Custo</span>
                  <b>{fmtR(simCost)}</b>
                </div>
                <div>
                  <span>Lucro</span>
                  <strong className={simProfit >= 0 ? "positive" : "negative"}>{fmtR(simProfit)}</strong>
                  <small>Margem {simMargin.toFixed(1)}%</small>
                </div>
              </div>
            </div>
          </Panel>
        </section>

        <Panel title="Atividade recente" subtitle={`Ultimos ${recentActivity.length} pedidos`} icon={Eye}>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  {["Status", "Revendedor", "Servidor", "Creditos", "Receita", "Custo", "Lucro", "Data"].map((head) => (
                    <th key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((request) => {
                  const cost = Number(request.requested_credits || 0) * Number(request._costPerCredit || 0);
                  const profit = Number(request.total_value || 0) - cost;
                  return (
                    <tr key={request.id}>
                      <td>
                        <StatusPill status={request.status} />
                      </td>
                      <td>{request.reseller_name}</td>
                      <td>{request.server_snapshot?.name || "N/A"}</td>
                      <td>{fmtNum(request.requested_credits)}</td>
                      <td>{fmtR(request.total_value)}</td>
                      <td>{request._costPerCredit > 0 ? fmtR(cost) : "-"}</td>
                      <td className={profit >= 0 ? "positive" : "negative"}>{request._costPerCredit > 0 ? fmtR(profit) : "-"}</td>
                      <td>{formatBrasiliaDate(request.created_date, "dd/MM HH:mm")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {showMetaEdit && (
        <Dialog open onOpenChange={() => setShowMetaEdit(false)}>
          <DialogContent className="analytics-dialog">
            <DialogHeader>
              <DialogTitle>Definir meta mensal</DialogTitle>
            </DialogHeader>
            <div className="analytics-dialog-body">
              <input value={metaInput} onChange={(event) => setMetaInput(event.target.value)} type="number" placeholder="Ex: 50000" />
              <button onClick={saveMeta} type="button">Salvar meta</button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showAllResellers && (
        <Dialog open onOpenChange={() => setShowAllResellers(false)}>
          <DialogContent className="analytics-dialog wide">
            <DialogHeader>
              <DialogTitle>Todos revendedores ({allResellerStats.length})</DialogTitle>
            </DialogHeader>
            <div className="analytics-dialog-list">
              {allResellerStats.map((reseller, index) => (
                <RankingRow
                  key={reseller.id}
                  rank={index + 1}
                  title={reseller.name}
                  detail={`${reseller.requestCount} pedidos`}
                  value={fmtR(reseller.totalValue)}
                  meta={`${percentage(reseller.totalValue, totalResellerValue).toFixed(1)}%`}
                  avatar
                  onClick={() => {
                    setShowAllResellers(false);
                    handleResellerClick(reseller);
                  }}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedLossServer && (
        <Dialog open onOpenChange={() => setSelectedLossServer(null)}>
          <DialogContent className="analytics-dialog wide">
            <DialogHeader>
              <DialogTitle>Diagnostico - {selectedLossServer.name}</DialogTitle>
            </DialogHeader>
            <div className="analytics-modal-kpis">
              <StatCard icon={DollarSign} label="Receita" value={fmtR(selectedLossServer.revenue)} />
              <StatCard icon={Layers} label="Custo" value={fmtR(selectedLossServer.cost)} />
              <StatCard icon={AlertTriangle} label="Lucro" value={fmtR(selectedLossServer.profit)} tone={selectedLossServer.profit >= 0 ? "success" : "danger"} />
              <StatCard icon={CreditCard} label="Compras" value={selectedLossServer.requests || 0} />
            </div>
            <div className="analytics-table-wrap modal">
              <table className="analytics-table">
                <thead>
                  <tr>
                    {["Data", "Revendedor", "Login", "Creditos", "Receita", "Custo", "Lucro"].map((head) => (
                      <th key={head}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedLossServer.purchases || []).map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{formatBrasiliaDate(purchase.created_date, "dd/MM/yy HH:mm")}</td>
                      <td>{purchase.reseller_name}</td>
                      <td>{purchase.login || "-"}</td>
                      <td>{fmtNum(purchase.credits)}</td>
                      <td>{fmtR(purchase.revenue)}</td>
                      <td>{fmtR(purchase.cost)}</td>
                      <td className={purchase.profit >= 0 ? "positive" : "negative"}>{fmtR(purchase.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedReseller && (
        <Dialog open onOpenChange={() => setSelectedReseller(null)}>
          <DialogContent className="analytics-dialog wide">
            <DialogHeader>
              <DialogTitle>Historico - {selectedReseller.name}</DialogTitle>
            </DialogHeader>
            <div className="analytics-modal-kpis">
              <StatCard icon={DollarSign} label="Receita" value={fmtR(selectedReseller.totalValue)} />
              <StatCard icon={Zap} label="Creditos" value={fmtNum(selectedReseller.totalCredits)} />
              <StatCard icon={CreditCard} label="Pedidos" value={selectedReseller.requestCount} />
            </div>
            <div className="analytics-table-wrap modal">
              <table className="analytics-table">
                <thead>
                  <tr>
                    {["Data", "Servidor", "Login", "Creditos", "Valor", "Status"].map((head) => (
                      <th key={head}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resellerHistory.map((request) => (
                    <tr key={request.id}>
                      <td>{formatBrasiliaDate(request.created_date, "dd/MM/yy HH:mm")}</td>
                      <td>{request.server_snapshot?.name || "N/A"}</td>
                      <td>{request.login || "-"}</td>
                      <td>{fmtNum(request.requested_credits)}</td>
                      <td>{fmtR(request.total_value)}</td>
                      <td>
                        <StatusPill status={request.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const analyticsCss = `
@keyframes analyticsSpin { to { transform: rotate(360deg); } }
.analytics-spin { animation: analyticsSpin .8s linear infinite; }
.analytics-page {
  --a-bg: #030404;
  --a-bg-soft: #080909;
  --a-surface: rgba(6, 7, 7, .96);
  --a-surface-2: rgba(9, 10, 10, .96);
  --a-sunken: rgba(3, 4, 4, .76);
  --a-text: #fff8f2;
  --a-muted: #a3a09b;
  --a-faint: #67615c;
  --a-accent: #ff4b12;
  --a-accent-deep: #8f1608;
  --a-good: #ff8a4a;
  --a-warn: #f5b942;
  --a-bad: #ff5b5b;
  --a-neu: 8px 10px 22px rgba(0,0,0,.44), -4px -4px 12px rgba(255,255,255,.016), inset 1px 1px 0 rgba(255,255,255,.014);
  --a-neu-soft: 5px 6px 14px rgba(0,0,0,.32), -2px -2px 8px rgba(255,255,255,.014);
  --a-inner: inset 3px 3px 8px rgba(0,0,0,.34), inset -2px -2px 6px rgba(255,255,255,.016);
  min-height: 100dvh;
  width: 100%;
  overflow-x: clip;
  background: linear-gradient(135deg, var(--a-bg), var(--a-bg-soft) 52%, #010202);
  color: var(--a-text);
}
.analytics-page *,
.analytics-page *::before,
.analytics-page *::after {
  box-sizing: border-box;
  letter-spacing: 0;
}
.analytics-shell {
  width: 100%;
  max-width: 100%;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.5vw, 22px);
}
.analytics-loading,
.analytics-denied {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  text-align: center;
}
.analytics-loader {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--a-surface-2);
  box-shadow: var(--a-neu);
  animation: analyticsSpin 1.1s linear infinite;
}
.analytics-loading p,
.analytics-denied p {
  margin: 0;
  color: var(--a-muted);
  font-weight: 800;
}
.analytics-denied h1 {
  margin: 0;
  color: var(--a-text);
}
.analytics-denied svg {
  color: var(--a-bad);
}
.analytics-hero,
.analytics-panel,
.analytics-stat,
.analytics-sync {
  border: 0;
  background: var(--a-surface);
  box-shadow: var(--a-neu);
}
.analytics-hero {
  border-radius: 26px;
  padding: clamp(18px, 2.2vw, 30px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
}
.analytics-hero span {
  color: var(--a-accent);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.analytics-hero h1 {
  margin: 4px 0 6px;
  color: var(--a-text);
  font-size: clamp(38px, 5.4vw, 72px);
  line-height: .9;
  font-weight: 950;
}
.analytics-hero p {
  margin: 0;
  color: var(--a-muted);
}
.analytics-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.analytics-secondary,
.analytics-icon-btn,
.analytics-periods button,
.analytics-link-btn,
.analytics-dialog-body button {
  border: 0;
  cursor: pointer;
  color: var(--a-text);
  font-weight: 850;
}
.analytics-secondary,
.analytics-icon-btn {
  min-height: 44px;
  border-radius: 15px;
  background: var(--a-surface-2);
  box-shadow: var(--a-neu-soft);
}
.analytics-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  color: var(--a-accent);
}
.analytics-icon-btn {
  width: 44px;
  display: grid;
  place-items: center;
  color: var(--a-accent);
}
.analytics-periods {
  min-height: 44px;
  border-radius: 16px;
  display: flex;
  gap: 6px;
  padding: 6px;
  background: var(--a-sunken);
  box-shadow: var(--a-inner);
}
.analytics-periods button {
  border-radius: 12px;
  padding: 0 12px;
  background: transparent;
  color: var(--a-muted);
  font-size: 12px;
}
.analytics-periods button.active {
  color: var(--a-accent);
  background: var(--a-surface-2);
  box-shadow: var(--a-neu-soft);
}
.analytics-sync {
  min-height: 42px;
  border-radius: 16px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #ffb4a4;
  font-weight: 800;
  font-size: 12px;
}
.analytics-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.analytics-stat {
  min-width: 0;
  min-height: 112px;
  border-radius: 20px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
}
.analytics-stat .analytics-icon {
  flex: 0 0 auto;
}
.analytics-stat small {
  display: block;
  color: var(--a-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}
.analytics-stat strong {
  display: block;
  margin-top: 5px;
  color: var(--a-text);
  font-size: clamp(19px, 2.2vw, 28px);
  line-height: 1;
  overflow-wrap: anywhere;
}
.analytics-stat em {
  display: block;
  color: var(--a-faint);
  font-size: 11px;
  font-style: normal;
}
.analytics-stat.accent strong,
.analytics-stat.accent .analytics-icon {
  color: var(--a-accent);
}
.analytics-stat.success strong,
.analytics-stat.success .analytics-icon {
  color: var(--a-good);
}
.analytics-stat.danger strong,
.analytics-stat.danger .analytics-icon {
  color: var(--a-bad);
}
.analytics-icon {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: var(--a-accent);
  background: var(--a-sunken);
  box-shadow: var(--a-inner);
}
.analytics-icon.small {
  width: 38px;
  height: 38px;
  border-radius: 13px;
}
.analytics-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  gap: 16px;
}
.analytics-side-stack,
.analytics-health,
.analytics-simulator,
.analytics-dialog-body,
.analytics-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.analytics-panel {
  min-width: 0;
  border-radius: 24px;
  padding: clamp(14px, 1.5vw, 20px);
}
.analytics-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.analytics-panel-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.analytics-panel-title strong {
  display: block;
  color: var(--a-text);
  font-size: 16px;
}
.analytics-panel-title small {
  display: block;
  color: var(--a-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.analytics-link-btn {
  min-height: 32px;
  border-radius: 11px;
  padding: 0 10px;
  color: var(--a-accent);
  background: var(--a-sunken);
  box-shadow: var(--a-inner);
}
.analytics-chart-panel {
  min-height: 402px;
}
.analytics-status-grid,
.analytics-triple,
.analytics-two,
.analytics-modal-kpis {
  display: grid;
  gap: 14px;
}
.analytics-status-grid {
  grid-template-columns: 1fr;
}
.analytics-triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.analytics-two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.analytics-big-value {
  display: block;
  color: var(--a-accent);
  font-size: 22px;
  margin-bottom: 12px;
}
.analytics-row,
.analytics-score-row {
  width: 100%;
  min-height: 58px;
  border: 0;
  border-radius: 16px;
  padding: 10px 12px;
  display: grid;
  align-items: center;
  gap: 10px;
  color: inherit;
  background: var(--a-sunken);
  box-shadow: var(--a-inner);
  text-align: left;
}
.analytics-row {
  grid-template-columns: 30px minmax(0, 1fr) auto;
}
.analytics-row:has(.analytics-avatar) {
  grid-template-columns: 30px 34px minmax(0, 1fr) auto;
}
.analytics-row.clickable {
  cursor: pointer;
}
.analytics-row.danger b,
.analytics-row.danger .analytics-rank {
  color: var(--a-bad);
}
.analytics-rank {
  width: 30px;
  height: 30px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: var(--a-accent);
  background: var(--a-surface-2);
  box-shadow: var(--a-neu-soft);
  font-weight: 950;
  font-size: 12px;
}
.analytics-row strong,
.analytics-score-row strong {
  display: block;
  color: var(--a-text);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.analytics-row small {
  display: block;
  color: var(--a-muted);
  font-size: 11px;
}
.analytics-row b {
  color: var(--a-accent);
  font-size: 13px;
}
.analytics-row em {
  grid-column: 3 / -1;
  justify-self: end;
  color: var(--a-faint);
  font-size: 10px;
  font-style: normal;
}
.analytics-avatar {
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--a-accent), var(--a-accent-deep));
  font-weight: 950;
  font-size: 12px;
}
.analytics-empty {
  min-height: 96px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--a-muted);
  font-weight: 800;
}
.analytics-progress-item > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}
.analytics-progress-item span {
  color: var(--a-muted);
  font-size: 12px;
}
.analytics-progress-item strong {
  color: var(--a-text);
  font-size: 12px;
}
.analytics-progress {
  height: 9px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--a-sunken);
  box-shadow: var(--a-inner);
}
.analytics-progress i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--a-accent), var(--a-accent-deep));
}
.analytics-progress i.success { background: linear-gradient(90deg, var(--a-good), var(--a-accent)); }
.analytics-progress i.danger { background: linear-gradient(90deg, var(--a-bad), var(--a-accent-deep)); }
.analytics-score-row {
  grid-template-columns: 30px 32px minmax(0, 1fr) 42px;
}
.analytics-score-row span {
  width: 30px;
  height: 30px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: var(--a-accent);
  background: var(--a-surface-2);
  box-shadow: var(--a-neu-soft);
  font-weight: 950;
}
.analytics-score-row b {
  color: var(--a-warn);
  font-size: 18px;
}
.analytics-simulator label {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 12px;
  color: var(--a-muted);
  font-size: 12px;
}
.analytics-simulator input[type="range"] {
  grid-column: 1 / -1;
  accent-color: var(--a-accent);
  width: 100%;
}
.analytics-sim-result {
  border-radius: 18px;
  padding: 14px;
  display: grid;
  gap: 8px;
  background: var(--a-sunken);
  box-shadow: var(--a-inner);
}
.analytics-sim-result div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.analytics-sim-result span,
.analytics-sim-result small {
  color: var(--a-muted);
  font-size: 12px;
}
.analytics-sim-result b {
  color: var(--a-text);
}
.positive { color: var(--a-good) !important; }
.negative { color: var(--a-bad) !important; }
.analytics-table-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}
.analytics-table-wrap.modal {
  max-height: min(52vh, 520px);
  overflow: auto;
}
.analytics-table {
  width: 100%;
  min-width: 860px;
  border-collapse: separate;
  border-spacing: 0 8px;
}
.analytics-table th {
  padding: 0 12px 6px;
  color: var(--a-faint);
  font-size: 10px;
  font-weight: 900;
  text-align: left;
  text-transform: uppercase;
}
.analytics-table td {
  padding: 11px 12px;
  color: var(--a-muted);
  font-size: 12px;
  background: var(--a-sunken);
}
.analytics-table td:first-child {
  border-top-left-radius: 14px;
  border-bottom-left-radius: 14px;
}
.analytics-table td:last-child {
  border-top-right-radius: 14px;
  border-bottom-right-radius: 14px;
}
.analytics-status {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  border-radius: 999px;
  padding: 0 9px;
  color: var(--status-color);
  background: rgba(255,255,255,.035);
  font-size: 11px;
  font-weight: 900;
}
.analytics-tooltip {
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(6,7,7,.96);
  box-shadow: var(--a-neu);
}
.analytics-tooltip strong,
.analytics-tooltip span {
  display: block;
  font-size: 12px;
}
.analytics-dialog {
  border: 0 !important;
  border-radius: 24px !important;
  background: var(--a-surface) !important;
  color: var(--a-text) !important;
  box-shadow: var(--a-neu) !important;
}
.analytics-dialog.wide {
  max-width: min(900px, calc(100vw - 24px)) !important;
}
.analytics-dialog-body input {
  min-height: 46px;
  border: 0;
  border-radius: 14px;
  padding: 0 14px;
  background: var(--a-sunken);
  box-shadow: var(--a-inner);
  color: var(--a-text);
}
.analytics-dialog-body button {
  min-height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--a-accent), var(--a-accent-deep));
}
@media (max-width: 1380px) {
  .analytics-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .analytics-main-grid,
  .analytics-triple,
  .analytics-two {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 820px) {
  .analytics-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }
  .analytics-hero {
    grid-template-columns: 1fr;
    border-radius: 22px;
  }
  .analytics-hero h1 {
    font-size: clamp(40px, 16vw, 58px);
  }
  .analytics-toolbar {
    justify-content: stretch;
    display: grid;
    grid-template-columns: 1fr 44px;
  }
  .analytics-periods {
    grid-column: 1 / -1;
    width: 100%;
  }
  .analytics-periods button {
    flex: 1;
  }
  .analytics-kpis {
    grid-template-columns: 1fr;
  }
  .analytics-stat {
    min-height: 104px;
  }
  .analytics-panel-head {
    flex-direction: column;
  }
  .analytics-row,
  .analytics-row:has(.analytics-avatar) {
    grid-template-columns: 30px minmax(0, 1fr);
  }
  .analytics-row .analytics-avatar {
    display: none;
  }
  .analytics-row b,
  .analytics-row em {
    grid-column: 2;
    justify-self: start;
  }
  .analytics-modal-kpis {
    grid-template-columns: 1fr;
  }
}
`;
