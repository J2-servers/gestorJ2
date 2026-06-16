import React, { useState, useEffect, useCallback, useMemo } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  Zap, Clock, CheckCircle, DollarSign, Activity, TrendingUp,
  Users, Server, Sparkles, Calendar, AlertCircle, ExternalLink,
  Edit2, Save, X, Link as LinkIcon, RefreshCw, ChevronRight,
  ShoppingCart, BarChart3, User as UserIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PhoneRequiredBanner from "../components/layout/PhoneRequiredBanner";
import PixKeysDisplay from "../components/dashboard/PixKeysDisplay";
import { formatFullBrasiliaDate, getCurrentBrasiliaDateTime } from "../components/utils/dateHelper";
import MobileDashboard from "../components/mobile/MobileDashboard";

/* ─────────── CONSTANTS ─────────── */
const PERIODS = [
  { id:"12h",label:"12h" },{ id:"24h",label:"24h" },{ id:"48h",label:"48h" },
  { id:"today",label:"Hoje" },{ id:"week",label:"Semana" },{ id:"month",label:"Mês" },
];
const STATUS = {
  pending:   { label:"Pendente",   color:"#fbbf24" },
  analyzing: { label:"Em Análise", color:"#60a5fa" },
  recharged: { label:"Aprovado",   color:"#34d399" },
  rejected:  { label:"Rejeitado",  color:"#f87171" },
  cancelled: { label:"Cancelado",  color:"#a3a3a3" },
};

/* ─────────── VIVID DARK METAL CARD ─────────── */
const metalCard = (accent = "#a78bfa") => ({
  background: `linear-gradient(160deg, #1c1c1c 0%, #141414 45%, #111111 100%)`,
  border: `1px solid ${accent}28`,
  borderRadius: 20,
  boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset, 0 -1px 0 rgba(0,0,0,0.6) inset, 0 0 40px ${accent}08`,
  position: "relative",
  overflow: "hidden",
});

/* ─────────── HOVER METAL ─────────── */
const useMetalHover = () => {
  const onEnter = (e) => {
    e.currentTarget.style.transform = "translateY(-4px) scale(1.007)";
    e.currentTarget.style.boxShadow = "0 24px 64px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.1) inset, 0 0 60px rgba(167,139,250,0.14)";
    e.currentTarget.style.borderColor = "rgba(167,139,250,0.55)";
  };
  const onLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0) scale(1)";
    e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset";
    e.currentTarget.style.borderColor = "rgba(167,139,250,0.28)";
  };
  return { onMouseEnter: onEnter, onMouseLeave: onLeave };
};

/* ─────────── BIG STAT CARD ─────────── */
const BigCard = ({ label, value, sublabel, icon: Icon, accent = "#a78bfa" }) => {
  const metal = useMetalHover();
  return (
    <div {...metal} style={{ ...metalCard(accent), padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)", cursor: "default" }}>
      {/* shine overlay */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0" }} />
      <div style={{ position:"absolute",top:-50,right:-50,width:120,height:120,background:accent,borderRadius:"50%",filter:"blur(60px)",opacity:0.12,pointerEvents:"none" }} />
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative" }}>
        <span style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(255,255,255,0.4)" }}>{label}</span>
        <div style={{ width:36,height:36,borderRadius:10,background:`${accent}18`,border:`1px solid ${accent}30`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 16px ${accent}22` }}>
          <Icon style={{ width:16,height:16,color:accent }} />
        </div>
      </div>
      <p style={{ fontSize:30,fontWeight:900,color:"#fff",lineHeight:1,margin:0,position:"relative",textShadow:"0 2px 8px rgba(0,0,0,0.5)" }}>{value}</p>
      {sublabel && <p style={{ fontSize:11,color:"rgba(255,255,255,0.4)",margin:0,position:"relative" }}>{sublabel}</p>}
    </div>
  );
};

