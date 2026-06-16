import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Phone, User as UserIcon, Mail, Save } from 'lucide-react';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:24 };
const Label = ({children}) => <p style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.4)",margin:"0 0 6px" }}>{children}</p>;
const FieldInput = ({value,onChange,disabled,type,placeholder,required}) => (
  <input type={type||"text"} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} required={required}
    style={{ width:"100%",padding:"10px 14px",background:disabled?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.06)",border:`1px solid ${disabled?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.1)"}`,borderRadius:10,color:disabled?"rgba(255,255,255,0.3)":"#fff",fontSize:13,outline:"none",boxSizing:"border-box",cursor:disabled?"not-allowed":"text" }}
    onFocus={e=>{ if(!disabled) e.target.style.borderColor="rgba(167,139,250,0.5)"; }}
    onBlur={e=>{ if(!disabled) e.target.style.borderColor="rgba(255,255,255,0.1)"; }} />
);

export default function ProfilePage() {
  const [user, setUser]       = useState(null);
  const [formData, setFormData] = useState({ name:'', phone:'' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try { const u=await remoteClient.auth.me(); setUser(u); setFormData({name:u.name||'',phone:u.phone||''}); }
      catch (error) {
        console.warn('[Profile] Falha ao carregar perfil:', error);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.phone?.trim()) { toast({title:"Telefone obrigatório",description:"Cadastre seu WhatsApp para continuar.",variant:"destructive"}); return; }
    setSaving(true);
    try {
      await remoteClient.users.updateMe(formData);
      const u = await remoteClient.auth.me();
      setUser(u);
      toast({ title:"Perfil atualizado ✅" });
    } catch { toast({title:"Erro ao salvar",variant:"destructive"}); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{...S,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={S}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .pf{animation:fadeUp 0.4s ease both}`}</style>
      <div style={{ maxWidth:520,margin:"0 auto",padding:"12px 12px 96px",display:"flex",flexDirection:"column",gap:12 }}>

        {/* Header */}
        <div className="pf" style={{ background:"#141414",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <UserIcon style={{ width:16,height:16,color:"#a78bfa" }} />
          </div>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>Meu Perfil</h1>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.35)",margin:0 }}>Atualize suas informações pessoais</p>
          </div>
        </div>

        {/* Alert sem WhatsApp */}
        {!user?.phone&&user?.role==='user'&&(
          <div style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:14,padding:16,display:"flex",alignItems:"flex-start",gap:12 }}>
            <div style={{ width:30,height:30,borderRadius:8,background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <AlertTriangle style={{ width:13,height:13,color:"#f87171" }} />
            </div>
            <div>
              <p style={{ fontSize:13,fontWeight:700,color:"#f87171",margin:"0 0 4px" }}>WhatsApp obrigatório</p>
              <p style={{ fontSize:12,color:"rgba(255,255,255,0.4)",margin:0 }}>Cadastre seu número para receber notificações e criar pedidos.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="pf" style={CARD}>
          <form onSubmit={handleUpdate} style={{ display:"flex",flexDirection:"column",gap:20 }}>

            <div>
              <Label>Nome *</Label>
              <FieldInput value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} required />
            </div>

            <div>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                <Phone style={{ width:13,height:13,color:"#34d399" }} />
                <span style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.4)" }}>WhatsApp *</span>
                <span style={{ fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:"rgba(248,113,113,0.12)",color:"#f87171",border:"1px solid rgba(248,113,113,0.25)" }}>OBRIGATÓRIO</span>
              </div>
              <FieldInput type="tel" value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} placeholder="(11) 99999-9999" required />
              <p style={{ fontSize:11,color:"rgba(255,255,255,0.3)",margin:"6px 0 0" }}>Usado para notificações de pedidos via WhatsApp.</p>
            </div>

            <div>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                <Mail style={{ width:13,height:13,color:"rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,0.4)" }}>Email</span>
              </div>
              <FieldInput value={user?.email||''} disabled />
              <p style={{ fontSize:11,color:"rgba(255,255,255,0.25)",margin:"6px 0 0" }}>O email não pode ser alterado.</p>
            </div>

            <div style={{ display:"flex",justifyContent:"flex-end",paddingTop:4 }}>
              <button type="submit" disabled={saving} style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"10px 24px",borderRadius:10,fontSize:13,fontWeight:700,background:"#a78bfa",color:"#0a0a0a",border:"none",cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1 }}>
                {saving ? <><div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(0,0,0,0.2)",borderTopColor:"#0a0a0a",animation:"spin 0.7s linear infinite" }} /> Salvando...</> : <><Save style={{ width:14,height:14 }} /> Salvar Alterações</>}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
