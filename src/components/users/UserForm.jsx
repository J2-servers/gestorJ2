import React, { useEffect, useState } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { CreditCard, LockKeyhole, Phone, ShieldCheck, UserCog } from 'lucide-react';

const J2_ACCENT = '#ff4b12';
const J2_SURFACE = 'linear-gradient(145deg,#111516,#0b0e0f)';
const J2_NEU = '10px 10px 22px rgba(0,0,0,0.46), -7px -7px 18px rgba(255,255,255,0.018)';
const J2_SUNKEN = 'inset 4px 4px 10px rgba(0,0,0,0.42), inset -3px -3px 8px rgba(255,255,255,0.014)';

const normalizeRoleForApi = (role) => (role === 'user' ? 'reseller' : role);
const normalizeRoleForForm = (role) => (role === 'user' ? 'reseller' : role);

export default function UserForm({ user, onSuccess, onCancel, currentUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'reseller',
    status: 'active',
    phone: '',
    payment_type: 'prepaid',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.full_name || user.name || '',
        email: user.email || '',
        role: normalizeRoleForForm(user.role || 'reseller'),
        status: user.status || 'active',
        phone: user.phone || '',
        payment_type: user.payment_type || 'prepaid',
        password: '',
        passwordConfirm: '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'reseller',
        status: 'active',
        phone: '',
        payment_type: 'prepaid',
        password: '',
        passwordConfirm: '',
      });
    }
  }, [user]);

  const setField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const phone = formData.phone.trim();
    const password = formData.password.trim();
    const passwordConfirm = formData.passwordConfirm.trim();

    if (!phone) {
      setError('Telefone (WhatsApp) e obrigatorio.');
      setLoading(false);
      return;
    }
    if (password && password.length < 8) {
      setError('A senha precisa ter no minimo 8 caracteres.');
      setLoading(false);
      return;
    }
    if (!password && passwordConfirm) {
      setError('Informe a nova senha antes de confirmar.');
      setLoading(false);
      return;
    }
    if (password && password !== passwordConfirm) {
      setError('As senhas nao conferem.');
      setLoading(false);
      return;
    }

    try {
      if (user) {
        const payload = {
          name: formData.name.trim(),
          phone,
          status: formData.status,
          paymentType: formData.payment_type,
        };
        if (password) payload.password = password;
        if (currentUser?.role === 'dev') payload.role = normalizeRoleForApi(formData.role);
        await remoteClient.users.update(user.id, payload);
      } else {
        if (!formData.email.trim()) {
          setError('Email e obrigatorio para novos usuarios.');
          setLoading(false);
          return;
        }
        if (!password) {
          setError('Informe uma senha inicial para o novo revendedor.');
          setLoading(false);
          return;
        }
        await remoteClient.users.create({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone,
          paymentType: formData.payment_type,
          password,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const canEditRole = currentUser?.role === 'dev' && user?.role !== 'admin' && user?.role !== 'recovery';

  const F = {
    label: { fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 },
    input: { background: '#080a0b', border: '0', borderRadius: 10, color: '#fff', fontSize: 13, padding: '11px 12px', width: '100%', outline: 'none', boxSizing: 'border-box', boxShadow: J2_SUNKEN },
    section: { background: '#101314', border: '0', borderRadius: 14, padding: 16, boxShadow: J2_SUNKEN },
    hint: { fontSize: 11, color: 'rgba(255,255,255,0.34)', margin: '6px 0 0' },
  };

  const segmentStyle = (active, tone = J2_ACCENT) => ({
    flex: 1,
    minHeight: 40,
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    border: 'none',
    background: active ? `linear-gradient(135deg, ${tone}, #8f1608)` : '#0b0e0f',
    color: active ? '#fff' : 'rgba(255,255,255,0.44)',
    outline: 'none',
    boxShadow: active ? J2_NEU : J2_SUNKEN,
  });

  return (
    <div style={{ background: J2_SURFACE, border: '0', borderRadius: 16, padding: 24, color: '#fff', boxShadow: J2_NEU }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: '#fff', margin: '0 0 20px' }}>
        {user ? 'Editar revendedor' : 'Novo revendedor'}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}

        <div>
          <label style={F.label}>Nome completo *</label>
          <input style={F.input} value={formData.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ex: Joao Silva" required />
        </div>

        <div>
          <label style={F.label}>Email *</label>
          <input
            disabled={!!user}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="email@exemplo.com"
            required
            style={{ ...F.input, opacity: user ? 0.5 : 1 }}
            type="email"
            value={formData.email}
          />
          <p style={F.hint}>{user ? 'O email de acesso nao e alterado por esta tela.' : 'Use uma senha inicial e oriente o revendedor a troca-la no primeiro acesso.'}</p>
        </div>

        <div>
          <label style={{ ...F.label, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Phone style={{ width: 11, height: 11, color: '#ff8a4a' }} /> Telefone / WhatsApp *
          </label>
          <input style={F.input} type="tel" value={formData.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="5511999999999 (com DDI)" required />
          <p style={F.hint}>Obrigatorio para notificacoes e avisos automaticos via WhatsApp.</p>
        </div>

        <div style={F.section}>
          <label style={{ ...F.label, display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24' }}>
            <CreditCard style={{ width: 11, height: 11 }} /> Tipo de pagamento *
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['prepaid', 'postpaid'].map((type) => (
              <button key={type} type="button" onClick={() => setField('payment_type', type)} style={segmentStyle(formData.payment_type === type, type === 'prepaid' ? '#ff4b12' : '#f59e0b')}>
                {type === 'prepaid' ? 'Pre-pago' : 'Pos-pago'}
              </button>
            ))}
          </div>
          <p style={F.hint}>
            {formData.payment_type === 'prepaid'
              ? 'Revendedor envia comprovante antes da aprovacao.'
              : 'Revendedor recebe fatura periodica dos pedidos aprovados.'}
          </p>
        </div>

        {user && (
          <div style={F.section}>
            <label style={{ ...F.label, display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e' }}>
              <ShieldCheck style={{ width: 11, height: 11 }} /> Permissoes e acesso
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['active', 'blocked'].map((status) => (
                <button key={status} type="button" onClick={() => setField('status', status)} style={segmentStyle(formData.status === status, status === 'active' ? '#16a34a' : '#dc2626')}>
                  {status === 'active' ? 'Acesso ativo' : 'Bloqueado'}
                </button>
              ))}
            </div>

            {canEditRole && (
              <div style={{ marginTop: 12 }}>
                <label style={{ ...F.label, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserCog style={{ width: 11, height: 11, color: '#ff8a4a' }} /> Papel do usuario
                </label>
                <select style={F.input} value={formData.role} onChange={(e) => setField('role', e.target.value)}>
                  <option value="reseller">Revendedor</option>
                  <option value="dev">Desenvolvedor</option>
                </select>
                <p style={F.hint}>Admins e recuperacao continuam protegidos pelo modelo de 2 administradores.</p>
              </div>
            )}
          </div>
        )}

        <div style={F.section}>
          <label style={{ ...F.label, display: 'flex', alignItems: 'center', gap: 6, color: '#ff8a4a' }}>
            <LockKeyhole style={{ width: 11, height: 11 }} /> {user ? 'Alterar senha' : 'Senha inicial *'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <input
              minLength={8}
              onChange={(e) => setField('password', e.target.value)}
              placeholder={user ? 'Nova senha opcional' : 'Minimo 8 caracteres'}
              required={!user}
              style={F.input}
              type="password"
              value={formData.password}
            />
            <input
              minLength={8}
              onChange={(e) => setField('passwordConfirm', e.target.value)}
              placeholder="Confirmar senha"
              required={!user || Boolean(formData.password)}
              style={F.input}
              type="password"
              value={formData.passwordConfirm}
            />
          </div>
          <p style={F.hint}>{user ? 'Preencha somente se quiser trocar a senha do revendedor.' : 'A senha sera usada no primeiro login do revendedor.'}</p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="button" onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 10, background: '#101314', border: '0', color: 'rgba(255,255,255,0.48)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: J2_NEU }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: 10, background: loading ? 'rgba(255,75,18,0.42)' : `linear-gradient(135deg,${J2_ACCENT},#d93810)`, color: '#fff', fontSize: 13, fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', boxShadow: J2_NEU }}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
