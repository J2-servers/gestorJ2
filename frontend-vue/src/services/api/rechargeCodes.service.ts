import { httpClient } from '@/services/api/httpClient'
import type { RechargeCode, RechargeCodeBatch, RechargeCodeImportMapping, RechargeCodeImportPreview, RechargeCodeProduct, RechargeCodeSale } from '@/types/domain'

function normalizeProduct(product: RechargeCodeProduct): RechargeCodeProduct {
  return {
    ...product,
    server_id: product.server_id ?? product.serverId ?? null,
    cost_value: Number(product.cost_value ?? product.costValue ?? 0),
    sale_value: Number(product.sale_value ?? product.saleValue ?? 0),
  }
}

function normalizeSale(sale: RechargeCodeSale): RechargeCodeSale {
  return {
    ...sale,
    product: normalizeProduct(sale.product),
    totalValue: Number(sale.totalValue ?? sale.total_value ?? 0),
    soldAt: sale.soldAt ?? sale.sold_at ?? '',
  }
}

export const rechargeCodesService = {
  async listProducts() {
    const products = await httpClient.get<RechargeCodeProduct[]>('/recharge-codes/products')
    return Array.isArray(products) ? products.map(normalizeProduct) : []
  },
  async createProduct(payload: unknown) {
    return normalizeProduct(await httpClient.post<RechargeCodeProduct>('/recharge-codes/products', payload))
  },
  async updateProduct(id: string, payload: unknown) {
    return normalizeProduct(await httpClient.patch<RechargeCodeProduct>(`/recharge-codes/products/${id}`, payload))
  },
  listBatches(productId: string) {
    return httpClient.get<RechargeCodeBatch[]>(`/recharge-codes/products/${productId}/batches`)
  },
  listCodes(productId: string, status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return httpClient.get<RechargeCode[]>(`/recharge-codes/products/${productId}/codes${query}`)
  },
  listSales(productId?: string) {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : ''
    return httpClient.get<RechargeCode[]>(`/recharge-codes/sales${query}`)
  },
  voidCode(codeId: string, reason?: string) {
    return httpClient.patch<RechargeCode>(`/recharge-codes/codes/${codeId}/void`, { reason })
  },
  previewImport(productId: string, file: File, mapping?: Partial<RechargeCodeImportMapping>) {
    const form = new FormData()
    form.append('file', file)
    if (mapping?.sheetName) form.append('sheetName', mapping.sheetName)
    if (mapping?.codeColumn) form.append('codeColumn', mapping.codeColumn)
    if (mapping?.pinColumn) form.append('pinColumn', mapping.pinColumn)
    if (mapping?.serialColumn) form.append('serialColumn', mapping.serialColumn)
    if (mapping?.expiresAtColumn) form.append('expiresAtColumn', mapping.expiresAtColumn)
    return httpClient.post<RechargeCodeImportPreview>(`/recharge-codes/products/${productId}/import/preview`, form)
  },
  importXlsx(productId: string, file: File, notes?: string, mapping?: Partial<RechargeCodeImportMapping>) {
    const form = new FormData()
    form.append('file', file)
    if (notes) form.append('notes', notes)
    if (mapping?.sheetName) form.append('sheetName', mapping.sheetName)
    if (mapping?.codeColumn) form.append('codeColumn', mapping.codeColumn)
    if (mapping?.pinColumn) form.append('pinColumn', mapping.pinColumn)
    if (mapping?.serialColumn) form.append('serialColumn', mapping.serialColumn)
    if (mapping?.expiresAtColumn) form.append('expiresAtColumn', mapping.expiresAtColumn)
    return httpClient.post<{ importedCount: number; duplicateCount: number; invalidCount: number; totalRows: number; sheetName: string; maxRows: number }>(
      `/recharge-codes/products/${productId}/import`,
      form,
    )
  },
  sellNext(productId: string, resellerId?: string) {
    return rechargeCodesService.sellLocal(productId, 1, resellerId)
  },
  async sellLocal(productId: string, quantity: number, resellerId?: string) {
    return normalizeSale(await httpClient.post<RechargeCodeSale>(`/recharge-codes/products/${productId}/local-sale`, { quantity, resellerId }))
  },
}
