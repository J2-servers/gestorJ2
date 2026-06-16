import React, { useState, useEffect, useCallback } from "react";
import { remoteClient } from "@/api/remoteClient";
import { DollarSign, Clock, AlertCircle, FileText, TrendingUp, Download, MessageSquare, XCircle, BarChart3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatBrasiliaDate, formatFullBrasiliaDate } from '../components/utils/dateHelper';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:16 };
const GRAD = { purple:"linear-gradient(135deg,#2d1b69,#1a0f3e)", green:"linear-gradient(135deg,#064e2e,#022c1a)", yellow:"linear-gradient(135deg,#78350f,#3f1f04)", blue:"linear-gradient(135deg,#1e3a8a,#0f1f4e)" };
const ICON_C = { purple:"#a78bfa", green:"#34d399", yellow:"#fbbf24", blue:"#60a5fa" };

const statusConfig = {
  pending:{ color:"#fbbf24", bg:"rgba(251,191,36,0.12)", border:"rgba(251,191,36,0.25)", label:"Pendente" },
  paid:   { color:"#34d399", bg:"rgba(52,211,153,0.12)", border:"rgba(52,211,153,0.25)", label:"Pago"     },
  overdue:{ color:"#f87171", bg:"rgba(248,113,113,0.12)",border:"rgba(248,113,113,0.25)",label:"Vencida"  },
};

