import { httpClient } from '@/services/api/httpClient'

export interface DashboardSummary {
  totalRequests?: number
  pendingRequests?: number
  approvedRequests?: number
  monthCredits?: number
  monthValue?: number
  activeResellers?: number
  activeServers?: number
}

export const dashboardService = {
  admin() {
    return httpClient.get<DashboardSummary>('/dashboard/admin')
  },
  reseller() {
    return httpClient.get<DashboardSummary>('/dashboard/reseller')
  },
}
