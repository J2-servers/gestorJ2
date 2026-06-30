import { httpClient } from '@/services/api/httpClient'
import { normalizeSettings, toSettingsPayload } from '@/services/api/normalizers'
import type { Settings } from '@/types/domain'

export const settingsService = {
  async get() {
    return normalizeSettings(await httpClient.get<Settings>('/settings'))
  },
  async getPublic() {
    return normalizeSettings(await httpClient.get<Settings>('/settings/public'))
  },
  async branding() {
    return normalizeSettings(await httpClient.get<Settings>('/branding'))
  },
  async update(payload: unknown) {
    return normalizeSettings(await httpClient.patch<Settings>('/settings', toSettingsPayload(payload)))
  },
  getPayments<T = unknown>() {
    return httpClient.get<T>('/settings/payments')
  },
  updatePayments<T = unknown>(payload: unknown) {
    return httpClient.patch<T>('/settings/payments', payload)
  },
  togglePayment<T = unknown>(id: string, active: boolean) {
    return httpClient.patch<T>(`/settings/payments/${id}/toggle`, { active })
  },
}
