import { httpClient } from '@/services/api/httpClient'
import { normalizeNotification } from '@/services/api/normalizers'
import type { NotificationItem } from '@/types/domain'

export const notificationsService = {
  async list() {
    const notifications = await httpClient.get<NotificationItem[]>('/notifications')
    return Array.isArray(notifications) ? notifications.map(normalizeNotification) : []
  },
  markRead(id: string) {
    return httpClient.patch(`/notifications/${id}/read`).then(normalizeNotification)
  },
  markAllRead() {
    return httpClient.patch('/notifications/read-all')
  },
  vapidPublicKey() {
    return httpClient.get<{ publicKey?: string | null }>('/notifications/vapid-public-key')
  },
  subscribePush(subscription: unknown) {
    return httpClient.post('/notifications/push-subscriptions', subscription)
  },
}
