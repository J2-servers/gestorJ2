import React, { useState, useEffect, useCallback } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { 
  DollarSign, Users as UsersIcon, TrendingUp,
  CreditCard, CheckCircle, XCircle, Clock, BarChart3, Activity, Zap, 
  Target, Award, AlertTriangle, ThumbsUp, Layers,
  ShoppingCart, Eye, Flame, Download, Calculator, UserX, Timer
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBrasiliaDate } from '../components/utils/dateHelper';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = (border="#a78bfa33") => ({ background:"#141414", border:`1px solid ${border}`, borderRadius:16, padding:20 });
const DS_COLORS = ['#a78bfa','#22d3ee','#34d399','#f472b6','#fbbf24','#60a5fa','#fb923c','#e879f9','#f87171','#a3e635'];

const GRAD = {
  purple:"linear-gradient(135deg,#2d1b69,#1a0f3e)", green:"linear-gradient(135deg,#064e2e,#022c1a)",
  cyan:"linear-gradient(135deg,#164e63,#083344)", yellow:"linear-gradient(135deg,#78350f,#3f1f04)",
  pink:"linear-gradient(135deg,#831843,#500724)", blue:"linear-gradient(135deg,#1e3a8a,#0f1f4e)",
  red:"linear-gradient(135deg,#7f1d1d,#450a0a)", orange:"linear-gradient(135deg,#7c2d12,#431407)",
};
const ICON_C = { purple:"#a78bfa",green:"#34d399",cyan:"#22d3ee",yellow:"#fbbf24",pink:"#f472b6",blue:"#60a5fa",red:"#f87171",orange:"#fb923c" };

const MetricCard = ({ icon: Icon, label, value, sublabel, color="purple", badge }) => (
  <div style={{ background:GRAD[color], border:`1px solid ${ICON_C[color]}33`, borderRadius:16, padding:20, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:-30, right:-30, width:80, height:80, background:ICON_C[color], borderRadius:"50%", filter:"blur(35px)", opacity:0.25, pointerEvents:"none" }} />
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", position:"relative" }}>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.45)", margin:"0 0 8px" }}>{label}</p>
        <p style={{ fontSize:22, fontWeight:800, color:"#fff", margin:"0 0 4px", lineHeight:1 }}>{value}</p>
        {sublabel && <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", margin:0 }}>{sublabel}</p>}
        {badge && <span style={{ display:"inline-block", marginTop:6, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:`${ICON_C[color]}22`, color:ICON_C[color], border:`1px solid ${ICON_C[color]}44` }}>{badge}</span>}
      </div>
      <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon style={{ width:16, height:16, color:ICON_C[color] }} />
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, subtitle, icon: Icon, children, badge, badgeColor="#a78bfa", action }) => (
  <div style={CARD()}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon style={{ width:14, height:14, color:"#a78bfa" }} />
        </div>
        <div>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#fff", margin:0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:0 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {action}
        {badge && <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, background:`${badgeColor}22`, color:badgeColor, border:`1px solid ${badgeColor}44` }}>{badge}</span>}
      </div>
    </div>
    {children}
  </div>
);

const Tooltip2 = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1a1a1a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 14px", fontSize:12 }}>
      <p style={{ color:"rgba(255,255,255,0.5)", marginBottom:6, fontWeight:600 }}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{ color:p.color, margin:"2px 0", fontWeight:700 }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</p>)}
    </div>
  );
};

const rankStyle = (rank) => ({
  1:{ bg:"rgba(251,191,36,0.15)", color:"#fbbf24" },
  2:{ bg:"rgba(167,139,250,0.15)", color:"#a78bfa" },
  3:{ bg:"rgba(34,211,238,0.15)", color:"#22d3ee" },
})[rank] || { bg:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)" };

