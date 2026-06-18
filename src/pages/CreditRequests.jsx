import React, { useState, useEffect, useCallback } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  Plus, RefreshCw, Search, X, Download, Eye, MessageSquare,
  History, Edit, Trash2, ChevronRight, Zap, Clock, CheckCircle2,
  XCircle, AlertTriangle, List, ExternalLink, CreditCard, Banknote, Users
} from "lucide-react";
import NewRequestForm from "@/components/requests/NewRequestForm";
import MultiRequestForm from "@/components/requests/MultiRequestForm";
import RequestActions from "@/components/requests/RequestActions";
import RequestMessages from "@/components/requests/RequestMessages";
import AuditTrail from "@/components/requests/AuditTrail";
import ProofViewer from "@/components/requests/ProofViewer";
import PhoneRequiredBanner from "@/components/layout/PhoneRequiredBanner";
import PixKeysDisplay from "@/components/dashboard/PixKeysDisplay";
import { hasUserWhatsApp } from "@/utils/contact";

const TABS = [
  { key: "all", label: "Todos", tone: "neutral", icon: List },
  { key: "pending", label: "Pendentes", tone: "warning", icon: Clock },
  { key: "analyzing", label: "Em análise", tone: "accent", icon: AlertTriangle },
  { key: "recharged", label: "Aprovados", tone: "success", icon: CheckCircle2 },
  { key: "rejected", label: "Rejeitados", tone: "danger", icon: XCircle },
  { key: "cancelled", label: "Cancelados", tone: "muted", icon: XCircle },
];

const STATUS_META = {
  all: { label: "Todos", color: "var(--j2-muted)" },
  pending: { label: "Pendente", color: "#fbbf24" },
  analyzing: { label: "Em análise", color: "var(--j2-accent)" },
  recharged: { label: "Aprovado", color: "#ff8a4a" },
  rejected: { label: "Rejeitado", color: "#f87171" },
  cancelled: { label: "Cancelado", color: "var(--j2-faint)" },
};

function statusInfo(status) {
  return STATUS_META[status] || STATUS_META.all;
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="cr-stat-card">
      <div className="cr-icon-sunken">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const meta = statusInfo(status);
  return (
    <span className="cr-status-pill" style={{ "--status": meta.color }}>
      <i />
      {meta.label}
    </span>
  );
}

