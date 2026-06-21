import { httpClient } from '@/services/api/httpClient'

export const whatsappService = {
  status() {
    return httpClient.get('/whatsapp/status')
  },
  qr() {
    return httpClient.get('/whatsapp/qr')
  },
  test(phone: string, message: string) {
    return httpClient.post('/whatsapp/test', { phone, message })
  },
  logs(limit = 80) {
    return httpClient.get(`/whatsapp/logs?limit=${limit}`)
  },
  queue() {
    return httpClient.get('/whatsapp/queue')
  },
  retryFailed() {
    return httpClient.post('/whatsapp/queue/retry-failed', {})
  },
  clearPending() {
    return httpClient.post('/whatsapp/queue/clear-pending', {})
  },
  broadcast(payload: unknown) {
    return httpClient.post('/whatsapp/broadcast', payload)
  },
}
