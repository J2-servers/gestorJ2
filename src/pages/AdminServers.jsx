import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Server, Plus, Edit, Trash2, ExternalLink, Search, Users, RefreshCw, X, DollarSign, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const S = {
  page:  { minHeight:"100vh", background:"#0a0a0a", padding:"1.25rem", paddingBottom:"6rem" },
  card:  { background:"#141414", border:"1px solid rgba(167,139,250,0.18)", borderRadius:12, padding:"1rem" },
  label: { fontSize:"0.7rem", fontWeight:600, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:4 },
  input: { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:8, color:"#fff", fontSize:"0.82rem", padding:"9px 12px", width:"100%", outline:"none", boxSizing:"border-box" },
};

const EMPTY = { name:"", panel_link:"", cost_per_credit:"" };

// ✅ Critério unificado de servidor global — mesma lógica do pages/Servers
// Fallback absoluto: se nenhum passar no filtro, retorna todos
const filterGlobalServers = (srvs) => {
  const global = srvs.filter(s =>
    !s.owner_id ||
    s.owner_id === '' ||
    s.owner_id === 'admin_global' ||
    s.owner_id === 'admin'
  );
  return global.length > 0 ? global : srvs;
};

export default function AdminServers() {
  const [user, setUser]               = useState(null);
  const [servers, setServers]         = useState([]);
  const [resellerServers, setResellerServers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [formErr, setFormErr]         = useState('');
  const [detailServer, setDetailServer] = useState(null); // { srv }
  const [editingPrice, setEditingPrice] = useState(null); // { reg, newPrice }
  const [savingPrice, setSavingPrice]   = useState(false);
  const [suppliers, setSuppliers]       = useState([]);
  const [supForm, setSupForm]           = useState({ name:'', panelLogin:'', panelLink:'', costPerCredit:'' });
  const [savingSup, setSavingSup]       = useState(false);

  useEffect(() => {
    remoteClient.auth.me().then(u => { setUser(u); loadAll(); }).catch(() => setLoading(false));
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [srvs, rs, sups] = await Promise.all([
        remoteClient.servers.list(),
        remoteClient.resellerServers.list().catch(() => []),
        remoteClient.suppliers.list().catch(() => []),
      ]);
      setServers(srvs || []);
      setResellerServers(rs || []);
      setSuppliers(sups || []);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'dev';

  if (!isAdmin) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:"rgba(255,255,255,0.3)" }}>Acesso negado.</p>
    </div>
  );

  const openNew = () => { setEditing(null); setForm(EMPTY); setFormErr(''); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name||'', panel_link: s.panel_link||'', cost_per_credit: s.cost_per_credit||'' }); setFormErr(''); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.name.trim()) { setFormErr('Nome obrigatório.'); return; }
    const cost = parseFloat(form.cost_per_credit);
    if (isNaN(cost) || cost < 0) { setFormErr('Preço inválido.'); return; }
    setSaving(true);
    const data = {
      name: form.name.trim(),
      panel_link: form.panel_link.trim(),
      cost_per_credit: cost,
      owner_id: 'admin_global',
      value_per_credit: cost, // admin também tem value = cost
    };
    if (editing) await remoteClient.servers.update(editing.id, data);
    else await remoteClient.servers.create(data);
    setSaving(false);
    setShowForm(false);
    loadAll();
  };

  const handleDelete = async (id) => {
    await remoteClient.servers.remove(id);
    loadAll();
  };

  const handleSavePrice = async () => {
    const val = parseFloat(editingPrice.newPrice);
    if (isNaN(val) || val <= 0) return;
    setSavingPrice(true);
    await remoteClient.resellerServers.update(editingPrice.reg.id, { valuePerCredit: val });
    setSavingPrice(false);
    setEditingPrice(null);
    await loadAll();
  };

  // ── Fornecedores ──
  const addSupplier = async (serverId) => {
    const cost = parseFloat(supForm.costPerCredit);
    if (!supForm.name.trim() || !supForm.panelLogin.trim() || isNaN(cost) || cost < 0) return;
    setSavingSup(true);
    try {
      await remoteClient.suppliers.create({
        serverId,
        name: supForm.name.trim(),
        panelLogin: supForm.panelLogin.trim(),
        panelLink: supForm.panelLink.trim() || undefined,
        costPerCredit: cost,
      });
      setSupForm({ name:'', panelLogin:'', panelLink:'', costPerCredit:'' });
      await loadAll();
    } finally { setSavingSup(false); }
  };

  const removeSupplier = async (id) => {
    await remoteClient.suppliers.remove(id);
    await loadAll();
  };

  const assignSupplier = async (regId, supplierId) => {
    await remoteClient.resellerServers.update(regId, { supplierId: supplierId || null });
    await loadAll();
  };

  const filtered = servers.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));

  // Stats
  const totalResellers = new Set(resellerServers.map(r => r.reseller_id)).size;

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:"1.25rem" }}>
        <div>
          <h1 style={{ fontSize:"1.35rem", fontWeight:800, background:"linear-gradient(135deg,#a78bfa,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
            Gerenciar Servidores
          </h1>
          <p style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.35)", margin:"4px 0 0" }}>
            Crie os servidores disponíveis para os revendedores
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={loadAll} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",fontSize:"0.75rem",cursor:"pointer" }}>
            <RefreshCw style={{ width:12,height:12 }} /> Atualizar
          </button>
          <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"#a78bfa",color:"#0a0a0a",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",border:"none" }}>
            <Plus style={{ width:13,height:13 }} /> Novo Servidor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:"1.25rem" }}>
        {[
          { label:"Servidores", value:servers.length, color:"#a78bfa", icon:Server },
          { label:"Cadastros de Resellers", value:resellerServers.length, color:"#22d3ee", icon:Users },
          { label:"Resellers Únicos", value:totalResellers, color:"#34d399", icon:Users },
        ].map(m => (
          <div key={m.label} style={{ background:"#141414", border:`1px solid ${m.color}22`, borderRadius:10, padding:"12px 14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <m.icon style={{ width:13,height:13,color:m.color }} />
              <span style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.35)",fontWeight:600,textTransform:"uppercase" }}>{m.label}</span>
            </div>
            <p style={{ fontSize:"1.5rem",fontWeight:800,color:"#fff",margin:0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"1rem" }}>
        <Search style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"rgba(255,255,255,0.25)" }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar servidor..."
          style={{ ...S.input, paddingLeft:36 }} />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"3rem 0" }}>
          <div style={{ width:32,height:32,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 0.7s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"3rem 0",background:"#141414",border:"1px dashed rgba(167,139,250,0.2)",borderRadius:12 }}>
          <Server style={{ width:32,height:32,color:"rgba(167,139,250,0.25)",marginBottom:10 }} />
          <p style={{ fontSize:"0.82rem",color:"rgba(255,255,255,0.3)" }}>Nenhum servidor. Clique em "Novo Servidor" para criar.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
          {filtered.map(srv => {
            const registrations = resellerServers.filter(r => r.server_id === srv.id);
            return (
              <ServerCard
                key={srv.id}
                server={srv}
                registrations={registrations}
                onEdit={openEdit}
                onDelete={handleDelete}
                onDetail={() => setDetailServer({ srv })}
              />
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showForm && (
        <Dialog open onOpenChange={() => setShowForm(false)}>
          <DialogContent style={{ background:"#111", border:"1px solid rgba(167,139,250,0.3)", maxWidth:440 }}>
            <DialogHeader>
              <DialogTitle style={{ color:"#fff", fontSize:"1rem" }}>
                {editing ? 'Editar Servidor' : 'Novo Servidor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:14, paddingTop:8 }}>
              {formErr && (
                <div style={{ background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"8px 12px",fontSize:"0.78rem",color:"#f87171" }}>{formErr}</div>
              )}
              <div>
                <label style={S.label}>Nome do Servidor *</label>
                <input style={S.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex: Servidor Premium BR" required />
              </div>
              <div>
                <label style={S.label}>Link do Painel</label>
                <input style={S.input} value={form.panel_link} onChange={e=>setForm({...form,panel_link:e.target.value})} placeholder="https://painel.exemplo.com" />
              </div>
              <div>
                <label style={S.label}>Preço pago pelo Admin (R$/crédito) *</label>
                <input style={S.input} type="number" step="0.001" min="0" value={form.cost_per_credit} onChange={e=>setForm({...form,cost_per_credit:e.target.value})} placeholder="Ex: 0.030" required />
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingTop:4 }}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{ padding:"8px 16px",borderRadius:8,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.4)",fontSize:"0.8rem",cursor:"pointer" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding:"8px 20px",borderRadius:8,background:"#a78bfa",color:"#0a0a0a",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",border:"none",opacity:saving?0.6:1 }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog */}
      {detailServer && (() => {
        const detSrv = servers.find(s => s.id === detailServer.srv.id) || detailServer.srv;
        const detRegs = resellerServers.filter(r => r.server_id === detSrv.id);
        const detSups = suppliers.filter(s => s.server_id === detSrv.id);
        const supName = (id) => detSups.find(s => s.id === id)?.name;
        return (
        <Dialog open onOpenChange={() => { setDetailServer(null); setEditingPrice(null); }}>
          <DialogContent style={{ background:"#111", border:"1px solid rgba(167,139,250,0.3)", maxWidth:620, maxHeight:"88vh", overflowY:"auto" }}>
            <DialogHeader>
              <DialogTitle style={{ color:"#fff", fontSize:"1rem" }}>
                {detSrv.name}
              </DialogTitle>
            </DialogHeader>
            <div style={{ paddingTop:8 }}>

              {/* ── Fornecedores ── */}
              <p style={{ fontSize:"0.72rem",fontWeight:700,color:"#fbbf24",textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 8px" }}>Fornecedores deste servidor</p>
              <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:10 }}>
                {detSups.length === 0 && <p style={{ fontSize:"0.75rem",color:"rgba(255,255,255,0.3)",margin:0 }}>Nenhum fornecedor. Adicione abaixo (login do painel + custo pago).</p>}
                {detSups.map(sp => (
                  <div key={sp.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:8 }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:"0.78rem",fontWeight:700,color:"#fff",margin:0 }}>{sp.name}</p>
                      <p style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.4)",margin:0 }}>Login painel: {sp.panel_login} • Custo: R$ {Number(sp.cost_per_credit).toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeSupplier(sp.id)} style={{ padding:"4px 8px",borderRadius:6,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",color:"#f87171",fontSize:"0.65rem",cursor:"pointer" }}>Remover</button>
                  </div>
                ))}
              </div>
              {/* add supplier */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6 }}>
                <input placeholder="Nome do fornecedor" value={supForm.name} onChange={e=>setSupForm({...supForm,name:e.target.value})} style={{ ...S.input, fontSize:"0.75rem", padding:"7px 10px" }} />
                <input placeholder="Login do admin no painel" value={supForm.panelLogin} onChange={e=>setSupForm({...supForm,panelLogin:e.target.value})} style={{ ...S.input, fontSize:"0.75rem", padding:"7px 10px" }} />
                <input placeholder="Link do painel (opcional)" value={supForm.panelLink} onChange={e=>setSupForm({...supForm,panelLink:e.target.value})} style={{ ...S.input, fontSize:"0.75rem", padding:"7px 10px" }} />
                <input placeholder="Custo pago (R$/créd)" type="number" step="0.001" min="0" value={supForm.costPerCredit} onChange={e=>setSupForm({...supForm,costPerCredit:e.target.value})} style={{ ...S.input, fontSize:"0.75rem", padding:"7px 10px" }} />
              </div>
              <button onClick={() => addSupplier(detSrv.id)} disabled={savingSup}
                style={{ width:"100%",padding:"7px",borderRadius:7,background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.3)",color:"#fbbf24",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",marginBottom:18,opacity:savingSup?0.6:1 }}>
                + Adicionar fornecedor
              </button>

              {/* ── Resellers ── */}
              <p style={{ fontSize:"0.72rem",fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 8px" }}>Revendedores cadastrados ({detRegs.length})</p>
              {detRegs.length === 0 ? (
                <p style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",padding:"1rem 0",fontSize:"0.82rem" }}>Nenhum reseller cadastrado ainda.</p>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:300,overflowY:"auto" }}>
                  {detRegs.map((r,i) => (
                    <div key={r.id} style={{ padding:"10px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                        <div style={{ width:26,height:26,borderRadius:7,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#a78bfa",flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ fontSize:"0.8rem",fontWeight:700,color:"#fff",margin:0 }}>{r.reseller?.name || 'Revendedor'} — login: {r.login}</p>
                          <p style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.35)",margin:0 }}>{r.reseller?.email || r.reseller_id}</p>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0 }}>
                          {editingPrice?.reg.id === r.id ? (
                            <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                              <input autoFocus type="number" step="0.01" min="0" value={editingPrice.newPrice}
                                onChange={e => setEditingPrice(prev => ({ ...prev, newPrice: e.target.value }))}
                                style={{ width:80,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(167,139,250,0.4)",borderRadius:6,color:"#fff",fontSize:"0.75rem",padding:"4px 8px",outline:"none",boxSizing:"border-box" }} />
                              <button onClick={handleSavePrice} disabled={savingPrice} style={{ padding:"4px 8px",borderRadius:6,background:"#a78bfa",color:"#0a0a0a",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",border:"none" }}>OK</button>
                              <button onClick={() => setEditingPrice(null)} style={{ padding:"4px 8px",borderRadius:6,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.4)",fontSize:"0.7rem",cursor:"pointer" }}>✕</button>
                            </div>
                          ) : (
                            <>
                              <p style={{ fontSize:"0.75rem",fontWeight:700,color:"#22d3ee",margin:0 }}>R$ {r.value_per_credit?.toFixed(2)}/créd</p>
                              <button onClick={() => setEditingPrice({ reg: r, newPrice: r.value_per_credit || '' })}
                                style={{ padding:"2px 8px",borderRadius:5,background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.25)",color:"#a78bfa",fontSize:"0.62rem",fontWeight:600,cursor:"pointer",marginTop:2 }}>Editar Preço</button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* vinculo fornecedor (oculto ao reseller) */}
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize:"0.68rem",color:"rgba(255,255,255,0.4)",fontWeight:600,flexShrink:0 }}>Fornecedor (oculto):</span>
                        <select value={r.supplier_id || ''} onChange={e => assignSupplier(r.id, e.target.value)}
                          style={{ flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:6,color:"#fff",fontSize:"0.72rem",padding:"5px 8px",outline:"none" }}>
                          <option value="" style={{ background:"#111" }}>— não vinculado —</option>
                          {detSups.map(sp => <option key={sp.id} value={sp.id} style={{ background:"#111" }}>{sp.name} ({sp.panel_login})</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        );
      })()}
    </div>
  );
}

function ServerCard({ server, registrations, onEdit, onDelete, onDetail }) {
  return (
    <div style={{ background:"#141414", borderRadius:12, padding:"1rem", border:"1px solid rgba(167,139,250,0.18)", transition:"border-color 0.2s,box-shadow 0.2s", cursor:"pointer" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(167,139,250,0.45)";e.currentTarget.style.boxShadow="0 0 18px rgba(167,139,250,0.1)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(167,139,250,0.18)";e.currentTarget.style.boxShadow="none";}}>

      <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
        <div style={{ width:36,height:36,borderRadius:9,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <Server style={{ width:16,height:16,color:"#a78bfa" }} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <h3 style={{ fontSize:"0.88rem",fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{server.name}</h3>
          <span style={{ fontSize:"0.65rem",color:"rgba(255,255,255,0.35)" }}>Servidor Global</span>
        </div>
      </div>

      {/* Prices */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
        <div style={{ background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:8,padding:"6px 10px" }}>
          <span style={{ fontSize:"0.62rem",color:"#fbbf24",fontWeight:600,display:"block" }}>Custo Admin</span>
          <span style={{ fontSize:"0.88rem",fontWeight:800,color:"#fbbf24" }}>R$ {server.cost_per_credit?.toFixed(2)}</span>
        </div>
        <div style={{ background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.18)",borderRadius:8,padding:"6px 10px" }}>
          <span style={{ fontSize:"0.62rem",color:"#a78bfa",fontWeight:600,display:"block" }}>Resellers</span>
          <span style={{ fontSize:"0.88rem",fontWeight:800,color:"#a78bfa" }}>{registrations.length} cadastrado{registrations.length!==1?'s':''}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:6, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onDetail}
          style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px",borderRadius:7,background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.2)",color:"#22d3ee",fontSize:"0.7rem",fontWeight:600,cursor:"pointer" }}>
          <Eye style={{ width:11,height:11 }} /> Ver Resellers
        </button>
        {server.panel_link && (
          <a href={server.panel_link} target="_blank" rel="noopener noreferrer"
            onClick={e=>e.stopPropagation()}
            style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 10px",borderRadius:7,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",textDecoration:"none",color:"rgba(255,255,255,0.4)",fontSize:"0.7rem",cursor:"pointer" }}>
            <ExternalLink style={{ width:11,height:11 }} />
          </a>
        )}
        <button onClick={()=>onEdit(server)}
          style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 10px",borderRadius:7,background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",color:"#a78bfa",cursor:"pointer" }}>
          <Edit style={{ width:11,height:11 }} />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button onClick={e=>e.stopPropagation()}
              style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:"6px 10px",borderRadius:7,background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",color:"#f87171",cursor:"pointer" }}>
              <Trash2 style={{ width:11,height:11 }} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent style={{ background:"#141414",border:"1px solid rgba(167,139,250,0.25)" }}>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color:"#fff" }}>Excluir "{server.name}"?</AlertDialogTitle>
              <AlertDialogDescription style={{ color:"rgba(255,255,255,0.4)" }}>
                Isso removerá o servidor. Pedidos existentes não serão afetados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.5)" }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={()=>onDelete(server.id)} style={{ background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",color:"#f87171" }}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}