function ActionBtn({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button type="button" className={`cr-action-btn ${danger ? "danger" : ""}`} onClick={onClick}>
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function RequestCard({ request, currentUser, reseller, onUpdate, onEdit, onCancel, onProof, onChat, onHistory }) {
  const [expanded, setExpanded] = useState(false);
  const meta = statusInfo(request.status);
  const credits = Number(request.requested_credits || 0);
  const value = Number(request.total_value || 0);
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "dev";
  const canEdit = currentUser?.id === request.reseller_id && request.status === "pending";
  const canAdminAct = isAdmin && ["pending", "analyzing"].includes(request.status);

  const details = [
    ["Login", request.login || "-"],
    ["Servidor", request.server_snapshot?.name || "-"],
    ["R$/crédito", request.server_snapshot?.value_per_credit ? `R$ ${Number(request.server_snapshot.value_per_credit).toFixed(2)}` : "-"],
    ["Créditos", credits.toLocaleString("pt-BR")],
    ["Total", `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Pagamento", request.payment_type === "postpaid" ? "Pós-pago" : "Pré-pago"],
  ];

  if (request.status === "rejected" && request.rejection_reason) details.push(["Rejeição", request.rejection_reason]);
  if (request.notes) details.push(["Observação", request.notes]);

  return (
    <article className={`cr-request-card ${expanded ? "expanded" : ""}`}>
      <button type="button" className="cr-request-summary" onClick={() => setExpanded((open) => !open)}>
        <div className="cr-request-main">
          <div className="cr-request-topline">
            <StatusPill status={request.status} />
            {reseller && (
              <span className="cr-reseller-name">{reseller.full_name || reseller.name || reseller.email}</span>
            )}
          </div>
          <h3>{request.server_snapshot?.name || "Servidor não informado"}</h3>
          <p>{request.login || "Login não informado"}</p>
        </div>

        <div className="cr-request-numbers">
          <strong>{credits.toLocaleString("pt-BR")} cr</strong>
          <span>R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>

        <ChevronRight className="cr-chevron" size={18} style={{ color: meta.color }} />
      </button>

      {expanded && (
        <div className="cr-request-expanded">
          <div className="cr-detail-grid">
            {details.map(([label, val]) => (
              <div className="cr-detail-cell" key={label}>
                <span>{label}</span>
                <strong>{val}</strong>
              </div>
            ))}
          </div>

          <div className="cr-card-actions">
            {request.server_snapshot?.panel_link && (
              <ActionBtn icon={ExternalLink} label="Painel" onClick={() => window.open(request.server_snapshot.panel_link, "_blank")} />
            )}
            {request.proof_of_payment_url && (
              <ActionBtn icon={Eye} label="Comprovante" onClick={() => onProof(request.proof_of_payment_url)} />
            )}
            <ActionBtn icon={MessageSquare} label="Chat" onClick={() => onChat(request)} />
            <ActionBtn icon={History} label="Histórico" onClick={() => onHistory(request)} />
            {canEdit && (
              <>
                <ActionBtn icon={Edit} label="Editar" onClick={() => onEdit(request)} />
                <ActionBtn icon={Trash2} label="Cancelar" danger onClick={() => onCancel(request)} />
              </>
            )}
            {canAdminAct && (
              <div className="cr-admin-actions">
                <RequestActions request={request} currentUser={currentUser} onUpdate={onUpdate} />
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function CreditRequests() {
  const [user, setUser] = useState(null);
  const [all, setAll] = useState([]);
  const [resellers, setResellers] = useState({});
  const [pixKeys, setPixKeys] = useState([]);
  const [allServers, setAllServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showMulti, setShowMulti] = useState(false);
  const [editReq, setEditReq] = useState(null);
  const [chatReq, setChatReq] = useState(null);
  const [auditReq, setAuditReq] = useState(null);
  const [proofUrl, setProofUrl] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cu = await remoteClient.auth.me();
        setUser(cu);
        if (cu.role === "user") {
          const settings = await remoteClient.settings.getPublic().catch(() => null);
          if (settings) setPixKeys(settings.pix_keys?.filter((k) => k.is_active) || []);
          await loadServers(cu.id);
        }
      } catch (error) {
        console.warn("[CreditRequests] Falha ao carregar usuário inicial:", error);
        setLoading(false);
      }
    })();
  }, []);

  const loadServers = async () => {
    try {
      const [allSrvs, resellerSrvs] = await Promise.all([
        remoteClient.servers.list().catch(() => []),
        remoteClient.resellerServers.list().catch(() => []),
      ]);
      const resellerMap = {};
      (resellerSrvs || []).forEach((r) => { resellerMap[r.server_id] = r; });
      const globalServers = (allSrvs || []).filter((s) =>
        !s.owner_id || s.owner_id === "" || s.owner_id === "admin_global" || s.owner_id === "admin"
      );
      const baseServers = globalServers.length > 0 ? globalServers : (allSrvs || []);
      const merged = baseServers
        .filter((s) => resellerMap[s.id])
        .map((s) => ({
          ...s,
          value_per_credit: resellerMap[s.id].value_per_credit,
          username: resellerMap[s.id].login,
        }));
      setAllServers(merged);
    } catch (error) {
      console.error("[CreditRequests] loadServers error:", error);
    }
  };

  const load = useCallback(async (showSpin = false) => {
    if (!user) return;
    if (showSpin) setRefreshing(true);
    else setLoading(true);

    try {
      if (user.role === "admin" || user.role === "dev") {
        const [users, requests] = await Promise.all([
          remoteClient.users.list().catch(() => []),
          remoteClient.creditRequests.list(null, 200).then((r) => r.data || []).catch(() => []),
        ]);
        const resellerMap = {};
        users.filter((u) => u.role === "user").forEach((u) => { resellerMap[u.id] = u; });
        setAll(requests);
        setResellers(resellerMap);
      } else {
        const requests = await remoteClient.creditRequests.list(null, 200).then((r) => r.data || []).catch(() => []);
        setAll(requests);
      }
    } catch (error) {
      console.warn("[CreditRequests] Falha ao carregar pedidos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const reset = () => {
    setShowNew(false);
    setShowMulti(false);
    setEditReq(null);
    load(true);
    if (user?.role === "user") loadServers();
  };

  const filtered = all.filter((request) => {
    if (tab !== "all" && request.status !== tab) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const reseller = resellers[request.reseller_id];
    return (
      request.login?.toLowerCase().includes(q) ||
      request.server_snapshot?.name?.toLowerCase().includes(q) ||
      request.id?.toLowerCase().includes(q) ||
      reseller?.email?.toLowerCase().includes(q) ||
      reseller?.name?.toLowerCase().includes(q) ||
      reseller?.full_name?.toLowerCase().includes(q)
    );
  });

  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, t.key === "all" ? all.length : all.filter((r) => r.status === t.key).length])
  );
  const openCount = (counts.pending || 0) + (counts.analyzing || 0);
  const totalValue = all.reduce((sum, r) => sum + Number(r.total_value || 0), 0);
  const totalCredits = all.reduce((sum, r) => sum + Number(r.requested_credits || 0), 0);
  const userHasWhatsApp = hasUserWhatsApp(user);

  const handleExport = () => {
    const header = ["ID", "Data", "Servidor", "Login", "Créditos", "Valor", "Status"];
    const rows = filtered.map((r) => [
      r.id,
      new Date(r.created_date).toLocaleString("pt-BR"),
      r.server_snapshot?.name || "",
      r.login,
      r.requested_credits,
      r.total_value?.toFixed(2),
      r.status,
    ]);
    const csv = "data:text/csv;charset=utf-8," + [header, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = Object.assign(document.createElement("a"), { href: encodeURI(csv), download: "pedidos.csv" });
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="cr-page cr-loading">
        <div className="cr-loader" />
        <style>{creditRequestStyles}</style>
      </div>
    );
  }

  return (
    <div className="cr-page">
      <div className="cr-shell">
        <PhoneRequiredBanner user={user} />
        {user?.role === "user" && pixKeys.length > 0 && <PixKeysDisplay keys={pixKeys} />}

        <section className="cr-hero">
          <div className="cr-hero-copy">
            <span className="cr-kicker">Gestor J2</span>
            <h1>{user?.role === "admin" || user?.role === "dev" ? "Pedidos de recarga" : "Meus pedidos"}</h1>
            <p>{counts.all} pedidos no total, {openCount} aguardando andamento.</p>
          </div>

          <div className="cr-hero-actions">
            <button type="button" className="cr-icon-btn" onClick={() => load(true)} aria-label="Atualizar pedidos">
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            </button>
            <button type="button" className="cr-icon-btn" onClick={handleExport} aria-label="Exportar pedidos">
              <Download size={17} />
            </button>
            {user?.role === "user" && (
              <>
                <button type="button" className="cr-secondary-btn" disabled={!userHasWhatsApp} onClick={() => { setEditReq(null); setShowMulti(false); loadServers(); setShowNew((v) => !v); }}>
                  <Plus size={15} />
                  Simples
                </button>
                <button type="button" className="cr-primary-btn" disabled={!userHasWhatsApp} onClick={() => { setShowNew(false); setShowMulti((v) => !v); }}>
                  <Plus size={15} />
                  Múltiplo
                </button>
              </>
            )}
          </div>
        </section>

        <section className="cr-stats">
          <StatCard icon={CreditCard} label="Pedidos" value={counts.all} detail={`${openCount} em aberto`} />
          <StatCard icon={Zap} label="Créditos" value={totalCredits.toLocaleString("pt-BR")} detail="volume solicitado" />
          <StatCard icon={Banknote} label="Valor" value={`R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} detail="soma geral" />
          {(user?.role === "admin" || user?.role === "dev") && <StatCard icon={Users} label="Revendedores" value={Object.keys(resellers).length} detail="com cadastro" />}
        </section>

        {(showNew || showMulti) && (
          <section className="cr-form-zone">
            {showNew && (
              <NewRequestForm request={editReq} servers={allServers} user={user} onSuccess={reset} onCancel={() => { setShowNew(false); setEditReq(null); }} />
            )}
            {showMulti && (
              <MultiRequestForm servers={allServers} user={user} onSuccess={reset} onCancel={() => setShowMulti(false)} />
            )}
          </section>
        )}

        <section className="cr-workbench">
          <div className="cr-filter-panel">
            <div className="cr-search">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por login, servidor, ID ou revendedor..." />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca">
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="cr-tabs">
              {TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.key;
                return (
                  <button type="button" key={item.key} className={active ? "active" : ""} onClick={() => setTab(item.key)}>
                    <Icon size={15} />
                    <span>{item.label}</span>
                    <strong>{counts[item.key] || 0}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cr-list-panel">
            <div className="cr-list-head">
              <div>
                <span>Fila selecionada</span>
                <strong>{filtered.length} pedidos</strong>
              </div>
              <small>{statusInfo(tab).label}</small>
            </div>

            {filtered.length === 0 ? (
              <div className="cr-empty">
                <div className="cr-icon-sunken">
                  <Zap size={22} />
                </div>
                <strong>Nenhum pedido encontrado</strong>
                <span>{search ? "Tente outro termo de busca." : "Mude o filtro ou crie um novo pedido."}</span>
              </div>
            ) : (
              <div className="cr-request-list">
                {filtered.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    currentUser={user}
                    reseller={resellers[request.reseller_id]}
                    onUpdate={reset}
                    onEdit={(req) => { setEditReq(req); setShowNew(true); }}
                    onCancel={async (req) => {
                      if (!window.confirm("Cancelar este pedido?")) return;
                      await remoteClient.creditRequests.cancel(req.id);
                      reset();
                    }}
                    onProof={setProofUrl}
                    onChat={setChatReq}
                    onHistory={setAuditReq}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {chatReq && <RequestMessages request={chatReq} user={user} onClose={() => setChatReq(null)} />}
      {auditReq && <AuditTrail request={auditReq} onClose={() => setAuditReq(null)} />}
      {proofUrl && <ProofViewer fileUrl={proofUrl} isOpen={!!proofUrl} onClose={() => setProofUrl(null)} />}

      <style>{creditRequestStyles}</style>
    </div>
  );
}

const creditRequestStyles = `
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .8s linear infinite; }
.cr-page {
  --j2-bg: #030404;
  --j2-bg-soft: #080909;
  --j2-surface: rgba(6, 7, 7, .96);
  --j2-surface-2: rgba(9, 10, 10, .96);
  --j2-sunken-bg: rgba(3, 4, 4, .76);
  --j2-text: #fff8f2;
  --j2-muted: #a3a09b;
  --j2-faint: #67615c;
  --j2-accent: #ff4b12;
  --j2-accent-deep: #8f1608;
  --j2-neu: 8px 10px 22px rgba(0,0,0,.44), -4px -4px 12px rgba(255,255,255,.016), inset 1px 1px 0 rgba(255,255,255,.014);
  --j2-sunken: inset 3px 3px 8px rgba(0,0,0,.34), inset -2px -2px 6px rgba(255,255,255,.016);
  min-height: 100dvh;
  background: linear-gradient(135deg, var(--j2-bg), var(--j2-bg-soft) 52%, #010202);
  color: var(--j2-text);
}
.cr-loading {
  display: grid;
  place-items: center;
}
.cr-loader {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu);
  animation: spin 1.2s linear infinite;
}
.cr-shell {
  width: 100%;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.5vw, 22px);
}
.cr-hero,
.cr-filter-panel,
.cr-list-panel,
.cr-form-zone,
.cr-request-card,
.cr-stat-card {
  background: var(--j2-surface);
  border: 0;
  box-shadow: var(--j2-neu);
}
.cr-hero {
  min-height: 116px;
  border-radius: 26px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.cr-kicker {
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.cr-hero h1 {
  margin: 4px 0 6px;
  font-size: clamp(28px, 4vw, 54px);
  line-height: .95;
  letter-spacing: 0;
  color: var(--j2-text);
}
.cr-hero p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}
.cr-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
.cr-icon-btn,
.cr-secondary-btn,
.cr-primary-btn,
.cr-action-btn,
.cr-tabs button {
  border: 0;
  min-height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform .16s ease, opacity .16s ease;
  font-weight: 850;
}
.cr-icon-btn,
.cr-secondary-btn,
.cr-action-btn,
.cr-tabs button {
  background: var(--j2-surface-2);
  color: var(--j2-muted);
  box-shadow: var(--j2-neu);
}
.cr-icon-btn {
  width: 42px;
}
.cr-secondary-btn,
.cr-primary-btn {
  padding: 0 16px;
  font-size: 13px;
}
.cr-primary-btn {
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  color: #fff;
  box-shadow: 5px 6px 14px rgba(0,0,0,.32), -2px -2px 8px rgba(255,255,255,.014);
}
.cr-icon-btn:hover,
.cr-secondary-btn:hover,
.cr-primary-btn:hover,
.cr-action-btn:hover,
.cr-tabs button:hover {
  transform: translateY(-1px);
}
.cr-icon-btn:disabled,
.cr-secondary-btn:disabled,
.cr-primary-btn:disabled {
  opacity: .42;
  cursor: not-allowed;
}
.cr-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.cr-stat-card {
  border-radius: 20px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}
.cr-icon-sunken {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: var(--j2-accent);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
  flex: 0 0 auto;
}
.cr-stat-card span,
.cr-list-head span,
.cr-detail-cell span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.cr-stat-card strong {
  display: block;
  color: var(--j2-text);
  font-size: clamp(18px, 2vw, 24px);
  line-height: 1.05;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
.cr-stat-card small {
  color: var(--j2-faint);
  font-size: 11px;
}
.cr-form-zone {
  border-radius: 24px;
  padding: clamp(12px, 1.5vw, 20px);
}
.cr-workbench {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.cr-filter-panel,
.cr-list-panel {
  border-radius: 24px;
  padding: 14px;
  min-width: 0;
  max-width: 100%;
}
.cr-filter-panel {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cr-search {
  min-height: 46px;
  border-radius: 16px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--j2-faint);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.cr-search input {
  width: 100%;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--j2-text);
  font-size: 13px;
}
.cr-search input::placeholder {
  color: var(--j2-faint);
}
.cr-search button {
  border: 0;
  background: transparent;
  color: var(--j2-muted);
  cursor: pointer;
}
.cr-tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cr-tabs button {
  width: 100%;
  justify-content: flex-start;
  padding: 0 12px;
  min-height: 44px;
  font-size: 13px;
}
.cr-tabs button.active {
  color: var(--j2-accent);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.cr-tabs button strong {
  margin-left: auto;
  min-width: 26px;
  height: 22px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  color: var(--j2-text);
  background: rgba(255,255,255,.035);
  font-size: 11px;
}
.cr-list-head {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.cr-list-head strong {
  display: block;
  margin-top: 3px;
  font-size: 20px;
  color: var(--j2-text);
}
.cr-list-head small {
  color: var(--j2-accent);
  font-weight: 900;
}
.cr-request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cr-request-card {
  border-radius: 20px;
  overflow: hidden;
}
.cr-request-summary {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  min-height: 86px;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 20px;
  gap: 14px;
  align-items: center;
}
.cr-request-topline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 7px;
}
.cr-status-pill {
  --status: var(--j2-accent);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--status);
  background: rgba(255,255,255,.028);
  font-size: 11px;
  font-weight: 900;
}
.cr-status-pill i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--status);
}
.cr-reseller-name {
  max-width: min(280px, 42vw);
  color: var(--j2-muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-request-main h3 {
  margin: 0;
  color: var(--j2-text);
  font-size: 17px;
  line-height: 1.18;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-request-main p {
  margin: 4px 0 0;
  color: var(--j2-muted);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-request-numbers {
  text-align: right;
}
.cr-request-numbers strong {
  display: block;
  color: #ff8a4a;
  font-size: 16px;
  line-height: 1.1;
}
.cr-request-numbers span {
  display: block;
  margin-top: 5px;
  color: var(--j2-accent);
  font-size: 13px;
  font-weight: 900;
}
.cr-chevron {
  transition: transform .2s ease;
}
.cr-request-card.expanded .cr-chevron {
  transform: rotate(90deg);
}
.cr-request-expanded {
  padding: 0 14px 14px;
}
.cr-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.cr-detail-cell {
  min-width: 0;
  border-radius: 15px;
  padding: 13px;
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.cr-detail-cell strong {
  display: block;
  margin-top: 6px;
  color: var(--j2-text);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.cr-card-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
}
.cr-action-btn {
  min-height: 38px;
  padding: 0 12px;
  font-size: 12px;
}
.cr-action-btn svg {
  color: var(--j2-accent);
}
.cr-action-btn.danger,
.cr-action-btn.danger svg {
  color: #f87171;
}
.cr-admin-actions {
  margin-left: auto;
  min-width: min(100%, 280px);
}
.cr-empty {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  color: var(--j2-muted);
}
.cr-empty strong {
  color: var(--j2-text);
  font-size: 18px;
}
.cr-empty span {
  font-size: 13px;
}
@media (max-width: 1180px) {
  .cr-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cr-workbench {
    grid-template-columns: minmax(0, 1fr);
    max-width: 100%;
    min-width: 0;
  }
  .cr-filter-panel {
    position: static;
    overflow: hidden;
  }
  .cr-list-panel {
    overflow: hidden;
  }
  .cr-tabs {
    flex-direction: row;
    overflow-x: auto;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .cr-tabs::-webkit-scrollbar {
    display: none;
  }
  .cr-tabs button {
    width: auto;
    flex: 0 0 auto;
  }
}
@media (max-width: 720px) {
  .cr-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
    gap: 12px;
  }
  .cr-hero {
    border-radius: 22px;
    padding: 18px;
    align-items: stretch;
    flex-direction: column;
  }
  .cr-hero h1 {
    font-size: clamp(30px, 11vw, 44px);
  }
  .cr-hero-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
  }
  .cr-icon-btn,
  .cr-secondary-btn,
  .cr-primary-btn {
    width: 100%;
  }
  .cr-stats {
    grid-template-columns: 1fr;
  }
  .cr-stat-card {
    border-radius: 18px;
  }
  .cr-filter-panel,
  .cr-list-panel,
  .cr-form-zone {
    border-radius: 20px;
    padding: 12px;
  }
  .cr-list-head {
    min-height: auto;
    align-items: flex-start;
  }
  .cr-request-summary {
    min-height: auto;
    grid-template-columns: minmax(0, 1fr) 18px;
    grid-template-areas:
      "main arrow"
      "numbers arrow";
    align-items: start;
    gap: 10px;
    padding: 14px;
  }
  .cr-request-main {
    grid-area: main;
  }
  .cr-request-numbers {
    grid-area: numbers;
    text-align: left;
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .cr-chevron {
    grid-area: arrow;
    margin-top: 5px;
  }
  .cr-reseller-name {
    max-width: 64vw;
  }
  .cr-detail-grid {
    grid-template-columns: 1fr;
  }
  .cr-card-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cr-action-btn {
    width: 100%;
  }
  .cr-admin-actions {
    grid-column: 1 / -1;
    margin-left: 0;
    width: 100%;
  }
}
@media (max-width: 390px) {
  .cr-hero-actions,
  .cr-card-actions {
    grid-template-columns: 1fr;
  }
}
`;
