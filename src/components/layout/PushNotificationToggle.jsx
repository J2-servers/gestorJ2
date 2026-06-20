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
  const raisedShadow = '8px 8px 18px rgba(0,0,0,0.42), -5px -5px 14px rgba(255,255,255,0.016)';
  const insetShadow = 'inset 4px 4px 10px rgba(0,0,0,0.42), inset -3px -3px 8px rgba(255,255,255,0.014)';

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
              : 'rgba(255,75,18,0.12)',
          border: '0',
          color: isDenied ? 'var(--j2-danger, #ef4444)' : isActive ? '#15803d' : 'var(--j2-accent, #ff4b12)',
          cursor: loading || isDenied ? 'not-allowed' : 'pointer',
          fontSize: 11,
          fontWeight: 700,
          boxShadow: isActive || isDenied ? 'var(--j2-sunken, ' + insetShadow + ')' : 'var(--j2-neu-soft, ' + raisedShadow + ')',
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
        <p style={{ margin: 0, fontSize: 10, color: 'var(--j2-muted, rgba(255,255,255,0.4))', lineHeight: 1.4 }}>
          {message}
        </p>
      )}
    </div>
  );
}
