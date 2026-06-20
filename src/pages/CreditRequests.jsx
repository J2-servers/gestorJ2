import React, { useState, useEffect, useCallback } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  Plus, RefreshCw, Search, X, Download, Eye, MessageSquare,
  History, Edit, Trash2, ChevronRight, Zap, Clock, CheckCircle2,
  XCircle, AlertTriangle, List, ExternalLink, CreditCard, Banknote, Users,
  Copy, KeyRound, WalletCards, Layers3, Sparkles, ShieldCheck, ClipboardList
} from "lucide-react";
import NewRequestForm from "@/components/requests/NewRequestForm";
import MultiRequestForm from "@/components/requests/MultiRequestForm";
import RequestActions from "@/components/requests/RequestActions";
import RequestMessages from "@/components/requests/RequestMessages";
import AuditTrail from "@/components/requests/AuditTrail";
import ProofViewer from "@/components/requests/ProofViewer";
import PhoneRequiredBanner from "@/components/layout/PhoneRequiredBanner";
import { hasUserWhatsApp } from "@/utils/contact";
import { useToast } from "@/components/ui/use-toast";

const TABS = [
  { key: "all", label: "Todos", tone: "neutral", icon: List },
  { key: "pending", label: "Pendentes", tone: "warning", icon: Clock },
  { key: "analyzing", label: "Em análise", tone: "accent", icon: AlertTriangle },
  { key: "recharged", label: "Aprovados", tone: "success", icon: CheckCircle2 },
  { key: "rejected", label: "Rejeitados", tone: "danger", icon: XCircle },
  { key: "canceled", label: "Cancelados", tone: "muted", icon: XCircle },
];

const STATUS_META = {
  all: { label: "Todos", color: "var(--j2-muted)" },
  pending: { label: "Pendente", color: "#fbbf24" },
  analyzing: { label: "Em análise", color: "var(--j2-accent)" },
  recharged: { label: "Aprovado", color: "#ff8a4a" },
  rejected: { label: "Rejeitado", color: "#f87171" },
  canceled: { label: "Cancelado", color: "var(--j2-faint)" },
  cancelled: { label: "Cancelado", color: "var(--j2-faint)" },
};

function statusInfo(status) {
  return STATUS_META[status] || STATUS_META.all;
}

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatNumber = (value) => Number(value || 0).toLocaleString("pt-BR");

