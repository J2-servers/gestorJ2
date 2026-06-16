import React, { useState, useEffect, useCallback } from "react";
import { remoteClient } from "@/api/remoteClient";
import { CreditCard, TrendingUp, Calendar, DollarSign, BarChart3, Activity } from "lucide-react";
import MonthlyChart from "../components/dashboard/MonthlyChart";
import PhoneRequiredBanner from "../components/layout/PhoneRequiredBanner";

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:16 };
const GRAD = {
  purple:"linear-gradient(135deg,#2d1b69,#1a0f3e)",
  green: "linear-gradient(135deg,#064e2e,#022c1a)",
  cyan:  "linear-gradient(135deg,#164e63,#083344)",
  yellow:"linear-gradient(135deg,#78350f,#3f1f04)",
};
const ICON_C = { purple:"#a78bfa", green:"#34d399", cyan:"#22d3ee", yellow:"#fbbf24" };

const StatCard = ({ title, value, icon:Icon, trend, color="purple" }) => (
  <div style={{ background:GRAD[color], border:`1px solid ${ICON_C[color]}33`, borderRadius:14, padding:18, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute",top:-25,right:-25,width:70,height:70,background:ICON_C[color],borderRadius:"50%",filter:"blur(30px)",opacity:0.25,pointerEvents:"none" }} />
    <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",position:"relative" }}>
      <div>
        <p style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.45)",margin:"0 0 8px" }}>{title}</p>
        <p style={{ fontSize:22,fontWeight:800,color:"#fff",margin:"0 0 4px",lineHeight:1 }}>{value}</p>
        {trend&&<p style={{ fontSize:11,color:"rgba(255,255,255,0.4)",margin:0 }}>{trend}</p>}
      </div>
      <div style={{ width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <Icon style={{ width:15,height:15,color:ICON_C[color] }} />
      </div>
    </div>
  </div>
);

const InfoRow = ({ label, value, accent }) => (
  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8,fontSize:12 }}>
    <span style={{ color:"rgba(255,255,255,0.4)" }}>{label}</span>
    <span style={{ fontWeight:700, color:accent||"#fff" }}>{value}</span>
  </div>
);

export default function ManagementPage() {
  const [user, setUser]   = useState(null);
  const [stats, setStats] = useState({ todayCredits:0,todayValue:0,weekCredits:0,weekValue:0,monthCredits:0,monthValue:0,averageCredits:0,averageValue:0,totalRequests:0,rechargedRequests:0 });
  const [loading, setLoading] = useState(true);

  const calculateStats = useCallback((requests) => {
    const now = new Date();
    const d0 = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const w0 = new Date(now.getTime()-(7*86400000));
    const m0 = new Date(now.getFullYear(),now.getMonth(),1);
    const rc = requests.filter(r=>r.status==="recharged");
    const sum = (arr,k) => arr.reduce((s,r)=>s+(r[k]||0),0);
    const range = (arr,from) => arr.filter(r=>new Date(r.created_date)>=from);
    const rTd=range(rc,d0), rWk=range(rc,w0), rMo=range(rc,m0);
    setStats({ todayCredits:sum(rTd,"requested_credits"),todayValue:sum(rTd,"total_value"), weekCredits:sum(rWk,"requested_credits"),weekValue:sum(rWk,"total_value"), monthCredits:sum(rMo,"requested_credits"),monthValue:sum(rMo,"total_value"), averageCredits:Math.round(sum(rMo,"requested_credits")/3), averageValue:sum(rMo,"total_value")/3, totalRequests:requests.length, rechargedRequests:rc.length });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const cu = await remoteClient.auth.me();
      setUser(cu);
      if (cu.role==='reseller' || cu.role==='user') {
        const result = await remoteClient.creditRequests.list(null, 500);
        calculateStats(result?.data || []);
      } else if (cu.role==='admin' || cu.role==='dev') {
        const result = await remoteClient.creditRequests.list(null, 2000);
        calculateStats(result?.data || []);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [calculateStats]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const fmt  = n => n.toLocaleString('pt-BR');
  const fmtR = n => `R$ ${n.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  const success = stats.totalRequests>0?((stats.rechargedRequests/stats.totalRequests)*100).toFixed(1):'0';

  return (
    <div style={S}>
      <div style={{ maxWidth:1600,margin:"0 auto",padding:"12px 12px 96px",display:"flex",flexDirection:"column",gap:12 }}>
        <PhoneRequiredBanner user={user} />

        {/* Header */}
        <div style={{ background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <BarChart3 style={{ width:16,height:16,color:"#a78bfa" }} />
          </div>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>
              {user?.role==='admin'?'Gestão Geral':'Minha Gestão'}
            </h1>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>{user?.role==='admin'?'Desempenho de todos os revendedores':'Seus investimentos e performance'}</p>
          </div>
        </div>

        {/* Hoje */}
        <div>
          <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 10px" }}>Hoje</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12 }}>
            <StatCard title="Créditos Hoje" value={fmt(stats.todayCredits)} icon={CreditCard} trend={fmtR(stats.todayValue)} color="purple" />
            <StatCard title="Gastos Hoje" value={fmtR(stats.todayValue)} icon={DollarSign} trend={`${fmt(stats.todayCredits)} créditos`} color="green" />
          </div>
        </div>

        {/* Semana */}
        <div>
          <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 10px" }}>Esta Semana</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12 }}>
            <StatCard title="Créditos Semana" value={fmt(stats.weekCredits)} icon={TrendingUp} trend={fmtR(stats.weekValue)} color="cyan" />
            <StatCard title="Gastos Semana" value={fmtR(stats.weekValue)} icon={Calendar} trend={`${fmt(stats.weekCredits)} créditos`} color="yellow" />
          </div>
        </div>

        {/* Mês */}
        <div>
          <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 10px" }}>Este Mês</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12 }}>
            <StatCard title="Total Créditos" value={fmt(stats.monthCredits)} icon={BarChart3} trend={fmtR(stats.monthValue)} color="purple" />
            <StatCard title="Total Investido" value={fmtR(stats.monthValue)} icon={Activity} trend={`${fmt(stats.monthCredits)} créditos`} color="green" />
          </div>
        </div>

        {/* Chart + Info */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12 }}>
          <MonthlyChart userRole={user?.role} />
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div style={CARD}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                <div style={{ width:26,height:26,borderRadius:7,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Activity style={{ width:12,height:12,color:"#a78bfa" }} />
                </div>
                <div>
                  <h3 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0 }}>Média 3 Meses</h3>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>Performance mensal</p>
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                <InfoRow label="Créditos/mês" value={fmt(stats.averageCredits)} />
                <InfoRow label="Investimento/mês" value={fmtR(stats.averageValue)} accent="#a78bfa" />
              </div>
            </div>
            <div style={CARD}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
                <div style={{ width:26,height:26,borderRadius:7,background:"rgba(34,211,238,0.12)",border:"1px solid rgba(34,211,238,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Activity style={{ width:12,height:12,color:"#22d3ee" }} />
                </div>
                <div>
                  <h3 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0 }}>Resumo Geral</h3>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>{user?.role==='admin'?'Todos os revendedores':'Meus dados'}</p>
                </div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                <InfoRow label="Total pedidos" value={stats.totalRequests} />
                <InfoRow label="Recarregados" value={stats.rechargedRequests} accent="#34d399" />
                <InfoRow label="Taxa sucesso" value={`${success}%`} accent="#22d3ee" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}