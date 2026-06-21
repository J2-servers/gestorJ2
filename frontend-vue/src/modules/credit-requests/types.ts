import type { CreditRequest } from '@/types/domain'

export type RequestStatus = CreditRequest['status']

export type StatusTone = 'yellow' | 'blue' | 'green' | 'red' | 'neutral'

export interface StatusMeta {
  label: string
  tone: StatusTone
}

// Metadados de exibicao por status. Centralizado para lista, card e badge
// usarem a mesma fonte de verdade.
export const STATUS_META: Record<RequestStatus, StatusMeta> = {
  pending: { label: 'Pendente', tone: 'yellow' },
  analyzing: { label: 'Em análise', tone: 'blue' },
  recharged: { label: 'Recarregado', tone: 'green' },
  rejected: { label: 'Rejeitado', tone: 'red' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
}

// Filtros disponiveis na pagina (inclui "todos").
export type StatusFilter = RequestStatus | 'all'

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'analyzing', label: 'Em análise' },
  { value: 'recharged', label: 'Recarregados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'canceled', label: 'Cancelados' },
]

export function statusMeta(status: RequestStatus): StatusMeta {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' }
}
