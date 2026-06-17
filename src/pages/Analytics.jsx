import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { remoteClient } from '@/api/remoteClient';
import {
  DollarSign, Users as UsersIcon, TrendingUp,
  CreditCard, CheckCircle, XCircle, Clock, BarChart3, Activity, Zap,
  Target, Award, AlertTriangle, ThumbsUp, Layers,
  ShoppingCart, Eye, Flame, Download, Calculator, UserX, Timer, X
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBrasiliaDate } from '../components/utils/dateHelper';

/* ──────────────────────────────────────────────────────────────────────────
   GESTOR J2 — ANALYTICS premium. Mesmo padrao do Chat: aurora viva,
   glassmorphism, gradientes, entradas com mola. Nenhum dado removido —
   12 dimensoes + Score + Churn + Horario de Pico + Simulador + diagnostico.
   ────────────────────────────────────────────────────────────────────────── */

const SPRING = { type: 'spring', stiffness: 280, damping: 30, mass: 0.9 };
const EASE = [0.22, 1, 0.36, 1];

const DS_COLORS = ['#a78bfa','#22d3ee','#34d399','#f472b6','#fbbf24','#60a5fa','#fb923c','#e879f9','#f87171','#a3e635'];

/* paleta deterministica de avatar a partir do nome */
const GRADIENTS = [
  ['#a78bfa', '#7c3aed'], ['#22d3ee', '#3b82f6'], ['#f472b6', '#db2777'],
  ['#34d399', '#059669'], ['#fbbf24', '#f59e0b'], ['#f87171', '#dc2626'],
  ['#818cf8', '#4f46e5'], ['#2dd4bf', '#0d9488'],
];
const gradOf = (s = '') => GRADIENTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length];
const initialsOf = (s = '?') => s.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const ICON_C = { purple:"#a78bfa",green:"#34d399",cyan:"#22d3ee",yellow:"#fbbf24",pink:"#f472b6",blue:"#60a5fa",red:"#f87171",orange:"#fb923c" };
const GLOW = { purple:"rgba(167,139,250,0.55)",green:"rgba(52,211,153,0.5)",cyan:"rgba(34,211,238,0.5)",yellow:"rgba(251,191,36,0.5)",pink:"rgba(244,114,182,0.5)",blue:"rgba(96,165,250,0.5)",red:"rgba(248,113,113,0.5)",orange:"rgba(251,146,60,0.5)" };

const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

const CSS = `
.j2-blob{ position:fixed; border-radius:50%; filter:blur(70px); opacity:0.85; will-change:transform; animation:j2drift 24s ease-in-out infinite; pointer-events:none; }
@keyframes j2drift{ 0%,100%{ transform:translate(0,0) scale(1); } 33%{ transform:translate(60px,-50px) scale(1.12); } 66%{ transform:translate(-40px,40px) scale(0.94); } }
@keyframes j2spin{ to{ transform:rotate(360deg); } }
.j2-glass{ transition:border-color .2s, box-shadow .25s, transform .2s; }
.j2-card-hover:hover{ transform:translateY(-2px); box-shadow:0 18px 50px rgba(0,0,0,0.4); border-color:rgba(167,139,250,0.35)!important; }
.j2-row{ transition:background .16s, border-color .16s, transform .16s; }
.j2-row:hover{ background:rgba(255,255,255,0.06)!important; transform:translateX(2px); }
.j2-loss-row{ transition:background .16s, border-color .16s, transform .16s; }
.j2-loss-row:hover{ background:rgba(248,113,113,0.14)!important; border-color:rgba(248,113,113,0.5)!important; transform:translateX(2px); }
.j2-bar{ transition:width 1s cubic-bezier(.22,1,.36,1); }
.j2-period{ transition:all .18s; }
`;

/* ── Fundo aurora vivo + grao ── */
function Aurora() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#06050c', overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <style>{CSS}</style>
      <div className="j2-blob" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5), transparent 60%)', width: 640, height: 640, top: -200, left: -160, animationDelay: '0s' }} />
      <div className="j2-blob" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.34), transparent 60%)', width: 560, height: 560, bottom: -240, right: -140, animationDelay: '-8s' }} />
      <div className="j2-blob" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.28), transparent 60%)', width: 520, height: 520, top: '45%', left: '52%', animationDelay: '-15s' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.045, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,5,12,0.35), rgba(6,5,12,0.82))' }} />
    </div>
  );
}

