import { httpClient } from '@/services/api/httpClient'
import { normalizeServer, toServerPayload } from '@/services/api/normalizers'
import type { Server } from '@/types/domain'

export const serversService = {
  async list() {
    const servers = await httpClient.get<Server[]>('/servers')
    return Array.isArray(servers) ? servers.map(normalizeServer) : servers
  },
  async create(payload: unknown) {
    return normalizeServer(await httpClient.post<Server>('/servers', toServerPayload(payload)))
  },
  async update(id: string, payload: unknown) {
    return normalizeServer(await httpClient.patch<Server>(`/servers/${id}`, toServerPayload(payload)))
  },
  async remove(id: string) {
    return normalizeServer(await httpClient.delete<Server>(`/servers/${id}`))
  },
  priceHistory(id: string) {
    return httpClient.get(`/servers/${id}/price-history`)
  },
}
