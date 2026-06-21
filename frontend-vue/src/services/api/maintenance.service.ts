import { httpClient } from '@/services/api/httpClient'

export const maintenanceService = {
  overview() {
    return httpClient.get('/maintenance/overview')
  },
  systemOverview() {
    return httpClient.get('/maintenance/system-overview')
  },
  errors(limit = 50) {
    return httpClient.get(`/maintenance/errors?limit=${limit}`)
  },
  resolveError(id: string) {
    return httpClient.patch(`/maintenance/errors/${id}/resolve`)
  },
  clearErrors() {
    return httpClient.delete('/maintenance/errors')
  },
  scripts() {
    return httpClient.get('/maintenance/scripts')
  },
  diagnoseScript(id: string) {
    return httpClient.post(`/maintenance/scripts/${id}/diagnose`, {})
  },
  applyScript(id: string) {
    return httpClient.post(`/maintenance/scripts/${id}/apply`, {})
  },
  whatsappQueue() {
    return httpClient.get('/maintenance/whatsapp-queue')
  },
  retryWhatsappQueue() {
    return httpClient.post('/maintenance/whatsapp-queue/retry', {})
  },
  migrations() {
    return httpClient.get('/maintenance/migrations')
  },
  deployMigrations() {
    return httpClient.post('/maintenance/migrations/deploy', {})
  },
}
