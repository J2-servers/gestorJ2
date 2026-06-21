import { notificationsService } from '@/services/api/notifications.service'

export type PushPermissionState = NotificationPermission | 'unsupported'

export interface PushState {
  supported: boolean
  permission: PushPermissionState
  subscribed: boolean
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isInstalledPwa() {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

async function getReadyRegistration() {
  const existing = await navigator.serviceWorker.getRegistration()
  if (!existing) {
    await navigator.serviceWorker.register('/push-worker.js', { scope: '/' })
  }
  return navigator.serviceWorker.ready
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return { supported: false, permission: 'unsupported', subscribed: false }

  let subscribed = false
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    subscribed = Boolean(subscription)
  } catch {
    subscribed = false
  }

  return { supported: true, permission: Notification.permission, subscribed }
}

export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error('Este navegador nao suporta notificacoes push.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Permissao bloqueada. Ative as notificacoes nas configuracoes do navegador.'
        : 'Permissao nao concedida.',
    )
  }

  const registration = await getReadyRegistration()
  const { publicKey } = await notificationsService.vapidPublicKey()
  if (!publicKey) {
    throw new Error('Servidor sem chave VAPID configurada.')
  }

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  await notificationsService.subscribePush(subscription.toJSON())
  return { permission, subscribed: true }
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) await subscription.unsubscribe()
  return { subscribed: false }
}
