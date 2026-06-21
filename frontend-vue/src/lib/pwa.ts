// Utilitarios de PWA: deteccao de instalacao, suporte a push e ativacao de
// notificacoes (permissao + subscription Web Push usando a chave VAPID do backend).
import { httpClient } from '@/services/api/httpClient'

export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export interface EnablePushResult {
  ok: boolean
  reason?: 'unsupported' | 'denied' | 'default' | 'no_vapid' | 'error'
}

// Pede permissao de notificacao e registra a subscription no backend.
// DEVE ser chamado a partir de um gesto do usuario (exigencia do iOS).
export async function enablePush(): Promise<EnablePushResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'default' }
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const res = await httpClient
      .get<{ publicKey?: string | null }>('/notifications/vapid-public-key')
      .catch(() => ({ publicKey: null }))
    const publicKey = res?.publicKey
    // Permissao concedida; sem VAPID no servidor nao da pra assinar push.
    if (!publicKey) return { ok: true, reason: 'no_vapid' }

    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    await httpClient
      .post('/notifications/push-subscriptions', {
        ...subscription.toJSON(),
        userAgent: navigator.userAgent,
      })
      .catch(() => {})
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