const GLASS = { background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:20 };

const MetricCard = ({ icon: Icon, label, value, sublabel, color="purple", badge, index=0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ ...SPRING, delay: Math.min(index * 0.03, 0.35) }}
    className="j2-glass j2-card-hover"
    style={{ ...GLASS, padding:20, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:-34, right:-34, width:96, height:96, background:GLOW[color], borderRadius:"50%", filter:"blur(34px)", opacity:0.4, pointerEvents:"none" }} />
    <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg, ${ICON_C[color]}10, transparent 55%)`, pointerEvents:"none" }} />
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", position:"relative" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.45)", margin:"0 0 8px" }}>{label}</p>
        <p style={{ fontSize:23, fontWeight:800, color:"#fff", margin:"0 0 4px", lineHeight:1, letterSpacing:"-0.02em" }}>{value}</p>
        {sublabel && <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", margin:0 }}>{sublabel}</p>}
        {badge && <span style={{ display:"inline-block", marginTop:6, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:`${ICON_C[color]}22`, color:ICON_C[color], border:`1px solid ${ICON_C[color]}44` }}>{badge}</span>}
      </div>
      <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg, ${ICON_C[color]}33, ${ICON_C[color]}11)`, border:`1px solid ${ICON_C[color]}40`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 6px 18px ${ICON_C[color]}22` }}>
        <Icon style={{ width:17, height:17, color:ICON_C[color] }} />
      </div>
    </div>
  </motion.div>
);

const ChartCard = ({ title, subtitle, icon: Icon, children, badge, badgeColor="#a78bfa", action, index=0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
    transition={{ ...SPRING, delay: Math.min(index * 0.02, 0.2) }}
    className="j2-glass j2-card-hover"
    style={{ ...GLASS, padding:20 }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:10, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:11, minWidth:0 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg, rgba(167,139,250,0.25), rgba(167,139,250,0.08))", border:"1px solid rgba(167,139,250,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 6px 16px rgba(167,139,250,0.18)" }}>
          <Icon style={{ width:15, height:15, color:"#a78bfa" }} />
        </div>
        <div style={{ minWidth:0 }}>
          <h3 style={{ fontSize:14.5, fontWeight:700, color:"#fff", margin:0, letterSpacing:"-0.01em" }}>{title}</h3>
          {subtitle && <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", margin:0 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {action}
        {badge && <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, background:`${badgeColor}22`, color:badgeColor, border:`1px solid ${badgeColor}44`, whiteSpace:"nowrap" }}>{badge}</span>}
      </div>
    </div>
    {children}
  </motion.div>
);

const Tooltip2 = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(20,16,32,0.92)", backdropFilter:"blur(12px)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:12, padding:"10px 14px", fontSize:12, boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
      <p style={{ color:"rgba(255,255,255,0.5)", marginBottom:6, fontWeight:600 }}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{ color:p.color, margin:"2px 0", fontWeight:700 }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</p>)}
    </div>
  );
};

const rankStyle = (rank) => ({
  1:{ bg:"linear-gradient(135deg,#fbbf24,#f59e0b)", color:"#1a1206", shadow:"0 4px 14px rgba(251,191,36,0.45)" },
  2:{ bg:"linear-gradient(135deg,#c4b5fd,#a78bfa)", color:"#1a0f2e", shadow:"0 4px 14px rgba(167,139,250,0.4)" },
  3:{ bg:"linear-gradient(135deg,#67e8f9,#22d3ee)", color:"#06222a", shadow:"0 4px 14px rgba(34,211,238,0.4)" },
})[rank] || { bg:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.45)", shadow:"none" };

const Avatar = ({ name, size=28 }) => {
  const [c1, c2] = gradOf(name || '?');
  return (
    <div style={{ width:size, height:size, borderRadius:size/2.4, flexShrink:0, background:`linear-gradient(135deg, ${c1}, ${c2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:800, color:"#fff", boxShadow:`0 4px 12px ${c1}55` }}>
      {initialsOf(name)}
    </div>
  );
};

