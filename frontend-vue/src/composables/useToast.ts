import { reactive } from 'vue'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  action?: ToastAction
  timeoutMs?: number
}

const toasts = reactive<ToastItem[]>([])
const timers = new Map<string, ReturnType<typeof window.setTimeout>>()

function remove(id: string) {
  const index = toasts.findIndex((toast) => toast.id === id)
  if (index >= 0) toasts.splice(index, 1)

  const timer = timers.get(id)
  if (timer) window.clearTimeout(timer)
  timers.delete(id)
}

function show(toast: Omit<ToastItem, 'id'>) {
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
  const item: ToastItem = { id, timeoutMs: 4000, ...toast }

  toasts.unshift(item)
  while (toasts.length > 5) {
    const removed = toasts.pop()
    if (removed) remove(removed.id)
  }

  if (item.timeoutMs && item.timeoutMs > 0) {
    timers.set(id, window.setTimeout(() => remove(id), item.timeoutMs))
  }

  return id
}

export function useToast() {
  return {
    toasts,
    remove,
    show,
    success: (message: string, title = 'Tudo certo') => show({ message, title, variant: 'success' }),
    error: (message: string, title = 'Algo deu errado') => show({ message, title, variant: 'error', timeoutMs: 5600 }),
    warning: (message: string, title = 'Atencao') => show({ message, title, variant: 'warning' }),
    info: (message: string, title = 'Aviso') => show({ message, title, variant: 'info' }),
  }
}
