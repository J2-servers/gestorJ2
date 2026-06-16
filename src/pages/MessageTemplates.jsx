import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Plus, Edit, Trash2, Copy, Check, MessageSquare } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import TemplateForm from '../components/templates/TemplateForm';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 };

const typeConfig = {
  queue:            { label:'Fila',          bg:'rgba(96,165,250,0.12)',   color:'#60a5fa', border:'rgba(96,165,250,0.25)'   },
  approval:         { label:'Aprovação',     bg:'rgba(52,211,153,0.12)',  color:'#34d399', border:'rgba(52,211,153,0.25)'  },
  rejection:        { label:'Rejeição',      bg:'rgba(248,113,113,0.12)', color:'#f87171', border:'rgba(248,113,113,0.25)' },
  payment_reminder: { label:'Pagamento',     bg:'rgba(251,191,36,0.12)',  color:'#fbbf24', border:'rgba(251,191,36,0.25)'  },
  custom:           { label:'Personalizado', bg:'rgba(167,139,250,0.12)', color:'#a78bfa', border:'rgba(167,139,250,0.25)' },
};

const VARIABLES = [
  { var:'{{resellerName}}',   desc:'Nome do revendedor' },
  { var:'{{requestId}}',      desc:'ID do pedido' },
  { var:'{{serverName}}',     desc:'Nome do servidor' },
  { var:'{{login}}',          desc:'Login de recebimento' },
  { var:'{{credits}}',        desc:'Quantidade de créditos' },
  { var:'{{value}}',          desc:'Valor total' },
  { var:'{{adminNotes}}',     desc:'Obs. do admin' },
  { var:'{{rejectionReason}}',desc:'Motivo da rejeição' },
];

const Btn = ({onClick,children,style}) => (
  <button onClick={onClick} style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",border:"none",transition:"all 0.15s",...style }}>
    {children}
  </button>
);

export default function MessageTemplatesPage() {
  const [user, setUser]                       = useState(null);
  const [templates, setTemplates]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [showForm, setShowForm]               = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [copiedId, setCopiedId]               = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await remoteClient.auth.me();
      setUser(u);
      if (u.role==='admin') setTemplates(await remoteClient.templates.list());
    } catch (error) {
      console.warn('[MessageTemplates] Falha ao carregar templates:', error);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    await remoteClient.templates.remove(id);
    toast({ title:"Template deletado ✅" });
    loadData();
  };

  const copyVar = (v) => {
    navigator.clipboard.writeText(v);
    setCopiedId(v);
    setTimeout(()=>setCopiedId(null), 2000);
  };

  if (loading) return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user||user.role!=='admin') return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{...CARD,borderColor:"rgba(248,113,113,0.3)"}}><p style={{color:"#f87171"}}>Acesso não autorizado.</p></div>
    </div>
  );

  return (
    <div style={S}>
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"12px 12px 96px",display:"flex",flexDirection:"column",gap:12 }}>

        {/* Header */}
        <div style={{ ...CARD,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,padding:"16px 20px",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <MessageSquare style={{ width:16,height:16,color:"#a78bfa" }} />
            </div>
            <div>
              <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Templates de Mensagens</h1>
              <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>Mensagens WhatsApp automáticas</p>
            </div>
          </div>
          <Btn onClick={()=>{setEditingTemplate(null);setShowForm(true);}} style={{ background:"#a78bfa",color:"#0a0a0a" }}>
            <Plus style={{ width:13,height:13 }} /> Novo Template
          </Btn>
        </div>

        {/* Variables */}
        <div style={CARD}>
          <p style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(255,255,255,0.3)",margin:"0 0 12px" }}>Variáveis Disponíveis</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8 }}>
            {VARIABLES.map(item=>(
              <div key={item.var} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:8 }}>
                <code style={{ fontSize:11,color:"#22d3ee",fontFamily:"monospace",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.var}</code>
                <button onClick={()=>copyVar(item.var)} style={{ width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,background:"none",border:"none",cursor:"pointer",color:copiedId===item.var?"#34d399":"rgba(255,255,255,0.3)",flexShrink:0 }}>
                  {copiedId===item.var?<Check style={{ width:12,height:12 }}/>:<Copy style={{ width:12,height:12 }}/>}
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12,padding:"10px 14px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:8,fontSize:12,color:"#a78bfa" }}>
            💡 Use <code style={{ fontFamily:"monospace" }}>{"{{adminNotes}}"}</code> nos templates de aprovação para observações personalizadas.
          </div>
        </div>

        {/* List */}
        {templates.length===0 ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"64px 0",background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16 }}>
            <div style={{ width:56,height:56,borderRadius:14,background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
              <MessageSquare style={{ width:24,height:24,color:"rgba(255,255,255,0.2)" }} />
            </div>
            <h3 style={{ fontSize:15,fontWeight:700,color:"#fff",margin:"0 0 6px" }}>Nenhum template</h3>
            <p style={{ fontSize:12,color:"rgba(255,255,255,0.35)",margin:"0 0 20px" }}>Crie seu primeiro template para começar</p>
            <Btn onClick={()=>setShowForm(true)} style={{ background:"#a78bfa",color:"#0a0a0a" }}><Plus style={{ width:13,height:13 }} /> Criar Template</Btn>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {templates.map(t=>{
              const cfg = typeConfig[t.type]||typeConfig.custom;
              return (
                <div key={t.id} style={{ ...CARD,opacity:t.is_active?1:0.55 }}>
                  <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:12 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
                      <h3 style={{ fontSize:14,fontWeight:700,color:"#fff",margin:0 }}>{t.name}</h3>
                      <span style={{ fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
                      {!t.is_active&&<span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.35)" }}>Inativo</span>}
                    </div>
                    <div style={{ display:"flex",gap:8,flexShrink:0 }}>
                      <Btn onClick={()=>{setEditingTemplate(t);setShowForm(true);}} style={{ background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.6)" }}>
                        <Edit style={{ width:12,height:12 }} /> Editar
                      </Btn>
                      <Btn onClick={()=>{ if(window.confirm("Deletar template?")) handleDelete(t.id); }} style={{ background:"rgba(248,113,113,0.12)",color:"#f87171",outline:"1px solid rgba(248,113,113,0.25)" }}>
                        <Trash2 style={{ width:12,height:12 }} /> Deletar
                      </Btn>
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:14 }}>
                    <pre style={{ fontSize:12,color:"rgba(255,255,255,0.6)",margin:0,whiteSpace:"pre-wrap",fontFamily:"monospace",lineHeight:1.6 }}>{t.message_content}</pre>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showForm&&(
          <TemplateForm template={editingTemplate}
            onSuccess={()=>{setShowForm(false);setEditingTemplate(null);loadData();}}
            onCancel={()=>{setShowForm(false);setEditingTemplate(null);}} />
        )}
      </div>
    </div>
  );
}