const TopItemRow = ({ rank, name, value, sublabel, metric, badge, badgeColor="#a78bfa", onClick, avatar }) => {
  const rs = rankStyle(rank);
  return (
    <div onClick={onClick} className="j2-row" style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.07)", cursor: onClick ? "pointer" : "default", marginBottom:6 }}>
      <div style={{ width:26, height:26, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, background:rs.bg, color:rs.color, flexShrink:0, boxShadow:rs.shadow }}>{rank}</div>
      {avatar && <Avatar name={name} size={28} />}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12.5, fontWeight:700, color:"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</p>
        <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", margin:0 }}>{metric}</p>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <p style={{ fontSize:13, fontWeight:800, color:"#c4b5fd", margin:0 }}>{value}</p>
        {sublabel && <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", margin:0 }}>{sublabel}</p>}
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

  // Novas metricas
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

  // Simulador de preco
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

      // Score = volume (40%) + regularidade (30%) + aprovacao (30%)
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

      // Churn — revendedores que nao pediam ha mais de 30 dias mas tiveram historico
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

      // Horario de pico
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
    const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
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
    <div style={{ minHeight:"100vh", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Aurora />
      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <div style={{ width:42,height:42,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"j2spin 0.7s linear infinite" }} />
        <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, fontWeight:600 }}>Carregando analytics…</p>
      </div>
    </div>
  );

  if (!user || user.role!=='admin') return (
    <div style={{ minHeight:"100vh", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Aurora />
      <div style={{ position:"relative", zIndex:1, ...GLASS, padding:"28px 36px", textAlign:"center", border:"1px solid rgba(248,113,113,0.3)" }}>
        <XCircle style={{ width:34, height:34, color:"#f87171", margin:"0 auto 10px" }} />
        <p style={{ color:"#f87171", fontWeight:700, margin:0 }}>Acesso negado.</p>
      </div>
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

  const dialogStyle = { background:"rgba(15,12,26,0.96)", backdropFilter:"blur(24px)", border:"1px solid rgba(167,139,250,0.25)", boxShadow:"0 30px 90px rgba(0,0,0,0.6)" };

  return (
    <div style={{ minHeight:"100vh", position:"relative", color:"#fff" }}>
      <Aurora />
      <div style={{ position:"relative", zIndex:1, maxWidth:1900, margin:"0 auto", padding:"14px 14px 110px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={SPRING}
          className="j2-glass" style={{ ...GLASS, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14, padding:"18px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 10px 30px rgba(124,58,237,0.4)" }}>
              <BarChart3 style={{ width:20,height:20,color:"#0a0a0a" }} />
            </div>
            <div>
              <h1 style={{ fontSize:26,fontWeight:800,letterSpacing:"-0.025em",background:"linear-gradient(120deg,#fff,#c4b5fd 55%,#67e8f9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Analytics Central</h1>
              <p style={{ fontSize:11.5,color:"rgba(255,255,255,0.42)",margin:"2px 0 0" }}>12 dimensões + Score + Churn + Horário de Pico + Simulador</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={exportCSV} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:12,background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.3)",color:"#34d399",fontSize:11.5,fontWeight:700,cursor:"pointer",backdropFilter:"blur(10px)" }}>
              <Download style={{ width:13,height:13 }} /> Exportar CSV
            </button>
            <div style={{ display:"inline-flex",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:13,padding:4,gap:3 }}>
              {["7d","30d","90d"].map(p=>(
                <button key={p} onClick={()=>setPeriod(p)} className="j2-period" style={{ padding:"6px 16px",borderRadius:10,fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer",background:period===p?"linear-gradient(135deg,#a78bfa,#7c3aed)":"transparent",color:period===p?"#fff":"rgba(255,255,255,0.45)",boxShadow:period===p?"0 6px 18px rgba(124,58,237,0.4)":"none" }}>
                  {p==="7d"?"7 dias":p==="30d"?"30 dias":"90 dias"}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
          <MetricCard index={0} icon={DollarSign} label="Receita no Período" value={fmtR(stats.totalRevenue)} sublabel={period==='7d'?'7 dias':period==='30d'?'30 dias':'90 dias'} color="purple" />
          <MetricCard index={1} icon={TrendingUp} label="Lucro Líquido" value={fmtR(stats.totalProfit)} sublabel={`Margem: ${stats.profitMargin}%`} color={stats.totalProfit>=0?"green":"red"} badge={stats.totalProfit>=0?"✓ Positivo":"⚠ Negativo"} />
          <MetricCard index={2} icon={Layers} label="Custo Total" value={fmtR(stats.totalCost)} sublabel="Custo das categorias" color="orange" />
          <MetricCard index={3} icon={Zap} label="Créditos Vendidos" value={stats.totalCredits.toLocaleString('pt-BR')} sublabel={`${stats.approvedRequests} pedidos`} color="cyan" />
          <MetricCard index={4} icon={Activity} label="Taxa de Aprovação" value={`${stats.approvalRate}%`} sublabel={`${stats.approvedRequests}/${stats.totalRequests}`} color="blue" />
          <MetricCard index={5} icon={ShoppingCart} label="Ticket Médio" value={fmtR(stats.avgTicket)} sublabel="Por pedido aprovado" color="pink" />
          <MetricCard index={6} icon={UsersIcon} label="Revendedores" value={stats.totalResellers} color="yellow" />
          <MetricCard index={7} icon={Target} label="Receita Histórica" value={fmtR(stats.totalRevenueAllTime)} sublabel="Acumulado total" color="green" />
        </div>

        {/* STATUS + META */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
          <MetricCard index={0} icon={CheckCircle} label="Aprovados" value={stats.approvedRequests} color="green" />
          <MetricCard index={1} icon={Clock} label="Pendentes" value={stats.pendingRequests} color="yellow" />
          <MetricCard index={2} icon={XCircle} label="Rejeitados" value={stats.rejectedRequests} color="red" />
          {/* META MENSAL */}
          <motion.div initial={{ opacity:0, y:16, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ ...SPRING, delay:0.09 }}
            className="j2-glass j2-card-hover" style={{ ...GLASS, padding:20, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-34, right:-34, width:96, height:96, background:"rgba(167,139,250,0.45)", borderRadius:"50%", filter:"blur(34px)", opacity:0.4, pointerEvents:"none" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, position:"relative" }}>
              <div>
                <p style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.45)",margin:"0 0 4px" }}>Meta Mensal</p>
                <p style={{ fontSize:19,fontWeight:800,color:"#c4b5fd",margin:0 }}>{meta>0?fmtR(meta):'Não definida'}</p>
              </div>
              <button onClick={()=>{ setMetaInput(String(meta)); setShowMetaEdit(true); }} style={{ padding:"5px 12px",borderRadius:10,background:"rgba(167,139,250,0.18)",border:"1px solid rgba(167,139,250,0.35)",color:"#c4b5fd",fontSize:11,fontWeight:700,cursor:"pointer" }}>Definir</button>
            </div>
            {meta>0 && (
              <>
                <div style={{ height:9,background:"rgba(255,255,255,0.08)",borderRadius:8,overflow:"hidden",marginBottom:6,position:"relative" }}>
                  <div className="j2-bar" style={{ height:"100%",width:`${metaPct}%`,background:`linear-gradient(90deg,${parseFloat(metaPct)>=100?'#34d399':'#a78bfa'},#22d3ee)`,borderRadius:8,boxShadow:`0 0 14px ${parseFloat(metaPct)>=100?'rgba(52,211,153,0.5)':'rgba(167,139,250,0.5)'}` }} />
                </div>
                <p style={{ fontSize:11,color:"rgba(255,255,255,0.42)",margin:0 }}>{metaPct}% atingido · Faltam {fmtR(Math.max(meta-stats.totalRevenue,0))}</p>
              </>
            )}
          </motion.div>
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
                <Tooltip content={<Tooltip2/>} cursor={{fill:"rgba(255,255,255,0.03)"}} />
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
                    className="j2-loss-row"
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:6, cursor:"pointer" }}>
                    <div style={{ width:26,height:26,borderRadius:9,background:"rgba(248,113,113,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#f87171",flexShrink:0 }}>{i+1}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{sv.name}</p>
                      <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>{sv.category} · {sv.credits.toLocaleString('pt-BR')} créditos · {sv.requests} compras</p>
                    </div>
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <p style={{ fontSize:13,fontWeight:800,color:"#f87171",margin:0 }}>{fmtR(sv.profit)}</p>
                      <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>Custo: {fmtR(sv.cost)}</p>
                    </div>
                    <div style={{ width:22,height:22,borderRadius:7,background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <Eye style={{ width:11,height:11,color:"#f87171" }} />
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={serverLoss.slice(0,6)} layout="vertical" margin={{left:10,right:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{fill:"rgba(255,255,255,0.5)",fontSize:10}} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<Tooltip2/>} cursor={{fill:"rgba(255,255,255,0.03)"}} />
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
                <Tooltip content={<Tooltip2/>} cursor={{fill:"rgba(255,255,255,0.03)"}} />
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
                <Tooltip content={<Tooltip2/>} cursor={{fill:"rgba(255,255,255,0.03)"}} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Bar dataKey="revenue" name="Receita" fill="#a78bfa" radius={[4,4,0,0]} />
                <Bar dataKey="cost" name="Custo" fill="#f87171" radius={[4,4,0,0]} />
                <Bar dataKey="profit" name="Lucro" fill="#34d399" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:6, overflowY:"auto", maxHeight:280 }}>
              {categoryProfitData.map((cat,i) => (
                <div key={cat.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:10, background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width:9,height:9,borderRadius:"50%",background:cat.color||DS_COLORS[i%10],flexShrink:0,boxShadow:`0 0 8px ${cat.color||DS_COLORS[i%10]}` }} />
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
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <ChartCard title="⑤ Receita x Lucro Mensal" subtitle="Últimos 6 meses" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4}/><stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{fill:"rgba(255,255,255,0.35)",fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={45} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tooltip2/>} cursor={{stroke:"rgba(255,255,255,0.1)"}} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#a78bfa" strokeWidth={2.5} fill="url(#gR)" dot={false} />
                <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#34d399" strokeWidth={2.5} fill="url(#gL)" dot={false} />
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
                <Tooltip content={<Tooltip2/>} cursor={{stroke:"rgba(255,255,255,0.1)"}} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#34d399" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="#fbbf24" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ANÁLISE 7 & 8 & 9 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <ChartCard title="⑦ Status dos Pedidos" subtitle={`${stats.totalRequests} total`} icon={CreditCard}>
            <ResponsiveContainer width="100%" height={180}>
              <RePieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value">
                  {statusData.map((e,i)=><Cell key={i} fill={e.color} stroke="rgba(0,0,0,0.2)"/>)}
                </Pie>
                <Tooltip content={<Tooltip2/>} />
              </RePieChart>
            </ResponsiveContainer>
            {statusData.map((item,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:9,height:9,borderRadius:"50%",background:item.color,boxShadow:`0 0 8px ${item.color}` }} />
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
                <Tooltip content={<Tooltip2/>} cursor={{fill:"rgba(255,255,255,0.03)"}} />
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
                  <div style={{ height:5,background:"rgba(255,255,255,0.08)",borderRadius:4 }}>
                    <div className="j2-bar" style={{ height:5,width:`${item.bar}%`,background:item.c,borderRadius:4,boxShadow:`0 0 10px ${item.c}88` }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* ANÁLISE 10 & 11 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <ChartCard title="⑩ Top Revendedores" subtitle={`Total: ${fmtR(totalResValue)}`} icon={UsersIcon}>
            {topResellers.length===0 ? <p style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",padding:"32px 0" }}>Sem dados</p> : (
              <>
                {topResellers.map((r,i)=>(
                  <TopItemRow key={r.id} rank={i+1} name={r.name} avatar
                    value={fmtR(r.totalValue)} sublabel={`${r.totalCredits.toLocaleString('pt-BR')} créditos`}
                    metric={`${r.requestCount} pedidos`} onClick={()=>handleResellerClick(r)}
                  />
                ))}
                {allResellerStats.length>5 && (
                  <button onClick={()=>setShowAllResellers(true)} style={{ width:"100%",padding:"9px",marginTop:8,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.28)",borderRadius:10,color:"#c4b5fd",fontSize:12,fontWeight:700,cursor:"pointer" }}>
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
                <Tooltip content={<Tooltip2/>} cursor={{stroke:"rgba(255,255,255,0.1)"}} />
                <Legend wrapperStyle={{fontSize:11,color:"rgba(255,255,255,0.5)"}} />
                <Line yAxisId="l" type="monotone" dataKey="novos" name="Novos" stroke="#22d3ee" strokeWidth={2.5} dot={{r:4}} />
                <Line yAxisId="l" type="monotone" dataKey="ativos" name="Pedidos" stroke="#fbbf24" strokeWidth={2.5} dot={{r:3}} />
                <Line yAxisId="r" type="monotone" dataKey="receita" name="Receita" stroke="#a78bfa" strokeWidth={2.5} dot={false} strokeDasharray="4 2" />
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
                    <tr key={a.id} className="j2-row">
                      <td style={{ padding:"9px 10px" }}><span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:`${sc.c}22`,color:sc.c,border:`1px solid ${sc.c}44` }}>{sc.l}</span></td>
                      <td style={{ padding:"9px 10px",fontSize:12,color:"#fff",fontWeight:600,whiteSpace:"nowrap" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}><Avatar name={a.reseller_name} size={22} />{a.reseller_name}</div>
                      </td>
                      <td style={{ padding:"9px 10px",fontSize:11,color:"rgba(255,255,255,0.4)" }}>{a.server_snapshot?.name||'N/A'}</td>
                      <td style={{ padding:"9px 10px",fontSize:12,color:"#fff",fontWeight:700 }}>{a.requested_credits?.toLocaleString('pt-BR')}</td>
                      <td style={{ padding:"9px 10px",fontSize:12,color:"#c4b5fd",fontWeight:800 }}>{fmtR(a.total_value)}</td>
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
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <ChartCard title="🏆 Score de Revendedores" subtitle="Volume (40%) + Regularidade (30%) + Recência (30%)" icon={Award} badge="Ranking" badgeColor="#fbbf24">
            {resellerScores.map((r,i)=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.07)", marginBottom:6 }}>
                <div style={{ width:26,height:26,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,background:rankStyle(i+1).bg,color:rankStyle(i+1).color,boxShadow:rankStyle(i+1).shadow,flexShrink:0 }}>{i+1}</div>
                <Avatar name={r.name} size={28} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12.5,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.name}</p>
                  <div style={{ height:4,background:"rgba(255,255,255,0.08)",borderRadius:3,marginTop:5 }}>
                    <div className="j2-bar" style={{ height:4,width:`${r.score}%`,background:"linear-gradient(90deg,#a78bfa,#22d3ee)",borderRadius:3,boxShadow:"0 0 8px rgba(167,139,250,0.5)" }} />
                  </div>
                </div>
                <span style={{ fontSize:17,fontWeight:900,color:"#fbbf24",flexShrink:0 }}>{r.score}</span>
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
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.18)", marginBottom:6 }}>
                <Avatar name={r.name} size={28} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12.5,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.name}</p>
                  <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>Total histórico: {fmtR(r.totalValue)}</p>
                </div>
                <span style={{ fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(248,113,113,0.15)",color:"#f87171",border:"1px solid rgba(248,113,113,0.3)",flexShrink:0,whiteSpace:"nowrap" }}>{r.diasSemPedir}d sem pedir</span>
              </div>
            ))}
          </ChartCard>
        </div>

        {/* HORÁRIO DE PICO + SIMULADOR */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
          <ChartCard title="🕐 Horário de Pico" subtitle="Pedidos aprovados por hora do dia (histórico completo)" icon={Timer}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hora" tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<Tooltip2/>} cursor={{fill:"rgba(255,255,255,0.03)"}} />
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
              <div style={{ marginTop:8, padding:14, borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                  <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>Receita</span>
                  <span style={{ fontSize:13,fontWeight:800,color:"#c4b5fd" }}>{fmtR(simRevenue)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                  <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>Custo</span>
                  <span style={{ fontSize:13,fontWeight:800,color:"#f87171" }}>{fmtR(simCost)}</span>
                </div>
                <div style={{ height:1,background:"rgba(255,255,255,0.08)",margin:"8px 0" }} />
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)" }}>Lucro</span>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:17,fontWeight:900,color:simProfit>=0?"#34d399":"#f87171" }}>{fmtR(simProfit)}</span>
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
            <DialogContent style={{ ...dialogStyle, maxWidth:400 }}>
              <DialogHeader><DialogTitle style={{ color:"#fff" }}>Definir Meta Mensal</DialogTitle></DialogHeader>
              <div style={{ padding:"16px 0", display:"flex", flexDirection:"column", gap:12 }}>
                <input type="number" value={metaInput} onChange={e=>setMetaInput(e.target.value)}
                  placeholder="Ex: 50000"
                  style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:10,color:"#fff",fontSize:14,padding:"11px 14px",outline:"none",width:"100%" }}
                />
                <button onClick={saveMeta} style={{ padding:"11px",borderRadius:10,background:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:"0 8px 24px rgba(124,58,237,0.4)" }}>Salvar Meta</button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal All Resellers */}
        {showAllResellers && (
          <Dialog open onOpenChange={()=>setShowAllResellers(false)}>
            <DialogContent style={{ ...dialogStyle, maxWidth:700,maxHeight:"85vh",overflow:"hidden" }}>
              <DialogHeader><DialogTitle style={{ color:"#fff" }}>Todos Revendedores ({allResellerStats.length})</DialogTitle></DialogHeader>
              <div style={{ overflowY:"auto",maxHeight:"calc(85vh - 120px)" }}>
                {allResellerStats.map((r,i)=>{
                  const tv=allResellerStats.reduce((s,x)=>s+x.totalValue,0);
                  return <TopItemRow key={r.id} rank={i+1} name={r.name} avatar value={fmtR(r.totalValue)} sublabel={`${((r.totalValue/tv)*100).toFixed(1)}%`} metric={`${r.requestCount} pedidos`} onClick={()=>{setShowAllResellers(false);handleResellerClick(r);}} />;
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Diagnóstico de Servidor com Prejuízo */}
        {selectedLossServer && (
          <Dialog open onOpenChange={()=>setSelectedLossServer(null)}>
            <DialogContent style={{ ...dialogStyle, maxWidth:840,maxHeight:"85vh",overflow:"hidden",border:"1px solid rgba(248,113,113,0.3)" }}>
              <DialogHeader>
                <DialogTitle style={{ color:"#fff", display:"flex", alignItems:"center", gap:10 }}>
                  <AlertTriangle style={{ width:18,height:18,color:"#f87171" }} /> Diagnóstico — {selectedLossServer.name}
                </DialogTitle>
              </DialogHeader>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14 }}>
                {[
                  {l:"Receita",v:fmtR(selectedLossServer.revenue),c:"#a78bfa"},
                  {l:"Custo",v:fmtR(selectedLossServer.cost),c:"#fb923c"},
                  {l:"Prejuízo",v:fmtR(selectedLossServer.profit),c:"#f87171"},
                  {l:"Compras",v:selectedLossServer.requests,c:"#22d3ee"},
                ].map(({l,v,c})=>(
                  <div key={l} style={{ padding:12,borderRadius:12,background:`${c}15`,border:`1px solid ${c}33` }}>
                    <p style={{ fontSize:10,color:"rgba(255,255,255,0.4)",margin:"0 0 4px" }}>{l}</p>
                    <p style={{ fontSize:15,fontWeight:800,color:c,margin:0 }}>{v}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:14 }}>
                <p style={{ fontSize:11.5, color:"rgba(255,255,255,0.6)", margin:0 }}>
                  <strong style={{ color:"#f87171" }}>Motivo:</strong> {(selectedLossServer.cost||0) === 0
                    ? "Custo por crédito não configurado neste servidor — receita aparece como lucro 0 ou negativo. Configure o custo/crédito."
                    : "O preço de venda praticado pelos revendedores está abaixo do custo por crédito deste servidor."}
                </p>
              </div>
              <div style={{ overflowY:"auto",maxHeight:"45vh" }}>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["Data","Revendedor","Login","Créditos","Receita","Custo","Lucro"].map(h=><th key={h} style={{ padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",color:"rgba(255,255,255,0.3)",borderBottom:"1px solid rgba(255,255,255,0.08)",whiteSpace:"nowrap" }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(selectedLossServer.purchases||[]).sort((a,b)=>a.profit-b.profit).map(p=>(
                      <tr key={p.id} className="j2-row">
                        <td style={{ padding:"8px 10px",fontSize:11,color:"rgba(255,255,255,0.35)",whiteSpace:"nowrap" }}>{formatBrasiliaDate(p.created_date,'dd/MM/yy HH:mm')}</td>
                        <td style={{ padding:"8px 10px",fontSize:12,color:"#fff" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}><Avatar name={p.reseller_name} size={22} />{p.reseller_name}</div>
                        </td>
                        <td style={{ padding:"8px 10px",fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"monospace" }}>{p.login||'—'}</td>
                        <td style={{ padding:"8px 10px",fontSize:12,color:"#fff",fontWeight:700 }}>{p.credits?.toLocaleString('pt-BR')}</td>
                        <td style={{ padding:"8px 10px",fontSize:12,color:"#c4b5fd",fontWeight:700 }}>{fmtR(p.revenue)}</td>
                        <td style={{ padding:"8px 10px",fontSize:11,color:"#fb923c" }}>{fmtR(p.cost)}</td>
                        <td style={{ padding:"8px 10px",fontSize:12,fontWeight:800,color:p.profit>=0?"#34d399":"#f87171" }}>{fmtR(p.profit)}</td>
                      </tr>
                    ))}
                    {(selectedLossServer.purchases||[]).length===0 && (
                      <tr><td colSpan={7} style={{ padding:"20px",textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:12 }}>Sem compras detalhadas para este período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Reseller History */}
        {selectedReseller && (
          <Dialog open onOpenChange={()=>setSelectedReseller(null)}>
            <DialogContent style={{ ...dialogStyle, maxWidth:800,maxHeight:"80vh",overflow:"hidden" }}>
              <DialogHeader>
                <DialogTitle style={{ color:"#fff", display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar name={selectedReseller.name} size={28} /> Histórico — {selectedReseller.name}
                </DialogTitle>
              </DialogHeader>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16 }}>
                {[{l:"Total Receita",v:fmtR(selectedReseller.totalValue),c:"#a78bfa"},{l:"Créditos",v:selectedReseller.totalCredits.toLocaleString('pt-BR'),c:"#22d3ee"},{l:"Pedidos",v:selectedReseller.requestCount,c:"#34d399"}].map(({l,v,c})=>(
                  <div key={l} style={{ padding:12,borderRadius:12,background:`${c}15`,border:`1px solid ${c}33` }}>
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
                        <tr key={req.id} className="j2-row">
                          <td style={{ padding:"8px 12px",fontSize:11,color:"rgba(255,255,255,0.35)" }}>{formatBrasiliaDate(req.created_date,'dd/MM/yy HH:mm')}</td>
                          <td style={{ padding:"8px 12px",fontSize:12,color:"#fff" }}>{req.server_snapshot?.name||'N/A'}</td>
                          <td style={{ padding:"8px 12px",fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"monospace" }}>{req.login}</td>
                          <td style={{ padding:"8px 12px",fontSize:13,color:"#fff",fontWeight:700 }}>{req.requested_credits?.toLocaleString('pt-BR')}</td>
                          <td style={{ padding:"8px 12px",fontSize:13,color:"#c4b5fd",fontWeight:800 }}>{fmtR(req.total_value)}</td>
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
