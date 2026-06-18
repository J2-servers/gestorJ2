import React, { useCallback, useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Activity,
  Ban,
  Bell,
  CheckCircle2,
  Database,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ScrollText,
  Server,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Users as UsersIcon,
  Wrench,
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Visao geral", icon: LayoutDashboard },
  { id: "users", label: "Usuarios", icon: UsersIcon },
  { id: "catalog", label: "Catalogo", icon: Server },
  { id: "ops", label: "Operacao", icon: ShoppingCart },
  { id: "system", label: "Sistema", icon: Activity },
  { id: "audit", label: "Auditoria", icon: ScrollText },
];

const roleColor = { admin: "warn", dev: "accent", recovery: "danger", reseller: "accent", user: "accent" };
const statusColor = { active: "ok", blocked: "danger", pending: "warn" };

const fmtBRL = (value) => `R$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function ActionButton({ children, className = "", disabled, onClick, type = "button" }) {
  return (
    <button className={`god-action ${className}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function PageState({ denied }) {
  return (
    <div className="god-page">
      <section className="god-state">
        {denied ? <ShieldAlert size={32} /> : <Loader2 className="god-spin" size={32} />}
        <strong>{denied ? "Acesso restrito" : "Carregando painel"}</strong>
        <p>{denied ? "Apenas administradores podem acessar esta area." : "Buscando dados do sistema."}</p>
      </section>
      <style>{godStyles}</style>
    </div>
  );
}

function Loading() {
  return (
    <div className="god-empty">
      <Loader2 className="god-spin" size={28} />
      Carregando...
    </div>
  );
}

function Empty({ text }) {
  return <div className="god-empty">{text}</div>;
}

function Pill({ children, tone = "accent" }) {
  return <span className={`god-pill ${tone}`}>{children}</span>;
}