/* ─────────── PERIOD FILTER ─────────── */
const PeriodFilter = ({ active, onChange }) => (
  <div style={{ display:"inline-flex",background:"rgba(255,255,255,0.05)",borderRadius:12,padding:4,gap:2,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 4px 16px rgba(0,0,0,0.4)" }}>
    {PERIODS.map(p=>(
      <button key={p.id} onClick={()=>onChange(p.id)} style={{ padding:"5px 14px",borderRadius:9,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.2s", background:active===p.id?"linear-gradient(135deg,#a78bfa,#8b5cf6)":"transparent",color:active===p.id?"#fff":"rgba(255,255,255,0.4)",boxShadow:active===p.id?"0 4px 16px rgba(167,139,250,0.4)":"none" }}>
        {p.label}
      </button>
    ))}
  </div>
);

/* ─────────── CUSTOM TOOLTIP ─────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(20,20,30,0.95)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:12,padding:"10px 14px",fontSize:12,backdropFilter:"blur(20px)",boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>
      <p style={{ color:"rgba(255,255,255,0.5)",marginBottom:6,fontWeight:700 }}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{ color:p.color,margin:"2px 0",fontWeight:700 }}>{p.name}: {p.value?.toLocaleString?.("pt-BR")??p.value}</p>)}
    </div>
  );
};

/* ─────────── SERVER ROW ─────────── */
const ServerRow = ({ server, onSaved, isAdmin, ownerName }) => {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [name,    setName]    = useState(server.name);
  const [price,   setPrice]   = useState(server.value_per_credit);
  const [url,     setUrl]     = useState(server.panel_link);

  const save = async () => {
    setSaving(true);
    try {
      await remoteClient.servers.update(server.id, { name, value_per_credit: parseFloat(price)||0, panel_link: url });
      setEditing(false); onSaved();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };
  const cancel = () => { setName(server.name); setPrice(server.value_per_credit); setUrl(server.panel_link); setEditing(false); };
  const inp = { background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:6,color:"#fff",fontSize:12,padding:"4px 8px",outline:"none",width:"100%" };

  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 13px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,transition:"all 0.18s",boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}
      onMouseEnter={e=>{ if(!editing){ e.currentTarget.style.borderColor="rgba(167,139,250,0.3)"; e.currentTarget.style.background="rgba(167,139,250,0.06)"; e.currentTarget.style.transform="translateX(2px)"; }}}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; e.currentTarget.style.background="rgba(255,255,255,0.025)"; e.currentTarget.style.transform="translateX(0)"; }}>
      <div style={{ width:30,height:30,borderRadius:8,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <Server style={{ width:12,height:12,color:"#a78bfa" }} />
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        {editing ? (
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            <input value={name} onChange={e=>setName(e.target.value)} style={{ ...inp,flex:"2 1 120px" }} placeholder="Nome" />
            <input value={price} onChange={e=>setPrice(e.target.value)} style={{ ...inp,flex:"1 1 70px" }} type="number" step="0.01" placeholder="R$/cred" />
            <input value={url} onChange={e=>setUrl(e.target.value)} style={{ ...inp,flex:"3 1 160px" }} placeholder="URL" />
          </div>
        ) : (
          <>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontSize:12,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160 }}>{server.name}</span>
              <span style={{ fontSize:10,fontWeight:700,color:"#34d399",whiteSpace:"nowrap" }}>R$ {Number(server.value_per_credit).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}/cred</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:2 }}>
              {ownerName && <span style={{ fontSize:10,color:"#a78bfa",fontWeight:600 }}>👤 {ownerName}</span>}
              <a href={server.panel_link} target="_blank" rel="noreferrer" style={{ fontSize:10,color:"rgba(255,255,255,0.25)",textDecoration:"none",display:"flex",alignItems:"center",gap:3 }} onClick={e=>e.stopPropagation()}>
                <LinkIcon style={{ width:9,height:9 }} />Painel
              </a>
            </div>
          </>
        )}
      </div>
      <div style={{ display:"flex",gap:5,flexShrink:0 }}>
        {editing ? (
          <>
            <button onClick={save} disabled={saving} style={{ width:26,height:26,borderRadius:7,background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.25)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#34d399" }}><Save style={{ width:11,height:11 }} /></button>
            <button onClick={cancel} style={{ width:26,height:26,borderRadius:7,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#f87171" }}><X style={{ width:11,height:11 }} /></button>
          </>
        ) : (isAdmin||server.owner_id) && (
          <button onClick={()=>setEditing(true)} style={{ width:26,height:26,borderRadius:7,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.35)",transition:"all 0.15s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(167,139,250,0.15)"; e.currentTarget.style.color="#a78bfa"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color="rgba(255,255,255,0.35)"; }}>
            <Edit2 style={{ width:11,height:11 }} />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─────────── RESELLER HISTORY MODAL ─────────── */
const ResellerModal = ({ reseller, requests, onClose }) => {
  const reqs = requests.filter(r => r.reseller_id === reseller.id);
  const total = reqs.filter(r=>r.status==="recharged").reduce((s,r)=>s+(r.total_value||0),0);
  const credits = reqs.filter(r=>r.status==="recharged").reduce((s,r)=>s+(r.requested_credits||0),0);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}
      onClick={onClose}>
      <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(12px)" }} />
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative",width:"100%",maxWidth:600,maxHeight:"85vh",borderRadius:24,overflow:"hidden",
        background:"linear-gradient(145deg,#1a1a2e 0%,#16161f 40%,#1e1e30 100%)",
        border:"1px solid rgba(167,139,250,0.3)",
        boxShadow:"0 32px 80px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.08) inset, 0 0 120px rgba(167,139,250,0.08)",
        display:"flex",flexDirection:"column",animation:"modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both"
      }}>
        {/* shine */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:"45%",background:"linear-gradient(180deg,rgba(255,255,255,0.05),transparent)",pointerEvents:"none" }} />
        <div style={{ position:"absolute",top:-80,right:-80,width:200,height:200,background:"#a78bfa",borderRadius:"50%",filter:"blur(80px)",opacity:0.08,pointerEvents:"none" }} />

        {/* Header */}
        <div style={{ padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:14,position:"relative" }}>
          <div style={{ width:46,height:46,borderRadius:14,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#a78bfa",flexShrink:0 }}>
            {reseller.full_name?.[0]?.toUpperCase()||"?"}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <h3 style={{ fontSize:16,fontWeight:800,color:"#fff",margin:0 }}>{reseller.full_name||reseller.email}</h3>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:"2px 0 0" }}>{reseller.email}</p>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:9,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.4)",flexShrink:0 }}>
            <X style={{ width:14,height:14 }} />
          </button>
        </div>

        {/* Summary */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:"14px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          {[
            { label:"Total gasto",value:`R$ ${total.toLocaleString("pt-BR",{minimumFractionDigits:2})}`,accent:"#a78bfa" },
            { label:"Créditos",value:credits.toLocaleString("pt-BR"),accent:"#22d3ee" },
            { label:"Pedidos",value:reqs.length,accent:"#34d399" },
          ].map(s=>(
            <div key={s.label} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",textAlign:"center" }}>
              <p style={{ fontSize:18,fontWeight:900,color:s.accent,margin:0 }}>{s.value}</p>
              <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:"4px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px 24px 20px",display:"flex",flexDirection:"column",gap:7 }}>
          {reqs.length===0 ? (
            <div style={{ textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,0.25)",fontSize:13 }}>Nenhum pedido encontrado</div>
          ) : reqs.map((req,i)=>{
            const s=STATUS[req.status]||STATUS.pending;
            return (
              <div key={req.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 13px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,animationDelay:`${i*0.03}s` }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"#fff" }}>{req.requested_credits?.toLocaleString("pt-BR")} créditos</span>
                    <span style={{ fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:`${s.color}22`,color:s.color,border:`1px solid ${s.color}44` }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,0.3)",margin:"3px 0 0" }}>{formatFullBrasiliaDate(req.created_date)}</p>
                </div>
                <span style={{ fontSize:13,fontWeight:800,color:"#a78bfa",whiteSpace:"nowrap" }}>R$ {req.total_value?.toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
};

/* ─────────── MAIN DASHBOARD ─────────── */
export default function Dashboard() {
  const [user,            setUser]           = useState(null);
  const [activePeriod,    setActivePeriod]   = useState("today");
  const [stats,           setStats]          = useState({ credits12h:0,value12h:0,credits24h:0,value24h:0,credits48h:0,value48h:0,todayCredits:0,weekCredits:0,monthCredits:0,pendingRequests:0,todayValue:0,weekValue:0,monthValue:0,previous12hCredits:0,previous12hValue:0,previous24hCredits:0,previous24hValue:0,previous48hCredits:0,previous48hValue:0,yesterdayCredits:0,yesterdayValue:0,lastWeekCredits:0,lastWeekValue:0,lastMonthCredits:0,lastMonthValue:0,unpaidPostpaidValue:0,unpaidPostpaidCount:0 });
  const [recentRequests,  setRecentRequests] = useState([]);
  const [allRequests,     setAllRequests]    = useState([]);
  const [allServers,      setAllServers]     = useState([]);
  const [allUsers,        setAllUsers]       = useState([]);
  const [pixKeys,         setPixKeys]        = useState([]);
  const [chartData,       setChartData]      = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [refreshKey,      setRefreshKey]     = useState(0);
  const [selectedReseller,setSelectedReseller]=useState(null);

  const calculateStats = useCallback((requests) => {
    const now=new Date();
    const t=(h)=>new Date(now-h*3600000);
    const d0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const d1=new Date(d0-86400000);
    const w0=new Date(now-7*86400000); const w1=new Date(w0-7*86400000);
    const m0=new Date(now.getFullYear(),now.getMonth(),1);
    const m1s=new Date(now.getFullYear(),now.getMonth()-1,1);
    const m1e=new Date(now.getFullYear(),now.getMonth(),0);
    const rc=requests.filter(r=>r.status==="recharged");
    const range=(arr,from,to)=>arr.filter(r=>{const d=new Date(r.created_date);return d>=from&&(!to||d<to);});
    const sum=(arr,k)=>arr.reduce((s,r)=>s+(r[k]||0),0);
    const r12=range(rc,t(12)); const p12=range(rc,t(24),t(12));
    const r24=range(rc,t(24)); const p24=range(rc,t(48),t(24));
    const r48=range(rc,t(48)); const p48=range(rc,t(96),t(48));
    const rTd=range(rc,d0);   const rYd=range(rc,d1,d0);
    const rWk=range(rc,w0);   const rLW=range(rc,w1,w0);
    const rMo=range(rc,m0);   const rLM=range(rc,m1s,m1e);
    const unp=requests.filter(r=>r.payment_type==="postpaid"&&r.status==="recharged"&&!r.invoice_id);
    setStats({ credits12h:sum(r12,"requested_credits"),value12h:sum(r12,"total_value"), credits24h:sum(r24,"requested_credits"),value24h:sum(r24,"total_value"), credits48h:sum(r48,"requested_credits"),value48h:sum(r48,"total_value"), todayCredits:sum(rTd,"requested_credits"),todayValue:sum(rTd,"total_value"), weekCredits:sum(rWk,"requested_credits"),weekValue:sum(rWk,"total_value"), monthCredits:sum(rMo,"requested_credits"),monthValue:sum(rMo,"total_value"), pendingRequests:requests.filter(r=>r.status==="pending").length, previous12hCredits:sum(p12,"requested_credits"),previous12hValue:sum(p12,"total_value"), previous24hCredits:sum(p24,"requested_credits"),previous24hValue:sum(p24,"total_value"), previous48hCredits:sum(p48,"requested_credits"),previous48hValue:sum(p48,"total_value"), yesterdayCredits:sum(rYd,"requested_credits"),yesterdayValue:sum(rYd,"total_value"), lastWeekCredits:sum(rLW,"requested_credits"),lastWeekValue:sum(rLW,"total_value"), lastMonthCredits:sum(rLM,"requested_credits"),lastMonthValue:sum(rLM,"total_value"), unpaidPostpaidValue:sum(unp,"total_value"),unpaidPostpaidCount:unp.length });
    const monthlyMap={};
    for(let i=11;i>=0;i--){ const key=format(subMonths(new Date(),i),"MMM/yy",{locale:ptBR}); monthlyMap[key]={name:key,creditos:0,"Valor (R$)":0}; }
    rc.forEach(req=>{ const d=new Date(req.created_date); const key=format(d,"MMM/yy",{locale:ptBR}); if(monthlyMap[key]){ monthlyMap[key].creditos+=req.requested_credits||0; monthlyMap[key]["Valor (R$)"]+=req.total_value||0; } });
    setChartData(Object.values(monthlyMap));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cu = await remoteClient.auth.me();
      setUser(cu);
      let reqs = [];
      if (cu.role === "admin" || cu.role === "dev") {
        const [allU, allReqsResult, allSrv] = await Promise.all([
          remoteClient.users.list(),
          remoteClient.creditRequests.list(null, 2000),
          remoteClient.servers.list(),
        ]);
        const myResellers = (allU || []).filter(u => u.role === "user");
        reqs = allReqsResult?.data || [];
        setAllUsers(myResellers);
        setAllRequests(reqs);
        setAllServers(allSrv || []);
      } else {
        const [allReqsResult, settingsResult, myRegs] = await Promise.all([
          remoteClient.creditRequests.list(null, 300),
          remoteClient.settings.getPublic().catch(() => null),
          remoteClient.resellerServers.list().catch(() => []),
        ]);
        reqs = allReqsResult?.data || [];
        setAllRequests(reqs);
        // Montar lista de servidores do reseller a partir das vinculações (incluem server aninhado)
        const merged = (myRegs || []).map(rs => ({
          id: rs.server?.id ?? rs.server_id,
          name: rs.server?.name ?? '',
          panel_link: rs.server?.panel_link ?? rs.server?.panelLink ?? '',
          value_per_credit: rs.value_per_credit,
          username: rs.login,
          owner_id: rs.server?.owner_id ?? rs.server?.ownerId,
        }));
        setAllServers(merged);
        if (settingsResult?.pix_keys?.length > 0) {
          setPixKeys((settingsResult.pix_keys || []).filter(k => k.is_active));
        }
      }
      calculateStats(reqs);
      setRecentRequests(reqs.slice(0, 8));
    } catch (e) { console.error("[Dashboard] loadData:", e?.message || e); }
    finally { setLoading(false); }
  }, [calculateStats, refreshKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const ps = useMemo(() => {
    const map = {
      "12h": {credits:stats.credits12h,value:stats.value12h,label:"12h"},
      "24h": {credits:stats.credits24h,value:stats.value24h,label:"24h"},
      "48h": {credits:stats.credits48h,value:stats.value48h,label:"48h"},
      today: {credits:stats.todayCredits,value:stats.todayValue,label:"Hoje"},
      week:  {credits:stats.weekCredits,value:stats.weekValue,label:"Semana"},
      month: {credits:stats.monthCredits,value:stats.monthValue,label:"Mês"},
    };
    return map[activePeriod]||map.today;
  }, [activePeriod, stats]);

  const fmt  = n => n>=1000?`${(n/1000).toFixed(1)}k`:n.toLocaleString("pt-BR");
  const fmtR = n => `R$ ${n.toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
  const isAdmin = user?.role==="admin" || user?.role==="dev";

  // Owner name lookup — memoised
  const ownerMap = useMemo(() => {
    const m = {};
    allUsers.forEach(u => { if (u?.id) m[u.id] = u.full_name || u.email; });
    return m;
  }, [allUsers]);

  // Credits per month list (reversed so newest first)
  const monthList = useMemo(() => [...chartData].reverse(), [chartData]);

  // Per-reseller request aggregation — memoised so it doesn't re-run on every render
  const resellerStats = useMemo(() => {
    const map = {};
    allRequests.forEach(r => {
      if (!map[r.reseller_id]) map[r.reseller_id] = { count: 0, total: 0 };
      map[r.reseller_id].count += 1;
      if (r.status === "recharged") map[r.reseller_id].total += r.total_value || 0;
    });
    return map;
  }, [allRequests]);

  // Max credits for bar calculation — memoised
  const maxCredits = useMemo(() => Math.max(...chartData.map(d => d.creditos), 1), [chartData]);

  if (loading) return (
    <div style={{ minHeight:"100vh",background:"#0a0a0a",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ width:40,height:40,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.15)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite",boxShadow:"0 0 20px rgba(167,139,250,0.3)" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Mobile view
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return (
      <MobileDashboard
        user={user}
        stats={stats}
        recentRequests={recentRequests}
        allServers={allServers}
        chartData={chartData}
        pixKeys={pixKeys}
        activePeriod={activePeriod}
        onPeriodChange={setActivePeriod}
        onRefresh={() => setRefreshKey(k => k + 1)}
      />
    );
  }

  return (
    <div style={{ minHeight:"100vh",background:"#0a0a0a",color:"#fff" }}>
      <div className="db-outer">
        <PhoneRequiredBanner user={user} />

        {/* ── Header ── */}
        <div style={{ ...metalCard("#a78bfa"),padding:"clamp(14px,3vw,22px)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,transition:"all 0.25s" }}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:"50%",background:"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0" }} />
          <div style={{ position:"relative" }}>
            <h1 style={{ fontSize:"clamp(22px,5vw,32px)",fontWeight:900,background:"linear-gradient(135deg,#a78bfa,#22d3ee,#a78bfa)",backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0,lineHeight:1.1 }}>Dashboard</h1>
            <p style={{ fontSize:"clamp(10px,2vw,12px)",color:"rgba(255,255,255,0.35)",marginTop:3 }}>{user?.full_name||user?.email} · {isAdmin ? "Administrador" : "Revendedor"}</p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",position:"relative" }}>
            {isAdmin && <PeriodFilter active={activePeriod} onChange={setActivePeriod} />}
            <button onClick={()=>setRefreshKey(k=>k+1)} className="db-icon-btn"
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(167,139,250,0.12)"; e.currentTarget.style.color="#a78bfa"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color="rgba(255,255,255,0.35)"; }}>
              <RefreshCw style={{ width:14,height:14 }} />
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        {isAdmin ? (
          <div className="db-stats-grid">
            <BigCard label={`Créditos — ${ps.label}`} value={fmt(ps.credits)} sublabel={fmtR(ps.value)} icon={Zap} accent="#a78bfa" />
            <BigCard label={`Receita — ${ps.label}`}  value={fmtR(ps.value)} sublabel={`${fmt(ps.credits)} créditos`} icon={DollarSign} accent="#34d399" />
            <BigCard label="Pendentes"                  value={stats.pendingRequests} sublabel="Aguardando análise" icon={Clock} accent="#fbbf24" />
            <BigCard label="Mês Completo"               value={fmtR(stats.monthValue)} sublabel={`${fmt(stats.monthCredits)} créditos`} icon={CheckCircle} accent="#22d3ee" />
            <BigCard label="Hoje vs Ontem"              value={`${fmt(stats.todayCredits)} / ${fmt(stats.yesterdayCredits)}`} sublabel="créditos" icon={TrendingUp} accent="#f59e0b" />
          </div>
        ) : (
          <div className="db-stats-grid">
            <BigCard label="Hoje"      value={fmtR(stats.todayValue)} sublabel={`${fmt(stats.todayCredits)} créditos`} icon={Zap}         accent="#a78bfa" />
            <BigCard label="Semana"    value={fmtR(stats.weekValue)}  sublabel={`${fmt(stats.weekCredits)} créditos`}  icon={TrendingUp}  accent="#34d399" />
            <BigCard label="Pendentes" value={stats.pendingRequests}  sublabel="Aguardando"                            icon={Clock}       accent="#fbbf24" />
            <BigCard label="Mês"       value={fmtR(stats.monthValue)} sublabel={`${fmt(stats.monthCredits)} créditos`} icon={CheckCircle} accent="#22d3ee" />
            {user?.payment_type==="postpaid"&&<BigCard label="Saldo Devedor" value={fmtR(stats.unpaidPostpaidValue)} sublabel={`${stats.unpaidPostpaidCount} não faturado(s)`} icon={DollarSign} accent="#f87171" />}
          </div>
        )}

        {/* ── ROW 1: Chart + Pedidos Recentes ── */}
        <div className="db-row2">

          {/* Chart */}
          <div style={{ ...metalCard("#a78bfa"),padding:"clamp(14px,3vw,22px)",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset"; e.currentTarget.style.borderColor="rgba(167,139,250,0.28)"; }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0" }} />
            <div style={{ position:"absolute",top:-60,right:-40,width:140,height:140,background:"#a78bfa",borderRadius:"50%",filter:"blur(70px)",opacity:0.07,pointerEvents:"none" }} />
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8,position:"relative" }}>
              <div>
                <h3 style={{ fontSize:"clamp(13px,2.5vw,15px)",fontWeight:800,color:"#fff",margin:0,display:"flex",alignItems:"center",gap:8 }}>
                  <TrendingUp style={{ width:14,height:14,color:"#a78bfa" }} /> Créditos por Mês
                </h3>
                <p style={{ fontSize:11,color:"rgba(255,255,255,0.3)",margin:"3px 0 0" }}>Últimos 6 meses</p>
              </div>
              <div style={{ display:"flex",gap:10,fontSize:10,color:"rgba(255,255,255,0.35)" }}>
                <span style={{ display:"flex",alignItems:"center",gap:4 }}><span style={{ width:7,height:7,borderRadius:2,background:"#a78bfa",display:"inline-block" }} />Créditos</span>
                <span style={{ display:"flex",alignItems:"center",gap:4 }}><span style={{ width:7,height:7,borderRadius:2,background:"#22d3ee",display:"inline-block" }} />Valor</span>
              </div>
            </div>
            <div style={{ height:"clamp(160px,30vw,220px)",position:"relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top:5,right:5,left:-10,bottom:0 }}>
                  <defs>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.5} /><stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} /><stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="creditos" name="Créditos" stroke="#a78bfa" strokeWidth={2} fill="url(#gC)" dot={false} activeDot={{ r:4,fill:"#a78bfa",strokeWidth:0 }} />
                  <Area type="monotone" dataKey="Valor (R$)" name="Valor (R$)" stroke="#22d3ee" strokeWidth={2} fill="url(#gV)" dot={false} activeDot={{ r:4,fill:"#22d3ee",strokeWidth:0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pedidos Recentes */}
          <div style={{ ...metalCard("#22d3ee"),padding:"clamp(14px,3vw,22px)",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(34,211,238,0.12)"; e.currentTarget.style.borderColor="rgba(34,211,238,0.5)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset"; e.currentTarget.style.borderColor="rgba(34,211,238,0.28)"; }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0" }} />
            <div style={{ position:"absolute",top:-60,left:-40,width:120,height:120,background:"#22d3ee",borderRadius:"50%",filter:"blur(70px)",opacity:0.06,pointerEvents:"none" }} />
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,position:"relative" }}>
              <h3 style={{ fontSize:"clamp(13px,2.5vw,15px)",fontWeight:800,color:"#fff",margin:0,display:"flex",alignItems:"center",gap:7 }}>
                <Activity style={{ width:14,height:14,color:"#a78bfa" }} /> Pedidos Recentes
              </h3>
              <Link to={createPageUrl("CreditRequests")} style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,color:"rgba(255,255,255,0.35)",textDecoration:"none",padding:"4px 10px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",whiteSpace:"nowrap" }}>
                Ver todos <ExternalLink style={{ width:10,height:10 }} />
              </Link>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:6,position:"relative",maxHeight:"clamp(220px,40vw,300px)",overflowY:"auto" }}>
              {recentRequests.length>0 ? recentRequests.map((req)=>{
                const s=STATUS[req.status]||STATUS.pending;
                return (
                  <div key={req.id} style={{ background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:11,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="rgba(167,139,250,0.06)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.2)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap" }}>
                        <span style={{ fontSize:"clamp(11px,2vw,12px)",fontWeight:700,color:"#fff" }}>{req.requested_credits?.toLocaleString("pt-BR")} créditos</span>
                        <span style={{ fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:20,background:`${s.color}22`,color:s.color,border:`1px solid ${s.color}44`,whiteSpace:"nowrap" }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize:10,color:"rgba(255,255,255,0.3)",margin:0 }}>{formatFullBrasiliaDate(req.created_date)}</p>
                    </div>
                    <span style={{ fontSize:"clamp(11px,2vw,13px)",fontWeight:800,color:"#a78bfa",whiteSpace:"nowrap",textShadow:"0 0 14px rgba(167,139,250,0.6)",flexShrink:0 }}>
                      R$ {req.total_value?.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                    </span>
                  </div>
                );
              }) : (
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 0",gap:8,color:"rgba(255,255,255,0.2)" }}>
                  <Clock style={{ width:28,height:28 }} />
                  <span style={{ fontSize:12 }}>Nenhum pedido recente</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ROW 2: Servidores | Créditos/Mês lista | Revendedores ── */}
        <div className="db-row3">

          {/* SERVIDORES */}
          <div style={{ ...metalCard("#a78bfa"),padding:"clamp(14px,3vw,22px)",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset"; e.currentTarget.style.borderColor="rgba(167,139,250,0.28)"; }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0" }} />
            <div style={{ position:"absolute",top:-50,right:-30,width:100,height:100,background:"#a78bfa",borderRadius:"50%",filter:"blur(60px)",opacity:0.08,pointerEvents:"none" }} />
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,position:"relative" }}>
              <h3 style={{ fontSize:"clamp(12px,2.5vw,14px)",fontWeight:800,color:"#fff",margin:0,display:"flex",alignItems:"center",gap:7 }}>
                <Server style={{ width:13,height:13,color:"#a78bfa" }} />
                {isAdmin?"Todos os Servidores":"Meus Servidores"}
              </h3>
              <span style={{ fontSize:10,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",padding:"2px 9px",borderRadius:20,border:"1px solid rgba(255,255,255,0.07)" }}>
                {allServers.length}
              </span>
            </div>
            {allServers.length===0 ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 0",color:"rgba(255,255,255,0.2)",position:"relative" }}>
                <Server style={{ width:26,height:26,marginBottom:8 }} />
                <span style={{ fontSize:12 }}>Nenhum servidor cadastrado</span>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:6,position:"relative",maxHeight:"clamp(220px,40vw,480px)",overflowY:"auto" }}>
                {allServers.map(sv=>(
                  <ServerRow key={sv.id} server={sv} onSaved={()=>setRefreshKey(k=>k+1)} isAdmin={isAdmin||sv.owner_id===user?.id} ownerName={isAdmin?ownerMap[sv.owner_id]:null} />
                ))}
              </div>
            )}
            {!isAdmin&&(
              <Link to={createPageUrl("Servers")} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:12,padding:"9px",borderRadius:12,background:"rgba(167,139,250,0.07)",border:"1px solid rgba(167,139,250,0.2)",color:"#a78bfa",textDecoration:"none",fontSize:12,fontWeight:700,position:"relative",transition:"all 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(167,139,250,0.14)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(167,139,250,0.07)"}>
                <Server style={{ width:12,height:12 }} /> Gerenciar Servidores
              </Link>
            )}
          </div>

          {/* CRÉDITOS POR MÊS */}
          <div style={{ ...metalCard("#fbbf24"),padding:"clamp(14px,3vw,22px)",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(251,191,36,0.12)"; e.currentTarget.style.borderColor="rgba(251,191,36,0.5)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset"; e.currentTarget.style.borderColor="rgba(251,191,36,0.28)"; }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0" }} />
            <div style={{ position:"absolute",top:-50,left:-30,width:100,height:100,background:"#22d3ee",borderRadius:"50%",filter:"blur(60px)",opacity:0.07,pointerEvents:"none" }} />
            <h3 style={{ fontSize:"clamp(12px,2.5vw,14px)",fontWeight:800,color:"#fff",margin:"0 0 14px",display:"flex",alignItems:"center",gap:7,position:"relative" }}>
              <BarChart3 style={{ width:13,height:13,color:"#22d3ee" }} /> Créditos por Mês
            </h3>
            <div style={{ display:"flex",flexDirection:"column",gap:10,position:"relative" }}>
              {monthList.map((m)=>{
                const pct = Math.min(Math.round((m.creditos / maxCredits) * 100), 100);
                return (
                  <div key={m.name} style={{ display:"flex",flexDirection:"column",gap:4 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:4 }}>
                      <span style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"capitalize" }}>{m.name}</span>
                      <div style={{ display:"flex",alignItems:"baseline",gap:5,flexWrap:"wrap",justifyContent:"flex-end" }}>
                        <span style={{ fontSize:"clamp(11px,2vw,13px)",fontWeight:900,color:"#a78bfa" }}>{m.creditos.toLocaleString("pt-BR")}</span>
                        <span style={{ fontSize:9,color:"rgba(255,255,255,0.3)" }}>R$ {m["Valor (R$)"].toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
                      </div>
                    </div>
                    <div style={{ height:5,background:"rgba(255,255,255,0.06)",borderRadius:10,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#a78bfa,#22d3ee)",borderRadius:10,transition:"width 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {user?.role==="user"&&pixKeys.length>0&&<div style={{ marginTop:14 }}><PixKeysDisplay keys={pixKeys} /></div>}
          </div>

          {/* REVENDEDORES (admin) ou PIX keys (reseller) */}
          {isAdmin ? (
            <div style={{ ...metalCard("#22d3ee"),padding:"clamp(14px,3vw,22px)",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
              onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(34,211,238,0.12)"; e.currentTarget.style.borderColor="rgba(34,211,238,0.5)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07) inset"; e.currentTarget.style.borderColor="rgba(34,211,238,0.28)"; }}>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:"40%",background:"linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0" }} />
              <div style={{ position:"absolute",top:-50,right:-30,width:100,height:100,background:"#22d3ee",borderRadius:"50%",filter:"blur(60px)",opacity:0.07,pointerEvents:"none" }} />
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,position:"relative" }}>
                <h3 style={{ fontSize:"clamp(12px,2.5vw,14px)",fontWeight:800,color:"#fff",margin:0,display:"flex",alignItems:"center",gap:7 }}>
                  <Users style={{ width:13,height:13,color:"#22d3ee" }} /> Revendedores
                </h3>
                <span style={{ fontSize:10,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",padding:"2px 9px",borderRadius:20,border:"1px solid rgba(255,255,255,0.07)" }}>
                  {allUsers.length}
                </span>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:6,position:"relative",maxHeight:"clamp(220px,40vw,480px)",overflowY:"auto" }}>
                {allUsers.length===0 ? (
                  <div style={{ textAlign:"center",padding:"24px 0",color:"rgba(255,255,255,0.2)",fontSize:12 }}>Nenhum revendedor</div>
                ) : allUsers.map(u=>{
                  const uStats = resellerStats[u.id] || { count: 0, total: 0 };
                  const uReqsLen = uStats.count;
                  const uTotal   = uStats.total;
                  return (
                    <div key={u.id} onClick={()=>setSelectedReseller(u)}
                      style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,cursor:"pointer",transition:"all 0.18s" }}
                      onMouseEnter={e=>{ e.currentTarget.style.background="rgba(34,211,238,0.07)"; e.currentTarget.style.borderColor="rgba(34,211,238,0.25)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
                      <div style={{ width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,rgba(34,211,238,0.15),rgba(167,139,250,0.1))",border:"1px solid rgba(34,211,238,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#22d3ee",flexShrink:0 }}>
                        {u.full_name?.[0]?.toUpperCase()||"?"}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:"clamp(11px,2vw,12px)",fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.full_name||u.email}</p>
                        <p style={{ fontSize:10,color:"rgba(255,255,255,0.3)",margin:"2px 0 0" }}>{uReqsLen} pedidos · {fmtR(uTotal)}</p>
                      </div>
                      <ChevronRight style={{ width:12,height:12,color:"rgba(255,255,255,0.2)",flexShrink:0 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            pixKeys.length>0 ? <PixKeysDisplay keys={pixKeys} /> : <div />
          )}

        </div>

        {/* Footer */}
        <div style={{ display:"flex",justifyContent:"center" }}>
          <span style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:10,color:"rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:20,padding:"5px 14px" }}>
            <Calendar style={{ width:11,height:11 }} /> Atualizado em {getCurrentBrasiliaDateTime()}
          </span>
        </div>
      </div>

      {/* Reseller Modal */}
      {selectedReseller && (
        <ResellerModal reseller={selectedReseller} requests={allRequests} onClose={()=>setSelectedReseller(null)} />
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

        /* ── OUTER WRAPPER ── */
        .db-outer {
          max-width: 1800px;
          margin: 0 auto;
          padding: clamp(12px,3vw,20px) clamp(10px,3vw,20px) clamp(80px,12vw,96px);
          display: flex;
          flex-direction: column;
          gap: clamp(12px,2.5vw,20px);
        }

        /* ── STAT CARDS GRID ── */
        .db-stats-grid {
          display: grid;
          gap: clamp(10px,2vw,14px);
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 480px) {
          .db-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 640px) {
          .db-stats-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .db-stats-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1100px) {
          .db-stats-grid { grid-template-columns: repeat(5, 1fr); }
        }

        /* ── ROW 2: Chart + Pedidos ── */
        .db-row2 {
          display: grid;
          gap: clamp(10px,2vw,16px);
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .db-row2 { grid-template-columns: 1fr 1fr; }
        }

        /* ── ROW 3: Servidores + Meses + Revendedores ── */
        .db-row3 {
          display: grid;
          gap: clamp(10px,2vw,16px);
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .db-row3 { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1024px) {
          .db-row3 { grid-template-columns: repeat(3, 1fr); }
        }

        /* ── Icon button ── */
        .db-icon-btn {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.35); transition: all 0.15s; flex-shrink: 0;
        }

        /* scrollbar */
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.2);border-radius:99px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(167,139,250,0.4)}
      `}</style>
    </div>
  );
}
