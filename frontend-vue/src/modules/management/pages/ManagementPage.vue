<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { creditRequestsService } from '@/services/api/creditRequests.service'
import { formatCurrency, formatNumber } from '@/utils/format'
import type { CreditRequest } from '@/types/domain'

const requests = ref<CreditRequest[]>([])
const loading = ref(true)
const notice = ref('')

function inRange(request: CreditRequest, days: number) {
  const date = new Date(request.created_date || '')
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= days * 86400000
}

async function load() {
  loading.value = true
  notice.value = ''
  try {
    const result = await creditRequestsService.list(1000)
    requests.value = result?.data ?? []
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel carregar indicadores reais.'
    requests.value = []
  } finally {
    loading.value = false
  }
}

const done = computed(() => requests.value.filter((item) => item.status === 'recharged'))
const week = computed(() => done.value.filter((item) => inRange(item, 7)))
const month = computed(() => done.value.filter((item) => inRange(item, 31)))
const stats = computed(() => ({
  todayCredits: done.value.filter((item) => inRange(item, 1)).reduce((sum, item) => sum + Number(item.requested_credits || 0), 0),
  weekCredits: week.value.reduce((sum, item) => sum + Number(item.requested_credits || 0), 0),
  weekValue: week.value.reduce((sum, item) => sum + Number(item.total_value || 0), 0),
  monthCredits: month.value.reduce((sum, item) => sum + Number(item.requested_credits || 0), 0),
  monthValue: month.value.reduce((sum, item) => sum + Number(item.total_value || 0), 0),
  successRate: requests.value.length ? Math.round((done.value.length / requests.value.length) * 100) : 0,
}))

onMounted(load)
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Minha gestão</h1>
        <p>Acompanhe seus créditos, gastos e desempenho por período.</p>
      </div>
      <div class="module-actions">
      </div>
    </header>

    <div v-if="notice" class="module-card pad">{{ notice }}</div>

    <section class="module-grid four">
      <article class="module-stat"><span>Creditos hoje</span><strong>{{ formatNumber(stats.todayCredits) }}</strong><small>movimento do dia</small></article>
      <article class="module-stat"><span>Semana</span><strong>{{ formatNumber(stats.weekCredits) }}</strong><small>{{ formatCurrency(stats.weekValue) }}</small></article>
      <article class="module-stat"><span>Mês</span><strong>{{ formatNumber(stats.monthCredits) }}</strong><small>{{ formatCurrency(stats.monthValue) }}</small></article>
      <article class="module-stat"><span>Sucesso</span><strong>{{ stats.successRate }}%</strong><small>{{ done.length }}/{{ requests.length }} recarregados</small></article>
    </section>

    <section class="module-card pad">
      <h2>Performance operacional</h2>
      <div class="management-bars">
        <div><span>Hoje</span><i :style="{ width: `${Math.min(100, stats.todayCredits)}%` }" /></div>
        <div><span>Semana</span><i :style="{ width: `${Math.min(100, stats.weekCredits / 10)}%` }" /></div>
        <div><span>Mês</span><i :style="{ width: `${Math.min(100, stats.monthCredits / 20)}%` }" /></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.management-bars {
  display: grid;
  gap: 16px;
  margin-top: 22px;
}

.management-bars div {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 12px;
  color: var(--gj2-muted);
  font-weight: 800;
}

.management-bars i {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--gj2-green), var(--gj2-blue));
}
</style>