function StatCard({ label, sub, tone = "", value }) {
  return (
    <article className={`god-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </article>
  );
}

function Section({ children, icon: Icon, right, title }) {
  return (
    <section className="god-panel">
      <div className="god-panel-head">
        <div className="god-panel-title">
          {Icon && (
            <div className="god-icon">
              <Icon size={18} />
            </div>
          )}
          <strong>{title}</strong>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function HealthDot({ label, ok }) {
  return (
    <article className={`god-health ${ok ? "ok" : "danger"}`}>
      <i />
      <span>{label}</span>
      <strong>{ok ? "OK" : "Falha"}</strong>
    </article>
  );
}

export default function GodDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const isGod = user?.role === "admin" || user?.role === "dev";

  if (!user) return <PageState />;
  if (!isGod) return <PageState denied />;

  return (
    <div className="god-page">
      <main className="god-shell">
        <section className="god-hero">
          <div>
            <span>Painel GOD</span>
            <h1>Sistema</h1>
            <p>Controle total de usuarios, catalogo, operacao, infraestrutura, manutencao e auditoria.</p>
          </div>
        </section>

        <section className="god-tabs">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)} type="button">
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </section>

        {tab === "overview" && <OverviewTab toast={toast} />}
        {tab === "users" && <UsersTab toast={toast} />}
        {tab === "catalog" && <CatalogTab />}
        {tab === "ops" && <OpsTab />}
        {tab === "system" && <SystemTab toast={toast} />}
        {tab === "audit" && <AuditTab />}
      </main>

      <style>{godStyles}</style>
    </div>
  );
}

function OverviewTab({ toast }) {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, healthData] = await Promise.all([
        remoteClient.maintenance.systemOverview(),
        remoteClient.maintenance.overview().catch(() => null),
      ]);
      setData(overview);
      setHealth(healthData);
    } catch {
      toast({ title: "Erro", description: "Nao foi possivel carregar a visao geral.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;
  if (!data) return <Empty text="Sem dados." />;

  const requestsByStatus = data.requests?.byStatus || {};
  const whatsapp = data.whatsapp || {};

  return (
    <div className="god-view">
      <Section icon={UsersIcon} title="Usuarios">
        <div className="god-stat-grid">
          <StatCard label="Total" value={data.users.total} />
          <StatCard label="Revendedores" tone="accent" value={data.users.byRole?.reseller || data.users.byRole?.user || 0} />
          <StatCard label="Ativos" tone="ok" value={data.users.byStatus?.active || 0} />
          <StatCard label="Bloqueados" tone="danger" value={data.users.byStatus?.blocked || 0} />
        </div>
      </Section>

      <Section icon={Server} title="Catalogo">
        <div className="god-stat-grid">
          <StatCard label="Servidores" value={data.catalog.servers} />
          <StatCard label="Fornecedores" tone="warn" value={data.catalog.suppliers} />
          <StatCard label="Vinculos reseller" tone="accent" value={data.catalog.resellerServers} />
        </div>
      </Section>

      <Section icon={ShoppingCart} title="Operacao">
        <div className="god-stat-grid">
          <StatCard label="Pendentes" tone="warn" value={requestsByStatus.pending || 0} />
          <StatCard label="Em analise" tone="accent" value={requestsByStatus.analyzing || 0} />
          <StatCard label="Aprovados" tone="ok" value={requestsByStatus.recharged || 0} />
          <StatCard label="Rejeitados" tone="danger" value={requestsByStatus.rejected || 0} />
          <StatCard label="Receita aprovada" tone="ok" value={fmtBRL(data.requests.revenueRecharged)} />
        </div>
      </Section>

      <Section icon={Bell} title="WhatsApp e erros">
        <div className="god-stat-grid">
          <StatCard label="WA enviados" tone="ok" value={whatsapp.sent || 0} />
          <StatCard label="WA na fila" tone="warn" value={whatsapp.queued || 0} />
          <StatCard label="WA falhas" tone="danger" value={whatsapp.failed || 0} />
          <StatCard label="Erros abertos" tone="danger" value={data.errors.unresolved} sub={`${data.errors.total} no total`} />
        </div>
      </Section>

      {health && (
        <Section
          icon={Database}
          right={<ActionButton onClick={load}><RefreshCw size={15} />Atualizar</ActionButton>}
          title="Saude da infraestrutura"
        >
          <div className="god-health-grid">
            <HealthDot label="Banco de dados" ok={health.dbOk ?? health.database} />
            <HealthDot label="Redis / Fila" ok={health.redisOk ?? health.redis} />
            <HealthDot label="VAPID push" ok={health.vapidConfigured} />
            <HealthDot label="Evolution WhatsApp" ok={health.evolutionConfigured} />
          </div>
        </Section>
      )}
    </div>
  );
}

function UsersTab({ toast }) {
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers((await remoteClient.users.list()) || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, fn, okMsg) => {
    setBusy(id);
    try {
      await fn();
      toast({ title: okMsg });
      await load();
    } catch (error) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const filtered = users.filter((item) => {
    const text = `${item.full_name || item.name || ""} ${item.email || ""}`.toLowerCase();
    return text.includes(q.toLowerCase());
  });

  if (loading) return <Loading />;

  return (
    <div className="god-view">
      <Section
        icon={UsersIcon}
        right={<input className="god-input" onChange={(event) => setQ(event.target.value)} placeholder="Buscar..." value={q} />}
        title={`Usuarios (${users.length})`}
      >
        <div className="god-list">
          {filtered.map((item) => {
            const protectedUser = item.role === "admin" || item.role === "recovery" || item.role === "dev";
            const blocked = item.status === "blocked";
            return (
              <article className="god-user-row" key={item.id}>
                <div>
                  <strong>{item.full_name || item.name || "Sem nome"}</strong>
                  <span>{item.email}</span>
                </div>
                <Pill tone={roleColor[item.role] || "accent"}>{item.role}</Pill>
                <Pill tone={statusColor[item.status] || "muted"}>{item.status}</Pill>
                {item.payment_type && <Pill tone="accent">{item.payment_type}</Pill>}
                {protectedUser ? (
                  <small>conta protegida</small>
                ) : (
                  <div className="god-row-actions">
                    <ActionButton
                      disabled={busy === item.id}
                      onClick={() => act(item.id, () => remoteClient.users.update(item.id, { status: blocked ? "active" : "blocked" }), blocked ? "Desbloqueado" : "Bloqueado")}
                    >
                      {blocked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                      {blocked ? "Desbloquear" : "Bloquear"}
                    </ActionButton>
                    <ActionButton
                      className="danger"
                      disabled={busy === item.id}
                      onClick={() => {
                        if (window.confirm(`Excluir ${item.email}?`)) {
                          act(item.id, () => remoteClient.users.remove(item.id), "Removido");
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </ActionButton>
                  </div>
                )}
              </article>
            );
          })}
          {filtered.length === 0 && <Empty text="Nenhum usuario." />}
        </div>
      </Section>
    </div>
  );
}

function CatalogTab() {
  const [data, setData] = useState({ links: [], servers: [], suppliers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [servers, suppliers, links] = await Promise.all([
          remoteClient.servers.list().catch(() => []),
          remoteClient.suppliers.list().catch(() => []),
          remoteClient.resellerServers.list().catch(() => []),
        ]);
        setData({ links, servers, suppliers });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="god-view">
      <Section icon={Server} title={`Servidores (${data.servers.length})`}>
        <div className="god-list">
          {data.servers.map((server) => (
            <article className="god-simple-row" key={server.id}>
              <strong>{server.name}</strong>
              <span>
                custo {fmtBRL(server.cost_per_credit)} - {data.suppliers.filter((supplier) => supplier.server_id === server.id).length} fornecedor(es) - {data.links.filter((link) => link.server_id === server.id).length} reseller(s)
              </span>
            </article>
          ))}
          {data.servers.length === 0 && <Empty text="Nenhum servidor." />}
        </div>
        <a className="god-link" href="/AdminServers">Gestao completa em Servidores</a>
      </Section>
    </div>
  );
}

function OpsTab() {
  const [data, setData] = useState({ invoices: [], requests: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [requests, invoices] = await Promise.all([
          remoteClient.creditRequests.list(null, 500).then((result) => result?.data || []).catch(() => []),
          remoteClient.invoices.list().catch(() => []),
        ]);
        setData({ invoices, requests });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  const byStatus = (status) => data.requests.filter((request) => request.status === status).length;

  return (
    <div className="god-view">
      <Section icon={ShoppingCart} title="Pedidos">
        <div className="god-stat-grid">
          <StatCard label="Pendentes" tone="warn" value={byStatus("pending")} />
          <StatCard label="Em analise" tone="accent" value={byStatus("analyzing")} />
          <StatCard label="Aprovados" tone="ok" value={byStatus("recharged")} />
          <StatCard label="Rejeitados" tone="danger" value={byStatus("rejected")} />
        </div>
        <a className="god-link" href="/CreditRequests">Abrir pedidos</a>
      </Section>

      <Section icon={ScrollText} title={`Faturas (${data.invoices.length})`}>
        <div className="god-stat-grid">
          <StatCard label="Pendentes" tone="warn" value={data.invoices.filter((invoice) => invoice.status === "pending").length} />
          <StatCard label="Pagas" tone="ok" value={data.invoices.filter((invoice) => invoice.status === "paid").length} />
          <StatCard label="Vencidas" tone="danger" value={data.invoices.filter((invoice) => invoice.status === "overdue").length} />
        </div>
        <a className="god-link" href="/InvoiceManagement">Abrir financeiro</a>
      </Section>
    </div>
  );
}

function SystemTab({ toast }) {
  const [busy, setBusy] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrations, setMigrations] = useState(null);
  const [queue, setQueue] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [settings, setSettings] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [errorData, queueData, scriptData, migrationData, settingsData] = await Promise.all([
        remoteClient.maintenance.errors(50).catch(() => []),
        remoteClient.maintenance.whatsappQueue().catch(() => null),
        remoteClient.maintenance.scripts().catch(() => []),
        remoteClient.maintenance.migrations().catch(() => null),
        remoteClient.settings.get().catch(() => null),
      ]);
      setErrors(errorData || []);
      setQueue(queueData);
      setScripts(scriptData || []);
      setMigrations(migrationData);
      setSettings(settingsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      const result = await fn();
      toast({ title: msg, description: typeof result === "object" ? JSON.stringify(result).slice(0, 120) : String(result) });
      await load();
    } catch (error) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleWhatsapp = async () => {
    const next = !(settings?.whatsapp_enabled ?? true);
    setBusy("wa-toggle");
    try {
      const updated = await remoteClient.settings.update({ whatsappEnabled: next });
      setSettings(updated);
      toast({ title: next ? "Envios de WhatsApp ativados" : "Envios de WhatsApp desligados" });
    } catch (error) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading />;

  const whatsappOn = settings?.whatsapp_enabled ?? true;

  return (
    <div className="god-view">
      <Section icon={Bell} title="Envios de WhatsApp">
        <div className="god-switch-row">
          <p>{whatsappOn ? "Ativado: pedidos disparam mensagens no WhatsApp dos revendedores." : "Desligado: nenhuma mensagem de WhatsApp e enviada."}</p>
          <ActionButton className={whatsappOn ? "danger" : "primary"} disabled={busy === "wa-toggle"} onClick={toggleWhatsapp}>
            {whatsappOn ? "Desligar envios" : "Ativar envios"}
          </ActionButton>
        </div>
      </Section>

      <Section
        icon={Bell}
        right={<ActionButton disabled={busy === "retry"} onClick={() => run("retry", () => remoteClient.maintenance.retryWhatsapp(), "Reprocessado")}><RefreshCw size={15} />Reprocessar falhas</ActionButton>}
        title="Fila WhatsApp"
      >
        {queue ? (
          <div className="god-stat-grid">
            {Object.entries(queue).filter(([, value]) => typeof value === "number").map(([key, value]) => (
              <StatCard key={key} label={key} value={value} />
            ))}
          </div>
        ) : (
          <Empty text="Fila indisponivel." />
        )}
      </Section>

      <Section
        icon={Database}
        right={<ActionButton className="primary" disabled={busy === "mig"} onClick={() => run("mig", () => remoteClient.maintenance.deployMigrations(), "Migrations aplicadas")}>Aplicar pendentes</ActionButton>}
        title="Migrations"
      >
        <div className={`god-status-line ${migrations?.pending ? "warn" : "ok"}`}>
          {migrations?.pending ? "Ha migrations pendentes" : "Banco em dia"}
        </div>
      </Section>

      <Section icon={Wrench} title="Scripts de manutencao">
        <div className="god-list">
          {scripts.map((script) => (
            <article className="god-script-row" key={script.id}>
              <div>
                <strong>{script.name} <Pill tone={script.danger === "high" ? "danger" : script.danger === "medium" ? "warn" : "ok"}>{script.danger}</Pill></strong>
                <span>{script.description}</span>
              </div>
              <div className="god-row-actions">
                <ActionButton disabled={busy === script.id} onClick={() => run(script.id, () => remoteClient.maintenance.diagnose(script.id), `Diagnostico: ${script.name}`)}>
                  Diagnosticar
                </ActionButton>
                <ActionButton className="primary" disabled={busy === script.id} onClick={() => {
                  if (window.confirm(`Aplicar "${script.name}"?`)) {
                    run(script.id, () => remoteClient.maintenance.apply(script.id), `Aplicado: ${script.name}`);
                  }
                }}>
                  Corrigir
                </ActionButton>
              </div>
            </article>
          ))}
          {scripts.length === 0 && <Empty text="Nenhum script." />}
        </div>
      </Section>

      <Section
        icon={ShieldAlert}
        right={errors.length > 0 && <ActionButton className="danger" disabled={busy === "clr"} onClick={() => run("clr", () => remoteClient.maintenance.clearErrors(), "Erros limpos")}>Limpar</ActionButton>}
        title={`Erros recentes (${errors.length})`}
      >
        <div className="god-list scroll">
          {errors.map((error) => (
            <article className="god-error-row" key={error.id}>
              <strong>{error.statusCode || ""} {error.method || ""} {error.path || ""}</strong>
              <span>{error.message}</span>
            </article>
          ))}
          {errors.length === 0 && <Empty text="Nenhum erro registrado." />}
        </div>
      </Section>
    </div>
  );
}

function AuditTab() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await remoteClient.audit.list();
        setLogs((Array.isArray(raw) ? raw : []).map((log) => ({
          ...log,
          createdAt: log.createdAt ?? log.created_date,
          userName: log.userName ?? log.user_name,
        })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="god-view">
      <Section icon={ScrollText} title={`Auditoria (${logs.length})`}>
        <div className="god-list scroll">
          {logs.map((log, index) => (
            <article className="god-audit-row" key={log.id || index}>
              <time>{log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : ""}</time>
              <div>
                <strong>{log.action}</strong>
                <span>{log.userName} {log.details ? `- ${log.details}` : ""}</span>
              </div>
            </article>
          ))}
          {logs.length === 0 && <Empty text="Sem registros de auditoria." />}
        </div>
      </Section>
    </div>
  );
}

const godStyles = `
.god-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.god-shell {
  width: min(1500px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.god-hero,
.god-tabs,
.god-panel,
.god-stat,
.god-state,
.god-empty {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.god-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
}

.god-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.god-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(38px, 6vw, 68px);
  line-height: .9;
  font-weight: 950;
}

.god-hero p {
  max-width: 780px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.god-tabs {
  border-radius: 24px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.god-tabs button,
.god-action {
  border: 0;
  min-height: 42px;
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.god-tabs button {
  background: transparent;
  box-shadow: none;
}

.god-tabs button.active,
.god-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.god-action {
  padding: 0 14px;
}

.god-action.danger {
  color: #ffb4b4;
  background: rgba(255, 91, 91, .08);
}

.god-action:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.god-view {
  display: grid;
  gap: 16px;
}

.god-panel {
  min-width: 0;
  border-radius: 26px;
  padding: 16px;
}

.god-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.god-panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.god-icon {
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

.god-panel-title > strong {
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.god-stat-grid,
.god-health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.god-stat {
  min-width: 0;
  border-radius: 18px;
  padding: 13px;
}

.god-stat span,
.god-health span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.god-stat strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(20px, 2.2vw, 28px);
  line-height: 1;
  font-weight: 950;
}

.god-stat.accent strong,
.god-stat.ok strong,
.god-stat.warn strong {
  color: var(--j2-accent);
}

.god-stat.danger strong {
  color: #ff5b5b;
}

.god-stat small {
  display: block;
  margin-top: 6px;
  color: var(--j2-faint);
  font-size: 11px;
}

.god-health,
.god-user-row,
.god-simple-row,
.god-script-row,
.god-error-row,
.god-audit-row,
.god-switch-row,
.god-status-line {
  border: 0;
  border-radius: 17px;
  padding: 12px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.god-health {
  display: grid;
  gap: 6px;
}

.god-health i {
  width: 10px;
  height: 10px;
  border-radius: 99px;
  background: var(--j2-accent);
}

.god-health.danger i {
  background: #ff5b5b;
}

.god-health strong {
  color: var(--j2-text);
  font-size: 14px;
  font-weight: 950;
}

.god-input {
  width: min(260px, 100%);
  min-height: 42px;
  border: 0;
  outline: 0;
  border-radius: 15px;
  padding: 0 12px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
  font-size: 13px;
}

.god-list {
  display: grid;
  gap: 9px;
}

.god-list.scroll {
  max-height: 520px;
  overflow-y: auto;
}

.god-user-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto auto auto;
  gap: 10px;
  align-items: center;
}

.god-user-row strong,
.god-simple-row strong,
.god-script-row strong,
.god-error-row strong,
.god-audit-row strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.god-user-row span,
.god-simple-row span,
.god-script-row span,
.god-error-row span,
.god-audit-row span,
.god-switch-row p {
  display: block;
  color: var(--j2-muted);
  font-size: 12px;
}

.god-user-row small {
  color: var(--j2-faint);
  font-size: 11px;
}

.god-row-actions {
  display: flex;
  gap: 7px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.god-pill {
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  padding: 4px 9px;
  color: var(--j2-accent);
  background: rgba(255, 75, 18, .08);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.god-pill.ok { color: var(--j2-accent); }
.god-pill.warn { color: #f5b942; }
.god-pill.danger { color: #ff5b5b; }
.god-pill.muted { color: var(--j2-muted); }

.god-simple-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 10px;
}

.god-link {
  display: inline-flex;
  margin-top: 12px;
  color: var(--j2-accent);
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
}

.god-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.god-switch-row p {
  margin: 0;
}

.god-status-line {
  color: var(--j2-accent);
  font-size: 13px;
  font-weight: 950;
}

.god-status-line.warn {
  color: #f5b942;
}

.god-script-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.god-error-row strong {
  color: #ffb4b4;
  font-family: monospace;
  font-size: 11px;
}

.god-audit-row {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 10px;
}

.god-audit-row time {
  color: var(--j2-muted);
  font-size: 11px;
}

.god-empty,
.god-state {
  min-height: 220px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.god-state {
  width: min(430px, calc(100vw - 28px));
  min-height: 320px;
  margin: 18dvh auto 0;
  padding: 24px;
}

.god-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.god-state p {
  margin: 0;
}

.god-spin {
  animation: godSpin .8s linear infinite;
}

@keyframes godSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1120px) {
  .god-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .god-user-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .god-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .god-hero {
    border-radius: 24px;
  }

  .god-hero h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .god-tabs {
    display: flex;
    overflow-x: auto;
  }

  .god-tabs button {
    min-width: 118px;
    flex: 0 0 auto;
  }

  .god-panel-head,
  .god-switch-row,
  .god-script-row,
  .god-simple-row,
  .god-audit-row {
    grid-template-columns: 1fr;
    display: grid;
  }

  .god-panel-head .god-action,
  .god-row-actions .god-action,
  .god-switch-row .god-action {
    width: 100%;
  }

  .god-row-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
`;
