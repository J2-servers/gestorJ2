import { httpClient } from '@/services/api/httpClient'
import { normalizeResellerServer, toCreateResellerServerPayload, toResellerServerPayload } from '@/services/api/normalizers'
import type { ResellerServer } from '@/types/domain'

export const resellerServersService = {
  async list() {
    const records = await httpClient.get<ResellerServer[]>('/reseller-servers')
    return Array.isArray(records) ? records.map(normalizeResellerServer) : records
  },
  async create(payload: unknown) {
    return normalizeResellerServer(await httpClient.post<ResellerServer>('/reseller-servers', toCreateResellerServerPayload(payload)))
  },
  async update(id: string, payload: unknown) {
    return normalizeResellerServer(await httpClient.patch<ResellerServer>(`/reseller-servers/${id}`, toResellerServerPayload(payload)))
  },
  async remove(id: string) {
    return normalizeResellerServer(await httpClient.delete<ResellerServer>(`/reseller-servers/${id}`))
  },
}
