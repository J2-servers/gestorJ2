import { httpClient } from '@/services/api/httpClient'
import { normalizeChatMessage } from '@/services/api/normalizers'
import type { ChatMessage, ChatThread } from '@/types/domain'

function normalizeThread(raw: ChatThread & Record<string, unknown>): ChatThread {
  return {
    ...raw,
    resellerId: (raw.resellerId ?? raw.reseller_id) as string | undefined,
    resellerName: (raw.resellerName ?? raw.name ?? raw.email) as string | undefined,
    resellerImageUrl: (raw.resellerImageUrl ?? raw.profileImageUrl ?? raw.profile_image_url) as string | undefined,
    counterpartImageUrl: (raw.counterpartImageUrl ?? raw.counterpart_image_url) as string | undefined,
    lastMessage: (raw.lastMessage ?? raw.last_message) as string | undefined,
    unreadCount: Number(raw.unreadCount ?? raw.unread ?? 0),
    updatedAt: (raw.updatedAt ?? raw.lastAt ?? raw.createdAt ?? raw.created_date) as string | undefined,
  }
}

export const chatService = {
  threads() {
    return httpClient.get<ChatThread[]>('/chat/threads').then((threads) =>
      Array.isArray(threads) ? threads.map((thread) => normalizeThread(thread as ChatThread & Record<string, unknown>)) : threads,
    )
  },
  async messages(resellerId?: string) {
    const qs = resellerId ? `?resellerId=${encodeURIComponent(resellerId)}` : ''
    const messages = await httpClient.get<ChatMessage[]>(`/chat/messages${qs}`)
    return Array.isArray(messages) ? messages.map(normalizeChatMessage) : messages
  },
  async send(content: string, resellerId?: string, attachmentUrl?: string, attachmentMime?: string) {
    return normalizeChatMessage(await httpClient.post<ChatMessage>('/chat/messages', {
      content,
      ...(resellerId ? { resellerId } : {}),
      ...(attachmentUrl ? { attachmentUrl, attachmentMime } : {}),
    }))
  },
  async uploadFile(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    return httpClient.post<{ fileUrl: string; mimeType: string; filename: string }>('/uploads', fd)
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
