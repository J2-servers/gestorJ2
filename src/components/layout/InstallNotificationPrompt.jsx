import { useEffect, useState, useCallback } from 'react';
import { BellRing, X } from 'lucide-react';
import { isPushSupported, isInstalledPWA, getPushState, enablePush } from '@/lib/pushManager';

const SNOOZE_KEY = 'gestorj2.push_prompt_snooze';
const SNOOZE_MS = 1000 * 60 * 60 * 24; // 24h

// Chaves do banner de instalação - usadas s para não sobrepor os dois banners?.
const INSTALL_AVAILABLE_KEY = 'gestorj2.install_available';
const INSTALL_COUNT_KEY = 'gestorj2.install_prompt_count';
const INSTALL_MAX = 3;

function isSnoozed() {
  const until = Number(localStorage?.getItem(SNOOZE_KEY) || 0);
  return Date?.now() < until;
}

// True quando instalar AINDA  a oferta da vez (não esgotou as insist?ncias).
// Enquanto isso, o banner de notificação no navegador espera para não sobrepor?.
function installStillTrying() {
  const available = localStorage?.getItem(INSTALL_AVAILABLE_KEY) === '1';
  const count = Number(localStorage?.getItem(INSTALL_COUNT_KEY) || 0);
  return available && count < INSTALL_MAX;
}

/**
 * Banner que aparece quando o app está instalado (PWA na tela inicial) e as
 * notificações ainda não foram autorizadas?. Um toque pede TODAS as permissões
 * e registra o push - garantindo alertas na tela do celular mesmo apagada?.
 */
export default function InstallNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('installed'); // 'installed' | 'browser'

  const evaluate = useCallback(async () => {
    if (!isPushSupported() || isSnoozed()) { setVisible(false); return; }

    const installed = isInstalledPWA();
    // No navegador (não instalado): só oferece quando instalar não está mais
    // insistindo - assim a pessoa que NÃO quer instalar recebe push direto.
    if (!installed && installStillTrying()) { setVisible(false); return; }

    const { permission, subscribed } = await getPushState();
    setMode(installed ? 'installed' : 'browser');
    // Mostra se ainda não decidiu OU concedeu mas perdeu a subscription
    setVisible(permission !== 'denied' && !subscribed);
  }, []);

  useEffect(() => {
    evaluate();
    const onInstalled = () => {
      localStorage?.removeItem(SNOOZE_KEY);
      evaluate();
    };
    const onVisible = () => {
      if (document?.visibilityState === 'visible') evaluate();
    };
    const onInstallState = () => evaluate(); // reavalia quando o "instalar" muda de estado
    window?.addEventListener('appinstalled', onInstalled);
    window?.addEventListener('gestorj2:install-state', onInstallState);
    document?.addEventListener('visibilitychange', onVisible);
    return () => {
      window?.removeEventListener('appinstalled', onInstalled);
      window?.removeEventListener('gestorj2:install-state', onInstallState);
      document?.removeEventListener('visibilitychange', onVisible);
    };
  }, [evaluate]);

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      await enablePush();
      setVisible(false);
    } catch (err) {
      setError(err?.message || 'Não foi possível ativar.');
      if (err?.code === 'denied') setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const snooze = () => {
    localStorage?.setItem(SNOOZE_KEY, String(Date?.now() + SNOOZE_MS));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
        zIndex: 9999,
        maxWidth: 460,
        margin: '0 auto',
        background: 'var(--j2-surface, rgba(6, 7, 7, .96))',
        border: '0',
        borderRadius: 18,
        color: 'var(--j2-text, #fff8f2)',
        boxShadow: 'var(--j2-neu, 10px 10px 24px rgba(0,0,0,0.5), -7px -7px 18px rgba(255,255,255,0.018))',
        padding: '16px 16px 14px',
        backdropFilter: 'blur(16px)',
        animation: 'gestorJ2SlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <style>{`@keyframes gestorJ2SlideUp{from{transform:translateY(120%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <button
        onClick={snooze}
        aria-label="Agora não"
        style={{
          position: 'absolute', top: 10, right: 10,
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--j2-surface-2, #15191a)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X style={{ width: 14, height: 14, color: 'var(--j2-muted, rgba(255,255,255,0.85))' }} />
      </button>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingRight: 28 }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'var(--j2-accent-soft, rgba(255,75,18,0.14))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <BellRing style={{ width: 20, height: 20, color: 'var(--j2-accent, #ff4b12)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--j2-text, #fff8f2)' }}>
            Ative as notificações
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--j2-muted, rgba(255,255,255,0.85))', lineHeight: 1.4 }}>
            {mode === 'browser'
              ? 'Receba avisos de pedidos, pagamentos e mensagens direto neste navegador - sem precisar instalar o app.'
              : 'Receba avisos de pedidos, pagamentos e mensagens direto na tela - mesmo com o celular bloqueado.'}
          </p>
        </div>
      </div>

      {error && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--j2-danger, #ff5b5b)', fontWeight: 700 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={snooze}
          style={{
            flex: 1, padding: '10px', borderRadius: 11,
            background: 'var(--j2-surface-2, #101314)', border: '0',
            color: 'var(--j2-muted, #a3a09b)', fontWeight: 800, fontSize: 12, cursor: 'pointer',
            boxShadow: 'var(--j2-sunken, inset 4px 4px 10px rgba(0,0,0,0.42), inset -3px -3px 8px rgba(255,255,255,0.014))',
          }}
        >
          Agora não
        </button>
        <button
          onClick={handleEnable}
          disabled={loading}
          style={{
            flex: 2, padding: '10px', borderRadius: 11,
            background: 'linear-gradient(135deg,#ff4b12,#d93810)', border: 'none',
            color: '#fff', fontWeight: 800, fontSize: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Ativando...' : 'Ativar notificações'}
        </button>
      </div>
    </div>
  );
}