const TopItemRow = ({ rank, name, value, sublabel, metric, badge, badgeColor="#a78bfa", onClick }) => {
  const rs = rankStyle(rank);
  return (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", cursor: onClick ? "pointer" : "default", marginBottom:6 }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.borderColor="rgba(167,139,250,0.4)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
      <div style={{ width:26, height:26, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, background:rs.bg, color:rs.color, flexShrink:0 }}>{rank}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, fontWeight:700, color:"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
        <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:0 }}>{metric}</p>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <p style={{ fontSize:13, fontWeight:800, color:"#a78bfa", margin:0 }}>{value}</p>
        {sublabel && <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", margin:0 }}>{sublabel}</p>}
      </div>
      {badge && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:`${badgeColor}22`, color:badgeColor, border:`1px solid ${badgeColor}44`, flexShrink:0 }}>{badge}</span>}
    </div>
  );
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [period, setPeriod] = useState('30d');

  const [stats, setStats] = useState({ totalRevenue:0, totalRevenueAllTime:0, totalCredits:0, totalResellers:0, totalServers:0, totalRequests:0, approvedRequests:0, rejectedRequests:0, pendingRequests:0, approvalRate:0, avgTicket:0, avgCreditsPerRequest:0, totalCost:0, totalProfit:0, profitMargin:0 });
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

  // Novas métricas
  const [churnResellers, setChurnResellers] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [resellerScores, setResellerScores] = useState([]);
  const [meta, setMeta] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('analytics_meta') || '0');
      return isNaN(v) ? 0 : Math.max(0, v);
    } catch { return 0; }
  });
  const [metaInput, setMetaInput] = useState('');
  const [showMetaEdit, setShowMetaEdit] = useState(false);

  // Simulador de preço
  const [simCredits, setSimCredits] = useState(100);
  const [simSalePrice, setSimSalePrice] = useState(5);
  const [simCostPrice, setSimCostPrice] = useState(3);

  const [selectedReseller, setSelectedReseller] = useState(null);
  const [resellerHistory, setResellerHistory] = useState([]);
  const [showAllResellers, setShowAllResellers] = useState(false);
  const [selectedLossServer, setSelectedLossServer] = useState(null);
  const [serverLossDetails, setServerLossDetails] = useState({});

  useEffect(() => { loadAnalytics(); }, [period]); // loadAnalytics is stable via useCallback with [period]

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await remoteClient.auth.me();
      setUser(currentUser);
      if (currentUser.role !== 'admin') { setLoading(false); return; }

      const [allUsers, allReqsResult, allServers] = await Promise.all([
        remoteClient.users.list(),
        remoteClient.creditRequests.list(null, 3000),
        remoteClient.servers.list(),
      ]);

      const myResellers = (allUsers||[]).filter(u => u?.role==='user');
      const myResellerIds = new Set(myResellers.map(r=>r.id));
      const allRequests = allReqsResult?.data || [];
      const myRequests = allRequests.filter(r=>myResellerIds.has(r?.reseller_id));

      // Mapa custo por servidor: server name -> value_per_credit (do servidor global)
      const serverCostMap = {};
      (allServers||[]).forEach(sv => {
        if (sv?.name) serverCostMap[sv.name.trim().toLowerCase()] = sv.value_per_credit || 0;
      });

      const now = new Date();
      const periodDays = period==='7d'?7:period==='30d'?30:90;
      const periodStart = new Date(now.getTime()-(periodDays*86400000));
      const periodRequests = myRequests.filter(r=>new Date(r.created_date)>=periodStart);
      const rechargedRequests = periodRequests.filter(r=>r.status==='recharged');
      const allRechargedEver = myRequests.filter(r=>r.status==='recharged');

      const totalRevenue = rechargedRequests.reduce((s,r)=>s+(r.total_value||0),0);
      const totalRevenueAllTime = allRechargedEver.reduce((s,r)=>s+(r.total_value||0),0);
      const totalCredits = rechargedRequests.reduce((s,r)=>s+(r.requested_credits||0),0);
      const approvedRequests = rechargedRequests.length;
      const rejectedRequests = periodRequests.filter(r=>r.status==='rejected').length;
      const pendingRequests = periodRequests.filter(r=>['pending','analyzing'].includes(r.status)).length;
      const totalRequests = periodRequests.length;
      const approvalRate = totalRequests>0?((approvedRequests/totalRequests)*100).toFixed(1):0;
      const avgTicket = approvedRequests>0?totalRevenue/approvedRequests:0;
      const avgCreditsPerRequest = approvedRequests>0?totalCredits/approvedRequests:0;

      // Server profit/loss analysis usando custo do servidor global
      const sStats = {};
      const sPurchases = {};
      rechargedRequests.forEach(req => {
        const sn = req.server_snapshot?.name || '?';
        const snKey = sn.trim().toLowerCase();
        const costPerCredit = serverCostMap[snKey] || 0;
        const credits = req.requested_credits || 0;
        const revenue = req.total_value || 0;
        const cost = credits * costPerCredit;
        const profit = revenue - cost;
        if (!sStats[sn]) sStats[sn] = { name:sn, revenue:0, cost:0, profit:0, credits:0, requests:0, category: '—' };
        sStats[sn].revenue += revenue;
        sStats[sn].cost += cost;
        sStats[sn].profit += profit;
        sStats[sn].credits += credits;
        sStats[sn].requests += 1;
        if (!sPurchases[sn]) sPurchases[sn] = [];
        const resellerUser = myResellers.find(r => r.id === req.reseller_id);
        sPurchases[sn].push({
          id: req.id, created_date: req.created_date, reseller_id: req.reseller_id,
          reseller_name: resellerUser?.full_name || resellerUser?.email || '?',
          login: req.login, credits, revenue, cost, profit, costPerCredit,
          payment_type: req.payment_type,
        });
      });
      // Attach purchases to each server stat
      Object.keys(sStats).forEach(sn => { sStats[sn].purchases = sPurchases[sn] || []; });
      setServerLossDetails(sStats);

      const allServerStats = Object.values(sStats);
      const totalCost = allServerStats.reduce((s,x)=>s+x.cost,0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) : 0;

      setStats({ totalRevenue, totalRevenueAllTime, totalCredits, totalResellers:myResellers.length,
        totalServers:new Set(rechargedRequests.map(r=>r.server_snapshot?.name||'?')).size,
        totalRequests, approvedRequests, rejectedRequests, pendingRequests, approvalRate,
        avgTicket, avgCreditsPerRequest, totalCost, totalProfit, profitMargin });

      setServerProfit([...allServerStats].sort((a,b)=>b.profit-a.profit).slice(0,8));
      setServerLoss([...allServerStats].filter(s=>s.profit<0).sort((a,b)=>a.profit-b.profit).slice(0,8));
      setServerSales([...allServerStats].sort((a,b)=>b.credits-a.credits).slice(0,8));

      // Lucro por servidor (agrupado por servidor)
      const catStats = {};
      rechargedRequests.forEach(req => {
        const sn = req.server_snapshot?.name || 'Sem servidor';
        const snKey = sn.trim().toLowerCase();
        const credits = req.requested_credits||0;
        const revenue = req.total_value||0;
        const cost = credits*(serverCostMap[snKey]||0);
        if(!catStats[sn]) catStats[sn]={ name:sn, revenue:0, cost:0, profit:0, credits:0, color:'#a78bfa' };
        catStats[sn].revenue += revenue;
        catStats[sn].cost += cost;
        catStats[sn].profit += (revenue-cost);
        catStats[sn].credits += credits;
      });
      setCategoryProfitData(Object.values(catStats).sort((a,b)=>b.profit-a.profit).slice(0,10));

      // Daily trend (14 days)
      const dailyMap = {};
      for(let i=13;i>=0;i--){
        const d = new Date(now); d.setDate(d.getDate()-i);
        const k = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        dailyMap[k]={ day:k, receita:0, custo:0, lucro:0, pedidos:0 };
      }
      allRechargedEver.forEach(req => {
        const d = new Date(req.created_date);
        const diff = Math.floor((now-d)/(86400000));
        if(diff<=13){
          const k = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
          if(dailyMap[k]){
            const sn=(req.server_snapshot?.name||'?').trim().toLowerCase();
            const cost=(req.requested_credits||0)*(serverCostMap[sn]||0);
            dailyMap[k].receita += req.total_value||0;
            dailyMap[k].custo += cost;
            dailyMap[k].lucro += (req.total_value||0)-cost;
            dailyMap[k].pedidos += 1;
          }
        }
      });
      setDailyTrendData(Object.values(dailyMap));

      // Reseller growth
      const growthMap = {};
      for(let i=5;i>=0;i--){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const k=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
        growthMap[k]={month:k,novos:0,ativos:0,receita:0};
      }
      myResellers.forEach(u=>{
        const d=new Date(u.created_date);
        if(d>=new Date(now.getFullYear(),now.getMonth()-5,1)){
          const k=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
          if(growthMap[k]) growthMap[k].novos+=1;
        }
      });
      allRechargedEver.forEach(req=>{
        const d=new Date(req.created_date);
        if(d>=new Date(now.getFullYear(),now.getMonth()-5,1)){
          const k=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
          if(growthMap[k]){ growthMap[k].ativos+=1; growthMap[k].receita+=req.total_value||0; }
        }
      });
      setResellerGrowthData(Object.values(growthMap));

      // Monthly
      const monthlyMap={};
      for(let i=5;i>=0;i--){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const k=d.toLocaleDateString('pt-BR',{month:'short'});
        monthlyMap[k]={month:k,receita:0,custo:0,lucro:0,pedidos:0};
      }
      allRechargedEver.forEach(r=>{
        const d=new Date(r.created_date);
        if(d>=new Date(now.getFullYear(),now.getMonth()-5,1)){
          const k=d.toLocaleDateString('pt-BR',{month:'short'});
          if(monthlyMap[k]){
            const sn=(r.server_snapshot?.name||'?').trim().toLowerCase();
            const cost=(r.requested_credits||0)*(serverCostMap[sn]||0);
            monthlyMap[k].receita+=r.total_value||0;
            monthlyMap[k].custo+=cost;
            monthlyMap[k].lucro+=(r.total_value||0)-cost;
            monthlyMap[k].pedidos+=1;
          }
        }
      });
      setMonthlyData(Object.values(monthlyMap));

      // Weekly
      const weeklyMap={};
      for(let i=3;i>=0;i--){ const k=`Sem ${4-i}`; weeklyMap[k]={week:k,pedidos:0,receita:0}; }
      allRechargedEver.forEach(r=>{
        const wa=Math.floor((now-new Date(r.created_date))/(7*86400000));
        if(wa>=0&&wa<4){ const k=`Sem ${4-wa}`; if(weeklyMap[k]){weeklyMap[k].pedidos+=1;weeklyMap[k].receita+=r.total_value||0;} }
      });
      setWeeklyData(Object.values(weeklyMap));

      setStatusData([{name:'Aprovados',value:approvedRequests,color:'#34d399'},{name:'Pendentes',value:pendingRequests,color:'#fbbf24'},{name:'Rejeitados',value:rejectedRequests,color:'#f87171'}]);

      // Top resellers + score
      const rStats={};
      const thirtyDaysAgo = new Date(now.getTime()-30*86400000);
      rechargedRequests.forEach(req=>{
        if(!rStats[req.reseller_id]){
          const res=myResellers.find(r=>r.id===req.reseller_id);
          rStats[req.reseller_id]={id:req.reseller_id,name:res?.full_name||res?.email||'?',totalValue:0,totalCredits:0,requestCount:0,lastRequest:null};
        }
        rStats[req.reseller_id].totalValue+=req.total_value||0;
        rStats[req.reseller_id].totalCredits+=req.requested_credits||0;
        rStats[req.reseller_id].requestCount+=1;
        const rd = new Date(req.created_date);
        if(!rStats[req.reseller_id].lastRequest || rd > rStats[req.reseller_id].lastRequest)
          rStats[req.reseller_id].lastRequest = rd;
      });
      const sortedR=Object.values(rStats).sort((a,b)=>b.totalValue-a.totalValue);
      setTopResellers(sortedR.slice(0,5));
      setAllResellerStats(sortedR);

      // Score = volume (40%) + regularidade (30%) + aprovação (30%)
      const maxVal = Math.max(...sortedR.map(r=>r.totalValue), 1);
      const maxReq = Math.max(...sortedR.map(r=>r.requestCount), 1);
      const scored = sortedR.map(r=>{
        const volScore = (r.totalValue/maxVal)*40;
        const regScore = (r.requestCount/maxReq)*30;
        const recScore = r.lastRequest && r.lastRequest>=thirtyDaysAgo ? 30 : 0;
        const score = Math.round(volScore+regScore+recScore);
        return { ...r, score };
      }).sort((a,b)=>b.score-a.score).slice(0,8);
      setResellerScores(scored);

      // Churn — revendedores que não pediam há mais de 30 dias mas tiveram histórico
      const allTimeResellerMap = {};
      allRechargedEver.forEach(req=>{
        if(!allTimeResellerMap[req.reseller_id]) {
          const res=myResellers.find(r=>r.id===req.reseller_id);
          allTimeResellerMap[req.reseller_id]={id:req.reseller_id,name:res?.full_name||res?.email||'?',lastRequest:null,totalValue:0};
        }
        const rd = new Date(req.created_date);
        allTimeResellerMap[req.reseller_id].totalValue+=req.total_value||0;
        if(!allTimeResellerMap[req.reseller_id].lastRequest || rd > allTimeResellerMap[req.reseller_id].lastRequest)
          allTimeResellerMap[req.reseller_id].lastRequest = rd;
      });
      const churn = Object.values(allTimeResellerMap)
        .filter(r=>r.lastRequest && r.lastRequest < thirtyDaysAgo)
        .sort((a,b)=>b.totalValue-a.totalValue)
        .slice(0,8)
        .map(r=>({ ...r, diasSemPedir: Math.floor((now-r.lastRequest)/86400000) }));
      setChurnResellers(churn);

      // Horário de pico
      const hourMap = {};
      for(let h=0;h<24;h++) hourMap[h]={hora:`${String(h).padStart(2,'0')}h`,pedidos:0,receita:0};
      allRechargedEver.forEach(req=>{
        const d = new Date(req.created_date);
        if(isNaN(d.getTime())) return;
        const h = d.getHours();
        if(h>=0 && h<=23){ hourMap[h].pedidos+=1; hourMap[h].receita+=req.total_value||0; }
      });
      setHourlyData(Object.values(hourMap));

      setRecentActivity(periodRequests.slice(0,12).map(r=>({
        ...r,
        reseller_name:myResellers.find(res=>res.id===r.reseller_id)?.full_name||'?',
        _costPerCredit: serverCostMap[(r.server_snapshot?.name||'?').trim().toLowerCase()] || 0,
      })));

    } catch(e){
      console.error('[Analytics] Erro ao carregar dados:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const handleResellerClick = async (reseller) => {
    if (!reseller?.id) return;
    setSelectedReseller(reseller);
    setResellerHistory([]);
    try {
      const result = await remoteClient.creditRequests.list(null, 2000);
      setResellerHistory((result?.data||[]).filter(r=>r.reseller_id===reseller.id));
    } catch(e) { console.error('[Analytics] Erro ao buscar histórico:', e?.message); }
  };

  const exportCSV = () => {
    const safe = v => String(v).replace(/;/g,',');
    const rows = [
      ['Servidor','Categoria','Créditos','Receita','Custo','Lucro','Pedidos'],
      ...serverProfit.map(s=>[safe(s.name),safe(s.category),s.credits,(s.revenue||0).toFixed(2),(s.cost||0).toFixed(2),(s.profit||0).toFixed(2),s.requests]),
    ];
    const csv = rows.map(r=>r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download='analytics_servidores.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const saveMeta = () => {
    const v = Math.max(0, parseFloat(metaInput)||0);
    setMeta(v);
    try {
      localStorage.setItem('analytics_meta', String(v));
    } catch (error) {
      console.warn('[Analytics] Falha ao salvar meta local:', error);
    }
    setShowMetaEdit(false);
    setMetaInput('');
  };

  if (loading) return (
    <div style={{ ...S, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user || user.role!=='admin') return (
    <div style={{ ...S, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ ...CARD("rgba(248,113,113,0.3)"), textAlign:"center" }}><p style={{ color:"#f87171" }}>Acesso negado.</p></div>
    </div>
  );

  const fmtR = v => {
    const n = typeof v === 'number' ? v : parseFloat(v) || 0;
    return `R$ ${n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  };
  const totalResValue = topResellers.reduce((s,r)=>s+(r.totalValue||0),0);
  const metaPct = meta>0 ? Math.min(((stats.totalRevenue||0)/meta)*100,100).toFixed(1) : 0;
  const simRevenue = (simCredits||0) * (simSalePrice||0);
  const simCost = (simCredits||0) * (simCostPrice||0);
  const simProfit = simRevenue - simCost;
  const simMargin = simRevenue>0 ? ((simProfit/simRevenue)*100).toFixed(1) : 0;

  return (
    <div style={S}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .au{animation:fadeUp 0.4s ease both}`}</style>
      <div style={{ maxWidth:1900, margin:"0 auto", padding:"12px 12px 100px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* Header */}
        <div style={{ ...CARD(), display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <BarChart3 style={{ width:16,height:16,color:"#a78bfa" }} />
            </div>
            <div>
              <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Analytics Central</h1>
              <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>12 dimensões de análise + Score + Churn + Horário de Pico + Simulador</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={exportCSV} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",color:"#34d399",fontSize:11,fontWeight:700,cursor:"pointer" }}>
              <Download style={{ width:12,height:12 }} /> Exportar CSV
            </button>
            <div style={{ display:"inline-flex",background:"rgba(255,255,255,0.06)",borderRadius:10,padding:4,gap:2 }}>
              {["7d","30d","90d"].map(p=>(
                <button key={p} onClick={()=>setPeriod(p)} style={{ padding:"5px 14px",borderRadius:8,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",transition:"all 0.15s",background:period===p?"#a78bfa":"transparent",color:period===p?"#0a0a0a":"rgba(255,255,255,0.45)" }}>
                  {p==="7d"?"7 dias":p==="30d"?"30 dias":"90 dias"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
          <MetricCard icon={DollarSign} label="Receita no Período" value={fmtR(stats.totalRevenue)} sublabel={period==='7d'?'7 dias':period==='30d'?'30 dias':'90 dias'} color="purple" />
          <MetricCard icon={TrendingUp} label="Lucro Líquido" value={fmtR(stats.totalProfit)} sublabel={`Margem: ${stats.profitMargin}%`} color={stats.totalProfit>=0?"green":"red"} badge={stats.totalProfit>=0?"✓ Positivo":"⚠ Negativo"} />
          <MetricCard icon={Layers} label="Custo Total" value={fmtR(stats.totalCost)} sublabel="Custo das categorias" color="orange" />
          <MetricCard icon={Zap} label="Créditos Vendidos" value={stats.totalCredits.toLocaleString('pt-BR')} sublabel={`${stats.approvedRequests} pedidos`} color="cyan" />
          <MetricCard icon={Activity} label="Taxa de Aprovação" value={`${stats.approvalRate}%`} sublabel={`${stats.approvedRequests}/${stats.totalRequests}`} color="blue" />
          <MetricCard icon={ShoppingCart} label="Ticket Médio" value={fmtR(stats.avgTicket)} sublabel="Por pedido aprovado" color="pink" />
          <MetricCard icon={UsersIcon} label="Revendedores" value={stats.totalResellers} color="yellow" />
          <MetricCard icon={Target} label="Receita Histórica" value={fmtR(stats.totalRevenueAllTime)} sublabel="Acumulado total" color="green" />
        </div>

        {/* STATUS + META */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
          <MetricCard icon={CheckCircle} label="Aprovados" value={stats.approvedRequests} color="green" />
          <MetricCard icon={Clock} label="Pendentes" value={stats.pendingRequests} color="yellow" />
          <MetricCard icon={XCircle} label="Rejeitados" value={stats.rejectedRequests} color="red" />
          {/* META MENSAL */}
          <div style={{ background:"linear-gradient(135deg,#1a0f3e,#0f0a2a)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:16, padding:20, position:"relative", overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <p style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.45)",margin:"0 0 4px" }}>Meta Mensal</p>
                <p style={{ fontSize:18,fontWeight:800,color:"#a78bfa",margin:0 }}>{meta>0?fmtR(meta):'Não definida'}</p>
              </div>
              <button onClick={()=>{ setMetaInput(String(meta)); setShowMetaEdit(true); }} style={{ padding:"4px 10px",borderRadius:8,background:"rgba(167,139,250,0.15)",border:"1px solid rgba(167,139,250,0.3)",color:"#a78bfa",fontSize:11,fontWeight:700,cursor:"pointer" }}>Definir</button>
            </div>
            {meta>0 && (
              <>
                <div style={{ height:8,background:"rgba(255,255,255,0.08)",borderRadius:8,overflow:"hidden",marginBottom:6 }}>
                  <div style={{ height:"100%",width:`${metaPct}%`,background:`linear-gradient(90deg,${parseFloat(metaPct)>=100?'#34d399':'#a78bfa'},${parseFloat(metaPct)>=100?'#22d3ee':'#22d3ee'})`,borderRadius:8,transition:"width 1s ease" }} />
                </div>
                <p style={{ fontSize:11,color:"rgba(255,255,255,0.4)",margin:0 }}>{metaPct}% atingido · Faltam {fmtR(Math.max(meta-stats.totalRevenue,0))}</p>
              </>
            )}
          </div>
        </div>

        {/* ANÁLISE 1 — MAIS LUCRO */}
        <ChartCard title="① Servidores que Dão MAIS LUCRO" subtitle="Receita − Custo da categoria" icon={ThumbsUp} badge="Lucratividade" badgeColor="#34d399">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              {serverProfit.length===0 ? <p style={{ color:"rgba(255,255,255,0.3)", textAlign:"center", padding:24 }}>Configure custo/crédito nas categorias para ver análise</p> :
                serverProfit.map((sv,i) => (
                  <TopItemRow key={sv.name} rank={i+1} name={sv.name}
                    value={fmtR(sv.profit)} sublabel={`Receita: ${fmtR(sv.revenue)}`}
                    metric={`${sv.credits.toLocaleString('pt-BR')} créditos · ${sv.category}`}
                    badge={sv.profit>0?"✓ Lucro":"⚠ Custo 0"} badgeColor={sv.profit>0?"#34d399":"#fbbf24"}
                  />
                ))
              }
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serverProfit.slice(0,6)} layout="vertical" margin={{left:10,right:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{fill:"rgba(255,255,255,0.5)",fontSize:10}} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<Tooltip2/>} />
                <Bar dataKey="profit" name="Lucro" fill="#34d399" radius={[0,6,6,0]} />
                <Bar dataKey="cost" name="Custo" fill="#f87171" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* ANÁLISE 2 — PREJUÍZO */}
        <ChartCard title="② Servidores com PREJUÍZO" subtitle="Clique em um servidor para ver compras detalhadas, revendedor e motivo" icon={AlertTriangle} badge="Atenção" badgeColor="#f87171">
          {serverLoss.length===0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:"rgba(255,255,255,0.3)" }}>
              <ThumbsUp style={{ width:32,height:32,margin:"0 auto 8px",opacity:0.3 }} />
              <p style={{ fontSize:13 }}>Nenhum servidor com prejuízo. Ótimo!</p>
              <p style={{ fontSize:11, marginTop:4 }}>Configure o custo/crédito nas categorias para análise precisa.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <p style={{ fontSize:10, color:"rgba(255,255,255,0.3)", margin:"0 0 8px", fontStyle:"italic" }}>🔍 Clique em qualquer servidor para ver o diagnóstico completo</p>
                {serverLoss.map((sv,i) => (
                  <div key={sv.name}
                    onClick={()=>setSelectedLossServer(serverLossDetails[sv.name]||sv)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:10, background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:6, cursor:"pointer", transition:"all 0.15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(248,113,113,0.14)";e.currentTarget.style.borderColor="rgba(248,113,113,0.5)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(248,113,113,0.07)";e.currentTarget.style.borderColor="rgba(248,113,113,0.2)";}}>
                    <div style={{ width:26,height:26,borderRadius:8,background:"rgba(248,113,113,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#f87171",flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{sv.name}</p>
                      <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>{sv.category} · {sv.credits.toLocaleString('pt-BR')} créditos · {sv.requests} compras</p>
                    </div>
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <p style={{ fontSize:13,fontWeight:800,color:"#f87171",margin:0 }}>{fmtR(sv.profit)}</p>
                      <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>Custo: {fmtR(sv.cost)}</p>
                    </div>
                    <div style={{ width:20,height:20,borderRadius:6,background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <Eye style={{ width:10,height:10,color:"#f87171" }} />
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={serverLoss.slice(0,6)} layout="vertical" margin={{left:10,right:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{fill:"rgba(255,255,255,0.5)",fontSize:10}} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<Tooltip2/>} />
                  <Bar dataKey="revenue" name="Receita" fill="#a78bfa" radius={[0,6,6,0]} />
                  <Bar dataKey="cost" name="Custo" fill="#f87171" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* ANÁLISE 3 — MAIS VENDEM */}
        <ChartCard title="③ Servidores que MAIS VENDEM" subtitle="Ranking por volume de créditos e pedidos" icon={Flame} badge="Top Vendas" badgeColor="#fbbf24">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              {serverSales.map((sv,i) => (
                <TopItemRow key={sv.name} rank={i+1} name={sv.name}
                  value={`${sv.credits.toLocaleString('pt-BR')} créditos`}
                  sublabel={fmtR(sv.revenue)}
                  metric={`${sv.requests} pedidos · ${sv.category}`}
                />
              ))}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serverSales.slice(0,6)} layout="vertical" margin={{left:10,right:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{fill:"rgba(255,255,255,0.5)",fontSize:10}} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<Tooltip2/>} />
                <Bar dataKey="credits" name="Créditos" fill="#fbbf24" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* ANÁLISE 4 — LUCRO POR CATEGORIA */}
        <ChartCard title="④ Lucro por Servidor" subtitle="Faturamento bruto x Custo x Lucro líquido" icon={Layers}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryProfitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tooltip2/>} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Bar dataKey="revenue" name="Receita" fill="#a78bfa" radius={[4,4,0,0]} />
                <Bar dataKey="cost" name="Custo" fill="#f87171" radius={[4,4,0,0]} />
                <Bar dataKey="profit" name="Lucro" fill="#34d399" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:6, overflowY:"auto", maxHeight:280 }}>
              {categoryProfitData.map((cat,i) => (
                <div key={cat.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:cat.color||DS_COLORS[i%10],flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12,fontWeight:700,color:"#fff",margin:0 }}>{cat.name}</p>
                    <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>{cat.credits.toLocaleString('pt-BR')} créditos</p>
                  </div>
                  <p style={{ fontSize:12,fontWeight:800,color:cat.profit>=0?"#34d399":"#f87171",margin:0 }}>{fmtR(cat.profit)}</p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* ANÁLISE 5 & 6 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ChartCard title="⑤ Receita x Lucro Mensal" subtitle="Últimos 6 meses" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35}/><stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.35}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{fill:"rgba(255,255,255,0.35)",fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={45} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tooltip2/>} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#a78bfa" strokeWidth={2} fill="url(#gR)" dot={false} />
                <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#34d399" strokeWidth={2} fill="url(#gL)" dot={false} />
                <Area type="monotone" dataKey="custo" name="Custo" stroke="#f87171" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="⑥ Tendência Diária (14 dias)" subtitle="Receita e lucro dia a dia" icon={Activity}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={45} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tooltip2/>} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="#fbbf24" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ANÁLISE 7 & 8 & 9 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
          <ChartCard title="⑦ Status dos Pedidos" subtitle={`${stats.totalRequests} total`} icon={CreditCard}>
            <ResponsiveContainer width="100%" height={180}>
              <RePieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value">
                  {statusData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={<Tooltip2/>} />
              </RePieChart>
            </ResponsiveContainer>
            {statusData.map((item,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:item.color }} />
                  <span style={{ color:"rgba(255,255,255,0.5)" }}>{item.name}</span>
                </div>
                <span style={{ fontWeight:700, color:item.color }}>{item.value}</span>
              </div>
            ))}
          </ChartCard>
          <ChartCard title="⑧ Volume Semanal" subtitle="Pedidos e receita por semana" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{fill:"rgba(255,255,255,0.35)",fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={25} />
                <YAxis yAxisId="r" orientation="right" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={40} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tooltip2/>} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Bar yAxisId="l" dataKey="pedidos" name="Pedidos" fill="#22d3ee" radius={[6,6,0,0]} />
                <Bar yAxisId="r" dataKey="receita" name="Receita" fill="#a78bfa" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="⑨ Saúde do Negócio" subtitle="Indicadores de desempenho" icon={Award}>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
              {[
                {l:"Margem de Lucro",v:`${stats.profitMargin}%`,c:parseFloat(stats.profitMargin)>20?"#34d399":parseFloat(stats.profitMargin)>0?"#fbbf24":"#f87171",bar:Math.min(Math.abs(parseFloat(stats.profitMargin)),100)},
                {l:"Taxa Aprovação",v:`${stats.approvalRate}%`,c:parseFloat(stats.approvalRate)>80?"#34d399":"#fbbf24",bar:parseFloat(stats.approvalRate)},
                {l:"Ticket Médio",v:fmtR(stats.avgTicket),c:"#a78bfa",bar:Math.min((stats.avgTicket/500)*100,100)},
                {l:"Créditos/Pedido",v:`${Math.round(stats.avgCreditsPerRequest)}`,c:"#22d3ee",bar:Math.min((stats.avgCreditsPerRequest/1000)*100,100)},
              ].map(item=>(
                <div key={item.l}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.45)" }}>{item.l}</span>
                    <span style={{ fontSize:12,fontWeight:800,color:item.c }}>{item.v}</span>
                  </div>
                  <div style={{ height:4,background:"rgba(255,255,255,0.08)",borderRadius:4 }}>
                    <div style={{ height:4,width:`${item.bar}%`,background:item.c,borderRadius:4,transition:"width 0.8s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* ANÁLISE 10 & 11 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ChartCard title="⑩ Top Revendedores" subtitle={`Total: ${fmtR(totalResValue)}`} icon={UsersIcon}>
            {topResellers.length===0 ? <p style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",padding:"32px 0" }}>Sem dados</p> : (
              <>
                {topResellers.map((r,i)=>(
                  <TopItemRow key={r.id} rank={i+1} name={r.name}
                    value={fmtR(r.totalValue)} sublabel={`${r.totalCredits.toLocaleString('pt-BR')} créditos`}
                    metric={`${r.requestCount} pedidos`} onClick={()=>handleResellerClick(r)}
                  />
                ))}
                {allResellerStats.length>5 && (
                  <button onClick={()=>setShowAllResellers(true)} style={{ width:"100%",padding:"8px",marginTop:8,background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:8,color:"#a78bfa",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                    Ver Todos ({allResellerStats.length})
                  </button>
                )}
              </>
            )}
          </ChartCard>
          <ChartCard title="⑪ Crescimento de Revendedores" subtitle="Novos x Pedidos mensais" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={resellerGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={25} />
                <YAxis yAxisId="r" orientation="right" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={40} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tooltip2/>} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Line yAxisId="l" type="monotone" dataKey="novos" name="Novos" stroke="#22d3ee" strokeWidth={2} dot={{r:4}} />
                <Line yAxisId="l" type="monotone" dataKey="ativos" name="Pedidos" stroke="#fbbf24" strokeWidth={2} dot={{r:3}} />
                <Line yAxisId="r" type="monotone" dataKey="receita" name="Receita" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ANÁLISE 12 — ATIVIDADE RECENTE */}
        <ChartCard title="⑫ Atividade Recente" subtitle={`Últimos ${recentActivity.length} pedidos`} icon={Eye}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["Status","Revendedor","Servidor","Créditos","Receita","Custo","Lucro","Data"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.3)",borderBottom:"1px solid rgba(255,255,255,0.06)",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(a=>{
                const sc={pending:{l:"Pendente",c:"#fbbf24"},analyzing:{l:"Análise",c:"#22d3ee"},recharged:{l:"Aprovado",c:"#34d399"},rejected:{l:"Rejeitado",c:"#f87171"}}[a.status]||{l:"?",c:"#666"};
                const cost = (a.requested_credits||0)*(a._costPerCredit||0);
                const profit = (a.total_value||0) - cost;
                  return (
                    <tr key={a.id} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"9px 10px" }}><span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:`${sc.c}22`,color:sc.c,border:`1px solid ${sc.c}44` }}>{sc.l}</span></td>
                      <td style={{ padding:"9px 10px",fontSize:12,color:"#fff",fontWeight:600,whiteSpace:"nowrap" }}>{a.reseller_name}</td>
                      <td style={{ padding:"9px 10px",fontSize:11,color:"rgba(255,255,255,0.4)" }}>{a.server_snapshot?.name||'N/A'}</td>
                      <td style={{ padding:"9px 10px",fontSize:12,color:"#fff",fontWeight:700 }}>{a.requested_credits?.toLocaleString('pt-BR')}</td>
                      <td style={{ padding:"9px 10px",fontSize:12,color:"#a78bfa",fontWeight:800 }}>{fmtR(a.total_value)}</td>
                      <td style={{ padding:"9px 10px",fontSize:11,color:"#f87171" }}>{a._costPerCredit > 0 ? fmtR(cost) : '—'}</td>
                      <td style={{ padding:"9px 10px",fontSize:12,fontWeight:800,color:profit>=0?"#34d399":"#f87171" }}>{a._costPerCredit > 0 ? fmtR(profit) : '—'}</td>
                      <td style={{ padding:"9px 10px",fontSize:10,color:"rgba(255,255,255,0.3)",whiteSpace:"nowrap" }}>{formatBrasiliaDate(a.created_date,'dd/MM HH:mm')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* ═══ EXTRAS ═══ */}

        {/* SCORE DE REVENDEDORES */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ChartCard title="🏆 Score de Revendedores" subtitle="Volume (40%) + Regularidade (30%) + Recência (30%)" icon={Award} badge="Ranking" badgeColor="#fbbf24">
            {resellerScores.map((r,i)=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", marginBottom:6 }}>
                <div style={{ width:26,height:26,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,background:rankStyle(i+1).bg,color:rankStyle(i+1).color }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.name}</p>
                  <div style={{ height:3,background:"rgba(255,255,255,0.08)",borderRadius:3,marginTop:4 }}>
                    <div style={{ height:3,width:`${r.score}%`,background:`linear-gradient(90deg,#a78bfa,#22d3ee)`,borderRadius:3 }} />
                  </div>
                </div>
                <span style={{ fontSize:16,fontWeight:900,color:"#fbbf24",flexShrink:0 }}>{r.score}</span>
              </div>
            ))}
          </ChartCard>

          {/* CHURN */}
          <ChartCard title="⚠️ Revendedores Inativos (Churn)" subtitle="Sem pedidos há mais de 30 dias" icon={UserX} badge={`${churnResellers.length} inativos`} badgeColor="#f87171">
            {churnResellers.length===0 ? (
              <div style={{ textAlign:"center", padding:"24px 0", color:"rgba(255,255,255,0.3)" }}>
                <CheckCircle style={{ width:32,height:32,margin:"0 auto 8px",opacity:0.3 }} />
                <p style={{ fontSize:13 }}>Todos os revendedores estão ativos!</p>
              </div>
            ) : churnResellers.map((r,i)=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.18)", marginBottom:6 }}>
                <div style={{ width:26,height:26,borderRadius:8,background:"rgba(248,113,113,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#f87171",flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.name}</p>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>Total histórico: {fmtR(r.totalValue)}</p>
                </div>
                <span style={{ fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(248,113,113,0.15)",color:"#f87171",border:"1px solid rgba(248,113,113,0.3)",flexShrink:0,whiteSpace:"nowrap" }}>{r.diasSemPedir}d sem pedir</span>
              </div>
            ))}
          </ChartCard>
        </div>

        {/* HORÁRIO DE PICO + SIMULADOR */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12 }}>
          <ChartCard title="🕐 Horário de Pico" subtitle="Pedidos aprovados por hora do dia (histórico completo)" icon={Timer}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hora" tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<Tooltip2/>} />
                <Bar dataKey="pedidos" name="Pedidos" radius={[4,4,0,0]}>
                  {hourlyData.map((e,i)=>{
                    const maxP = Math.max(...hourlyData.map(h=>h.pedidos),1);
                    const pct = e.pedidos/maxP;
                    const color = pct>0.7?"#f87171":pct>0.4?"#fbbf24":"#a78bfa";
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* SIMULADOR DE PREÇO */}
          <ChartCard title="🧮 Simulador de Margem" subtitle="Calcule lucro antes de precificar" icon={Calculator}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                {l:"Créditos",v:simCredits,set:setSimCredits,step:10},
                {l:"Preço de Venda (R$/créd)",v:simSalePrice,set:setSimSalePrice,step:0.25},
                {l:"Custo (R$/créd)",v:simCostPrice,set:setSimCostPrice,step:0.25},
              ].map(f=>(
                <div key={f.l}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.5)" }}>{f.l}</span>
                    <span style={{ fontSize:12,fontWeight:700,color:"#fff" }}>{f.v}</span>
                  </div>
                  <input type="range" min={0} max={f.l==="Créditos"?5000:20} step={f.step} value={f.v}
                    onChange={e=>f.set(parseFloat(e.target.value))}
                    style={{ width:"100%",accentColor:"#a78bfa" }}
                  />
                </div>
              ))}
              <div style={{ marginTop:8, padding:14, borderRadius:10, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                  <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>Receita</span>
                  <span style={{ fontSize:13,fontWeight:800,color:"#a78bfa" }}>{fmtR(simRevenue)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                  <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>Custo</span>
                  <span style={{ fontSize:13,fontWeight:800,color:"#f87171" }}>{fmtR(simCost)}</span>
                </div>
                <div style={{ height:1,background:"rgba(255,255,255,0.08)",margin:"8px 0" }} />
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)" }}>Lucro</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:16,fontWeight:900,color:simProfit>=0?"#34d399":"#f87171" }}>{fmtR(simProfit)}</span>
                    <p style={{ fontSize:10,color:"rgba(255,255,255,0.3)",margin:0 }}>Margem: {simMargin}%</p>
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Modal Meta */}
        {showMetaEdit && (
          <Dialog open onOpenChange={()=>setShowMetaEdit(false)}>
            <DialogContent style={{ background:"#141414",border:"1px solid rgba(167,139,250,0.25)",maxWidth:400 }}>
              <DialogHeader><DialogTitle style={{ color:"#fff" }}>Definir Meta Mensal</DialogTitle></DialogHeader>
              <div style={{ padding:"16px 0", display:"flex", flexDirection:"column", gap:12 }}>
                <input type="number" value={metaInput} onChange={e=>setMetaInput(e.target.value)}
                  placeholder="Ex: 50000"
                  style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:8,color:"#fff",fontSize:14,padding:"10px 14px",outline:"none",width:"100%" }}
                />
                <button onClick={saveMeta} style={{ padding:"10px",borderRadius:8,background:"#a78bfa",border:"none",color:"#0a0a0a",fontWeight:800,fontSize:14,cursor:"pointer" }}>Salvar Meta</button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal All Resellers */}
        {showAllResellers && (
          <Dialog open onOpenChange={()=>setShowAllResellers(false)}>
            <DialogContent style={{ background:"#141414",border:"1px solid rgba(167,139,250,0.25)",maxWidth:700,maxHeight:"85vh",overflow:"hidden" }}>
              <DialogHeader><DialogTitle style={{ color:"#fff" }}>Todos Revendedores ({allResellerStats.length})</DialogTitle></DialogHeader>
              <div style={{ overflowY:"auto",maxHeight:"calc(85vh - 120px)" }}>
                {allResellerStats.map((r,i)=>{
                  const tv=allResellerStats.reduce((s,x)=>s+x.totalValue,0);
                  return <TopItemRow key={r.id} rank={i+1} name={r.name} value={fmtR(r.totalValue)} sublabel={`${((r.totalValue/tv)*100).toFixed(1)}%`} metric={`${r.requestCount} pedidos`} onClick={()=>{setShowAllResellers(false);handleResellerClick(r);}} />;
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}


        {/* Modal Reseller History */}
        {selectedReseller && (
          <Dialog open onOpenChange={()=>setSelectedReseller(null)}>
            <DialogContent style={{ background:"#141414",border:"1px solid rgba(167,139,250,0.25)",maxWidth:800,maxHeight:"80vh",overflow:"hidden" }}>
              <DialogHeader><DialogTitle style={{ color:"#fff" }}>Histórico — {selectedReseller.name}</DialogTitle></DialogHeader>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16 }}>
                {[{l:"Total Receita",v:fmtR(selectedReseller.totalValue),c:"#a78bfa"},{l:"Créditos",v:selectedReseller.totalCredits.toLocaleString('pt-BR'),c:"#22d3ee"},{l:"Pedidos",v:selectedReseller.requestCount,c:"#34d399"}].map(({l,v,c})=>(
                  <div key={l} style={{ padding:12,borderRadius:10,background:`${c}15`,border:`1px solid ${c}33` }}>
                    <p style={{ fontSize:11,color:"rgba(255,255,255,0.4)",margin:"0 0 4px" }}>{l}</p>
                    <p style={{ fontSize:18,fontWeight:800,color:c,margin:0 }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ overflowY:"auto",maxHeight:"50vh" }}>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["Data","Servidor","Login","Créditos","Valor","Status"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",color:"rgba(255,255,255,0.3)",borderBottom:"1px solid rgba(255,255,255,0.08)" }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {resellerHistory.map(req=>{
                      const sc={pending:{l:"Pendente",c:"#fbbf24"},analyzing:{l:"Análise",c:"#22d3ee"},recharged:{l:"Aprovado",c:"#34d399"},rejected:{l:"Rejeitado",c:"#f87171"},cancelled:{l:"Cancelado",c:"#666"}}[req.status]||{l:"?",c:"#666"};
                      return (
                        <tr key={req.id} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"8px 12px",fontSize:11,color:"rgba(255,255,255,0.35)" }}>{formatBrasiliaDate(req.created_date,'dd/MM/yy HH:mm')}</td>
                          <td style={{ padding:"8px 12px",fontSize:12,color:"#fff" }}>{req.server_snapshot?.name||'N/A'}</td>
                          <td style={{ padding:"8px 12px",fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"monospace" }}>{req.login}</td>
                          <td style={{ padding:"8px 12px",fontSize:13,color:"#fff",fontWeight:700 }}>{req.requested_credits?.toLocaleString('pt-BR')}</td>
                          <td style={{ padding:"8px 12px",fontSize:13,color:"#a78bfa",fontWeight:800 }}>{fmtR(req.total_value)}</td>
                          <td style={{ padding:"8px 12px" }}><span style={{ fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${sc.c}22`,color:sc.c }}>{sc.l}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
