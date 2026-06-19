import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Phone, CreditCard } from 'lucide-react';

const J2_ACCENT = "#ff4b12";
const J2_SURFACE = "linear-gradient(145deg,#111516,#0b0e0f)";
const J2_NEU = "10px 10px 22px rgba(0,0,0,0.46), -7px -7px 18px rgba(255,255,255,0.018)";
const J2_SUNKEN = "inset 4px 4px 10px rgba(0,0,0,0.42), inset -3px -3px 8px rgba(255,255,255,0.014)";

export default function UserForm({ user, onSuccess, onCancel, currentUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    phone: '',
    payment_type: 'prepaid',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.full_name || user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        phone: user.phone || '',
        payment_type: user.payment_type || 'prepaid',
        password: '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação do telefone
    if (!formData.phone || formData.phone.trim() === '') {
      setError("Telefone (WhatsApp) é obrigatório.");
      setLoading(false);
      return;
    }

    try {
      if (user) {
        // Editar usuário existente
        await remoteClient.users.update(user.id, {
          name: formData.name,
          phone: formData.phone,
          paymentType: formData.payment_type,
        });
      } else {
        if (!formData.email) {
          setError("Email é obrigatório para novos usuários.");
          setLoading(false);
          return;
        }
        // Criar revendedor via API
        await remoteClient.users.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          paymentType: formData.payment_type,
          password: formData.password,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const F = {
    label: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 },
    input: { background: "#080a0b", border: "0", borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 12px", width: "100%", outline: "none", boxSizing: "border-box", boxShadow: J2_SUNKEN },
    section: { background: "#101314", border: "0", borderRadius: 12, padding: 16, boxShadow: J2_SUNKEN },
    hint: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 5 },
  };

  return (
    <div style={{ background: J2_SURFACE, border: "0", borderRadius: 16, padding: 24, color: "#fff", boxShadow: J2_NEU }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 20px" }}>
        {user ? 'Editar Revendedor' : 'Novo Revendedor'}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}

        <div>
          <label style={F.label}>Nome completo *</label>
          <input style={F.input} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: João Silva" required />
        </div>

        <div>
          <label style={F.label}>Email *</label>
          <input style={{ ...F.input, opacity: user ? 0.5 : 1 }} type="email" value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@exemplo.com" required disabled={!!user} />
          {!user && <p style={F.hint}>Use uma senha inicial e oriente o revendedor a troca-la no primeiro acesso.</p>}
        </div>

        {!user && (
          <div>
            <label style={F.label}>Senha inicial *</label>
            <input style={F.input} type="password" minLength={8} value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimo 8 caracteres" required />
          </div>
        )}

        <div>
          <label style={{ ...F.label, display: "flex", alignItems: "center", gap: 6 }}>
            <Phone style={{ width: 11, height: 11, color: "#ff8a4a" }} /> Telefone / WhatsApp *
          </label>
          <input style={F.input} type="tel" value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="5511999999999 (com DDI)" required />
          <p style={F.hint}>Obrigatório para notificações via WhatsApp.</p>
        </div>

        <div style={F.section}>
          <label style={{ ...F.label, display: "flex", alignItems: "center", gap: 6, color: "#fbbf24" }}>
            <CreditCard style={{ width: 11, height: 11 }} /> Tipo de Pagamento *
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {['prepaid', 'postpaid'].map(type => (
              <button key={type} type="button" onClick={() => setFormData({ ...formData, payment_type: type })}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                  background: formData.payment_type === type ? (type === 'prepaid' ? "rgba(52,211,153,0.16)" : "rgba(255,75,18,0.14)") : "#0b0e0f",
                  color: formData.payment_type === type ? (type === 'prepaid' ? "#ff8a4a" : "#fbbf24") : "rgba(255,255,255,0.4)",
                  outline: "none",
                  boxShadow: formData.payment_type === type ? J2_SUNKEN : J2_NEU,
                }}>
                {type === 'prepaid' ? '✓ Pré-Pago' : '⏱ Pós-Pago'}
              </button>
            ))}
          </div>
          <p style={F.hint}>
            {formData.payment_type === 'prepaid'
              ? 'Revendedor envia comprovante antes da aprovação.'
              : 'Revendedor recebe fatura periódica dos pedidos aprovados.'}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
          <button type="button" onClick={onCancel}
            style={{ padding: "9px 20px", borderRadius: 8, background: "#101314", border: "0", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: J2_NEU }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: "9px 24px", borderRadius: 8, background: loading ? "rgba(255,75,18,0.42)" : `linear-gradient(135deg,${J2_ACCENT},#d93810)`, color: "#fff", fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", border: "none", boxShadow: J2_NEU }}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