const StatusCard = ({ icon:Icon, label, value, sublabel, color="purple" }) => (
  <div style={{ background:GRAD[color], border:`1px solid ${ICON_C[color]}33`, borderRadius:14, padding:18, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute",top:-25,right:-25,width:70,height:70,background:ICON_C[color],borderRadius:"50%",filter:"blur(30px)",opacity:0.25,pointerEvents:"none" }} />
    <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",position:"relative" }}>
      <div>
        <p style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.45)",margin:"0 0 8px" }}>{label}</p>
        <p style={{ fontSize:22,fontWeight:800,color:"#fff",margin:"0 0 4px",lineHeight:1 }}>{value}</p>
        {sublabel&&<p style={{ fontSize:11,color:"rgba(255,255,255,0.4)",margin:0 }}>{sublabel}</p>}
      </div>
      <div style={{ width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <Icon style={{ width:15,height:15,color:ICON_C[color] }} />
      </div>
    </div>
  </div>
);

const InvoiceCard = ({ invoice, onClick }) => {
  const isOverdue = new Date(invoice.due_date)<new Date()&&invoice.status==='pending';
  const cfg = statusConfig[isOverdue?'overdue':invoice.status]||statusConfig.pending;
  return (
    <div onClick={onClick} style={{ ...CARD,borderColor:cfg.border,cursor:"pointer",transition:"box-shadow 0.15s" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.5)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10 }}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:8,flex:1 }}>
          <div style={{ width:28,height:28,borderRadius:7,background:cfg.bg,border:`1px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <FileText style={{ width:12,height:12,color:cfg.color }} />
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <h4 style={{ fontSize:13,fontWeight:800,color:"#fff",margin:"0 0 2px" }}>{invoice.invoice_number}</h4>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>{invoice.request_count} pedidos • {invoice.total_credits?.toLocaleString('pt-BR')} créditos</p>
          </div>
        </div>
        <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,flexShrink:0 }}>{cfg.label}</span>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:11 }}>
          <span style={{ color:"rgba(255,255,255,0.4)" }}>Período</span>
          <span style={{ color:"rgba(255,255,255,0.7)" }}>{formatBrasiliaDate(invoice.period_start,'dd/MM')} - {formatBrasiliaDate(invoice.period_end,'dd/MM/yyyy')}</span>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:11 }}>
          <span style={{ color:"rgba(255,255,255,0.4)" }}>{invoice.status==='paid'?'Pago em':'Vencimento'}</span>
          <span style={{ color:isOverdue?"#f87171":"rgba(255,255,255,0.7)",fontWeight:600 }}>{invoice.status==='paid'?formatBrasiliaDate(invoice.paid_date,'dd/MM/yyyy'):formatBrasiliaDate(invoice.due_date,'dd/MM/yyyy')}</span>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>Valor Total</span>
          <span style={{ fontSize:16,fontWeight:800,color:"#a78bfa" }}>R$ {invoice.total_value?.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
      </div>
    </div>
  );
};

const ConsumptionChart = ({ monthlyData }) => {
  const maxV = Math.max(...(monthlyData||[]).map(m=>m.value),1);
  return (
    <div style={CARD}>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
        <div style={{ width:26,height:26,borderRadius:7,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <BarChart3 style={{ width:12,height:12,color:"#a78bfa" }} />
        </div>
        <div>
          <h3 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0 }}>Consumo Mensal</h3>
          <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>{monthlyData?.length?'Últimos 6 meses':'Sem dados'}</p>
        </div>
      </div>
      {!monthlyData?.length ? <p style={{ fontSize:12,color:"rgba(255,255,255,0.25)",textAlign:"center",padding:"16px 0" }}>Nenhum consumo</p> : (
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {monthlyData.map((m,i)=>(
            <div key={i}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12 }}>
                <span style={{ color:"rgba(255,255,255,0.4)" }}>{m.month}</span>
                <span style={{ fontWeight:700,color:"#fff" }}>R$ {m.value.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
              </div>
              <div style={{ height:6,borderRadius:4,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
                <div style={{ height:"100%",borderRadius:4,width:`${(m.value/maxV)*100}%`,background:"#a78bfa",opacity:0.7 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InvoiceDetailModal = ({ invoice, requests, onClose }) => (
  <div style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)" }} onClick={onClose}>
    <div style={{ maxWidth:900,width:"100%",maxHeight:"90vh",overflow:"hidden",borderRadius:20,background:"#141414",border:"1px solid rgba(255,255,255,0.1)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <h2 style={{ fontSize:15,fontWeight:800,color:"#fff",margin:0 }}>{invoice.invoice_number}</h2>
          <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>{formatBrasiliaDate(invoice.period_start,'dd/MM/yyyy')} - {formatBrasiliaDate(invoice.period_end,'dd/MM/yyyy')}</p>
        </div>
        <button onClick={onClose} style={{ width:30,height:30,borderRadius:7,background:"rgba(255,255,255,0.06)",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <XCircle style={{ width:15,height:15 }} />
        </button>
      </div>
      <div style={{ padding:20,overflowY:"auto",maxHeight:"calc(90vh-140px)" }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20 }}>
          {[{l:"Pedidos",v:invoice.request_count},{l:"Créditos",v:invoice.total_credits?.toLocaleString('pt-BR')},{l:invoice.status==='paid'?'Pago em':'Vencimento',v:invoice.status==='paid'?formatBrasiliaDate(invoice.paid_date,'dd/MM'):formatBrasiliaDate(invoice.due_date,'dd/MM')},{l:"Valor Total",v:`R$ ${invoice.total_value?.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,accent:"#a78bfa"}].map(item=>(
            <div key={item.l} style={{ padding:12,borderRadius:10,background:"rgba(255,255,255,0.04)",border:item.accent?"1px solid rgba(167,139,250,0.2)":"1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize:10,color:item.accent||"rgba(255,255,255,0.35)",margin:"0 0 4px" }}>{item.l}</p>
              <p style={{ fontSize:14,fontWeight:800,color:item.accent||"#fff",margin:0 }}>{item.v}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 10px" }}>Pedidos Incluídos ({requests.length})</p>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {requests.map((req,i)=>(
            <div key={req.id} style={{ padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                  <span style={{ fontSize:10,fontFamily:"monospace",color:"rgba(255,255,255,0.3)" }}>#{i+1}</span>
                  <span style={{ fontSize:12,fontWeight:700,color:"#fff" }}>{req.server_snapshot?.name||'Servidor'}</span>
                </div>
                <p style={{ fontSize:11,color:"rgba(255,255,255,0.4)",margin:0 }}>Login: {req.login} • {formatFullBrasiliaDate(req.created_date)}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:11,color:"rgba(255,255,255,0.5)",margin:"0 0 2px" }}>{req.requested_credits?.toLocaleString('pt-BR')} créditos</p>
                <p style={{ fontSize:13,fontWeight:800,color:"#a78bfa",margin:0 }}>R$ {req.total_value?.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",gap:10,padding:"14px 20px",borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onClose} style={{ flex:1,padding:"9px",borderRadius:9,fontSize:13,fontWeight:700,background:"#a78bfa",color:"#0a0a0a",border:"none",cursor:"pointer" }}>Fechar</button>
      </div>
    </div>
  </div>
);

export default function FinanceiroPospago() {
  const { toast } = useToast();
  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [stats, setStats]                 = useState({ saldoDevedor:0,proximoVencimento:null,ultimaFatura:null,pedidosNaoFaturados:0,totalGastoMes:0,tendenciaMes:0 });
  const [invoices, setInvoices]           = useState([]);
  const [unbilledRequests, setUnbilled]   = useState([]);
  const [selectedInvoice, setSelected]   = useState(null);
  const [invoiceRequests, setInvoiceReqs] = useState([]);
  const [allRequests, setAllRequests]     = useState([]);
  const [monthlyData, setMonthlyData]    = useState([]);
  const [activeTab, setActiveTab]        = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const cu = await remoteClient.auth.me();
      setUser(cu);
      if (cu.payment_type!=='postpaid') { setLoading(false); return; }
      const [allInvoices, allReqsResult] = await Promise.all([
        remoteClient.invoices.list(),
        remoteClient.creditRequests.list(null, 500),
      ]);
      const allReqs = allReqsResult?.data || [];
      setAllRequests(allReqs);
      setInvoices(allInvoices);
      const allRequests = allReqs;
      const unbilled=allRequests.filter(r=>r.status==='recharged'&&r.payment_type==='postpaid'&&!r.invoice_id);
      setUnbilled(unbilled);
      const pending=allInvoices.filter(i=>i.status==='pending');
      const saldo=pending.reduce((s,i)=>s+i.total_value,0);
      const nextDue=pending.length>0?pending.sort((a,b)=>new Date(a.due_date)-new Date(b.due_date))[0]:null;
      const now=new Date();
      const monthly=[];
      for(let i=5;i>=0;i--){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const mStart=new Date(d.getFullYear(),d.getMonth(),1), mEnd=new Date(d.getFullYear(),d.getMonth()+1,0);
        const mInv=allInvoices.filter(inv=>{const id=new Date(inv.created_date);return inv.status==='paid'&&id>=mStart&&id<=mEnd;});
        monthly.push({month:d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),value:mInv.reduce((s,i)=>s+i.total_value,0)});
      }
      setMonthlyData(monthly);
      const thisM=monthly[5]?.value||0, lastM=monthly[4]?.value||0;
      const tend=lastM>0?parseFloat(((thisM-lastM)/lastM*100).toFixed(1)):0;
      setStats({ saldoDevedor:saldo||0, proximoVencimento:nextDue||null, ultimaFatura:allInvoices[0]||null, pedidosNaoFaturados:unbilled?.length||0, totalGastoMes:thisM||0, tendenciaMes:isNaN(tend)?0:tend });
    } catch(e) { console.error(e); toast({title:"Erro",description:"Não foi possível carregar.",variant:"destructive"}); }
    finally { setLoading(false); }
  };

  const handleInvoiceClick = (invoice) => {
    setInvoiceReqs(allRequests.filter(r => r.invoice_id === invoice.id));
    setSelected(invoice);
  };

  const handleRequestInvoice = async () => {
    try {
      const settings=await remoteClient.settings.getPublic();
      const adminWA=settings?.admin_whatsapp;
      if (!adminWA) { toast({title:"Entre em contato com o administrador para solicitar a fatura.",duration:4000}); return; }
      const msg=`Olá! Gostaria de solicitar a geração da fatura dos meus pedidos não faturados.\n\n📊 *Dados:*\n• Pedidos: ${unbilledRequests.length}\n• Total: R$ ${unbilledRequests.reduce((s,r)=>s+r.total_value,0).toLocaleString('pt-BR',{minimumFractionDigits:2})}\n\nObrigado!`;
      window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(msg)}`,'_blank');
      toast({title:"WhatsApp Aberto",description:"Envie a mensagem para solicitar a fatura.",duration:3000});
    } catch(e) { toast({title:"Erro",variant:"destructive"}); }
  };

  const filtered = activeTab==='all'?invoices:invoices.filter(i=>i.status===activeTab);

  if (loading) return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user||user.payment_type!=='postpaid') return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{ background:"#141414",border:"1px solid rgba(248,113,113,0.3)",borderRadius:16,padding:32,maxWidth:360,textAlign:"center" }}>
        <AlertCircle style={{ width:32,height:32,color:"#f87171",marginBottom:12,display:"block",margin:"0 auto 12px" }} />
        <p style={{ fontSize:14,fontWeight:700,color:"#fff",margin:"0 0 6px" }}>Acesso Negado</p>
        <p style={{ fontSize:12,color:"rgba(255,255,255,0.4)",margin:0 }}>Página exclusiva para pós-pago.</p>
      </div>
    </div>
  );

  return (
    <div style={S}>
      <div style={{ maxWidth:1800,margin:"0 auto",padding:"20px 20px 96px",display:"flex",flexDirection:"column",gap:16 }}>
        {/* Header */}
        <div style={{ background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <DollarSign style={{ width:16,height:16,color:"#a78bfa" }} />
          </div>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Financeiro Pós-Pago</h1>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>Gerencie suas faturas e consumo</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12 }}>
          <StatusCard icon={DollarSign} label="Saldo Devedor" value={`R$ ${stats.saldoDevedor.toLocaleString('pt-BR',{minimumFractionDigits:2})}`} sublabel={`${invoices.filter(i=>i.status==='pending').length} faturas pendentes`} color="purple" />
          <StatusCard icon={Clock} label="Próximo Vencimento" value={stats.proximoVencimento?formatBrasiliaDate(stats.proximoVencimento.due_date,'dd/MM'):'Nenhum'} sublabel={stats.proximoVencimento?`Fatura ${stats.proximoVencimento.invoice_number}`:'Todas em dia'} color={stats.proximoVencimento?"yellow":"green"} />
          <StatusCard icon={FileText} label="Última Fatura" value={stats.ultimaFatura?`R$ ${stats.ultimaFatura.total_value.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'Nenhuma'} sublabel={stats.ultimaFatura?formatBrasiliaDate(stats.ultimaFatura.created_date,'dd/MM/yyyy'):'Sem faturas'} color="blue" />
          <StatusCard icon={TrendingUp} label="Consumo Este Mês" value={`R$ ${stats.totalGastoMes.toLocaleString('pt-BR',{minimumFractionDigits:2})}`} sublabel={`${stats.pedidosNaoFaturados} pedidos não faturados`} color="green" />
        </div>

        {/* Main */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:16 }}>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {/* Tabs */}
            <div style={{ display:"inline-flex",background:"rgba(255,255,255,0.05)",borderRadius:10,padding:4,gap:2 }}>
              {[['all','Todas'],['pending','Pendentes'],['paid','Pagas']].map(([k,l])=>(
                <button key={k} onClick={()=>setActiveTab(k)} style={{ padding:"5px 14px",borderRadius:8,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.15s",
                  background:activeTab===k?"#a78bfa":"transparent", color:activeTab===k?"#0a0a0a":"rgba(255,255,255,0.45)" }}>
                  {l} ({k==='all'?invoices.length:invoices.filter(i=>i.status===k).length})
                </button>
              ))}
            </div>
            {filtered.length===0 ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 0",background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14 }}>
                <FileText style={{ width:28,height:28,color:"rgba(255,255,255,0.2)",marginBottom:8 }} />
                <p style={{ fontSize:13,color:"rgba(255,255,255,0.35)",margin:0 }}>Nenhuma fatura encontrada</p>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {filtered.map(inv=><InvoiceCard key={inv.id} invoice={inv} onClick={()=>handleInvoiceClick(inv)} />)}
              </div>
            )}
          </div>

          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {unbilledRequests.length>0&&(
              <div style={{ ...CARD,borderColor:"rgba(96,165,250,0.25)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                  <div style={{ width:26,height:26,borderRadius:7,background:"rgba(96,165,250,0.12)",border:"1px solid rgba(96,165,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Clock style={{ width:11,height:11,color:"#60a5fa" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0 }}>Pedidos Não Faturados</h3>
                    <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>Próxima fatura</p>
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:10 }}>
                  {[["Pedidos",unbilledRequests.length],["Créditos",unbilledRequests.reduce((s,r)=>s+r.requested_credits,0).toLocaleString('pt-BR')]].map(([l,v])=>(
                    <div key={l} style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                      <span style={{ color:"rgba(255,255,255,0.4)" }}>{l}</span>
                      <span style={{ color:"#fff",fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:14,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>Estimado</span>
                    <span style={{ fontWeight:800,color:"#60a5fa" }}>R$ {unbilledRequests.reduce((s,r)=>s+r.total_value,0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                </div>
                <button onClick={handleRequestInvoice} style={{ width:"100%",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:8,fontSize:12,fontWeight:700,background:"rgba(96,165,250,0.12)",color:"#60a5fa",border:"1px solid rgba(96,165,250,0.25)",cursor:"pointer" }}>
                  <MessageSquare style={{ width:13,height:13 }} /> Solicitar Fatura
                </button>
              </div>
            )}

            <ConsumptionChart monthlyData={monthlyData} />

            <div style={CARD}>
              <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 10px" }}>Estatísticas</p>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {[["Total Faturas",invoices.length,""],["Faturas Pagas",invoices.filter(i=>i.status==='paid').length,"#34d399"],["Total Pago",`R$ ${invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.total_value,0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`,""]] .map(([l,v,c])=>(
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",fontSize:12,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color:"rgba(255,255,255,0.4)" }}>{l}</span>
                    <span style={{ fontWeight:700,color:c||"#fff" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedInvoice&&<InvoiceDetailModal invoice={selectedInvoice} requests={invoiceRequests} onClose={()=>{setSelected(null);setInvoiceReqs([]);}} />}
    </div>
  );
}