function MetricTile({ icon: Icon, label, value, detail, tone = "accent" }) {
  return (
    <div className={`cr-metric-tile ${tone}`}>
      <i>
        <Icon size={16} />
      </i>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function PixWallet({ pixKeys }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState("");

  if (!pixKeys || pixKeys.length === 0) return null;

  const copyPix = async (key) => {
    try {
      await navigator.clipboard.writeText(key.key_value);
      setCopied(key.key_value);
      toast({ title: "Chave Pix copiada", description: `${key.bank || "Pix"} pronto para pagamento.`, duration: 2200 });
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      toast({ title: "Nao foi possivel copiar", description: "Toque e segure na chave para copiar manualmente.", variant: "destructive" });
    }
  };

  return (
    <aside className="cr-pix-wallet" aria-label="Chaves Pix para pagamento">
      <div className="cr-pix-head">
        <div className="cr-pix-icon">
          <WalletCards size={18} />
        </div>
        <div>
          <span>Carteira Pix</span>
          <strong>Copie e pague antes de enviar</strong>
        </div>
      </div>

      <div className="cr-pix-list">
        {pixKeys.map((key, index) => (
          <button
            aria-label={`Copiar chave Pix ${key.bank || index + 1}`}
            className={copied === key.key_value ? "copied" : ""}
            key={`${key.key_value}-${index}`}
            onClick={() => copyPix(key)}
            type="button"
          >
            <KeyRound size={14} />
            <span>
              <strong>{key.bank || "Pix"} · {key.type || "chave"}</strong>
              <small>{key.key_value}</small>
            </span>
            {copied === key.key_value ? <CheckCircle2 size={15} /> : <Copy size={15} />}
          </button>
        ))}
      </div>
    </aside>
  );
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
  const shortId = request.id ? `#${String(request.id).slice(-8).toUpperCase()}` : "#";
  const createdAt = request.created_date ? new Date(request.created_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "--/--";
  const resellerName = reseller?.full_name || reseller?.name || reseller?.email || "Revendedor";
  const serverName = request.server_snapshot?.name || "Servidor nao informado";
  const login = request.login || "Login nao informado";

  const details = [
    ["Pedido", shortId],
    ["Data", request.created_date ? new Date(request.created_date).toLocaleString("pt-BR") : "-"],
    ...(isAdmin && reseller ? [["Revendedor", resellerName]] : []),
    ["Login", login],
    ["Servidor", serverName],
    ["R$/crédito", request.server_snapshot?.value_per_credit ? `R$ ${Number(request.server_snapshot.value_per_credit).toFixed(2)}` : "-"],
    ["Créditos", credits.toLocaleString("pt-BR")],
    ["Total", `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Pagamento", request.payment_type === "postpaid" ? "Pós-pago" : "Pré-pago"],
  ];

  if (request.status === "rejected" && request.rejection_reason) details.push(["Rejeição", request.rejection_reason]);
  if (request.notes) details.push(["Observação", request.notes]);

  return (
    <article className={`cr-request-card ${expanded ? "expanded" : ""} ${isAdmin ? "admin-card" : "reseller-card"}`}>
      <button type="button" className="cr-request-summary" onClick={() => setExpanded((open) => !open)}>
        <div className="cr-request-status-slot">
          <StatusPill status={request.status} />
        </div>
        <div className="cr-request-main">
          <div className="cr-request-topline">
            <span className="cr-request-id">{shortId}</span>
            <span className="cr-request-date">{createdAt}</span>
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
  const isAdmin = user?.role === "admin" || user?.role === "dev";
  const isReseller = user?.role === "user";

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
    <div className={`cr-page ${isAdmin ? "admin-mode" : "reseller-mode"}`}>
      <div className="cr-shell">
        <PhoneRequiredBanner user={user} />

        <section className={`cr-command-deck ${isAdmin ? "admin" : "reseller"}`}>
          <div className="cr-command-copy">
            <span className="cr-kicker">{isAdmin ? "Fila operacional" : "Pedidos + Pix"}</span>
            <h1>{isAdmin ? "Central de recargas" : "Recarregar creditos"}</h1>
            <p>
              {isAdmin
                ? `${openCount} pedidos precisam de atencao agora.`
                : "Escolha o pedido, copie o Pix e anexe o comprovante no mesmo fluxo."}
            </p>

            <div className="cr-command-metrics">
              <MetricTile icon={ClipboardList} label="Pedidos" value={counts.all} detail={`${openCount} em aberto`} tone="amber" />
              <MetricTile icon={Zap} label="Creditos" value={formatNumber(totalCredits)} detail="volume total" tone="orange" />
              <MetricTile icon={Banknote} label="Valor" value={formatCurrency(totalValue)} detail="em pedidos" tone="green" />
              {isAdmin && <MetricTile icon={Users} label="Revendas" value={Object.keys(resellers).length} detail="cadastradas" tone="blue" />}
            </div>
          </div>

          <div className="cr-command-side">
            {isReseller && <PixWallet pixKeys={pixKeys} />}

            <div className="cr-command-actions">
              <button type="button" className="cr-icon-btn" onClick={() => load(true)} aria-label="Atualizar pedidos">
                <RefreshCw size={17} className={refreshing ? "spin" : ""} />
              </button>
              <button type="button" className="cr-icon-btn" onClick={handleExport} aria-label="Exportar pedidos">
                <Download size={17} />
              </button>
              {isReseller && (
                <>
                  <button type="button" className="cr-secondary-btn" disabled={!userHasWhatsApp} onClick={() => { setEditReq(null); setShowMulti(false); loadServers(); setShowNew((v) => !v); }}>
                    <Plus size={15} />
                    Pedido rapido
                  </button>
                  <button type="button" className="cr-primary-btn" disabled={!userHasWhatsApp} onClick={() => { setShowNew(false); setShowMulti((v) => !v); }}>
                    <Layers3 size={15} />
                    Pedido multiplo
                  </button>
                </>
              )}
              {isAdmin && (
                <div className="cr-admin-signal">
                  <ShieldCheck size={15} />
                  <span>Modo aprovacao</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="cr-status-rail" aria-label="Resumo por status">
          {TABS.slice(0, isAdmin ? 6 : 5).map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={tab === item.key ? "active" : ""}
                key={`rail-${item.key}`}
                onClick={() => setTab(item.key)}
                style={{ "--rail-color": statusInfo(item.key).color }}
                type="button"
              >
                <Icon size={15} />
                <span>{item.label}</span>
                <strong>{counts[item.key] || 0}</strong>
              </button>
            );
          })}
        </section>

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
            {isReseller && pixKeys.length > 0 && (
              <div className="cr-form-pix-hint">
                <Sparkles size={16} />
                <span>Use a carteira Pix acima para copiar a chave antes de anexar o comprovante.</span>
              </div>
            )}
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
.cr-stats {
  display: none !important;
}
.cr-command-deck,
.cr-status-rail,
.cr-pix-wallet {
  background: var(--j2-surface);
  border: 0;
  box-shadow: var(--j2-neu);
}
.cr-command-deck {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 30px;
  padding: clamp(16px, 2vw, 26px);
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr);
  gap: clamp(14px, 2vw, 24px);
}
.cr-command-deck::before {
  content: "";
  position: absolute;
  inset: auto -12% -55% 45%;
  height: 210px;
  z-index: -1;
  background:
    radial-gradient(circle at center, rgba(255, 75, 18, .13), transparent 63%),
    radial-gradient(circle at 78% 24%, rgba(25, 177, 135, .075), transparent 42%);
  pointer-events: none;
}
.cr-command-copy {
  min-width: 0;
  display: grid;
  align-content: space-between;
  gap: 18px;
}
.cr-command-copy h1 {
  max-width: 760px;
  margin: 4px 0 8px;
  color: var(--j2-text);
  font-size: clamp(30px, 4.8vw, 62px);
  line-height: .93;
  letter-spacing: 0;
}
.cr-command-copy p {
  max-width: 560px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.5;
}
.cr-command-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.cr-metric-tile {
  min-width: 0;
  min-height: 82px;
  border-radius: 18px;
  padding: 12px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  grid-template-areas:
    "icon label"
    "icon value"
    "icon detail";
  align-items: center;
  column-gap: 10px;
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.cr-metric-tile i {
  grid-area: icon;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--metric-color, var(--j2-accent));
  background: rgba(255,255,255,.035);
  font-style: normal;
}
.cr-metric-tile span {
  grid-area: label;
  color: var(--j2-muted);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}
.cr-metric-tile strong {
  grid-area: value;
  min-width: 0;
  color: var(--metric-color, var(--j2-accent));
  font-size: clamp(17px, 2vw, 23px);
  line-height: 1.05;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-metric-tile small {
  grid-area: detail;
  color: var(--j2-faint);
  font-size: 10px;
  font-weight: 800;
}
.cr-metric-tile.amber { --metric-color: #fbbf24; }
.cr-metric-tile.orange { --metric-color: var(--j2-accent); }
.cr-metric-tile.green { --metric-color: #20d08d; }
.cr-metric-tile.blue { --metric-color: #7dd3fc; }
.cr-command-side {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 12px;
}
.cr-command-actions {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.cr-command-actions .cr-secondary-btn,
.cr-command-actions .cr-primary-btn {
  grid-column: span 2;
}
.cr-admin-signal {
  grid-column: span 2;
  min-height: 42px;
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #20d08d;
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  font-weight: 950;
}
.cr-pix-wallet {
  border-radius: 22px;
  padding: 13px;
  display: grid;
  gap: 11px;
}
.cr-pix-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cr-pix-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #20d08d;
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.cr-pix-head span {
  display: block;
  color: #20d08d;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}
.cr-pix-head strong {
  display: block;
  margin-top: 2px;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}
.cr-pix-list {
  display: grid;
  gap: 8px;
}
.cr-pix-list button {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  border: 0;
  border-radius: 16px;
  padding: 9px 10px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 8px;
  color: var(--j2-muted);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
  cursor: pointer;
  text-align: left;
}
.cr-pix-list button > svg:first-child,
.cr-pix-list button > svg:last-child {
  color: #20d08d;
}
.cr-pix-list button.copied {
  color: #20d08d;
}
.cr-pix-list span {
  min-width: 0;
}
.cr-pix-list strong,
.cr-pix-list small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-pix-list strong {
  color: var(--j2-text);
  font-size: 12px;
  font-weight: 950;
}
.cr-pix-list small {
  margin-top: 3px;
  color: var(--j2-faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
}
.cr-status-rail {
  border-radius: 22px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px;
}
.reseller-mode .cr-status-rail {
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
}
.cr-status-rail button {
  min-width: 0;
  min-height: 56px;
  border: 0;
  border-radius: 16px;
  padding: 9px 10px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
}
.cr-status-rail button svg {
  color: var(--rail-color);
}
.cr-status-rail button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
}
.cr-status-rail button strong {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: var(--rail-color);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
  font-size: 11px;
}
.cr-status-rail button.active {
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.cr-status-rail button.active span {
  color: var(--j2-text);
}
.cr-form-pix-hint {
  min-height: 42px;
  border-radius: 15px;
  margin-bottom: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #20d08d;
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  font-weight: 850;
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
  cursor: not-allowed;
  opacity: .72;
  color: var(--j2-faint);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
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
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
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
  position: static;
  display: grid;
  gap: 0;
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
  display: none;
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
  gap: 9px;
}
.cr-request-card {
  border-radius: 12px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,.012), transparent 58%),
    rgba(6, 7, 7, .96);
}
.cr-request-summary {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  min-height: 62px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto 16px;
  gap: 10px;
  align-items: start;
}
.cr-request-status-slot {
  padding-top: 5px;
  min-width: 64px;
}
.cr-request-status-slot .cr-status-pill {
  width: fit-content;
  min-height: 18px;
  padding: 0 7px;
  gap: 4px;
  font-size: 9px;
  letter-spacing: 0;
}
.cr-request-topline {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 3px;
  margin-bottom: 0;
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
.cr-request-id,
.cr-request-date {
  min-height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  color: var(--j2-faint);
  background: rgba(255,255,255,.026);
  font-size: 9px;
  font-weight: 900;
}
.cr-reseller-name {
  max-width: min(280px, 42vw);
  min-height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  color: #8b5cf6;
  background: rgba(139, 92, 246, .08);
  font-size: 10px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-request-main h3 {
  margin: 0;
  color: var(--j2-text);
  font-size: 14px;
  font-weight: 950;
  line-height: 1.18;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-request-main p {
  margin: 3px 0 0;
  color: var(--j2-muted);
  font-size: 10px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-request-numbers {
  text-align: right;
  padding-top: 3px;
  min-width: 72px;
}
.cr-request-numbers strong {
  display: block;
  color: #22f7a5;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.1;
}
.cr-request-numbers span {
  display: block;
  margin-top: 3px;
  color: #21d4ff;
  font-size: 11px;
  font-weight: 900;
}
.cr-chevron {
  margin-top: 8px;
  opacity: .48;
  transition: transform .2s ease;
}
.cr-request-card.expanded .cr-chevron {
  transform: rotate(90deg);
}
.cr-request-expanded {
  padding: 0;
  background: rgba(3, 4, 4, .42);
}
.cr-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: rgba(255,255,255,.035);
}
.cr-detail-cell {
  min-width: 0;
  border-radius: 0;
  padding: 10px 12px;
  background: var(--j2-sunken-bg);
  box-shadow: none;
}
.cr-detail-cell span {
  color: #8b5cf6;
  font-size: 9px;
  letter-spacing: 0;
}
.cr-detail-cell strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: 11px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.cr-card-actions {
  margin-top: 0;
  padding: 10px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  background: rgba(6, 7, 7, .96);
}
.cr-action-btn {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 10px;
  color: var(--j2-muted);
  background: rgba(9, 10, 10, .96);
  box-shadow: var(--j2-neu-soft);
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
.cr-admin-actions .request-actions-bar {
  gap: 7px !important;
}
.cr-admin-actions .request-actions-bar button {
  min-height: 32px !important;
  padding: 0 12px !important;
  border-radius: 10px !important;
  font-size: 11px !important;
  box-shadow: var(--j2-neu-soft) !important;
}
.cr-empty {
  min-height: 240px;
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
    padding: 10px 8px calc(90px + env(safe-area-inset-bottom, 0px));
    gap: 10px;
  }
  .cr-command-deck {
    border-radius: 24px;
    padding: 14px;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .cr-command-deck::before {
    inset: auto -45% -78% 12%;
    height: 180px;
  }
  .cr-command-copy {
    gap: 12px;
  }
  .cr-command-copy h1 {
    margin: 3px 0 5px;
    font-size: clamp(26px, 9vw, 38px);
  }
  .cr-command-copy p {
    font-size: 12px;
  }
  .cr-command-metrics {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    padding: 1px 2px 4px;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .cr-command-metrics::-webkit-scrollbar {
    display: none;
  }
  .cr-metric-tile {
    flex: 0 0 142px;
    min-height: 58px;
    border-radius: 16px;
    padding: 9px;
    grid-template-columns: 30px minmax(0, 1fr);
    column-gap: 8px;
  }
  .cr-metric-tile i {
    width: 30px;
    height: 30px;
    border-radius: 11px;
  }
  .cr-metric-tile strong {
    font-size: clamp(15px, 5vw, 20px);
  }
  .cr-metric-tile small {
    display: none;
  }
  .cr-command-side {
    gap: 9px;
  }
  .cr-command-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
  }
  .cr-command-actions .cr-secondary-btn,
  .cr-command-actions .cr-primary-btn,
  .cr-command-actions .cr-admin-signal {
    grid-column: auto;
  }
  .cr-command-actions .cr-primary-btn {
    grid-column: auto;
  }
  .cr-pix-wallet {
    border-radius: 19px;
    padding: 11px;
  }
  .cr-pix-head strong {
    font-size: 12px;
  }
  .cr-pix-list {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    padding: 1px 2px 4px;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .cr-pix-list::-webkit-scrollbar {
    display: none;
  }
  .cr-pix-list button {
    flex: 0 0 min(292px, 84vw);
  }
  .cr-status-rail,
  .reseller-mode .cr-status-rail {
    border-radius: 20px;
    padding: 8px;
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }
  .cr-status-rail::-webkit-scrollbar {
    display: none;
  }
  .cr-status-rail button {
    flex: 0 0 auto;
    min-width: 116px;
    min-height: 48px;
    border-radius: 15px;
    grid-template-columns: 16px minmax(0, 1fr) auto;
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
    padding: 10px;
  }
  .cr-search {
    min-height: 44px;
    border-radius: 15px;
  }
  .cr-list-head {
    min-height: auto;
    align-items: flex-start;
    padding: 0 2px 2px;
    margin-bottom: 8px;
  }
  .cr-list-head strong {
    font-size: 17px;
  }
  .cr-request-list {
    gap: 9px;
  }
  .cr-request-card {
    border-radius: 12px;
  }
  .cr-request-summary {
    min-height: auto;
    grid-template-columns: auto minmax(0, 1fr) auto 16px;
    grid-template-areas:
      "status main numbers arrow";
    align-items: start;
    gap: 8px;
    padding: 10px 8px;
  }
  .cr-request-status-slot {
    grid-area: status;
    min-width: 62px;
    padding-top: 3px;
  }
  .cr-request-topline {
    gap: 6px;
    margin-top: 3px;
    margin-bottom: 0;
  }
  .cr-status-pill {
    min-height: 18px;
    padding: 0 7px;
    font-size: 9px;
  }
  .cr-request-id,
  .cr-request-date,
  .cr-reseller-name {
    min-height: 18px;
    padding: 0 6px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    color: var(--j2-faint);
    background: rgba(255,255,255,.026);
    font-size: 9px;
    font-weight: 900;
  }
  .cr-request-id {
    display: none;
  }
  .cr-request-main h3 {
    font-size: 13px;
  }
  .cr-request-main p {
    font-size: 10px;
  }
  .cr-request-main {
    grid-area: main;
  }
  .cr-request-numbers {
    grid-area: numbers;
    min-width: 68px;
    text-align: right;
    display: block;
  }
  .cr-request-numbers strong {
    font-size: 12px;
  }
  .cr-request-numbers span {
    margin-top: 3px;
    font-size: 10px;
  }
  .cr-request-expanded {
    padding: 0;
  }
  .cr-chevron {
    grid-area: arrow;
    margin-top: 5px;
  }
  .cr-reseller-name {
    max-width: 64vw;
  }
  .cr-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cr-card-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 9px 10px;
  }
  .cr-action-btn {
    width: 100%;
  }
  .cr-admin-actions {
    grid-column: 1 / -1;
    margin-left: 0;
    width: 100%;
  }
  .cr-admin-actions .request-actions-bar {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .cr-empty {
    min-height: 210px;
  }
}
@media (max-width: 390px) {
  .cr-command-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cr-command-actions .cr-secondary-btn,
  .cr-command-actions .cr-primary-btn,
  .cr-command-actions .cr-admin-signal {
    grid-column: auto;
  }
  .cr-hero-actions,
  .cr-card-actions {
    grid-template-columns: 1fr;
  }
}
`;
