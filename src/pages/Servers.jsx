import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Server, ExternalLink, CheckCircle, Plus, Edit, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const S = {
  page:  { minHeight:"100vh", background:"#0a0a0a", padding:"1.25rem", paddingBottom:"6rem" },
  input: { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:8, color:"#fff", fontSize:"0.82rem", padding:"9px 12px", width:"100%", outline:"none", boxSizing:"border-box" },
  label: { fontSize:"0.7rem", fontWeight:600, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:4 },
};

// ✅ Critério unificado: servidor é global se owner_id for admin_global, admin, vazio ou nulo
// Fallback absoluto: se nenhum servidor passar, mostra TODOS
const filterGlobalServers = (srvs) => {
  const global = srvs.filter(s =>
    !s.owner_id ||
    s.owner_id === '' ||
    s.owner_id === 'admin_global' ||
    s.owner_id === 'admin'
  );
  return global.length > 0 ? global : srvs;
};

export default function Servers() {
  const [user, setUser]               = useState(null);
  const [servers, setServers]         = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadErr, setLoadErr]         = useState('');
  const [selected, setSelected]       = useState(null);
  const [editReg, setEditReg]         = useState(null);
  const [form, setForm]               = useState({ login: '', value_per_credit: '' });
  const [saving, setSaving]           = useState(false);
  const [saveErr, setSaveErr]         = useState('');
  const [saveOk, setSaveOk]           = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const me = await remoteClient.auth.me();
      setUser(me);
      const [srvs, myRegs] = await Promise.all([
        remoteClient.servers.list(),
        remoteClient.resellerServers.list().catch(() => []),
      ]);
      setServers(srvs || []);
      setMyRegistrations(Array.isArray(myRegs) ? myRegs : []);
    } catch (err) {
      setLoadErr('Erro ao carregar servidores. Tente novamente.');
      console.error('[Servers] loadAll error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openRegister = (srv) => {
    const existing = myRegistrations.find(r => r.server_id === srv.id);
    setSelected(srv);
    setEditReg(existing || null);
    setForm({
      login: existing?.login || '',
      value_per_credit: existing?.value_per_credit != null ? String(existing.value_per_credit) : '',
    });
    setSaveErr('');
    setSaveOk(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveErr('');
    setSaveOk(false);

    if (!form.login.trim()) { setSaveErr('Login obrigatório.'); return; }

    const val = parseFloat(form.value_per_credit);
    if (!editReg && (isNaN(val) || val <= 0)) {
      setSaveErr('Informe um valor por crédito válido (ex: 0.05).'); return;
    }

    if (!user?.id) { setSaveErr('Usuário não autenticado. Recarregue a página.'); return; }
    if (!selected?.id) { setSaveErr('Servidor inválido. Feche e tente novamente.'); return; }

    setSaving(true);
    try {
      const data = {
        reseller_id:     user.id,
        server_id:       selected.id,
        server_name:     selected.name,
        login:           form.login.trim(),
        value_per_credit: editReg ? editReg.value_per_credit : val,
      };

      const payload = editReg
        ? { valuePerCredit: editReg.value_per_credit }
        : { serverId: selected.id, login: data.login, valuePerCredit: val, resellerId: user.id };
      if (editReg) {
        await remoteClient.resellerServers.update(editReg.id, payload);
      } else {
        await remoteClient.resellerServers.create(payload);
      }

      setSaveOk(true);
      setTimeout(() => {
        setSelected(null);
        setSaveOk(false);
        loadAll();
      }, 800);
    } catch (err) {
      setSaveErr(err?.message || 'Erro ao salvar. Tente novamente.');
      console.error('[Servers] handleSave error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:32,height:32,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:"1.25rem" }}>
        <h1 style={{ fontSize:"1.35rem", fontWeight:800, background:"linear-gradient(135deg,#a78bfa,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          Servidores Disponíveis
        </h1>
        <p style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.35)", margin:"4px 0 0" }}>
          Clique em um servidor para se cadastrar e definir seu preço de venda
        </p>
      </div>

      {/* Erro de carregamento */}
      {loadErr && (
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
          <AlertTriangle style={{ width:14,height:14,color:"#f87171",flexShrink:0 }} />
          <span style={{ fontSize:"0.8rem",color:"#f87171",flex:1 }}>{loadErr}</span>
          <button onClick={loadAll} style={{ padding:"4px 12px",borderRadius:6,background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",color:"#f87171",fontSize:"0.72rem",fontWeight:700,cursor:"pointer" }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:"1.25rem" }}>
        <div style={{ background:"#141414",border:"1px solid rgba(167,139,250,0.18)",borderRadius:10,padding:"12px 14px" }}>
          <p style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.35)",fontWeight:600,textTransform:"uppercase",margin:"0 0 2px" }}>Disponíveis</p>
          <p style={{ fontSize:"1.5rem",fontWeight:800,color:"#fff",margin:0 }}>{servers.length}</p>
        </div>
        <div style={{ background:"#141414",border:"1px solid rgba(52,211,153,0.25)",borderRadius:10,padding:"12px 14px" }}>
          <p style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.35)",fontWeight:600,textTransform:"uppercase",margin:"0 0 2px" }}>Meus Cadastros</p>
          <p style={{ fontSize:"1.5rem",fontWeight:800,color:"#34d399",margin:0 }}>{myRegistrations.length}</p>
        </div>
      </div>

      {/* Grid */}
      {servers.length === 0 ? (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"3rem 0",background:"#141414",border:"1px dashed rgba(167,139,250,0.2)",borderRadius:12 }}>
          <Server style={{ width:32,height:32,color:"rgba(167,139,250,0.25)",marginBottom:10 }} />
          <p style={{ fontSize:"0.82rem",color:"rgba(255,255,255,0.3)" }}>Nenhum servidor disponível no momento.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
          {servers.map(srv => {
            const reg = myRegistrations.find(r => r.server_id === srv.id);
            return (
              <div key={srv.id}
                onClick={() => openRegister(srv)}
                style={{ background:"#141414", borderRadius:12, padding:"1rem", border: reg ? "1px solid rgba(52,211,153,0.4)" : "1px solid rgba(167,139,250,0.18)", transition:"all 0.2s", cursor:"pointer", position:"relative" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=reg?"rgba(52,211,153,0.7)":"rgba(167,139,250,0.5)";e.currentTarget.style.boxShadow=`0 0 20px ${reg?"rgba(52,211,153,0.1)":"rgba(167,139,250,0.1)"}`}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=reg?"rgba(52,211,153,0.4)":"rgba(167,139,250,0.18)";e.currentTarget.style.boxShadow="none"}}>

                {reg && (
                  <div style={{ position:"absolute",top:10,right:10,display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:20,background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.3)" }}>
                    <CheckCircle style={{ width:10,height:10,color:"#34d399" }} />
                    <span style={{ fontSize:"0.62rem",fontWeight:700,color:"#34d399" }}>Cadastrado</span>
                  </div>
                )}

                <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:reg?"rgba(52,211,153,0.12)":"rgba(167,139,250,0.12)",border:`1px solid ${reg?"rgba(52,211,153,0.3)":"rgba(167,139,250,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Server style={{ width:17,height:17,color:reg?"#34d399":"#a78bfa" }} />
                  </div>
                  <div style={{ flex:1,minWidth:0,paddingRight:reg?80:0 }}>
                    <h3 style={{ fontSize:"0.9rem",fontWeight:700,color:"#fff",margin:0 }}>{srv.name}</h3>
                    <p style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.35)",margin:0 }}>Servidor global</p>
                  </div>
                </div>

                {srv.panel_link && (
                  <div style={{ background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 12px",marginBottom:10 }}>
                    <p style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.35)",margin:0,textTransform:"uppercase",fontWeight:600 }}>Painel disponível</p>
                  </div>
                )}

                {reg && (
                  <div style={{ background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:8,padding:"8px 12px",marginBottom:10 }}>
                    <p style={{ fontSize:"0.68rem",color:"rgba(52,211,153,0.7)",margin:"0 0 2px",textTransform:"uppercase",fontWeight:600 }}>Meu preço de venda</p>
                    <p style={{ fontSize:"0.95rem",fontWeight:800,color:"#34d399",margin:0 }}>R$ {(reg.value_per_credit||0).toFixed(2)}/crédito</p>
                    <p style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.35)",margin:"2px 0 0" }}>Login: {reg.login}</p>
                  </div>
                )}

                <div style={{ display:"flex", gap:6, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.06)", alignItems:"center" }}>
                  <button style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px",borderRadius:8,background:reg?"rgba(52,211,153,0.1)":"rgba(167,139,250,0.12)",border:`1px solid ${reg?"rgba(52,211,153,0.3)":"rgba(167,139,250,0.25)"}`,color:reg?"#34d399":"#a78bfa",fontSize:"0.75rem",fontWeight:700,cursor:"pointer" }}>
                    {reg ? <><Edit style={{ width:11,height:11 }} /> Editar Cadastro</> : <><Plus style={{ width:11,height:11 }} /> Cadastrar-se</>}
                  </button>
                  {srv.panel_link && (
                    <a href={srv.panel_link} target="_blank" rel="noopener noreferrer"
                      onClick={e=>e.stopPropagation()}
                      style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",textDecoration:"none" }}>
                      <ExternalLink style={{ width:12,height:12 }} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => { setSelected(null); setSaveErr(''); setSaveOk(false); }}>
          <DialogContent style={{ background:"#111", border:"1px solid rgba(167,139,250,0.3)", maxWidth:420 }}>
            <DialogHeader>
              <DialogTitle style={{ color:"#fff", fontSize:"1rem" }}>
                {editReg ? 'Editar Cadastro' : 'Cadastrar no Servidor'}
              </DialogTitle>
              <DialogDescription style={{ color:"rgba(255,255,255,0.35)", fontSize:"0.75rem" }}>
                Defina seu login e preço de venda para este servidor.
              </DialogDescription>
            </DialogHeader>
            <div style={{ paddingTop:4 }}>
              <div style={{ background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16 }}>
                <p style={{ fontSize:"0.78rem",fontWeight:700,color:"#a78bfa",margin:0 }}>{selected.name}</p>
                <p style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.35)",margin:"2px 0 0" }}>Defina seu login e preço de venda</p>
              </div>

              <form onSubmit={handleSave} style={{ display:"flex",flexDirection:"column",gap:14 }}>

                {/* Erro de salvamento */}
                {saveErr && (
                  <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"8px 12px" }}>
                    <AlertTriangle style={{ width:13,height:13,color:"#f87171",flexShrink:0 }} />
                    <span style={{ fontSize:"0.78rem",color:"#f87171" }}>{saveErr}</span>
                  </div>
                )}

                {/* Sucesso */}
                {saveOk && (
                  <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:8,padding:"8px 12px" }}>
                    <CheckCircle style={{ width:13,height:13,color:"#34d399",flexShrink:0 }} />
                    <span style={{ fontSize:"0.78rem",color:"#34d399",fontWeight:700 }}>Salvo com sucesso!</span>
                  </div>
                )}

                <div>
                  <label style={S.label}>Seu Login neste servidor *</label>
                  <input style={S.input} value={form.login}
                    onChange={e=>setForm({...form,login:e.target.value})}
                    placeholder="seu_login_painel" required />
                </div>

                {!editReg ? (
                  <div>
                    <label style={S.label}>Valor que você cobra por crédito (R$) *</label>
                    <input style={S.input} type="number" step="0.001" min="0.001"
                      value={form.value_per_credit}
                      onChange={e=>setForm({...form,value_per_credit:e.target.value})}
                      placeholder="Ex: 0.050" required />
                    <p style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.25)",margin:"4px 0 0" }}>
                      Este é o preço que você cobra aos seus clientes.
                    </p>
                  </div>
                ) : (
                  <div style={{ background:"rgba(255,193,7,0.07)", border:"1px solid rgba(255,193,7,0.2)", borderRadius:8, padding:"10px 14px" }}>
                    <p style={{ fontSize:"0.68rem", color:"rgba(255,193,7,0.7)", fontWeight:700, margin:"0 0 2px", textTransform:"uppercase" }}>Preço por crédito</p>
                    <p style={{ fontSize:"0.88rem", fontWeight:800, color:"#fbbf24", margin:0 }}>R$ {(editReg.value_per_credit||0).toFixed(3)}</p>
                    <p style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.35)", margin:"2px 0 0" }}>Somente o administrador pode alterar este valor</p>
                  </div>
                )}

                <div style={{ display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4 }}>
                  <button type="button" onClick={()=>setSelected(null)}
                    style={{ padding:"8px 16px",borderRadius:8,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.4)",fontSize:"0.8rem",cursor:"pointer" }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving || saveOk}
                    style={{ padding:"8px 20px",borderRadius:8,background: saveOk ? "#34d399" : "#a78bfa",color:"#0a0a0a",fontWeight:700,fontSize:"0.8rem",cursor:saving?"not-allowed":"pointer",border:"none",opacity:saving?0.7:1,transition:"background 0.3s" }}>
                    {saving ? 'Salvando...' : saveOk ? 'Salvo!' : editReg ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}