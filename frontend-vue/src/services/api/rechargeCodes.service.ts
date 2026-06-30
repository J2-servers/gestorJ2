import { httpClient } from '@/services/api/httpClient'
import type {
  PlanModality,
  RechargeCode,
  RechargeCodeBatch,
  RechargeCodeImportMapping,
  RechargeCodeImportPreview,
  RechargeCodeOrder,
  RechargeCodePaymentOption,
  RechargeCodeProduct,
  RechargeCodeSale,
} from '@/types/domain'

function normalizeProduct(product: RechargeCodeProduct): RechargeCodeProduct {
  return {
    ...product,
    server_id: product.server_id ?? product.serverId ?? null,
    modality_id: product.modality_id ?? product.modalityId ?? null,
    cost_value: Number(product.cost_value ?? product.costValue ?? 0),
    sale_value: Number(product.sale_value ?? product.saleValue ?? 0),
    availableForSale: product.availableForSale ?? product.available_for_sale ?? false,
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
  async catalog() {
    const products = await httpClient.get<RechargeCodeProduct[]>('/recharge-codes/catalog')
    return Array.isArray(products) ? products.map(normalizeProduct) : []
  },
  async listProducts() {
    const products = await httpClient.get<RechargeCodeProduct[]>('/recharge-codes/products')
    return Array.isArray(products) ? products.map(normalizeProduct) : []
  },
  listModalities() {
    return httpClient.get<PlanModality[]>('/recharge-codes/modalities')
  },
  createModality(payload: unknown) {
    return httpClient.post<PlanModality>('/recharge-codes/modalities', payload)
  },
  updateModality(id: string, payload: unknown) {
    return httpClient.patch<PlanModality>(`/recharge-codes/modalities/${id}`, payload)
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
    if (mapping?.serverColumn) form.append('serverColumn', mapping.serverColumn)
    if (mapping?.modalityColumn) form.append('modalityColumn', mapping.modalityColumn)
    if (mapping?.costColumn) form.append('costColumn', mapping.costColumn)
    if (mapping?.batchColumn) form.append('batchColumn', mapping.batchColumn)
    if (mapping?.supplierColumn) form.append('supplierColumn', mapping.supplierColumn)
    if (mapping?.noteColumn) form.append('noteColumn', mapping.noteColumn)
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
    if (mapping?.serverColumn) form.append('serverColumn', mapping.serverColumn)
    if (mapping?.modalityColumn) form.append('modalityColumn', mapping.modalityColumn)
    if (mapping?.costColumn) form.append('costColumn', mapping.costColumn)
    if (mapping?.batchColumn) form.append('batchColumn', mapping.batchColumn)
    if (mapping?.supplierColumn) form.append('supplierColumn', mapping.supplierColumn)
    if (mapping?.noteColumn) form.append('noteColumn', mapping.noteColumn)
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
  listMyPurchases() {
    return httpClient.get<RechargeCodeOrder[]>('/recharge-codes/my-purchases')
  },
  paymentOptions() {
    return httpClient.get<RechargeCodePaymentOption[]>('/recharge-codes/payment-options')
  },
  createOrder(items: Array<{ productId: string; quantity: number }>, payerTaxNumber?: string, provider?: string) {
    return httpClient.post<RechargeCodeOrder>('/recharge-codes/orders', { items, payerTaxNumber, provider })
  },
  listOrders() {
    return httpClient.get<RechargeCodeOrder[]>('/recharge-codes/orders')
  },
  approvePayment(orderId: string, providerRef?: string) {
    return httpClient.patch<RechargeCodeOrder>(`/recharge-codes/orders/${orderId}/approve-payment`, { providerRef })
  },
  rejectPayment(orderId: string) {
    return httpClient.patch<RechargeCodeOrder>(`/recharge-codes/orders/${orderId}/reject-payment`, {})
  },
}
