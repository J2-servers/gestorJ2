import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Zap, DollarSign, Clock, CheckCircle, TrendingUp, ChevronRight,
  Server, Activity, BarChart3, ArrowUpRight
} from "lucide-react";

const STATUS = {
  pending:   { label:"Pendente",   color:"#fbbf24", bg:"rgba(251,191,36,0.12)" },
  analyzing: { label:"Em Análise", color:"#ff7540", bg:"rgba(96,165,250,0.12)" },
  recharged: { label:"Aprovado",   color:"#ff8a4a", bg:"rgba(255,75,18,0.10)" },
  rejected:  { label:"Rejeitado",  color:"#f87171", bg:"rgba(248,113,113,0.12)" },
  canceled:  { label:"Cancelado",  color:"#a3a3a3", bg:"rgba(163,163,163,0.12)" },
  cancelled: { label:"Cancelado",  color:"#a3a3a3", bg:"rgba(163,163,163,0.12)" },
};

const fmtR = n => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmt  = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n || 0);

/* ── Stat Card ── */
function StatCard({ label, value, sublabel, icon: Icon, accent = "#ff4b12" }) {
  return (
    <div style={{ background:"#141414", border:0, borderRadius:16, padding:"14px 16px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-20, right:-20, width:60, height:60, background:accent, borderRadius:"50%", filter:"none", opacity:0.15, pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
        <div style={{ width:28, height:28, borderRadius:8, background:`${accent}18`, border:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon style={{ width:12, height:12, color:accent }} />
        </div>
      </div>
      <p style={{ fontSize:22, fontWeight:900, color:"#fff", margin:0, lineHeight:1 }}>{value}</p>
      {sublabel && <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:"4px 0 0" }}>{sublabel}</p>}
    </div>
  );
}

/* ── Request Item ── */
function RequestItem({ req }) {
  const s = STATUS[req.status] || STATUS.pending;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{fmt(req.requested_credits)} créditos</span>
          <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:20, background:s.bg, color:s.color }}>{s.label}</span>
        </div>
        <p style={{ fontSize:10, color:"rgba(255,255,255,0.3)", margin:0 }}>
          {req.server_snapshot?.name || "Servidor"} · {new Date(req.created_date).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <span style={{ fontSize:12, fontWeight:800, color:"#ff4b12", whiteSpace:"nowrap", flexShrink:0 }}>{fmtR(req.total_value)}</span>
    </div>
  );
}

