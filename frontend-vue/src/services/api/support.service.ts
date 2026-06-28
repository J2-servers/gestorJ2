import { httpClient } from '@/services/api/httpClient'
import type { SupportLink, SupportOverview, SupportServerUpdate, SupportTopic } from '@/types/domain'

export const supportService = {
  overview() {
    return httpClient.get<SupportOverview>('/support')
  },
  createTopic(payload: unknown) {
    return httpClient.post<SupportTopic>('/support/topics', payload)
  },
  updateTopic(id: string, payload: unknown) {
    return httpClient.patch<SupportTopic>(`/support/topics/${id}`, payload)
  },
  createLink(payload: unknown) {
    return httpClient.post<SupportLink>('/support/links', payload)
  },
  updateLink(id: string, payload: unknown) {
    return httpClient.patch<SupportLink>(`/support/links/${id}`, payload)
  },
  createServerUpdate(payload: unknown) {
    return httpClient.post<SupportServerUpdate>('/support/server-updates', payload)
  },
  updateServerUpdate(id: string, payload: unknown) {
    return httpClient.patch<SupportServerUpdate>(`/support/server-updates/${id}`, payload)
  },
}
