import { httpClient, setAccessToken } from '@/services/api/httpClient'
import { normalizeUser } from '@/services/api/normalizers'
import type { BootstrapStatus, LoginPayload, LoginResponse } from '@/types/api'
import type { User } from '@/types/domain'

export const authService = {
  bootstrapStatus() {
    return httpClient.get<BootstrapStatus>('/auth/bootstrap/status')
  },
  async bootstrap(payload: unknown) {
    const result = await httpClient.post<LoginResponse<User>>('/auth/bootstrap', payload)
    setAccessToken(result.accessToken)
    return normalizeUser(result.user)
  },
  async login(payload: LoginPayload) {
    const result = await httpClient.post<LoginResponse<User>>('/auth/login', payload)
    setAccessToken(result.accessToken)
    return normalizeUser(result.user)
  },
  async register(payload: unknown) {
    const result = await httpClient.post<LoginResponse<User>>('/auth/register', payload)
    setAccessToken(result.accessToken)
    return normalizeUser(result.user)
  },
  me() {
    return httpClient.get<User>('/users/me').then(normalizeUser)
  },
  async logout() {
    try {
      await httpClient.post('/auth/logout', {})
    } finally {
      setAccessToken(null)
    }
  },
}
