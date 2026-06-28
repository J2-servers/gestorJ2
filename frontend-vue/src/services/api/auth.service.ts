import { httpClient, setAccessToken } from '@/services/api/httpClient'
import { normalizeUser } from '@/services/api/normalizers'
import type { BootstrapStatus, LoginPayload, LoginResponse } from '@/types/api'
import type { User } from '@/types/domain'

type AuthResponseShape = LoginResponse<User> & {
  access_token?: string | null
  token?: string | null
  data?: LoginResponse<User> & {
    access_token?: string | null
    token?: string | null
  }
}

function resolveAuthPayload(result: AuthResponseShape) {
  const payload = result.data ?? result
  const accessToken = payload.accessToken ?? payload.access_token ?? payload.token ?? null
  const user = payload.user
  setAccessToken(accessToken)
  return normalizeUser(user)
}

export const authService = {
  bootstrapStatus() {
    return httpClient.get<BootstrapStatus>('/auth/bootstrap/status')
  },
  async bootstrap(payload: unknown) {
    const result = await httpClient.post<AuthResponseShape>('/auth/bootstrap', payload)
    return resolveAuthPayload(result)
  },
  async login(payload: LoginPayload) {
    const result = await httpClient.post<AuthResponseShape>('/auth/login', payload)
    return resolveAuthPayload(result)
  },
  async register(payload: unknown) {
    const result = await httpClient.post<AuthResponseShape>('/auth/register', payload)
    return resolveAuthPayload(result)
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
