import { httpClient } from './httpClient'
import { normalizeServerFornecedor } from './normalizers'

export interface CreateServerFornecedorPayload {
  serverId: string
  fornecedorId: string
  costPerCredit: number
  panelLogin: string
  panelLink?: string
  panelPassword?: string
  notes?: string
  active?: boolean
}

export interface UpdateServerFornecedorPayload {
  costPerCredit?: number
  panelLogin?: string
  panelLink?: string
  panelPassword?: string
  notes?: string
  active?: boolean
}

export const serverFornecedoresService = {
  async list(serverId?: string) {
    const qs = serverId ? `?serverId=${encodeURIComponent(serverId)}` : ''
    const data = await httpClient.get<unknown>(`/server-fornecedores${qs}`)
    return Array.isArray(data) ? data.map(normalizeServerFornecedor) : []
  },

  async create(payload: CreateServerFornecedorPayload) {
    return normalizeServerFornecedor(await httpClient.post<unknown>('/server-fornecedores', payload))
  },

  async update(id: string, payload: UpdateServerFornecedorPayload) {
    return normalizeServerFornecedor(await httpClient.patch<unknown>(`/server-fornecedores/${id}`, payload))
  },

  async remove(id: string) {
    return httpClient.delete(`/server-fornecedores/${id}`)
  },
}
