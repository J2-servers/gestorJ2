import React, { useState, useEffect, useCallback } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  Plus, RefreshCw, Search, X, Download, Eye, MessageSquare,
  History, Edit, Trash2, ChevronRight, Zap, Clock, CheckCircle2,
  XCircle, AlertTriangle, List, ExternalLink
} from "lucide-react";
import { formatFullBrasiliaDate } from "@/components/utils/dateHelper";
import NewRequestForm from "@/components/requests/NewRequestForm";
import MultiRequestForm from "@/components/requests/MultiRequestForm";
import RequestActions from "@/components/requests/RequestActions";
import RequestMessages from "@/components/requests/RequestMessages";
import AuditTrail from "@/components/requests/AuditTrail";
import ProofViewer from "@/components/requests/ProofViewer";
import PhoneRequiredBanner from "@/components/layout/PhoneRequiredBanner";
import PixKeysDisplay from "@/components/dashboard/PixKeysDisplay";

const TABS = [
  { key: "all",       label: "Todos",      color: "#94a3b8", icon: List },
  { key: "pending",   label: "Pendente",   color: "#facc15", icon: Clock },
  { key: "analyzing", label: "Em Análise", color: "#38bdf8", icon: AlertTriangle },
  { key: "recharged", label: "Aprovado",   color: "#4ade80", icon: CheckCircle2 },
  { key: "rejected",  label: "Rejeitado",  color: "#f87171", icon: XCircle },
  { key: "cancelled", label: "Cancelado",  color: "#64748b", icon: XCircle },
];

function statusInfo(s) {
  return TABS.find(t => t.key === s) || TABS[0];
}

