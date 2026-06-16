import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { isPushSupported, getPushState, enablePush, disablePush } from '@/lib/pushManager';

export default function PushNotificationToggle() {
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    getPushState().then((s) => {
      setPermission(s.permission);
      setSubscribed(s.subscribed);
    });
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    setMessage('');
    try {
      await enablePush();
      setPermission('granted');
      setSubscribed(true);
      setMessage('Notificações ativadas neste dispositivo!');
    } catch (err) {
      setPermission(err.code === 'denied' ? 'denied' : Notification.permission);
      setMessage(err.message || 'Erro ao ativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await disablePush();
      setSubscribed(false);
      setMessage('Notificações desativadas.');
    } catch (err) {
      setMessage(err.message || 'Erro ao desativar.');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  const isDenied = permission === 'denied';
  const isActive = subscribed && permission === 'granted';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        onClick={isActive ? handleDisable : handleEnable}
        disabled={loading || isDenied}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 10,
          background: isDenied
            ? 'rgba(248,113,113,0.08)'
            : isActive
              ? 'rgba(34,197,94,0.12)'
              : 'rgba(167,139,250,0.08)',
          border: `1px solid ${
            isDenied
              ? 'rgba(248,113,113,0.25)'
              : isActive
                ? 'rgba(34,197,94,0.28)'
                : 'rgba(167,139,250,0.22)'
          }`,
          color: isDenied ? '#f87171' : isActive ? '#86efac' : '#c4b5fd',
          cursor: loading || isDenied ? 'not-allowed' : 'pointer',
          fontSize: 11,
          fontWeight: 700,
          transition: 'all 0.2s',
          width: '100%',
        }}
      >
        {loading ? (
          <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
        ) : isDenied ? (
          <BellOff style={{ width: 12, height: 12 }} />
        ) : isActive ? (
          <BellRing style={{ width: 12, height: 12 }} />
        ) : (
          <Bell style={{ width: 12, height: 12 }} />
        )}
        {loading
          ? 'Aguarde...'
          : isDenied
            ? 'Push bloqueado'
            : isActive
              ? 'Push ativo'
              : 'Ativar push'}
      </button>
      {message && (
        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
          {message}
        </p>
      )}
    </div>
  );
}
