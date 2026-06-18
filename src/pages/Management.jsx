import React, { useCallback, useEffect, useState } from "react";
import { Activity, BarChart3, Calendar, CreditCard, DollarSign, Loader2, TrendingUp } from "lucide-react";
import { remoteClient } from "@/api/remoteClient";
import MonthlyChart from "../components/dashboard/MonthlyChart";
import PhoneRequiredBanner from "../components/layout/PhoneRequiredBanner";

const emptyStats = {
  averageCredits: 0,
  averageValue: 0,
  monthCredits: 0,
  monthValue: 0,
  rechargedRequests: 0,
  todayCredits: 0,
  todayValue: 0,
  totalRequests: 0,
  weekCredits: 0,
  weekValue: 0,
};

const fmt = (value) => Number(value || 0).toLocaleString("pt-BR");
const fmtMoney = (value) => `R$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function PageState() {
  return (
    <div className="management-page">
      <section className="management-state">
        <Loader2 className="management-spin" size={30} />
        <strong>Carregando gestao</strong>
        <p>Buscando pedidos e estatisticas.</p>
      </section>
      <style>{managementStyles}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="management-stat">
      <div className="management-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="management-info-row">
      <span>{label}</span>
      <strong className={accent ? "accent" : ""}>{value}</strong>
    </div>
  );
}

export default function ManagementPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);

  const calculateStats = useCallback((requests) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const recharged = requests.filter((request) => request.status === "recharged");
    const sum = (items, key) => items.reduce((total, request) => total + (request[key] || 0), 0);
    const range = (items, from) => items.filter((request) => new Date(request.created_date) >= from);

    const today = range(recharged, todayStart);
    const week = range(recharged, weekStart);
    const month = range(recharged, monthStart);

    setStats({
      averageCredits: Math.round(sum(month, "requested_credits") / 3),
      averageValue: sum(month, "total_value") / 3,
      monthCredits: sum(month, "requested_credits"),
      monthValue: sum(month, "total_value"),
      rechargedRequests: recharged.length,
      todayCredits: sum(today, "requested_credits"),
      todayValue: sum(today, "total_value"),
      totalRequests: requests.length,
      weekCredits: sum(week, "requested_credits"),
      weekValue: sum(week, "total_value"),
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await remoteClient.auth.me();
      setUser(currentUser);
      const limit = currentUser.role === "admin" || currentUser.role === "dev" ? 2000 : 500;
      const result = await remoteClient.creditRequests.list(null, limit);
      calculateStats(result?.data || []);
    } catch (error) {
      console.error("[Management] load error:", error);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PageState />;

  const successRate = stats.totalRequests > 0 ? ((stats.rechargedRequests / stats.totalRequests) * 100).toFixed(1) : "0";
  const isAdmin = user?.role === "admin" || user?.role === "dev";

  return (
    <div className="management-page">
      <main className="management-shell">
        <PhoneRequiredBanner user={user} />

        <section className="management-hero">
          <div>
            <span>{isAdmin ? "Geral" : "Revendedor"}</span>
            <h1>{isAdmin ? "Gestao Geral" : "Minha Gestao"}</h1>
            <p>{isAdmin ? "Desempenho consolidado de pedidos e creditos." : "Acompanhe seus investimentos, creditos e performance."}</p>
          </div>
          <button className="management-action" onClick={loadData} type="button">
            Atualizar
          </button>
        </section>

        <section className="management-section">
          <div className="management-section-head">
            <span>Hoje</span>
          </div>
          <div className="management-stats">
            <StatCard icon={CreditCard} label="Creditos hoje" value={fmt(stats.todayCredits)} hint={fmtMoney(stats.todayValue)} />
            <StatCard icon={DollarSign} label="Gastos hoje" value={fmtMoney(stats.todayValue)} hint={`${fmt(stats.todayCredits)} creditos`} />
          </div>
        </section>

        <section className="management-section">
          <div className="management-section-head">
            <span>Esta semana</span>
          </div>
          <div className="management-stats">
            <StatCard icon={TrendingUp} label="Creditos semana" value={fmt(stats.weekCredits)} hint={fmtMoney(stats.weekValue)} />
            <StatCard icon={Calendar} label="Gastos semana" value={fmtMoney(stats.weekValue)} hint={`${fmt(stats.weekCredits)} creditos`} />
          </div>
        </section>

        <section className="management-section">
          <div className="management-section-head">
            <span>Este mes</span>
          </div>
          <div className="management-stats">
            <StatCard icon={BarChart3} label="Total creditos" value={fmt(stats.monthCredits)} hint={fmtMoney(stats.monthValue)} />
            <StatCard icon={Activity} label="Total investido" value={fmtMoney(stats.monthValue)} hint={`${fmt(stats.monthCredits)} creditos`} />
          </div>
        </section>

        <section className="management-workbench">
          <div className="management-chart">
            <MonthlyChart userRole={user?.role} />
          </div>

          <aside className="management-side">
            <section className="management-panel">
              <div className="management-panel-head">
                <div className="management-icon">
                  <Activity size={18} />
                </div>
                <div>
                  <strong>Media 3 meses</strong>
                  <span>Performance mensal</span>
                </div>
              </div>
              <InfoRow label="Creditos/mes" value={fmt(stats.averageCredits)} />
              <InfoRow accent label="Investimento/mes" value={fmtMoney(stats.averageValue)} />
            </section>

            <section className="management-panel">
              <div className="management-panel-head">
                <div className="management-icon">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <strong>Resumo geral</strong>
                  <span>{isAdmin ? "Todos os revendedores" : "Meus dados"}</span>
                </div>
              </div>
              <InfoRow label="Total pedidos" value={stats.totalRequests} />
              <InfoRow accent label="Recarregados" value={stats.rechargedRequests} />
              <InfoRow accent label="Taxa sucesso" value={`${successRate}%`} />
            </section>
          </aside>
        </section>
      </main>

      <style>{managementStyles}</style>
    </div>
  );
}

const managementStyles = `
.management-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.management-shell {
  width: min(1500px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.management-hero,
.management-stat,
.management-panel,
.management-chart,
.management-state {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.management-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.management-hero span,
.management-section-head span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.management-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(36px, 5.8vw, 66px);
  line-height: .9;
  font-weight: 950;
}

.management-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.management-action {
  border: 0;
  min-height: 42px;
  padding: 0 15px;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.management-section {
  display: grid;
  gap: 10px;
}

.management-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.management-stat {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.management-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.management-stat span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.management-stat strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(22px, 2.4vw, 31px);
  line-height: 1;
  font-weight: 950;
}

.management-stat small {
  display: block;
  margin-top: 5px;
  color: var(--j2-faint);
  font-size: 11px;
}

.management-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: start;
}

.management-chart,
.management-panel {
  min-width: 0;
  border-radius: 26px;
  padding: 16px;
}

.management-side {
  display: grid;
  gap: 14px;
}

.management-panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.management-panel-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.management-panel-head span {
  display: block;
  color: var(--j2-muted);
  font-size: 12px;
}

.management-info-row {
  border: 0;
  border-radius: 16px;
  min-height: 44px;
  margin-top: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.management-info-row span {
  color: var(--j2-muted);
  font-size: 12px;
}

.management-info-row strong {
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.management-info-row strong.accent {
  color: var(--j2-accent);
}

.management-state {
  width: min(430px, calc(100vw - 28px));
  min-height: 320px;
  margin: 18dvh auto 0;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.management-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.management-state p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.management-spin {
  animation: managementSpin .8s linear infinite;
}

@keyframes managementSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1050px) {
  .management-workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .management-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .management-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .management-hero h1 {
    font-size: clamp(34px, 10vw, 50px);
  }

  .management-hero .management-action {
    width: 100%;
  }

  .management-stats {
    grid-template-columns: 1fr;
  }

  .management-chart,
  .management-panel {
    border-radius: 22px;
  }
}
`;