/* ── Monthly Bar ── */
function MonthBar({ data, maxCredits }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {data.slice(0, 6).map(m => {
        const pct = maxCredits > 0 ? Math.min(Math.round((m.creditos / maxCredits) * 100), 100) : 0;
        return (
          <div key={m.name}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", textTransform:"capitalize" }}>{m.name}</span>
              <div style={{ display:"flex", gap:6, alignItems:"baseline" }}>
                <span style={{ fontSize:12, fontWeight:800, color:"#ff4b12" }}>{m.creditos.toLocaleString("pt-BR")}</span>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.25)" }}>{fmtR(m["Valor (R$)"])}</span>
              </div>
            </div>
            <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:10 }}>
              <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#ff4b12,#8f1608)", borderRadius:10, transition:"width 0.8s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── MAIN MOBILE DASHBOARD ── */
export default function MobileDashboard({ user, stats, recentRequests, allServers, chartData, pixKeys, activePeriod, onPeriodChange, onRefresh }) {
  const isAdmin = user?.role === "admin" || user?.role === "dev";
  const ps = {
    "12h": { credits: stats.credits12h, value: stats.value12h, label: "12h" },
    "24h": { credits: stats.credits24h, value: stats.value24h, label: "24h" },
    "48h": { credits: stats.credits48h, value: stats.value48h, label: "48h" },
    today: { credits: stats.todayCredits, value: stats.todayValue, label: "Hoje" },
    week:  { credits: stats.weekCredits, value: stats.weekValue, label: "Semana" },
    month: { credits: stats.monthCredits, value: stats.monthValue, label: "Mês" },
  }[activePeriod] || { credits: stats.todayCredits, value: stats.todayValue, label: "Hoje" };

  const maxCredits = Math.max(...(chartData || []).map(d => d.creditos), 1);
  const PERIODS = ["12h","24h","today","week","month"];

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#fff", paddingBottom:80 }}>
      {/* Header */}
      <div style={{ padding:"16px 16px 12px", background:"rgba(10,10,10,0.98)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, background:"linear-gradient(135deg,#ff4b12,#8f1608)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0, lineHeight:1.1 }}>Dashboard</h1>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:"3px 0 0" }}>{user?.full_name || user?.email} · {isAdmin ? "Admin" : "Revendedor"}</p>
          </div>
          <button onClick={onRefresh} style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.4)" }}>
            <Activity style={{ width:14, height:14 }} />
          </button>
        </div>

        {/* Period filter */}
        {isAdmin && (
          <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:2 }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => onPeriodChange(p)}
                style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, border:"none", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, background: activePeriod === p ? "#ff4b12" : "rgba(255,255,255,0.07)", color: activePeriod === p ? "#fff" : "rgba(255,255,255,0.4)", transition:"all 0.15s" }}>
                {p === "today" ? "Hoje" : p === "week" ? "Semana" : p === "month" ? "Mês" : p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:"14px 14px 0", display:"flex", flexDirection:"column", gap:12 }}>
        {/* Stat cards grid */}
        {isAdmin ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <StatCard label={`Créditos · ${ps.label}`} value={fmt(ps.credits)} sublabel={fmtR(ps.value)} icon={Zap} accent="#ff4b12" />
            <StatCard label={`Receita · ${ps.label}`} value={fmtR(ps.value)} sublabel={`${fmt(ps.credits)} créditos`} icon={DollarSign} accent="#ff8a4a" />
            <StatCard label="Pendentes" value={stats.pendingRequests} sublabel="Aguardando análise" icon={Clock} accent="#fbbf24" />
            <StatCard label="Mês Completo" value={fmtR(stats.monthValue)} sublabel={`${fmt(stats.monthCredits)} cred`} icon={CheckCircle} accent="#ff7540" />
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <StatCard label="Hoje" value={fmtR(stats.todayValue)} sublabel={`${fmt(stats.todayCredits)} cred`} icon={Zap} accent="#ff4b12" />
            <StatCard label="Semana" value={fmtR(stats.weekValue)} sublabel={`${fmt(stats.weekCredits)} cred`} icon={TrendingUp} accent="#ff8a4a" />
            <StatCard label="Pendentes" value={stats.pendingRequests} sublabel="Aguardando" icon={Clock} accent="#fbbf24" />
            <StatCard label="Mês" value={fmtR(stats.monthValue)} sublabel={`${fmt(stats.monthCredits)} cred`} icon={CheckCircle} accent="#ff7540" />
          </div>
        )}

        {/* Pedidos Recentes */}
        <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:7 }}>
              <Activity style={{ width:13, height:13, color:"#ff7540" }} /> Pedidos Recentes
            </span>
            <Link to={createPageUrl("CreditRequests")} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#ff4b12", textDecoration:"none", fontWeight:700 }}>
              Ver todos <ArrowUpRight style={{ width:11, height:11 }} />
            </Link>
          </div>
          <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
            {recentRequests.length === 0 ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(255,255,255,0.2)", fontSize:12 }}>
                <Clock style={{ width:24, height:24, margin:"0 auto 6px", display:"block", opacity:0.4 }} />
                Nenhum pedido recente
              </div>
            ) : recentRequests.slice(0, 5).map(req => <RequestItem key={req.id} req={req} />)}
          </div>
        </div>

        {/* Créditos por mês */}
        {chartData?.length > 0 && (
          <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
              <BarChart3 style={{ width:13, height:13, color:"#ff7540" }} />
              <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Créditos por Mês</span>
            </div>
            <MonthBar data={[...chartData].reverse()} maxCredits={maxCredits} />
          </div>
        )}

        {/* Servidores (reseller) */}
        {!isAdmin && allServers.length > 0 && (
          <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:7 }}>
                <Server style={{ width:13, height:13, color:"#ff4b12" }} /> Meus Servidores
              </span>
              <Link to={createPageUrl("Servers")} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#ff4b12", textDecoration:"none", fontWeight:700 }}>
                Gerenciar <ChevronRight style={{ width:11, height:11 }} />
              </Link>
            </div>
            <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
              {allServers.slice(0, 4).map(sv => (
                <div key={sv.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:"rgba(255,75,18,0.10)", border:"1px solid rgba(255,75,18,0.10)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Server style={{ width:12, height:12, color:"#ff4b12" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sv.name}</p>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:"#ff8a4a", whiteSpace:"nowrap" }}>
                    {fmtR(sv.value_per_credit)}/cred
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIX keys para reseller */}
        {!isAdmin && pixKeys?.length > 0 && (
          <div style={{ background:"#141414", border:"1px solid rgba(255,75,18,0.10)", borderRadius:16, padding:"14px" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#ff8a4a", margin:"0 0 10px", display:"flex", alignItems:"center", gap:6 }}>
              <DollarSign style={{ width:12, height:12 }} /> Chaves PIX para Pagamento
            </p>
            {pixKeys.map((k, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"rgba(255,75,18,0.04)", border:"1px solid rgba(255,75,18,0.10)", borderRadius:8, marginBottom:6 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:"rgba(255,75,18,0.10)", color:"#ff8a4a", textTransform:"uppercase" }}>{k.type}</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#fff", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{k.key_value}</span>
                {k.bank && <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", flexShrink:0 }}>{k.bank}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
