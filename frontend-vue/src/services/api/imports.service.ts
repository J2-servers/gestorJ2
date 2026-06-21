import { httpClient } from '@/services/api/httpClient'

export const importsService = {
  previewOrders(csv: string, mapping: Record<string, string> = {}, costs: Record<string, number> = {}) {
    return httpClient.post('/import/orders/preview', { csv, mapping, costs })
  },
  commitOrders(
    csv: string,
    mapping: Record<string, string> = {},
    costs: Record<string, number> = {},
    statusMode = 'keep',
  ) {
    return httpClient.post('/import/orders/commit', { csv, mapping, costs, statusMode })
  },
}
