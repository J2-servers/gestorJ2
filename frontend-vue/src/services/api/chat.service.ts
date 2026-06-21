import { httpClient } from '@/services/api/httpClient'
import { normalizeChatMessage } from '@/services/api/normalizers'
import type { ChatMessage, ChatThread } from '@/types/domain'

export const chatService = {
  threads() {
    return httpClient.get<ChatThread[]>('/chat/threads')
  },
  async messages(resellerId?: string) {
    const qs = resellerId ? `?resellerId=${encodeURIComponent(resellerId)}` : ''
    const messages = await httpClient.get<ChatMessage[]>(`/chat/messages${qs}`)
    return Array.isArray(messages) ? messages.map(normalizeChatMessage) : messages
  },
  async send(content: string, resellerId?: string) {
    return normalizeChatMessage(await httpClient.post<ChatMessage>('/chat/messages', { content, ...(resellerId ? { resellerId } : {}) }))
  },
  archive(resellerId?: string) {
    return httpClient.post('/chat/archive', resellerId ? { resellerId } : {})
  },
  archives(resellerId?: string) {
    const qs = resellerId ? `?resellerId=${encodeURIComponent(resellerId)}` : ''
    return httpClient.get(`/chat/archives${qs}`)
  },
  archiveDetail(id: string) {
    return httpClient.get(`/chat/archives/${id}`)
  },
}
