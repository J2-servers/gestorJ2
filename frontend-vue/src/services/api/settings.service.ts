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
}
