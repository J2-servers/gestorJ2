import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { AnimatePresence } from 'framer-motion';
import { Image, User, Search, X, Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatBrasiliaDate, formatFullBrasiliaDate } from '../components/utils/dateHelper';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:16 };

const statusCfg = {
  pending:   { label:"Pendente",   bg:"rgba(251,191,36,0.12)",  color:"#fbbf24", border:"rgba(251,191,36,0.25)"  },
  analyzing: { label:"Em Análise", bg:"rgba(96,165,250,0.12)",  color:"#60a5fa", border:"rgba(96,165,250,0.25)"  },
  recharged: { label:"Aprovado",   bg:"rgba(52,211,153,0.12)",  color:"#34d399", border:"rgba(52,211,153,0.25)"  },
  rejected:  { label:"Rejeitado",  bg:"rgba(248,113,113,0.12)", color:"#f87171", border:"rgba(248,113,113,0.25)" },
  cancelled: { label:"Cancelado",  bg:"rgba(115,115,115,0.12)", color:"#737373", border:"rgba(115,115,115,0.25)" },
};

const Badge = ({ status }) => {
  const cfg = statusCfg[status]||statusCfg.pending;
  return <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}` }}>{cfg.label}</span>;
};

const ProofCard = ({ proof, onClick }) => (
  <div onClick={onClick} style={{ borderRadius:12,overflow:"hidden",cursor:"pointer",background:"#141414",border:"1px solid rgba(255,255,255,0.07)",transition:"border-color 0.15s" }}
    onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(167,139,250,0.4)"}
    onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
    <div style={{ position:"relative",width:"100%",height:210,background:"#0a0a0a",overflow:"hidden" }}>
      {proof.proof_of_payment_url
        ? <img src={proof.proof_of_payment_url} alt="Comprovante" style={{ width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.3s" }}
            onMouseEnter={e=>e.target.style.transform="scale(1.05)"} onMouseLeave={e=>e.target.style.transform="scale(1)"}
            onError={e=>{e.target.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23111"/%3E%3C/svg%3E';}} />
        : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center" }}><Image style={{ width:40,height:40,color:"rgba(255,255,255,0.15)" }}/></div>
      }
      <div style={{ position:"absolute",top:8,right:8 }}><Badge status={proof.status} /></div>
    </div>
    <div style={{ padding:12 }}>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
        <div style={{ width:24,height:24,borderRadius:6,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <User style={{ width:11,height:11,color:"#a78bfa" }} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontSize:12,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{proof.reseller_name||'Revendedor'}</p>
          <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{proof.reseller_email}</p>
        </div>
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:11 }}>
        <span style={{ color:"rgba(255,255,255,0.4)" }}>{proof.server_name||'N/A'}</span>
        <span style={{ fontWeight:800,color:"#a78bfa" }}>R$ {proof.total_value?.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
      </div>
    </div>
  </div>
);

const ProofModal = ({ proof, onClose }) => {
  const cfg = statusCfg[proof.status]||statusCfg.pending;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)" }} onClick={onClose}>
      <div style={{ maxWidth:900,width:"100%",maxHeight:"90vh",overflow:"hidden",borderRadius:20,background:"#141414",border:"1px solid rgba(255,255,255,0.1)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Image style={{ width:14,height:14,color:"#a78bfa" }} />
            </div>
            <div>
              <h2 style={{ fontSize:14,fontWeight:700,color:"#fff",margin:0 }}>Comprovante de Pagamento</h2>
              <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>Pedido #{proof.id.slice(-8)}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.06)",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <X style={{ width:15,height:15 }} />
          </button>
        </div>
        <div style={{ padding:20,overflowY:"auto",maxHeight:"calc(90vh-140px)" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
            <div style={{ borderRadius:14,overflow:"hidden",background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.06)" }}>
              {proof.proof_of_payment_url
                ? <img src={proof.proof_of_payment_url} alt="Comprovante" style={{ width:"100%",height:"auto",maxHeight:400,objectFit:"contain" }} />
                : <div style={{ height:200,display:"flex",alignItems:"center",justifyContent:"center" }}><Image style={{ width:40,height:40,color:"rgba(255,255,255,0.2)" }}/></div>
              }
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div>
                <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 8px" }}>Status</p>
                <Badge status={proof.status} />
              </div>
              <div>
                <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 8px" }}>Revendedor</p>
                <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:9 }}>
                  <div style={{ width:26,height:26,borderRadius:6,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <User style={{ width:11,height:11,color:"#a78bfa" }} />
                  </div>
                  <div>
                    <p style={{ fontSize:12,fontWeight:700,color:"#fff",margin:0 }}>{proof.reseller_name||'Revendedor'}</p>
                    <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",margin:0 }}>{proof.reseller_email}</p>
                  </div>
                </div>
              </div>
              <div>
                <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 8px" }}>Informações</p>
                <div style={{ background:"rgba(255,255,255,0.04)",borderRadius:9,overflow:"hidden" }}>
                  {[["Servidor",proof.server_name||'N/A'],["Login",proof.login],["Créditos",proof.requested_credits?.toLocaleString('pt-BR')]].map(([l,v])=>(
                    <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:12 }}>
                      <span style={{ color:"rgba(255,255,255,0.4)" }}>{l}</span>
                      <span style={{ color:"#fff",fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"10px 12px",fontSize:14 }}>
                    <span style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>Valor Total</span>
                    <span style={{ fontWeight:800,color:"#a78bfa" }}>R$ {proof.total_value?.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                </div>
              </div>
              <div>
                <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 6px" }}>Data</p>
                <p style={{ fontSize:12,color:"rgba(255,255,255,0.6)",margin:0 }}>{formatFullBrasiliaDate(proof.created_date)}</p>
              </div>
              {proof.notes&&<div>
                <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 6px" }}>Obs.</p>
                <p style={{ fontSize:12,color:"rgba(255,255,255,0.5)",margin:0 }}>{proof.notes}</p>
              </div>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex",gap:10,padding:"14px 20px",borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={()=>proof.proof_of_payment_url&&window.open(proof.proof_of_payment_url,'_blank')} style={{ flex:1,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:9,fontSize:13,fontWeight:700,background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.6)",border:"none",cursor:"pointer" }}>
            <Download style={{ width:13,height:13 }} /> Abrir em Nova Aba
          </button>
          <button onClick={onClose} style={{ flex:1,padding:"9px",borderRadius:9,fontSize:13,fontWeight:700,background:"#a78bfa",color:"#0a0a0a",border:"none",cursor:"pointer" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default function ProofGallery() {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [proofs, setProofs]           = useState([]);
  const [filteredProofs, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [selectedProof, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { filterProofs(); }, [searchTerm, statusFilter, proofs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const cu = await remoteClient.auth.me();
      setUser(cu);
      if (cu.role!=='admin') return;
      const [allUsers, allReqsResult] = await Promise.all([
        remoteClient.users.list(),
        remoteClient.creditRequests.list(null, 1000),
      ]);
      const myResellers = (allUsers || []).filter(u => u.role === 'user' && (u.parent_user_id === cu.id || u.parentId === cu.id));
      const resellerMap = {};
      myResellers.forEach(r => { resellerMap[r.id] = { name: r.name || r.email, email: r.email }; });
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const allRequests = allReqsResult?.data || [];
      const data = allRequests.filter(req => {
        return req.proof_of_payment_url && new Date(req.created_date) >= thirtyDaysAgo;
      }).map(req => ({ ...req, reseller_name: resellerMap[req.reseller_id]?.name || 'Revendedor', reseller_email: resellerMap[req.reseller_id]?.email || '', server_name: req.server_snapshot?.name || 'Servidor' }));
      setProofs(data); setFiltered(data);
    } catch(e) { console.error(e); toast({title:"Erro",description:"Não foi possível carregar.",variant:"destructive"}); }
    finally { setLoading(false); }
  };

  const filterProofs = () => {
    let f = proofs;
    if (searchTerm) f=f.filter(p=>p.reseller_name.toLowerCase().includes(searchTerm.toLowerCase())||p.reseller_email.toLowerCase().includes(searchTerm.toLowerCase())||p.server_name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter!=='all') f=f.filter(p=>p.status===statusFilter);
    setFiltered(f);
  };

  if (loading) return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user||user.role!=='admin') return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{ background:"#141414",border:"1px solid rgba(248,113,113,0.3)",borderRadius:16,padding:24 }}><p style={{ color:"#f87171" }}>Acesso negado.</p></div>
    </div>
  );

  const filterBtns = [
    {key:'all',label:`Todos (${proofs.length})`},
    {key:'pending',label:`Pendentes (${proofs.filter(p=>p.status==='pending').length})`},
    {key:'analyzing',label:`Em Análise (${proofs.filter(p=>p.status==='analyzing').length})`},
    {key:'recharged',label:`Aprovados (${proofs.filter(p=>p.status==='recharged').length})`},
  ];

  return (
    <div style={S}>
      <div style={{ maxWidth:2000,margin:"0 auto",padding:"20px 20px 96px",display:"flex",flexDirection:"column",gap:16 }}>

        {/* Header */}
        <div style={{ background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Image style={{ width:16,height:16,color:"#a78bfa" }} />
          </div>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Galeria de Comprovantes</h1>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>Últimos 30 dias • {filteredProofs.length} comprovantes</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ ...CARD,display:"flex",flexDirection:"row",gap:12,flexWrap:"wrap",alignItems:"center" }}>
          <div style={{ flex:1,minWidth:200,position:"relative" }}>
            <Search style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"rgba(255,255,255,0.3)" }} />
            <input placeholder="Buscar por revendedor ou servidor..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              style={{ width:"100%",padding:"9px 12px 9px 36px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,color:"#fff",fontSize:12,outline:"none",boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor="rgba(167,139,250,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"} />
          </div>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {filterBtns.map(fb=>(
              <button key={fb.key} onClick={()=>setStatusFilter(fb.key)} style={{ padding:"7px 14px",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",border:"none",transition:"all 0.15s",
                background:statusFilter===fb.key?"#a78bfa":"rgba(255,255,255,0.06)",
                color:statusFilter===fb.key?"#0a0a0a":"rgba(255,255,255,0.5)" }}>
                {fb.label}
              </button>
            ))}
          </div>
        </div>

        {filteredProofs.length===0 ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"64px 0",background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16 }}>
            <div style={{ width:56,height:56,borderRadius:14,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
              <Image style={{ width:24,height:24,color:"rgba(255,255,255,0.2)" }} />
            </div>
            <h3 style={{ fontSize:15,fontWeight:700,color:"#fff",margin:"0 0 6px" }}>Nenhum comprovante encontrado</h3>
            <p style={{ fontSize:12,color:"rgba(255,255,255,0.35)",margin:0 }}>{searchTerm||statusFilter!=='all'?'Tente ajustar os filtros':'Não há comprovantes nos últimos 30 dias'}</p>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16 }}>
            {filteredProofs.map(proof=><ProofCard key={proof.id} proof={proof} onClick={()=>setSelected(proof)} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedProof&&<ProofModal proof={selectedProof} onClose={()=>setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
