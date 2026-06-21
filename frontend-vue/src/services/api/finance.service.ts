import { httpClient } from '@/services/api/httpClient'
import { normalizeInvoice } from '@/services/api/normalizers'
import type { Invoice } from '@/types/domain'

export const financeService = {
  async invoices() {
    const invoices = await httpClient.get<Invoice[]>('/invoices')
    return Array.isArray(invoices) ? invoices.map(normalizeInvoice) : invoices
  },
  async invoice(id: string) {
    return normalizeInvoice(await httpClient.get<Invoice>(`/invoices/${id}`))
  },
  async generate(resellerId: string) {
    return normalizeInvoice(await httpClient.post<Invoice>('/invoices', { resellerId }))
  },
  async markPaid(id: string, proofUrl?: string) {
    return normalizeInvoice(await httpClient.patch<Invoice>(`/invoices/${id}/pay`, { proofUrl }))
  },
  resend(id: string) {
    return httpClient.post(`/invoices/${id}/resend`, {})
  },
}
