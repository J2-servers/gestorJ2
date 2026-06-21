import { httpClient } from '@/services/api/httpClient'

export const recoveryService = {
  operationalAdmin() {
    return httpClient.get('/recovery/operational-admin')
  },
  resetCredentials(payload: { email: string; password: string }) {
    return httpClient.patch('/recovery/operational-admin/credentials', payload)
  },
  changeOwnPassword(password: string) {
    return httpClient.patch('/recovery/me/password', { password })
  },
}