/* ────── tiny pill badge ────── */
function Pill({ label, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}44`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/* ────── single request row ────── */
function RequestRow({ request, currentUser, reseller, onUpdate, onEdit, onCancel, onProof, onChat, onHistory }) {
  const [expanded, setExpanded] = useState(false);
  const s = statusInfo(request.status);
  const val = Number(request.total_value || 0);
  const credits = Number(request.requested_credits || 0);
  const isAdmin = currentUser?.role === "admin";
  const canEdit = currentUser?.id === request.reseller_id && request.status === "pending";
  const canAdminAct = isAdmin && (request.status === "pending" || request.status === "analyzing");

  return (
    <div className="credit-request-card" style={{
      background: "linear-gradient(135deg, #1a1020 0%, #0f0515 100%)",
      border: `1px solid ${s.color}33`,
      borderRadius: 14,
      overflow: "hidden",
      transition: "all 0.2s",
      boxShadow: `0 0 0 1px ${s.color}11 inset`,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${s.color}66`;
        e.currentTarget.style.boxShadow = `0 0 16px ${s.color}22, 0 0 0 1px ${s.color}22 inset`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${s.color}33`;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${s.color}11 inset`;
      }}
    >
      {/* left accent line */}
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, flexShrink: 0, background: `linear-gradient(180deg, ${s.color}, ${s.color}44)`, borderRadius: "14px 0 0 14px", boxShadow: `0 0 12px ${s.color}44` }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* main row */}
          <div
           className="credit-request-row"
           onClick={() => setExpanded(o => !o)}
           style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }}
          >
           {/* left info */}
           <div style={{ flex: 1, minWidth: 0 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
               <Pill label={s.label} color={s.color} />
               {reseller && <span style={{ fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>@{reseller.full_name || reseller.email}</span>}
             </div>
             <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
               {request.server_snapshot?.name || "—"}
             </p>
             <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
               {request.login || "—"}
             </p>
           </div>

           {/* right values */}
           <div style={{ textAlign: "right", flexShrink: 0 }}>
             <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#10b981" }}>
               {credits.toLocaleString("pt-BR")} ⚡
             </p>
             <p style={{ margin: "2px 0 0", fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>
               R$ {val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
             </p>
           </div>

           <ChevronRight style={{ width: 14, height: 14, color: s.color, flexShrink: 0, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
          </div>

          {/* expanded */}
          {expanded && (
            <div style={{ borderTop: `1px solid ${s.color}22` }}>
              {/* details grid */}
              <div className="credit-details-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(clamp(100px, 40vw, 160px), 1fr))", gap: 2, background: "#1a0f1a", padding: 2 }}>
                {[
                  ["📱 Login", request.login || "—", "#ec4899"],
                  ["📺 Servidor", request.server_snapshot?.name || "—", "#8b5cf6"],
                  ["💰 R$/crédito", request.server_snapshot?.value_per_credit ? `R$ ${Number(request.server_snapshot.value_per_credit).toFixed(2)}` : "—", "#f59e0b"],
                  ["⚡ Créditos", credits.toLocaleString("pt-BR"), "#10b981"],
                  ["💵 Total", `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "#06b6d4"],
                  ["🔄 Pagamento", request.payment_type === "postpaid" ? "Pós-pago" : "Pré-pago", "#a78bfa"],
                  ...(request.status === "rejected" && request.rejection_reason ? [["❌ Rejeição", request.rejection_reason, "#f87171"]] : []),
                  ...(request.notes ? [["📝 Observação", request.notes, "#94a3b8"]] : []),
                ].map(([k, v, col]) => (
                  <div key={k} style={{ background: `${col}11`, border: `1px solid ${col}33`, borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: col, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{k}</p>
                    <p style={{ margin: 0, fontSize: "clamp(12px, 2vw, 13px)", color: "#e2e8f0", wordBreak: "break-word", fontWeight: 600 }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* action bar */}
              <div className="credit-request-actions" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "#0a0805", borderTop: `1px solid ${s.color}22` }}>
                {request.server_snapshot?.panel_link && (
                  <ActionBtn icon={ExternalLink} label="Painel" color="#06b6d4" onClick={() => window.open(request.server_snapshot.panel_link, "_blank")} />
                )}
                {request.proof_of_payment_url && (
                  <ActionBtn icon={Eye} label="Comprovante" color="#8b5cf6" onClick={() => onProof(request.proof_of_payment_url)} />
                )}
                <ActionBtn icon={MessageSquare} label="Chat" color="#10b981" onClick={() => onChat(request)} />
                <ActionBtn icon={History} label="Histórico" color="#f59e0b" onClick={() => onHistory(request)} />
                {canEdit && (
                  <>
                    <ActionBtn icon={Edit} label="Editar" color="#38bdf8" onClick={() => onEdit(request)} />
                    <ActionBtn icon={Trash2} label="Cancelar" color="#f87171" onClick={() => onCancel(request)} />
                  </>
                )}
                {canAdminAct && (
                  <div style={{ marginLeft: "auto" }}>
                    <RequestActions request={request} currentUser={currentUser} onUpdate={onUpdate} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, color = "#64748b", onClick }) {
  return (
    <button className="credit-action-btn" onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
      background: "transparent", border: `1px solid #1e1e1e`,
      color, cursor: "pointer", transition: "all 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}12`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e1e"; e.currentTarget.style.background = "transparent"; }}
    >
      <Icon style={{ width: 11, height: 11 }} />{label}
    </button>
  );
}

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
export default function CreditRequests() {
  const [user, setUser]           = useState(null);
  const [all, setAll]             = useState([]);
  const [resellers, setResellers] = useState({});
  const [pixKeys, setPixKeys]     = useState([]);
  const [allServers, setAllServers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]             = useState("pending");
  const [search, setSearch]       = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [showMulti, setShowMulti] = useState(false);
  const [editReq, setEditReq]     = useState(null);
  const [chatReq, setChatReq]     = useState(null);
  const [auditReq, setAuditReq]   = useState(null);
  const [proofUrl, setProofUrl]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cu = await remoteClient.auth.me();
        setUser(cu);
        if (cu.role === "user") {
          const settings = await remoteClient.settings.getPublic().catch(() => null);
          if (settings) setPixKeys(settings.pix_keys?.filter(k => k.is_active) || []);
          await loadServers(cu.id);
        }
      } catch (error) {
        console.warn('[CreditRequests] Falha ao carregar usuario inicial:', error);
      }
    })();
  }, []);

  const loadServers = async (resellerId) => {
    try {
      const [allSrvs, myResellerSrvs] = await Promise.all([
        remoteClient.servers.list().catch(() => []),
        remoteClient.resellerServers.list().catch(() => []),
      ]);
      const resellerMap = {};
      (myResellerSrvs || []).forEach(r => { resellerMap[r.server_id] = r; });
      const allGlobal = (allSrvs || []).filter(s =>
        !s.owner_id || s.owner_id === '' || s.owner_id === 'admin_global' || s.owner_id === 'admin'
      );
      const globalSrvs = allGlobal.length > 0 ? allGlobal : (allSrvs || []);
      const merged = globalSrvs
        .filter(s => resellerMap[s.id])
        .map(s => ({
          ...s,
          value_per_credit: resellerMap[s.id].value_per_credit,
          username: resellerMap[s.id].login,
        }));
      setAllServers(merged);
    } catch (e) {
      console.error('[CreditRequests] loadServers error:', e);
    }
  };

  const load = useCallback(async (showSpin = false) => {
    if (!user) return;
    if (showSpin) setRefreshing(true);
    else setLoading(true);
    try {
      if (user.role === "admin" || user.role === "dev") {
        const [us, cr] = await Promise.all([
          remoteClient.users.list().catch(() => []),
          remoteClient.creditRequests.list(null, 200).then(r => r.data || []).catch(() => []),
        ]);
        // Admin vê TODOS os pedidos de TODOS os revendedores, sem filtro por parent_user_id
        const allResellers = us.filter(u => u.role === "user");
        setAll(cr);
        const map = {};
        allResellers.forEach(u => { map[u.id] = u; });
        setResellers(map);
      } else {
        const reqs = await remoteClient.creditRequests.list(null, 200).then(r => r.data || []).catch(() => []);
        setAll(reqs);
      }
    } catch (error) {
      console.warn('[CreditRequests] Falha ao carregar pedidos:', error);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { if (user) load(); }, [user]);

  const reset = () => {
    setShowNew(false); setShowMulti(false); setEditReq(null);
    load(true);
    if (user?.role === "user") loadServers(user.id);
  };

  const filtered = all.filter(r => {
    if (tab !== "all" && r.status !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.login?.toLowerCase().includes(q) ||
        r.server_snapshot?.name?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = Object.fromEntries(
    TABS.map(t => [t.key, t.key === "all" ? all.length : all.filter(r => r.status === t.key).length])
  );

  const handleExport = () => {
    const h = ["ID", "Data", "Servidor", "Login", "Créditos", "Valor", "Status"];
    const rows = filtered.map(r => [r.id, new Date(r.created_date).toLocaleString("pt-BR"), r.server_snapshot?.name || "", r.login, r.requested_credits, r.total_value?.toFixed(2), r.status]);
    const csv = "data:text/csv;charset=utf-8," + [h, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: encodeURI(csv), download: `pedidos.csv` });
    document.body.appendChild(a); a.click(); a.remove();
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "2px solid #1e1e1e", borderTopColor: "#c084fc", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="credit-requests-page" style={{ minHeight: "100vh", background: "#080808", color: "#e2e8f0" }}>
      <div className="credit-requests-inner" style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 12px 96px", display: "flex", flexDirection: "column", gap: 12 }}>

        <PhoneRequiredBanner user={user} />
        {user?.role === "user" && pixKeys.length > 0 && <PixKeysDisplay keys={pixKeys} />}

        {/* ── Header ── */}
        <div className="credit-requests-header" style={{ background:"#0f0f0f", border:"1px solid #1e1e1e", borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              {user?.role === "admin" ? "Pedidos" : "Meus Pedidos"}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#334155" }}>
              {counts.all} total · {(counts.pending || 0) + (counts.analyzing || 0)} em aberto
            </p>
          </div>
          <div className="credit-header-actions" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => load(true)} style={{ width: 32, height: 32, borderRadius: 8, background: "#0f0f0f", border: "1px solid #1e1e1e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
              <RefreshCw style={{ width: 13, height: 13, animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
            </button>
            <button onClick={handleExport} style={{ width: 32, height: 32, borderRadius: 8, background: "#0f0f0f", border: "1px solid #1e1e1e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
              <Download style={{ width: 13, height: 13 }} />
            </button>
            {user?.role === "user" && (
              <>
                <button onClick={() => { setEditReq(null); setShowMulti(false); loadServers(user.id); setShowNew(v => !v); }}
                  style={{ height: 32, padding: "0 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#0f0f0f", border: "1px solid #1e1e1e", color: "#94a3b8", cursor: !user.phone ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 5, opacity: !user.phone ? 0.4 : 1 }}
                  disabled={!user.phone}>
                  <Plus style={{ width: 11, height: 11 }} /> Simples
                </button>
                <button onClick={() => { setShowNew(false); setShowMulti(v => !v); }}
                  style={{ height: 32, padding: "0 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "#c084fc", border: "none", color: "#0a0a0a", cursor: !user.phone ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 5, opacity: !user.phone ? 0.4 : 1 }}
                  disabled={!user.phone}>
                  <Plus style={{ width: 11, height: 11 }} /> Múltiplo
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Forms ── */}
        {showNew && (
          <NewRequestForm request={editReq} servers={allServers} user={user} onSuccess={reset} onCancel={() => { setShowNew(false); setEditReq(null); }} />
        )}
        {showMulti && (
          <MultiRequestForm servers={allServers} user={user} onSuccess={reset} onCancel={() => setShowMulti(false)} />
        )}

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 2 }} className="credit-tabs hide-sb">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: active ? "#111" : "transparent",
                border: `1px solid ${active ? "#2a2a2a" : "transparent"}`,
                color: active ? t.color : "#334155",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#64748b"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#334155"; }}
              >
                <t.icon style={{ width: 12, height: 12 }} />
                {t.label}
                {counts[t.key] > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: active ? `${t.color}18` : "#111", color: active ? t.color : "#334155", borderRadius: 99, padding: "1px 6px" }}>
                    {counts[t.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search ── */}
        <div className="credit-search" style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#334155", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por login, servidor ou ID..."
            style={{ width: "100%", boxSizing: "border-box", background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, color: "#e2e8f0", fontSize: 13, padding: "10px 36px", outline: "none" }}
            onFocus={e => e.target.style.borderColor = "#c084fc"}
            onBlur={e => e.target.style.borderColor = "#1e1e1e"} />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#334155", padding: 0, display: "flex" }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", color: "#1e293b" }}>
            <Zap style={{ width: 32, height: 32, margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#334155" }}>Nenhum pedido encontrado</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#1e293b" }}>{search ? "Tente outro termo" : "Mude o filtro acima"}</p>
          </div>
        ) : (
          <div className="credit-requests-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(r => (
              <RequestRow
                key={r.id} request={r} currentUser={user} reseller={resellers[r.reseller_id]}
                onUpdate={reset}
                onEdit={req => { setEditReq(req); setShowNew(true); }}
                onCancel={async req => {
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

      {chatReq  && <RequestMessages request={chatReq}  user={user} onClose={() => setChatReq(null)} />}
      {auditReq && <AuditTrail      request={auditReq} onClose={() => setAuditReq(null)} />}
      {proofUrl && <ProofViewer fileUrl={proofUrl} isOpen={!!proofUrl} onClose={() => setProofUrl(null)} />}

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        .hide-sb::-webkit-scrollbar { display:none; }
        .hide-sb { -ms-overflow-style:none; scrollbar-width:none; }
        @media (max-width: 700px) {
          .credit-requests-page {
            min-height: 100dvh !important;
          }
          .credit-requests-inner {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px 10px calc(96px + env(safe-area-inset-bottom, 0px)) !important;
            gap: 10px !important;
          }
          .credit-requests-header {
            align-items: stretch !important;
            border-radius: 12px !important;
            padding: 12px !important;
          }
          .credit-requests-header > div:first-child {
            min-width: 0 !important;
            width: 100% !important;
          }
          .credit-header-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch !important;
          }
          .credit-header-actions button {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 40px !important;
            justify-content: center !important;
          }
          .credit-tabs {
            margin-left: -10px !important;
            margin-right: -10px !important;
            padding: 0 10px 4px !important;
            scroll-snap-type: x proximity;
          }
          .credit-tabs button {
            scroll-snap-align: start;
            min-height: 38px !important;
            padding: 8px 12px !important;
          }
          .credit-search input {
            min-height: 42px !important;
            font-size: 14px !important;
          }
          .credit-request-card {
            border-radius: 12px !important;
          }
          .credit-request-row {
            align-items: flex-start !important;
            gap: 8px !important;
            padding: 12px 10px !important;
          }
          .credit-request-row > div:first-child {
            min-width: 0 !important;
          }
          .credit-request-row > div:nth-child(2) {
            max-width: 36vw !important;
          }
          .credit-details-grid {
            grid-template-columns: 1fr !important;
            gap: 4px !important;
            padding: 4px !important;
          }
          .credit-request-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            padding: 10px !important;
            gap: 8px !important;
            align-items: stretch !important;
          }
          .credit-request-actions > div {
            margin-left: 0 !important;
            grid-column: 1 / -1;
            min-width: 0 !important;
          }
          .credit-action-btn {
            width: 100% !important;
            min-height: 38px !important;
            justify-content: center !important;
            padding: 7px 8px !important;
          }
        }
        @media (max-width: 390px) {
          .credit-header-actions,
          .credit-request-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

