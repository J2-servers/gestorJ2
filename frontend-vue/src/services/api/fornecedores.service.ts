import { httpClient } from './httpClient'
import { normalizeFornecedor } from './normalizers'
import type { Fornecedor } from '@/types/domain'

export const fornecedoresService = {
  async list() {
    const data = await httpClient.get<unknown>('/fornecedores')
    return Array.isArray(data) ? data.map(normalizeFornecedor) : []
  },

  async create(payload: { name: string; contact?: string; notes?: string; active?: boolean }) {
    return normalizeFornecedor(await httpClient.post<unknown>('/fornecedores', payload))
  },

  async update(id: string, payload: { name?: string; contact?: string; notes?: string; active?: boolean }) {
    return normalizeFornecedor(await httpClient.patch<unknown>(`/fornecedores/${id}`, payload))
  },

  async remove(id: string) {
    return httpClient.delete(`/fornecedores/${id}`)
  },

  async reactivate(id: string) {
    return httpClient.patch(`/fornecedores/${id}/reactivate`)
  },
}
