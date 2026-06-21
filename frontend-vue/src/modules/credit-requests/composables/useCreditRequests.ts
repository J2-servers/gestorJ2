import { computed, ref } from 'vue'

import { ApiError } from '@/services/api/httpClient'
import { creditRequestsService } from '@/services/api/creditRequests.service'
import type { CreditRequest } from '@/types/domain'

import type { StatusFilter } from '../types'

// Composable de dados dos pedidos: carrega a lista, expoe filtros e executa
// as acoes (analisar/aprovar/rejeitar/cancelar) atualizando o estado local.
export function useCreditRequests() {
  const requests = ref<CreditRequest[]>([])
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')
  const filter = ref<StatusFilter>('all')
  const search = ref('')
  // Guarda qual pedido esta com acao em andamento (loading por linha).
  const actingId = ref<string | null>(null)

  function normalizeError(err: unknown, fallback: string) {
    if (err instanceof ApiError) return err.message
    if (err instanceof Error) return err.message
    return fallback
  }

  async function load() {
    loading.value = true
    error.value = ''
    notice.value = ''
    try {
      const result = await creditRequestsService.list()
      requests.value = result?.data ?? []
    } catch (err) {
      error.value = normalizeError(err, 'Não foi possível carregar os pedidos.')
      requests.value = []
      const message = normalizeError(err, 'Nao foi possivel carregar os pedidos.')
      notice.value = `${message} Verifique a conexao com o backend.`
    } finally {
      loading.value = false
    }
  }

  function replaceRequest(updated: CreditRequest) {
    const index = requests.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) requests.value.splice(index, 1, { ...requests.value[index], ...updated })
  }

  // Executor generico de acao: marca a linha, chama o service e aplica o retorno.
  async function runAction(
    id: string,
    action: () => Promise<CreditRequest>,
  ) {
    actingId.value = id
    error.value = ''
    try {
      const updated = await action()
      if (updated?.id) replaceRequest(updated)
      else await load()
      return true
    } catch (err) {
      error.value = normalizeError(err, 'Não foi possível concluir a ação.')
      return false
    } finally {
      actingId.value = null
    }
  }

  const analyze = (id: string) => runAction(id, () => creditRequestsService.analyzing(id))
  const approve = (id: string, notes?: string) =>
    runAction(id, () => creditRequestsService.approve(id, notes))
  const reject = (id: string, reason: string, rejectionImageUrl?: string) =>
    runAction(id, () => creditRequestsService.reject(id, reason, rejectionImageUrl))
  const cancel = (id: string) => runAction(id, () => creditRequestsService.cancel(id))

  const filtered = computed(() => {
    const term = search.value.trim().toLowerCase()
    return requests.value.filter((request) => {
      const matchStatus = filter.value === 'all' || request.status === filter.value
      if (!matchStatus) return false
      if (!term) return true
      const haystack = [
        request.server_snapshot?.name,
        request.reseller?.name,
        request.reseller?.email,
        request.login,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  })

  const counts = computed(() => {
    const base: Record<string, number> = { all: requests.value.length }
    for (const request of requests.value) {
      base[request.status] = (base[request.status] ?? 0) + 1
    }
    return base
  })

  const totals = computed(() => {
    const recharged = requests.value.filter((request) => request.status === 'recharged')
    return {
      count: requests.value.length,
      revenue: recharged.reduce((sum, request) => sum + (Number(request.total_value) || 0), 0),
      credits: recharged.reduce((sum, request) => sum + (Number(request.requested_credits) || 0), 0),
    }
  })

  return {
    requests,
    filtered,
    counts,
    totals,
    loading,
    error,
    notice,
    filter,
    search,
    actingId,
    load,
    analyze,
    approve,
    reject,
    cancel,
  }
}
