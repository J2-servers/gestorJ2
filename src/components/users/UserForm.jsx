import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Phone, CreditCard } from 'lucide-react';

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
    input: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 12px", width: "100%", outline: "none", boxSizing: "border-box" },
    section: { background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, padding: 16 },
    hint: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 5 },
  };

  return (
    <div style={{ background: "#111", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 16, padding: 24, color: "#fff" }}>
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
            <input style={F.input} type="password" minLength={6} value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimo 6 caracteres" required />
          </div>
        )}

        <div>
          <label style={{ ...F.label, display: "flex", alignItems: "center", gap: 6 }}>
            <Phone style={{ width: 11, height: 11, color: "#34d399" }} /> Telefone / WhatsApp *
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
                  background: formData.payment_type === type ? (type === 'prepaid' ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.2)") : "rgba(255,255,255,0.04)",
                  color: formData.payment_type === type ? (type === 'prepaid' ? "#34d399" : "#fbbf24") : "rgba(255,255,255,0.4)",
                  outline: formData.payment_type === type ? `1px solid ${type === 'prepaid' ? "rgba(52,211,153,0.4)" : "rgba(251,191,36,0.4)"}` : "1px solid rgba(255,255,255,0.06)",
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
            style={{ padding: "9px 20px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: "9px 24px", borderRadius: 8, background: loading ? "rgba(167,139,250,0.4)" : "#a78bfa", color: "#0a0a0a", fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", border: "none" }}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
