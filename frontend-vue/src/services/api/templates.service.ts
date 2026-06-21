import { httpClient } from '@/services/api/httpClient'
import { normalizeTemplate, toTemplatePayload } from '@/services/api/normalizers'
import type { MessageTemplate } from '@/types/domain'

export const templatesService = {
  async list() {
    const templates = await httpClient.get<MessageTemplate[]>('/message-templates')
    return Array.isArray(templates) ? templates.map(normalizeTemplate) : templates
  },
  async create(payload: unknown) {
    return normalizeTemplate(await httpClient.post<MessageTemplate>('/message-templates', toTemplatePayload(payload)))
  },
  async update(id: string, payload: unknown) {
    return normalizeTemplate(await httpClient.patch<MessageTemplate>(`/message-templates/${id}`, toTemplatePayload(payload)))
  },
  async remove(id: string) {
    return normalizeTemplate(await httpClient.delete<MessageTemplate>(`/message-templates/${id}`))
  },
}
