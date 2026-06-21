import { httpClient } from '@/services/api/httpClient'
import { normalizeAuditLog } from '@/services/api/normalizers'

export const auditService = {
  async list() {
    const logs = await httpClient.get('/audit')
    return Array.isArray(logs) ? logs.map(normalizeAuditLog) : logs
  },
}
