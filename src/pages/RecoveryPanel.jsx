import React, { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Mail, Lock, LogOut, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { remoteClient } from '@/api/remoteClient';
import { useAuth } from '@/lib/AuthContext';

const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 22,
};
const label = { fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' };
const input = {
  width: '100%', boxSizing: 'border-box', padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none',
};
const btn = (disabled, color = '#7c3aed') => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '12px', borderRadius: 10, border: 'none', width: '100%',
  background: disabled ? 'rgba(124,58,237,0.4)' : color,
  color: '#fff', fontWeight: 700, fontSize: 14,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

function Banner({ kind, children }) {
  if (!children) return null;
  const ok = kind === 'ok';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: 10, padding: '10px 14px',
      color: ok ? '#86efac' : '#fca5a5', fontSize: 13, marginBottom: 14,
    }}>
      {ok ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : <AlertTriangle style={{ width: 16, height: 16 }} />}
      {children}
    </div>
  );
}

export default function RecoveryPanel() {
  const { user, logout } = useAuth();
  const [admin, setAdmin] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const [credForm, setCredForm] = useState({ email: '', password: '', confirm: '' });
  const [credBusy, setCredBusy] = useState(false);
  const [credMsg, setCredMsg] = useState({ kind: '', text: '' });

  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState({ kind: '', text: '' });

  useEffect(() => {
    remoteClient.recovery
      .getOperationalAdmin()
      .then((a) => { setAdmin(a); setCredForm((f) => ({ ...f, email: a.email })); })
      .catch(() => setAdmin(null))
      .finally(() => setLoadingAdmin(false));
  }, []);

  const submitCreds = async (e) => {
    e.preventDefault();
    setCredMsg({ kind: '', text: '' });
    const emailChanged = credForm.email && credForm.email !== admin?.email;
    const wantsPassword = !!credForm.password;
    if (!emailChanged && !wantsPassword) {
      setCredMsg({ kind: 'err', text: 'Altere o e-mail ou informe uma nova senha.' });
      return;
    }
    if (wantsPassword && credForm.password !== credForm.confirm) {
      setCredMsg({ kind: 'err', text: 'As senhas não conferem.' });
      return;
    }
    setCredBusy(true);
    try {
      const payload = {};
      if (emailChanged) payload.email = credForm.email;
      if (wantsPassword) payload.password = credForm.password;
      const res = await remoteClient.recovery.resetCredentials(payload);
      setAdmin(res.admin);
      setCredForm((f) => ({ ...f, email: res.admin.email, password: '', confirm: '' }));
      setCredMsg({ kind: 'ok', text: 'Credenciais do administrador atualizadas. As sessões dele foram encerradas.' });
    } catch (err) {
      setCredMsg({ kind: 'err', text: err.message || 'Falha ao atualizar.' });
    } finally {
      setCredBusy(false);
    }
  };

  const submitOwnPassword = async (e) => {
    e.preventDefault();
    setPwMsg({ kind: '', text: '' });
    if (pwForm.password.length < 8) {
      setPwMsg({ kind: 'err', text: 'A senha precisa de no mínimo 8 caracteres.' });
      return;
    }
    if (pwForm.password !== pwForm.confirm) {
      setPwMsg({ kind: 'err', text: 'As senhas não conferem.' });
      return;
    }
    setPwBusy(true);
    try {
      await remoteClient.recovery.changeOwnPassword(pwForm.password);
      setPwForm({ password: '', confirm: '' });
      setPwMsg({ kind: 'ok', text: 'Sua senha foi alterada. Faça login novamente quando precisar.' });
    } catch (err) {
      setPwMsg({ kind: 'err', text: err.message || 'Falha ao alterar a senha.' });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0515 0%, #160a24 50%, #0b0b16 100%)',
      padding: '32px 16px',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck style={{ width: 24, height: 24, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 800 }}>Conta de Recuperação</h1>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={() => logout()} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
            color: '#f87171', fontWeight: 600, fontSize: 12, cursor: 'pointer',
          }}>
            <LogOut style={{ width: 14, height: 14 }} /> Sair
          </button>
        </div>

        {/* Aviso de escopo */}
        <div style={{
          ...card, marginBottom: 18, padding: '14px 18px',
          background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.22)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <ShieldCheck style={{ width: 18, height: 18, color: '#a78bfa', flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.5 }}>
            Esta conta serve <b>apenas para segurança e recuperação</b>. Você pode trocar o login e a
            senha do administrador operacional — e nada mais. Nenhum dado das operações dele é visível aqui.
          </p>
        </div>

        {/* Reset credenciais do admin operacional */}
        <div style={{ ...card, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <KeyRound style={{ width: 18, height: 18, color: '#a78bfa' }} />
            <h2 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Credenciais do Administrador</h2>
          </div>

          {loadingAdmin ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Carregando...</p>
          ) : !admin ? (
            <Banner kind="err">Administrador operacional não encontrado.</Banner>
          ) : (
            <form onSubmit={submitCreds}>
              <Banner kind={credMsg.kind === 'ok' ? 'ok' : 'err'}>{credMsg.text}</Banner>

              <div style={{ marginBottom: 14 }}>
                <label style={label}><Mail style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Novo e-mail (login)</label>
                <input type="email" style={input} value={credForm.email}
                  onChange={(e) => setCredForm((f) => ({ ...f, email: e.target.value }))} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}><Lock style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Nova senha (deixe em branco para não trocar)</label>
                <input type="password" style={input} placeholder="mínimo 8 caracteres" minLength={8}
                  value={credForm.password}
                  onChange={(e) => setCredForm((f) => ({ ...f, password: e.target.value }))} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={label}>Confirmar nova senha</label>
                <input type="password" style={input} value={credForm.confirm}
                  onChange={(e) => setCredForm((f) => ({ ...f, confirm: e.target.value }))} />
              </div>

              <button type="submit" disabled={credBusy} style={btn(credBusy)}>
                {credBusy ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <KeyRound style={{ width: 16, height: 16 }} />}
                {credBusy ? 'Aplicando...' : 'Atualizar credenciais do admin'}
              </button>
            </form>
          )}
        </div>

        {/* Trocar própria senha */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lock style={{ width: 18, height: 18, color: '#94a3b8' }} />
            <h2 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Minha senha</h2>
          </div>
          <form onSubmit={submitOwnPassword}>
            <Banner kind={pwMsg.kind === 'ok' ? 'ok' : 'err'}>{pwMsg.text}</Banner>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nova senha</label>
              <input type="password" style={input} placeholder="mínimo 8 caracteres" minLength={8}
                value={pwForm.password}
                onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={label}>Confirmar nova senha</label>
              <input type="password" style={input} value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} />
            </div>
            <button type="submit" disabled={pwBusy} style={btn(pwBusy, '#475569')}>
              {pwBusy ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Lock style={{ width: 16, height: 16 }} />}
              {pwBusy ? 'Alterando...' : 'Alterar minha senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
