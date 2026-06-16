import React, { useState, useEffect, useCallback } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Plus, Search, Link as LinkIcon, AlertTriangle, Users as UsersIcon, Edit, FileText, Phone, Mail } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import UserForm from '../components/users/UserForm';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 };
const Btn = ({onClick,children,style}) => (
  <button onClick={onClick} style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",border:"none",transition:"all 0.15s",...style }}>
    {children}
  </button>
);

export default function UsersPage() {
  const [currentUser, setCurrentUser]   = useState(null);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editingUser, setEditingUser]   = useState(null);
  const [searchTerm, setSearchTerm]     = useState("");
  const [debounced, setDebounced]       = useState("");
  const [usersNoPhone, setUsersNoPhone] = useState([]);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await remoteClient.auth.me();
      setCurrentUser(me);
      if (me.role === 'dev' || me.role === 'admin') {
        const all = await remoteClient.users.list();
        const list = (all || []).filter(u => u.role === 'user');
        setUsers(list);
        setUsersNoPhone(list.filter(u => !u.phone));
      } else { setUsers([]); }
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { const t=setTimeout(()=>setDebounced(searchTerm),500); return ()=>clearTimeout(t); }, [searchTerm]);

  const copyRegLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register?parent=${currentUser?.id}`);
    toast({ title:"Link Copiado", description:"Link de cadastro copiado." });
  };

  const handleGenerateInvoice = async (reseller) => {
    if (!reseller?.id) return;
    if (reseller.payment_type!=='postpaid') { toast({title:"Tipo Inválido",description:"Apenas pós-pago pode ter faturas.",variant:"destructive"}); return; }
    try {
      toast({ title:"Gerando Fatura...", description:"Buscando pedidos não faturados." });
      const inv = await remoteClient.invoices.generate(reseller.id);
      toast({ title:"Fatura Gerada! ✅", description:`${inv.invoice_number} criada com sucesso.`, duration:4000 });
      loadData();
    } catch(e) { toast({title:"Erro",description:e?.message||'Erro ao gerar fatura.',variant:"destructive",duration:5000}); }
  };

  const filtered = users.filter(u => (u.full_name||u.name||'').toLowerCase().includes(debounced.toLowerCase()) || u.email?.toLowerCase().includes(debounced.toLowerCase()));

  return (
    <div style={S}>
      <div style={{ maxWidth:1600,margin:"0 auto",padding:"12px 12px 96px",display:"flex",flexDirection:"column",gap:12 }}>

        {/* No-phone alert */}
        {usersNoPhone.length>0&&(
          <div style={{ background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:16,padding:20 }}>
            <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
              <div style={{ width:32,height:32,borderRadius:8,background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <AlertTriangle style={{ width:14,height:14,color:"#fbbf24" }} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13,fontWeight:700,color:"#fff",margin:"0 0 10px" }}>{usersNoPhone.length} revendedor(es) sem WhatsApp</p>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {usersNoPhone.map(u=>(
                    <div key={u.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:8 }}>
                      <span style={{ fontSize:12,color:"rgba(255,255,255,0.6)" }}>{u.full_name||u.name} ({u.email})</span>
                      <Btn onClick={()=>{setEditingUser(u);setShowForm(true);}} style={{ background:"rgba(251,191,36,0.12)",color:"#fbbf24",outline:"1px solid rgba(251,191,36,0.25)" }}>Editar</Btn>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ ...CARD,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,padding:"16px 20px",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <UsersIcon style={{ width:16,height:16,color:"#a78bfa" }} />
            </div>
            <div>
              <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Revendedores</h1>
              <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>Gerencie sua equipe de revendas</p>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <Btn onClick={()=>{setEditingUser(null);setShowForm(true);}} style={{ background:"#a78bfa",color:"#0a0a0a" }}>
              <Plus style={{ width:13,height:13 }} /> Novo Revendedor
            </Btn>
          </div>
        </div>

        {/* Search */}
        <div style={{ position:"relative" }}>
          <Search style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",width:15,height:15,color:"rgba(255,255,255,0.3)" }} />
          <input placeholder="Buscar por nome ou email..."
            style={{ width:"100%",padding:"10px 14px 10px 40px",background:"#141414",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#fff",fontSize:13,outline:"none",boxSizing:"border-box" }}
            value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
            onFocus={e=>e.target.style.borderColor="rgba(167,139,250,0.5)"}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"} />
        </div>

        {/* User Cards Grid */}
        {loading ? (
          <div style={{ display:"flex",justifyContent:"center",padding:"48px 0" }}>
            <div style={{ width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite" }} />
          </div>
        ) : filtered.length===0 ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"64px 0",background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16 }}>
            <UsersIcon style={{ width:36,height:36,color:"rgba(255,255,255,0.15)",marginBottom:12 }} />
            <p style={{ fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.4)",margin:0 }}>Nenhum revendedor encontrado</p>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {filtered.map((u,i) => {
              const colors = [
                { bg:"linear-gradient(135deg,#2d1b69,#1a0f3e)", accent:"#a78bfa", border:"rgba(167,139,250,0.3)" },
                { bg:"linear-gradient(135deg,#064e2e,#022c1a)", accent:"#34d399", border:"rgba(52,211,153,0.3)" },
                { bg:"linear-gradient(135deg,#164e63,#083344)", accent:"#22d3ee", border:"rgba(34,211,238,0.3)" },
                { bg:"linear-gradient(135deg,#78350f,#3f1f04)", accent:"#fbbf24", border:"rgba(251,191,36,0.3)" },
                { bg:"linear-gradient(135deg,#1e3a8a,#0f1f4e)", accent:"#60a5fa", border:"rgba(96,165,250,0.3)" },
                { bg:"linear-gradient(135deg,#831843,#500724)", accent:"#f472b6", border:"rgba(244,114,182,0.3)" },
              ];
              const c = colors[i % colors.length];
              const initials = (u.full_name||u.name||u.email||"?").substring(0,2).toUpperCase();
              const payPost = u.payment_type==="postpaid";
              return (
                <motion.div key={u.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04,duration:0.3}}
                  style={{ background:"#141414",border:`1px solid ${c.border}`,borderRadius:14,overflow:"hidden",transition:"box-shadow 0.2s,transform 0.2s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 8px 32px rgba(0,0,0,0.4)`; }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
                  {/* Colored bar */}
                  <div style={{ height:4,background:c.bg }} />
                  <div style={{ padding:"12px 14px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
                    {/* Avatar */}
                    <div style={{ width:46,height:46,borderRadius:12,background:c.bg,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:c.accent,flexShrink:0 }}>
                      {initials}
                    </div>
                    {/* Info */}
                    <div style={{ flex:1,minWidth:160 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4 }}>
                        <p style={{ fontSize:14,fontWeight:800,color:"#fff",margin:0 }}>{u.full_name||u.name||'Sem nome'}</p>
                        <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                          background:payPost?"rgba(251,191,36,0.12)":"rgba(52,211,153,0.12)",
                          color:payPost?"#fbbf24":"#34d399",
                          border:`1px solid ${payPost?"rgba(251,191,36,0.25)":"rgba(52,211,153,0.25)"}`}}>
                          {payPost?"Pós-Pago":"Pré-Pago"}
                        </span>
                        {!u.phone&&<span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(248,113,113,0.12)",color:"#f87171",border:"1px solid rgba(248,113,113,0.25)" }}>Sem WhatsApp</span>}
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:11,color:"rgba(255,255,255,0.4)" }}>
                        <span style={{ display:"flex",alignItems:"center",gap:4 }}><Mail style={{ width:11,height:11 }}/>{u.email}</span>
                        {u.phone&&<span style={{ display:"flex",alignItems:"center",gap:4 }}><Phone style={{ width:11,height:11 }}/>{u.phone}</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                      {payPost&&(
                        <button onClick={()=>handleGenerateInvoice(u)} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,background:"rgba(251,191,36,0.1)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.25)",cursor:"pointer" }}>
                          <FileText style={{ width:11,height:11 }}/> Fatura
                        </button>
                      )}
                      <button onClick={()=>{setEditingUser(u);setShowForm(true);}} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,background:"rgba(167,139,250,0.1)",color:"#a78bfa",border:"1px solid rgba(167,139,250,0.2)",cursor:"pointer" }}>
                        <Edit style={{ width:11,height:11 }}/> Editar
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showForm&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{ position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)" }}
              onClick={()=>{setShowForm(false);setEditingUser(null);}}>
              <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
                style={{ width:"100%",maxWidth:640 }} onClick={e=>e.stopPropagation()}>
                <UserForm user={editingUser} currentUser={currentUser}
                  onSuccess={()=>{setShowForm(false);setEditingUser(null);loadData();}}
                  onCancel={()=>{setShowForm(false);setEditingUser(null);}} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}