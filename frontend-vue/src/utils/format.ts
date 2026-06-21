export function asArray<T>(payload: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data
  }
  return fallback
}

export function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
}

export function formatCurrency(value?: number | string | null) {
  const amount = Number(value || 0)
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatNumber(value?: number | string | null) {
  return Number(value || 0).toLocaleString('pt-BR')
}

export function formatDate(value?: string | null) {
  if (!value) return 'sem data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
