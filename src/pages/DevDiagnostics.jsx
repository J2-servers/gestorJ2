import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Loader2,
  Play,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";

const DANGER = {
  high: { className: "danger", label: "alto" },
  low: { className: "ok", label: "baixo" },
  medium: { className: "warn", label: "medio" },
};

const CATEGORY_LABEL = {
  banco: "Banco de dados",
  config: "Configuracao",
  dados: "Dados",
  fila: "Fila / WhatsApp",
  notificacoes: "Notificacoes",
  seguranca: "Seguranca",
};

const TABS = [
  { id: "overview", label: "Saude", icon: Activity },
  { id: "scripts", label: "Scripts", icon: Wrench },
  { id: "errors", label: "Erros", icon: AlertTriangle },
  { id: "queue", label: "Fila WA", icon: Zap },
  { id: "migrations", label: "Migrations", icon: Database },
];

function ActionButton({ children, className = "", disabled, onClick, type = "button" }) {
  return (
    <button className={`devdiag-action ${className}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function PageState({ denied }) {
  return (
    <div className="devdiag-page">
      <section className="devdiag-state">
        {denied ? <ShieldCheck size={32} /> : <Loader2 className="devdiag-spin" size={32} />}
        <strong>{denied ? "Acesso restrito" : "Carregando manutencao"}</strong>
        <p>{denied ? "Esta pagina e exclusiva do administrador." : "Preparando diagnosticos do sistema."}</p>
      </section>
      <style>{devDiagnosticsStyles}</style>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`devdiag-toast ${toast.type === "ok" ? "ok" : "bad"}`}>
      {toast.text}
    </div>
  );
}

function ConfirmModal({ busy, onCancel, onConfirm, open, script }) {
  if (!open || !script) return null;
  const danger = DANGER[script.danger] || DANGER.medium;
  return (
    <div className="devdiag-overlay" onClick={onCancel}>
      <section className="devdiag-confirm" onClick={(event) => event.stopPropagation()}>
        <div className="devdiag-panel-head">
          <div className={`devdiag-icon ${danger.className}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <strong>Confirmar correcao</strong>
            <span>Risco {danger.label}</span>
          </div>
        </div>
        <h3>{script.name}</h3>
        <p>{script.description}</p>
        {script.danger === "high" && (
          <div className="devdiag-warning">
            Acao de risco alto. Confirme somente se voce entende o impacto.
          </div>
        )}
        <div className="devdiag-actions-row">
          <ActionButton onClick={onCancel}>Cancelar</ActionButton>
          <ActionButton className="primary" disabled={busy} onClick={onConfirm}>
            {busy ? <Loader2 className="devdiag-spin" size={15} /> : <Play size={15} />}
            {busy ? "Aplicando..." : "Corrigir agora"}
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

function HealthItem({ label, ok }) {
  return (
    <article className={`devdiag-health ${ok ? "ok" : "bad"}`}>
      {ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <span>{label}</span>
      <strong>{ok ? "OK" : "Falha"}</strong>
    </article>
  );
}

function IssueCard({ label, value }) {
  return (
    <article className={`devdiag-issue ${value > 0 ? "warn" : "ok"}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export default function DevDiagnostics() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [overview, setOverview] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [diagnostics, setDiagnostics] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [expandedError, setExpandedError] = useState(null);
  const [queue, setQueue] = useState(null);
  const [migrations, setMigrations] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, script: null });

  const isAdmin = user?.role === "admin" || user?.role === "dev";

  const flash = useCallback((type, text) => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 6000);
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await remoteClient.maintenance.overview());
    } catch (error) {
      flash("err", error.message || "Falha ao carregar visao geral");
    }
  }, [flash]);

  const loadScripts = useCallback(async () => {
    try {
      setScripts(await remoteClient.maintenance.scripts());
    } catch {
      /* noop */
    }
  }, []);

  const loadErrors = useCallback(async () => {
    try {
      setErrors(await remoteClient.maintenance.errors(100));
    } catch {
      /* noop */
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      setQueue(await remoteClient.maintenance.whatsappQueue());
    } catch {
      /* noop */
    }
  }, []);

  const loadMigrations = useCallback(async () => {
    try {
      setMigrations(await remoteClient.maintenance.migrations());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadOverview();
    loadScripts();
  }, [isAdmin, loadOverview, loadScripts]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "errors") loadErrors();
    if (tab === "queue") loadQueue();
    if (tab === "migrations") loadMigrations();
  }, [isAdmin, loadErrors, loadMigrations, loadQueue, tab]);

  const groupedScripts = useMemo(() => {
    return scripts.reduce((acc, script) => {
      (acc[script.category] ||= []).push(script);
      return acc;
    }, {});
  }, [scripts]);

  if (!user) return <PageState />;
  if (!isAdmin) return <PageState denied />;

  const runDiagnose = async (id) => {
    setBusyId(`diag-${id}`);
    try {
      const result = await remoteClient.maintenance.diagnose(id);
      setDiagnostics((current) => ({ ...current, [id]: result }));
    } catch (error) {
      flash("err", error.message || "Falha no diagnostico");
    } finally {
      setBusyId(null);
    }
  };

  const confirmApply = async () => {
    const id = confirm.script.id;
    setBusyId(`apply-${id}`);
    try {
      if (id === "__migrate__") {
        const result = await remoteClient.maintenance.deployMigrations();
        flash(result.success ? "ok" : "err", result.output?.slice(0, 300) || "Deploy executado.");
        setConfirm({ open: false, script: null });
        loadMigrations();
      } else {
        const result = await remoteClient.maintenance.apply(id);
        flash("ok", result.message || "Correcao aplicada.");
        setDiagnostics((current) => ({ ...current, [id]: undefined }));
        setConfirm({ open: false, script: null });
        loadOverview();
      }
    } catch (error) {
      flash("err", error.message || "Falha ao aplicar");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="devdiag-page">
      <Toast toast={toast} />
      <ConfirmModal
        busy={busyId === `apply-${confirm.script?.id}`}
        onCancel={() => setConfirm({ open: false, script: null })}
        onConfirm={confirmApply}
        open={confirm.open}
        script={confirm.script}
      />

      <main className="devdiag-shell">
        <section className="devdiag-hero">
          <div>
            <span>Manutencao</span>
            <h1>Centro tecnico</h1>
            <p>Diagnostico, auto-correcao controlada, logs de erro, fila WhatsApp e migrations do banco.</p>
          </div>
          <ActionButton onClick={() => {
            loadOverview();
            loadScripts();
            if (tab === "errors") loadErrors();
            if (tab === "queue") loadQueue();
            if (tab === "migrations") loadMigrations();
          }}>
            <RefreshCw size={15} />
            Atualizar
          </ActionButton>
        </section>

        <section className="devdiag-tabs">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button className={tab === item.id ? "active" : ""} key={item.id} onClick={() => setTab(item.id)} type="button">
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </section>

        {tab === "overview" && (
          <section className="devdiag-view">
            {!overview ? (
              <div className="devdiag-empty">
                <Loader2 className="devdiag-spin" size={26} />
                Carregando saude do sistema...
              </div>
            ) : (
              <>
                <section className="devdiag-panel">
                  <div className="devdiag-panel-head">
                    <div className="devdiag-icon">
                      <Activity size={18} />
                    </div>
                    <div>
                      <strong>Saude dos servicos</strong>
                      <span>Uptime: {Math.floor((overview.uptime || 0) / 60)} min</span>
                    </div>
                  </div>
                  <div className="devdiag-health-grid">
                    <HealthItem label="Banco de dados" ok={overview.health?.database} />
                    <HealthItem label="Redis / Fila" ok={overview.health?.redis} />
                    <HealthItem label="Push VAPID" ok={overview.health?.vapidConfigured} />
                    <HealthItem label="Evolution API" ok={overview.health?.evolutionConfigured} />
                  </div>
                </section>

                <section className="devdiag-panel">
                  <div className="devdiag-panel-head">
                    <div className="devdiag-icon warn">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <strong>Problemas detectados</strong>
                      <span>Use scripts para corrigir cada grupo.</span>
                    </div>
                  </div>
                  <div className="devdiag-issue-grid">
                    <IssueCard label="Pedidos presos" value={overview.issues?.stuckRequests || 0} />
                    <IssueCard label="Faturas vencidas" value={overview.issues?.overdueInvoices || 0} />
                    <IssueCard label="Revendedores orfaos" value={overview.issues?.orphanResellers || 0} />
                    <IssueCard label="Faturas inexistentes" value={overview.issues?.danglingInvoices || 0} />
                    <IssueCard label="Tokens expirados" value={overview.issues?.expiredTokens || 0} />
                    <IssueCard label="Push antigo" value={overview.issues?.stalePushSubscriptions || 0} />
                    <IssueCard label="Erros nao resolvidos" value={overview.issues?.unresolvedErrors || 0} />
                  </div>
                </section>
              </>
            )}
          </section>
        )}

        {tab === "scripts" && (
          <section className="devdiag-view">
            {Object.keys(groupedScripts).length === 0 ? (
              <div className="devdiag-empty">Carregando scripts...</div>
            ) : (
              Object.entries(groupedScripts).map(([category, items]) => (
                <section className="devdiag-panel" key={category}>
                  <div className="devdiag-panel-head">
                    <div className="devdiag-icon">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <strong>{CATEGORY_LABEL[category] || category}</strong>
                      <span>{items.length} script(s)</span>
                    </div>
                  </div>
                  <div className="devdiag-script-list">
                    {items.map((script) => {
                      const danger = DANGER[script.danger] || DANGER.medium;
                      const diag = diagnostics[script.id];
                      return (
                        <article className="devdiag-script" key={script.id}>
                          <div className="devdiag-script-main">
                            <strong>{script.name}</strong>
                            <span>{script.description}</span>
                            <small className={danger.className}>risco {danger.label}</small>
                          </div>
                          <div className="devdiag-script-actions">
                            <ActionButton disabled={busyId === `diag-${script.id}`} onClick={() => runDiagnose(script.id)}>
                              {busyId === `diag-${script.id}` ? <Loader2 className="devdiag-spin" size={15} /> : <Stethoscope size={15} />}
                              Diagnosticar
                            </ActionButton>
                            <ActionButton className="primary" disabled={!diag} onClick={() => setConfirm({ open: true, script })}>
                              <Play size={15} />
                              Corrigir
                            </ActionButton>
                          </div>
                          {diag && (
                            <div className="devdiag-result">
                              <strong>{diag.message}</strong>
                              {Array.isArray(diag.samples) && diag.samples.length > 0 && (
                                <pre>{JSON.stringify(diag.samples, null, 2)}</pre>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </section>
        )}

        {tab === "errors" && (
          <section className="devdiag-view">
            <div className="devdiag-toolbar">
              <span>{errors.length} erro(s) registrado(s)</span>
              <div>
                <ActionButton onClick={loadErrors}><RefreshCw size={15} />Atualizar</ActionButton>
                <ActionButton className="danger" onClick={async () => {
                  await remoteClient.maintenance.clearErrors();
                  flash("ok", "Log de erros limpo.");
                  loadErrors();
                }}>
                  <Trash2 size={15} /> Limpar tudo
                </ActionButton>
              </div>
            </div>

            {errors.length === 0 ? (
              <div className="devdiag-empty">
                <CheckCircle2 size={28} />
                Nenhum erro registrado.
              </div>
            ) : (
              <div className="devdiag-error-list">
                {errors.map((error) => {
                  const expanded = expandedError === error.id;
                  return (
                    <article className={`devdiag-error ${error.resolved ? "resolved" : ""}`} key={error.id}>
                      <button onClick={() => setExpandedError(expanded ? null : error.id)} type="button">
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <strong>{error.statusCode}</strong>
                        <span>{error.method} {error.path}</span>
                        <time>{error.createdAt?.slice(0, 19).replace("T", " ")}</time>
                      </button>
                      <p>{error.message}</p>
                      {expanded && (
                        <div className="devdiag-error-detail">
                          {error.stack && <pre>{error.stack}</pre>}
                          {!error.resolved && (
                            <ActionButton onClick={async () => {
                              await remoteClient.maintenance.resolveError(error.id);
                              loadErrors();
                            }}>
                              <CheckCircle2 size={15} />
                              Marcar resolvido
                            </ActionButton>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "queue" && (
          <section className="devdiag-view">
            <div className="devdiag-toolbar">
              <span>Fila WhatsApp</span>
              <div>
                <ActionButton onClick={loadQueue}><RefreshCw size={15} />Atualizar</ActionButton>
                <ActionButton className="primary" onClick={async () => {
                  const result = await remoteClient.maintenance.retryWhatsapp();
                  flash("ok", `${result.retried} job(s) reenfileirado(s).`);
                  loadQueue();
                }}>
                  <RefreshCw size={15} /> Reprocessar falhas
                </ActionButton>
              </div>
            </div>

            {!queue ? (
              <div className="devdiag-empty">Carregando fila...</div>
            ) : (
              <>
                <section className="devdiag-panel">
                  <div className="devdiag-queue-grid">
                    {Object.entries(queue.counts || {}).map(([key, value]) => (
                      <IssueCard key={key} label={key} value={value} />
                    ))}
                  </div>
                </section>
                {queue.failed?.length > 0 && (
                  <section className="devdiag-panel">
                    <div className="devdiag-panel-head">
                      <div className="devdiag-icon danger"><AlertTriangle size={18} /></div>
                      <div>
                        <strong>Falhas recentes</strong>
                        <span>{queue.failed.length} job(s)</span>
                      </div>
                    </div>
                    <div className="devdiag-failed-list">
                      {queue.failed.map((job) => (
                        <article key={job.id}>
                          <strong>{job.phone} - {job.attemptsMade} tentativa(s)</strong>
                          <span>{job.failedReason}</span>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        )}

        {tab === "migrations" && (
          <section className="devdiag-view">
            <div className="devdiag-toolbar">
              <span>Banco / Migrations</span>
              <div>
                <ActionButton onClick={loadMigrations}><RefreshCw size={15} />Verificar</ActionButton>
                <ActionButton className="primary" onClick={() => setConfirm({
                  open: true,
                  script: {
                    danger: "high",
                    description: "Executa prisma migrate deploy no banco de dados.",
                    id: "__migrate__",
                    name: "Aplicar migrations pendentes",
                  },
                })}>
                  <Database size={15} /> Aplicar migrations
                </ActionButton>
              </div>
            </div>

            <section className="devdiag-panel">
              {!migrations ? (
                <div className="devdiag-empty">Clique em verificar para checar as migrations.</div>
              ) : (
                <>
                  <div className={`devdiag-migration-state ${migrations.pending ? "warn" : "ok"}`}>
                    {migrations.pending ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                    <strong>{migrations.pending ? "Ha migrations pendentes" : "Banco atualizado"}</strong>
                  </div>
                  <pre className="devdiag-pre">{migrations.output}</pre>
                </>
              )}
            </section>
          </section>
        )}
      </main>

      <style>{devDiagnosticsStyles}</style>
    </div>
  );
}

const devDiagnosticsStyles = `
.devdiag-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.devdiag-shell {
  width: min(1260px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.devdiag-hero,
.devdiag-tabs,
.devdiag-panel,
.devdiag-empty,
.devdiag-toolbar,
.devdiag-state,
.devdiag-confirm {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.devdiag-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.devdiag-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.devdiag-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(34px, 5.6vw, 64px);
  line-height: .9;
  font-weight: 950;
}

.devdiag-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.devdiag-action {
  border: 0;
  min-height: 42px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.devdiag-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.devdiag-action.danger {
  color: #ffb4b4;
  background: rgba(255, 91, 91, .08);
}

.devdiag-action:disabled {
  cursor: not-allowed;
  opacity: .52;
}

.devdiag-tabs {
  border-radius: 24px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.devdiag-tabs button {
  border: 0;
  min-height: 48px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 950;
}

.devdiag-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.devdiag-view {
  display: grid;
  gap: 16px;
}

.devdiag-panel,
.devdiag-empty,
.devdiag-toolbar {
  min-width: 0;
  border-radius: 26px;
  padding: 16px;
}

.devdiag-panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.devdiag-icon {
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

.devdiag-icon.warn,
.devdiag-health.bad svg,
.devdiag-issue.warn strong,
.devdiag-migration-state.warn svg {
  color: #f5b942;
}

.devdiag-icon.danger {
  color: #ff5b5b;
}

.devdiag-panel-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.devdiag-panel-head span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.devdiag-health-grid,
.devdiag-issue-grid,
.devdiag-queue-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.devdiag-issue-grid {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.devdiag-health,
.devdiag-issue,
.devdiag-script,
.devdiag-result,
.devdiag-error,
.devdiag-failed-list article,
.devdiag-migration-state,
.devdiag-warning {
  border: 0;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.devdiag-health,
.devdiag-issue {
  border-radius: 18px;
  padding: 13px;
  display: grid;
  gap: 6px;
}

.devdiag-health svg,
.devdiag-migration-state.ok svg {
  color: var(--j2-accent);
}

.devdiag-health span,
.devdiag-issue span {
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.devdiag-health strong,
.devdiag-issue strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.devdiag-issue strong {
  color: var(--j2-accent);
  font-size: 30px;
}

.devdiag-script-list,
.devdiag-error-list,
.devdiag-failed-list {
  display: grid;
  gap: 10px;
}

.devdiag-script {
  border-radius: 20px;
  padding: 13px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.devdiag-script-main {
  min-width: 0;
}

.devdiag-script-main strong {
  display: block;
  color: var(--j2-text);
  font-size: 14px;
  font-weight: 950;
}

.devdiag-script-main span {
  display: block;
  margin-top: 4px;
  color: var(--j2-muted);
  font-size: 12px;
}

.devdiag-script-main small {
  display: inline-flex;
  margin-top: 9px;
  color: var(--j2-muted);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.devdiag-script-main small.ok { color: var(--j2-accent); }
.devdiag-script-main small.warn { color: #f5b942; }
.devdiag-script-main small.danger { color: #ff5b5b; }

.devdiag-script-actions,
.devdiag-actions-row,
.devdiag-toolbar > div {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.devdiag-result {
  grid-column: 1 / -1;
  border-radius: 16px;
  padding: 11px;
}

.devdiag-result strong {
  color: var(--j2-accent);
  font-size: 12px;
}

.devdiag-result pre,
.devdiag-error-detail pre,
.devdiag-pre {
  max-height: 260px;
  overflow: auto;
  margin: 9px 0 0;
  color: var(--j2-muted);
  white-space: pre-wrap;
  font-size: 11px;
}

.devdiag-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--j2-muted);
  font-size: 13px;
  font-weight: 900;
}

.devdiag-error {
  border-radius: 20px;
  padding: 12px;
}

.devdiag-error.resolved {
  opacity: .55;
}

.devdiag-error > button {
  border: 0;
  width: 100%;
  display: grid;
  grid-template-columns: auto 54px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.devdiag-error > button strong {
  color: #ff5b5b;
  font-size: 12px;
}

.devdiag-error > button span,
.devdiag-error p {
  overflow: hidden;
  color: var(--j2-text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.devdiag-error > button time {
  color: var(--j2-muted);
  font-size: 11px;
  white-space: nowrap;
}

.devdiag-error p {
  margin: 8px 0 0 25px;
  color: var(--j2-muted);
}

.devdiag-error-detail {
  margin-top: 10px;
  padding-left: 25px;
}

.devdiag-failed-list article {
  border-radius: 17px;
  padding: 12px;
}

.devdiag-failed-list strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
}

.devdiag-failed-list span {
  display: block;
  margin-top: 5px;
  color: #ffb4b4;
  font-family: monospace;
  font-size: 11px;
}

.devdiag-migration-state {
  border-radius: 17px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 9px;
}

.devdiag-migration-state strong {
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.devdiag-empty {
  min-height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.devdiag-state {
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

.devdiag-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.devdiag-state p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.devdiag-toast {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  max-width: min(380px, calc(100vw - 32px));
  border-radius: 18px;
  padding: 13px 15px;
  color: var(--j2-text);
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
  font-size: 13px;
  white-space: pre-wrap;
}

.devdiag-toast.ok { color: var(--j2-accent); }
.devdiag-toast.bad { color: #ffb4b4; }

.devdiag-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.76);
}

.devdiag-confirm {
  width: min(460px, 100%);
  border-radius: 26px;
  padding: 18px;
}

.devdiag-confirm h3 {
  margin: 4px 0 8px;
  color: var(--j2-text);
  font-size: 16px;
  font-weight: 950;
}

.devdiag-confirm p {
  margin: 0 0 14px;
  color: var(--j2-muted);
  font-size: 13px;
}

.devdiag-warning {
  border-radius: 16px;
  padding: 11px;
  margin-bottom: 12px;
  color: #ffb4b4;
  font-size: 12px;
  font-weight: 850;
}

.devdiag-spin {
  animation: devdiagSpin .8s linear infinite;
}

@keyframes devdiagSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 960px) {
  .devdiag-health-grid,
  .devdiag-queue-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .devdiag-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .devdiag-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .devdiag-hero h1 {
    font-size: clamp(34px, 10vw, 50px);
  }

  .devdiag-hero .devdiag-action,
  .devdiag-actions-row .devdiag-action,
  .devdiag-toolbar .devdiag-action,
  .devdiag-script-actions .devdiag-action {
    width: 100%;
  }

  .devdiag-tabs {
    display: flex;
    overflow-x: auto;
  }

  .devdiag-tabs button {
    min-width: 104px;
    flex: 0 0 auto;
  }

  .devdiag-health-grid,
  .devdiag-queue-grid,
  .devdiag-script,
  .devdiag-toolbar,
  .devdiag-error > button {
    grid-template-columns: 1fr;
  }

  .devdiag-toolbar,
  .devdiag-toolbar > div,
  .devdiag-script-actions,
  .devdiag-actions-row {
    display: grid;
    grid-template-columns: 1fr;
  }

  .devdiag-error > button time,
  .devdiag-error > button span,
  .devdiag-error p {
    white-space: normal;
  }

  .devdiag-error p,
  .devdiag-error-detail {
    margin-left: 0;
    padding-left: 0;
  }
}
`;
