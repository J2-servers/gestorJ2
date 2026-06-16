import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { FileText, DollarSign, Clock, CheckCircle, AlertCircle, Loader2, User, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatBrasiliaDate } from '../components/utils/dateHelper';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:16 };

const KanbanCol = ({ title, icon:Icon, accentColor, children, count }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#141414",border:`1px solid rgba(255,255,255,0.06)`,borderLeft:`3px solid ${accentColor}`,borderRadius:12 }}>
      <div style={{ width:28,height:28,borderRadius:7,background:`${accentColor}18`,border:`1px solid ${accentColor}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <Icon style={{ width:13,height:13,color:accentColor }} />
      </div>
      <div>
        <h3 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0 }}>{title}</h3>
        <p style={{ fontSize:10,color:"rgba(255,255,255,0.3)",margin:0 }}>{count} {count===1?'item':'itens'}</p>
      </div>
    </div>
    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>{children}</div>
  </div>
);

const Btn = ({onClick,disabled,children,style}) => (
  <button onClick={onClick} disabled={disabled} style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"8px 12px",borderRadius:8,fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",border:"none",width:"100%",transition:"all 0.15s",opacity:disabled?0.5:1,...style }}>
    {children}
  </button>
);

export default function InvoiceManagement() {
  const { toast } = useToast();
  const [user, setUser]                       = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [resendingReceipt, setResendingReceipt]   = useState(null);
  const [pendingByReseller, setPendingByReseller] = useState([]);
  const [pendingInvoices, setPendingInvoices]     = useState([]);
  const [paidInvoices, setPaidInvoices]           = useState([]);

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if (user) loadKanbanData(); }, [user]);

  const loadUser = async () => {
    try { const u=await remoteClient.auth.me(); setUser(u); } catch(e) { console.error(e); }
  };

  const loadKanbanData = async () => {
    setLoading(true);
    try {
      const [allUsers, allReqsResult, allInvoices] = await Promise.all([
        remoteClient.users.list(),
        remoteClient.creditRequests.list(null, 1000),
        remoteClient.invoices.list(),
      ]);
      const allRequests = allReqsResult?.data || [];
      const myResellers = (allUsers||[]).filter(u=>u.role==='user'&&u.payment_type==='postpaid');
      const pendingData=[];
      for (const reseller of myResellers) {
        const unbilled = allRequests.filter(req=>req.reseller_id===reseller.id&&req.payment_type==='postpaid'&&req.status==='recharged'&&!req.invoice_id);
        if (unbilled.length>0) pendingData.push({ reseller, requests:unbilled, totalCredits:unbilled.reduce((s,r)=>s+(r.requested_credits||0),0), totalValue:unbilled.reduce((s,r)=>s+(r.total_value||0),0) });
      }
      setPendingByReseller(pendingData);
      const ids = new Set(myResellers.map(r=>r.id));
      setPendingInvoices((allInvoices||[]).filter(inv=>ids.has(inv.reseller_id)&&inv.status==='pending'));
      setPaidInvoices((allInvoices||[]).filter(inv=>ids.has(inv.reseller_id)&&inv.status==='paid'));
    } catch(e) { console.error(e); toast({title:"Erro",description:"Não foi possível carregar dados.",variant:"destructive"}); }
    finally { setLoading(false); }
  };

  const generateInvoice = async (data) => {
    if (!data?.reseller?.id) return;
    setGeneratingInvoice(data.reseller.id);
    try {
      const inv = await remoteClient.invoices.generate(data.reseller.id);
      toast({title:"Fatura Gerada! ✅",description:`${inv.invoice_number} com ${data.requests.length} pedidos.`,duration:4000});
      loadKanbanData();
    } catch(e) { toast({title:"Erro",description:e?.message||'Erro ao gerar fatura.',variant:"destructive"}); }
    finally { setGeneratingInvoice(null); }
  };

  const markAsPaid = async (invoice) => {
    if (!invoice?.id||processingPayment===invoice.id) return;
    setProcessingPayment(invoice.id);
    try {
      await remoteClient.invoices.markPaid(invoice.id, null);
      toast({title:"Fatura Paga! ✅",description:`${invoice.invoice_number} confirmada.`,duration:3000});
      loadKanbanData();
    } catch(e) { toast({title:"Erro",description:e?.message||"Não foi possível atualizar.",variant:"destructive"}); }
    finally { setProcessingPayment(null); }
  };

  const resendReceipt = async (invoice) => {
    if (!invoice?.id||resendingReceipt===invoice.id) return;
    setResendingReceipt(invoice.id);
    try {
      await remoteClient.invoices.resend(invoice.id);
      toast({title:"Comprovante Reenviado!",duration:3000});
    } catch(e) { toast({title:"Erro",description:e?.message,variant:"destructive"}); }
    finally { setResendingReceipt(null); }
  };

  if (loading) return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user||user.role!=='admin') return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#141414",border:"1px solid rgba(248,113,113,0.3)",borderRadius:16,padding:24}}><p style={{color:"#f87171"}}>Acesso negado.</p></div>
    </div>
  );

  const emptyCol = (msg) => (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",background:"#141414",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12 }}>
      <p style={{ fontSize:12,color:"rgba(255,255,255,0.25)",margin:0 }}>{msg}</p>
    </div>
  );

  return (
    <div style={S}>
      <div style={{ maxWidth:1800,margin:"0 auto",padding:"12px 12px 96px",display:"flex",flexDirection:"column",gap:12 }}>
        {/* Header */}
        <div style={{ background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <DollarSign style={{ width:16,height:16,color:"#a78bfa" }} />
          </div>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Financeiro</h1>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>Gestão de faturas pós-pago</p>
          </div>
        </div>

        {/* Kanban */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16 }}>

          <KanbanCol title="Pedidos Pendentes" icon={Clock} accentColor="#fbbf24" count={pendingByReseller.length}>
            {pendingByReseller.length===0 ? emptyCol("Nenhum pedido pendente de faturamento") : pendingByReseller.map(data=>(
              <div key={data.reseller.id} style={CARD}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                  <div style={{ width:28,height:28,borderRadius:7,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <User style={{ width:12,height:12,color:"#a78bfa" }} />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <h4 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{data.reseller.full_name||data.reseller.name||data.reseller.email}</h4>
                    <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>{data.requests.length} pedidos aprovados</p>
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"rgba(255,255,255,0.4)" }}>Créditos</span>
                    <span style={{ color:"#fff",fontWeight:700 }}>{data.totalCredits.toLocaleString('pt-BR')}</span>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:14 }}>
                    <span style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>Valor Total</span>
                    <span style={{ fontWeight:800,color:"#fbbf24" }}>R$ {data.totalValue.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                </div>
                <Btn onClick={()=>generateInvoice(data)} disabled={generatingInvoice===data.reseller.id} style={{ background:"#a78bfa",color:"#0a0a0a" }}>
                  {generatingInvoice===data.reseller.id?<><Loader2 style={{ width:13,height:13 }} className="animate-spin" />Gerando...</>:<><FileText style={{ width:13,height:13 }} />Gerar Fatura</>}
                </Btn>
              </div>
            ))}
          </KanbanCol>

          <KanbanCol title="Faturas Pendentes" icon={AlertCircle} accentColor="#a78bfa" count={pendingInvoices.length}>
            {pendingInvoices.length===0 ? emptyCol("Nenhuma fatura aguardando pagamento") : pendingInvoices.map(invoice=>(
              <div key={invoice.id} style={{ ...CARD,borderColor:"rgba(167,139,250,0.25)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                  <div style={{ width:28,height:28,borderRadius:7,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <FileText style={{ width:12,height:12,color:"#a78bfa" }} />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <h4 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0 }}>{invoice.invoice_number}</h4>
                    <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{invoice.reseller_name}</p>
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
                  {[["Vencimento",formatBrasiliaDate(invoice.due_date,'dd/MM/yyyy'),""],["Pedidos",invoice.request_count,""]].map(([l,v])=>(
                    <div key={l} style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                      <span style={{ color:"rgba(255,255,255,0.4)" }}>{l}</span>
                      <span style={{ color:"#fff",fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:14 }}>
                    <span style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>Valor</span>
                    <span style={{ fontWeight:800,color:"#a78bfa" }}>R$ {invoice.total_value.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                </div>
                <Btn onClick={()=>markAsPaid(invoice)} disabled={processingPayment===invoice.id} style={{ background:"rgba(52,211,153,0.12)",color:"#34d399",outline:"1px solid rgba(52,211,153,0.25)" }}>
                  {processingPayment===invoice.id?<><Loader2 style={{ width:13,height:13 }} className="animate-spin"/>Processando...</>:<><CheckCircle style={{ width:13,height:13 }}/>Marcar como Pago</>}
                </Btn>
              </div>
            ))}
          </KanbanCol>

          <KanbanCol title="Faturas Pagas" icon={CheckCircle} accentColor="#34d399" count={paidInvoices.length}>
            {paidInvoices.length===0 ? emptyCol("Nenhuma fatura paga ainda") : paidInvoices.slice(0,10).map(invoice=>(
              <div key={invoice.id} style={{ ...CARD,borderColor:"rgba(52,211,153,0.2)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                  <div style={{ width:28,height:28,borderRadius:7,background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <CheckCircle style={{ width:12,height:12,color:"#34d399" }} />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <h4 style={{ fontSize:13,fontWeight:700,color:"#fff",margin:0 }}>{invoice.invoice_number}</h4>
                    <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{invoice.reseller_name}</p>
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"rgba(255,255,255,0.4)" }}>Pago em</span>
                    <span style={{ color:"#34d399",fontWeight:600 }}>{formatBrasiliaDate(invoice.paid_date,'dd/MM/yyyy')}</span>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:13 }}>
                    <span style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>Valor</span>
                    <span style={{ fontWeight:800,color:"#fff" }}>R$ {invoice.total_value.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                </div>
                <Btn onClick={()=>resendReceipt(invoice)} disabled={resendingReceipt===invoice.id} style={{ background:"rgba(52,211,153,0.08)",color:"#34d399",outline:"1px solid rgba(52,211,153,0.2)" }}>
                  {resendingReceipt===invoice.id?<><Loader2 style={{ width:13,height:13 }} className="animate-spin"/>Enviando...</>:<><Send style={{ width:13,height:13 }}/>Reenviar Comprovante</>}
                </Btn>
              </div>
            ))}
          </KanbanCol>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
