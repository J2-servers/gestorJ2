import { httpClient } from '@/services/api/httpClient'
import { normalizeUser, toCreateUserPayload, toUpdateMePayload, toUpdateUserPayload } from '@/services/api/normalizers'
import type { User } from '@/types/domain'

export const usersService = {
  async list() {
    const users = await httpClient.get<User[]>('/users')
    return Array.isArray(users) ? users.map(normalizeUser) : users
  },
  async create(payload: unknown) {
    return normalizeUser(await httpClient.post<User>('/users', toCreateUserPayload(payload)))
  },
  async update(id: string, payload: unknown) {
    return normalizeUser(await httpClient.patch<User>(`/users/${id}`, toUpdateUserPayload(payload)))
  },
  async updateMe(payload: unknown) {
    return normalizeUser(await httpClient.patch<User>('/users/me', toUpdateMePayload(payload)))
  },
  async remove(id: string) {
    return normalizeUser(await httpClient.delete<User>(`/users/${id}`))
  },
}
