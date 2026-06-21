import { httpClient } from '@/services/api/httpClient'
import { normalizeChatMessage, normalizeCreditRequest, toCreditRequestPayload } from '@/services/api/normalizers'
import type { PaginatedResponse } from '@/types/api'
import type { ChatMessage, CreditRequest } from '@/types/domain'

export const creditRequestsService = {
  async list(limit = 200) {
    const result = await httpClient.get<PaginatedResponse<CreditRequest>>(`/credit-requests?limit=${limit}`)
    return Array.isArray(result?.data) ? { ...result, data: result.data.map(normalizeCreditRequest) } : result
  },
  async get(id: string) {
    return normalizeCreditRequest(await httpClient.get<CreditRequest>(`/credit-requests/${id}`))
  },
  async create(payload: unknown) {
    return normalizeCreditRequest(await httpClient.post<CreditRequest>('/credit-requests', toCreditRequestPayload(payload)))
  },
  async update(id: string, payload: unknown) {
    return normalizeCreditRequest(await httpClient.patch<CreditRequest>(`/credit-requests/${id}`, toCreditRequestPayload(payload)))
  },
  async cancel(id: string) {
    return normalizeCreditRequest(await httpClient.patch<CreditRequest>(`/credit-requests/${id}/cancel`))
  },
  async analyzing(id: string) {
    return normalizeCreditRequest(await httpClient.patch<CreditRequest>(`/credit-requests/${id}/analyzing`))
  },
  async approve(id: string, notes?: string) {
    return normalizeCreditRequest(await httpClient.patch<CreditRequest>(`/credit-requests/${id}/approve`, { notes }))
  },
  async reject(id: string, reason: string, rejectionImageUrl?: string) {
    return normalizeCreditRequest(await httpClient.patch<CreditRequest>(`/credit-requests/${id}/reject`, { reason, rejectionImageUrl }))
  },
  async messages(id: string) {
    const messages = await httpClient.get<ChatMessage[]>(`/credit-requests/${id}/messages`)
    return Array.isArray(messages) ? messages.map(normalizeChatMessage) : messages
  },
  async sendMessage(id: string, content: string) {
    return normalizeChatMessage(await httpClient.post<ChatMessage>(`/credit-requests/${id}/messages`, { content }))
  },
}
