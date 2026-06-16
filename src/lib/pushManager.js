/* Gerenciador único de Web Push — usado pelo toggle e pelo banner pós-instalação. */
import { remoteClient } from '@/api/remoteClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
const TOKEN_KEY = 'gestorj2.api_token';

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isInstalledPWA() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Garante o service worker registrado e pronto (não duplica). */
async function getReadyRegistration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) {
    await navigator.serviceWorker.register('/push-worker.js', { scope: '/' });
  }
  return navigator.serviceWorker.ready;
}

export async function getPushState() {
  if (!isPushSupported()) return { supported: false, permission: 'unsupported', subscribed: false };
  let subscribed = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
    }
  } catch { /* ignore */ }
  return { supported: true, permission: Notification.permission, subscribed };
}

/**
 * Pede TODAS as permissões e registra a subscription no backend.
 * É o que garante notificação na tela do celular mesmo com a tela apagada.
 * DEVE ser chamado a partir de um gesto do usuário (clique) — exigência do iOS.
 */
export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error('Este dispositivo/navegador não suporta notificações push.');
  }

  // 1. Permissão do SO
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    const err = new Error(
      permission === 'denied'
        ? 'Permissão negada. Habilite nas configurações do navegador/app.'
        : 'Permissão não concedida.',
    );
    err.code = permission;
    throw err;
  }

  // 2. Service worker pronto
  const reg = await getReadyRegistration();

  // 3. Chave pública VAPID do backend
  const res = await fetch(`${API_BASE}/notifications/vapid-public-key`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` },
  });
  const { publicKey } = await res.json().catch(() => ({}));
  if (!publicKey) {
    throw new Error('Servidor sem chave VAPID configurada. Contate o administrador.');
  }

  // 4. Reaproveita subscription existente ou cria nova
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  // 5. Persiste no backend
  await remoteClient.notifications.subscribePush(subscription.toJSON());
  return { permission, subscribed: true };
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) {
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
  return { subscribed: false };
}

