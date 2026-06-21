import { httpClient } from '@/services/api/httpClient'
import { normalizeSupplier, toCreateSupplierPayload, toUpdateSupplierPayload } from '@/services/api/normalizers'
import type { Supplier } from '@/types/domain'

export const suppliersService = {
  async list(serverId?: string) {
    const qs = serverId ? `?serverId=${encodeURIComponent(serverId)}` : ''
    const suppliers = await httpClient.get<Supplier[]>(`/suppliers${qs}`)
    return Array.isArray(suppliers) ? suppliers.map(normalizeSupplier) : suppliers
  },
  async create(payload: unknown) {
    return normalizeSupplier(await httpClient.post<Supplier>('/suppliers', toCreateSupplierPayload(payload)))
  },
  async update(id: string, payload: unknown) {
    return normalizeSupplier(await httpClient.patch<Supplier>(`/suppliers/${id}`, toUpdateSupplierPayload(payload)))
  },
  async remove(id: string) {
    return normalizeSupplier(await httpClient.delete<Supplier>(`/suppliers/${id}`))
  },
}
