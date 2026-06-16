import React, { useState } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Plus, Trash2, Key, CheckCircle } from 'lucide-react';

const keyTypes = { cpf:'CPF', cnpj:'CNPJ', email:'Email', phone:'Telefone', random:'Chave Aleatória' };

const inputStyle = {
  background:"rgba(255,255,255,0.07)",
  border:"1px solid rgba(255,255,255,0.18)",
  borderRadius:8, color:"#ffffff",
  fontSize:13, padding:"9px 12px",
  width:"100%", outline:"none",
  fontFamily:"inherit",
};

const Btn = ({ children, onClick, disabled, style={} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:8,
      fontSize:13, fontWeight:700, cursor:disabled?"not-allowed":"pointer", border:"none",
      opacity:disabled?0.5:1, transition:"all 0.15s", fontFamily:"inherit", ...style }}>
    {children}
  </button>
);

export default function PixForm({ settings, onUpdate }) {
  const [pixKeys, setPixKeys] = useState(settings?.pix_keys || []);
  const [newKey, setNewKey]   = useState({ type:'', key_value:'', bank:'', is_active:true });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddKey = () => {
    if (!newKey.type || !newKey.key_value || !newKey.bank) {
      alert('Preencha todos os campos: Tipo, Valor e Banco.');
      return;
    }
    setPixKeys([...pixKeys, { ...newKey, id: Date.now() }]);
    setNewKey({ type:'', key_value:'', bank:'', is_active:true });
  };

  const handleRemoveKey = (index) => setPixKeys(pixKeys.filter((_, i) => i !== index));

  const handleToggleActive = (index) => {
    setPixKeys(pixKeys.map((k, i) => i === index ? { ...k, is_active: !k.is_active } : k));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await remoteClient.settings.update({ pix_keys: pixKeys });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Success banner */}
      {success && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
          background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.35)",
          borderRadius:10, color:"#34d399", fontSize:13, fontWeight:700 }}>
          <CheckCircle style={{ width:15, height:15 }} />
          Chaves PIX salvas com sucesso!
        </div>
      )}

      {/* Header */}
      <div>
        <h3 style={{ fontSize:16, fontWeight:800, color:"#ffffff", margin:"0 0 4px" }}>Chaves PIX</h3>
        <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", margin:0 }}>Gerencie as chaves PIX disponíveis para recebimento.</p>
      </div>

      {/* Lista de chaves */}
      {pixKeys.length === 0 && (
        <div style={{ padding:"24px", textAlign:"center", background:"rgba(255,255,255,0.03)",
          border:"1px dashed rgba(255,255,255,0.15)", borderRadius:10, color:"rgba(255,255,255,0.35)", fontSize:13 }}>
          Nenhuma chave PIX cadastrada.
        </div>
      )}

      {pixKeys.map((key, index) => (
        <div key={index} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:12, padding:"12px 16px",
          background: key.is_active ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${key.is_active ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
          borderRadius:10, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:9,
              background: key.is_active ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.07)",
              border:`1px solid ${key.is_active ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Key style={{ width:15, height:15, color: key.is_active ? "#34d399" : "rgba(255,255,255,0.4)" }} />
            </div>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#ffffff" }}>
                {keyTypes[key.type] || key.type} — {key.bank}
              </p>
              <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.55)" }}>{key.key_value}</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={() => handleToggleActive(index)} style={{
              background: key.is_active ? "rgba(251,191,36,0.12)" : "rgba(52,211,153,0.12)",
              color: key.is_active ? "#fbbf24" : "#34d399",
              border: `1px solid ${key.is_active ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`,
              padding:"6px 12px", fontSize:12
            }}>
              {key.is_active ? 'Desativar' : 'Ativar'}
            </Btn>
            <Btn onClick={() => handleRemoveKey(index)} style={{
              background:"rgba(248,113,113,0.12)", color:"#f87171",
              border:"1px solid rgba(248,113,113,0.3)", padding:"6px 10px"
            }}>
              <Trash2 style={{ width:13, height:13 }} />
            </Btn>
          </div>
        </div>
      ))}

      {/* Adicionar nova chave */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:16, display:"flex", flexDirection:"column", gap:12 }}>
        <h4 style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)", margin:0 }}>Adicionar Nova Chave PIX</h4>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10 }}>
          {/* Tipo de chave */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", display:"block", marginBottom:5 }}>Tipo de chave</label>
            <select
              value={newKey.type}
              onChange={e => setNewKey({ ...newKey, type: e.target.value })}
              style={{ ...inputStyle }}
            >
              <option value="" disabled style={{ background:"#1f1f1f" }}>Selecione</option>
              {Object.entries(keyTypes).map(([v, l]) => (
                <option key={v} value={v} style={{ background:"#1f1f1f", color:"#fff" }}>{l}</option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", display:"block", marginBottom:5 }}>Valor da chave PIX</label>
            <input
              placeholder="ex: 00000000000"
              value={newKey.key_value}
              onChange={e => setNewKey({ ...newKey, key_value: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Banco */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", display:"block", marginBottom:5 }}>Nome do banco</label>
            <input
              placeholder="ex: Nubank"
              value={newKey.bank}
              onChange={e => setNewKey({ ...newKey, bank: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <Btn onClick={handleAddKey} style={{ background:"rgba(167,139,250,0.12)", color:"#a78bfa", border:"1px solid rgba(167,139,250,0.3)" }}>
            <Plus style={{ width:14, height:14 }} /> Adicionar Chave
          </Btn>
          <Btn onClick={handleSave} disabled={loading} style={{ background:"#f97316", color:"#fff", fontWeight:800 }}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
