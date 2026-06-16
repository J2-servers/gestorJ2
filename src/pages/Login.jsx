import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { remoteClient } from '@/api/remoteClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Login() {
  const { checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [canBootstrap, setCanBootstrap] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });
  const [setupForm, setSetupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    recoveryEmail: '',
    recoveryPassword: '',
    confirmRecoveryPassword: '',
  });

  useEffect(() => {
    let alive = true;
    remoteClient.auth.bootstrapStatus()
      .then((status) => {
        if (alive) setCanBootstrap(Boolean(status?.canBootstrap));
      })
      .catch(() => {
        if (alive) setCanBootstrap(false);
      })
      .finally(() => {
        if (alive) setBootstrapLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const handleBootstrap = async (e) => {
    e.preventDefault();
    setError('');

    if (setupForm.password !== setupForm.confirmPassword) {
      setError('A senha do admin operacional nao confere.');
      return;
    }
    if (setupForm.recoveryPassword !== setupForm.confirmRecoveryPassword) {
      setError('A senha da conta de recuperacao nao confere.');
      return;
    }
    if (setupForm.email === setupForm.recoveryEmail) {
      setError('Use emails diferentes para as duas contas administrativas.');
      return;
    }

    setLoading(true);
    try {
      await remoteClient.auth.bootstrap({
        name: setupForm.name,
        email: setupForm.email,
        password: setupForm.password,
        recoveryEmail: setupForm.recoveryEmail,
        recoveryPassword: setupForm.recoveryPassword,
      });
      await checkUserAuth();
      navigate(createPageUrl('Dashboard'));
    } catch (err) {
      setError(err.message || 'Nao foi possivel criar os administradores iniciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await remoteClient.auth.login(loginForm.email, loginForm.password);
      await checkUserAuth();
      navigate(createPageUrl('Dashboard'));
    } catch (err) {
      setError(err.message || 'Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await remoteClient.auth.register(registerForm);
      await checkUserAuth();
      navigate(createPageUrl('Dashboard'));
    } catch (err) {
      setError(err.message || 'Erro ao criar conta de revendedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0515 0%, #1a0a2e 50%, #0d0d1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: canBootstrap ? 520 : 420,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '36px 32px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #f97316, #ec4899)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 12,
          }}>R</div>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Gestor J2</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            {canBootstrap ? 'Primeira instalacao administrativa' : 'Gestao de recargas profissional'}
          </p>
        </div>

        {bootstrapLoading ? (
          <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '18px 0' }}>
            Verificando instalacao...
          </div>
        ) : canBootstrap ? (
          <form onSubmit={handleBootstrap} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={sectionStyle}>
              <p style={sectionTitle}>Admin operacional</p>
              <input type="text" placeholder="Nome do admin" required value={setupForm.name}
                onChange={e => setSetupForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              <input type="email" placeholder="Email do admin" required value={setupForm.email}
                onChange={e => setSetupForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              <input type="password" placeholder="Senha do admin" required minLength={6} value={setupForm.password}
                onChange={e => setSetupForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
              <input type="password" placeholder="Confirmar senha do admin" required minLength={6} value={setupForm.confirmPassword}
                onChange={e => setSetupForm(f => ({ ...f, confirmPassword: e.target.value }))} style={inputStyle} />
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitle}>Conta de recuperacao</p>
              <input type="email" placeholder="Email de recuperacao" required value={setupForm.recoveryEmail}
                onChange={e => setSetupForm(f => ({ ...f, recoveryEmail: e.target.value }))} style={inputStyle} />
              <input type="password" placeholder="Senha de recuperacao" required minLength={6} value={setupForm.recoveryPassword}
                onChange={e => setSetupForm(f => ({ ...f, recoveryPassword: e.target.value }))} style={inputStyle} />
              <input type="password" placeholder="Confirmar senha de recuperacao" required minLength={6} value={setupForm.confirmRecoveryPassword}
                onChange={e => setSetupForm(f => ({ ...f, confirmRecoveryPassword: e.target.value }))} style={inputStyle} />
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Criando administradores...' : 'Criar os 2 administradores'}
            </button>
          </form>
        ) : (
          <>
            <div style={{
              display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)',
              borderRadius: 10, padding: 4, marginBottom: 24,
            }}>
              {['login', 'register'].map((t) => (
                <button key={t} onClick={() => { setTab(t); setError(''); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13,
                    background: tab === t ? 'rgba(249,115,22,0.15)' : 'transparent',
                    color: tab === t ? '#f97316' : '#94a3b8',
                    transition: 'all 0.2s',
                  }}>
                  {t === 'login' ? 'Entrar' : 'Cadastrar revendedor'}
                </button>
              ))}
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="email" placeholder="Email" required value={loginForm.email}
                  onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                <input type="password" placeholder="Senha" required minLength={6} value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="text" placeholder="Nome completo" required value={registerForm.name}
                  onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
                <input type="email" placeholder="Email" required value={registerForm.email}
                  onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                <input type="password" placeholder="Senha (minimo 6 caracteres)" required minLength={6} value={registerForm.password}
                  onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} />
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? 'Criando conta...' : 'Criar conta de revendedor'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const ErrorBox = ({ children }) => (
  <div style={{
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10, padding: '10px 14px', color: '#fca5a5',
    fontSize: 13, marginBottom: 16,
  }}>{children}</div>
);

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.025)',
};

const sectionTitle = {
  margin: 0,
  color: '#f8fafc',
  fontWeight: 800,
  fontSize: 13,
};

const inputStyle = {
  padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#f1f5f9', fontSize: 14,
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

const btnStyle = (loading) => ({
  padding: '12px',
  background: loading ? 'rgba(249,115,22,0.4)' : 'linear-gradient(135deg, #f97316, #ea580c)',
  border: 'none', borderRadius: 10, color: '#fff',
  fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
});

