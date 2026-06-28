<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { dashboardService, type DashboardSummary } from '@/services/api/dashboard.service'
import { formatCurrency, formatNumber } from '@/utils/format'

const summary = ref<DashboardSummary>({
  totalRequests: 0,
  pendingRequests: 0,
  approvedRequests: 0,
  monthCredits: 0,
  monthValue: 0,
  activeResellers: 0,
  activeServers: 0,
})
const notice = ref('')
const range = ref('30d')

const bars = computed(() => [
  { label: 'Pedidos', value: summary.value.totalRequests || 0, max: 220, color: 'var(--gj2-green)' },
  { label: 'Aprovados', value: summary.value.approvedRequests || 0, max: 220, color: 'var(--gj2-blue)' },
  { label: 'Pendentes', value: summary.value.pendingRequests || 0, max: 80, color: 'var(--gj2-yellow)' },
  { label: 'Servidores', value: summary.value.activeServers || 0, max: 60, color: 'var(--gj2-red)' },
])

const approvalRate = computed(() => {
  const total = Number(summary.value.totalRequests || 0)
  if (!total) return 0
  return Math.round((Number(summary.value.approvedRequests || 0) / total) * 100)
})

async function load() {
  notice.value = ''
  try {
    summary.value = { ...summary.value, ...(await dashboardService.admin()) }
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel carregar indicadores reais.'
  }
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <section class="module-hero">
      <div>
        <h1>Analytics</h1>
        <p>Leitura executiva de pedidos, creditos, receita, conversao e pontos de atencao da operacao.</p>
      </div>
      <div class="module-actions">
        <select v-model="range" class="module-select compact-select">
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
          <option value="90d">90 dias</option>
        </select>
      </div>
    </section>

    <section class="module-grid four">
      <div class="module-stat"><span>Receita</span><strong>{{ formatCurrency(summary.monthValue) }}</strong><small>periodo {{ range }}</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Creditos</span><strong>{{ formatNumber(summary.monthCredits) }}</strong><small>vendidos</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-green)"><span>Aprovacao</span><strong>{{ approvalRate }}%</strong><small>pedidos finalizados</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-red)"><span>Fila</span><strong>{{ summary.pendingRequests || 0 }}</strong><small>aguardando acao</small></div>
    </section>

    <p v-if="notice" class="module-row">{{ notice }}</p>

    <section class="analytics-layout">
      <article class="module-card pad chart-card">
        <div class="module-row-line">
          <h2>Performance operacional</h2>
          <span class="module-pill">{{ range }}</span>
        </div>
        <div class="bar-chart">
          <div v-for="bar in bars" :key="bar.label" class="bar-row">
            <span>{{ bar.label }}</span>
            <div><i :style="{ width: `${Math.min(100, (bar.value / bar.max) * 100)}%`, background: bar.color }" /></div>
            <strong>{{ bar.value }}</strong>
          </div>
        </div>
      </article>

      <article class="module-card pad insight-card">
        <h2>Alertas inteligentes</h2>
        <div class="module-list">
          <div class="module-row"><strong>Fila sob controle</strong><small>Pedidos pendentes abaixo do limite operacional.</small></div>
          <div class="module-row"><strong>Receita concentrada</strong><small>Revise servidores com melhor margem para priorizar ofertas.</small></div>
          <div class="module-row"><strong>Templates ativos</strong><small>Mantenha avisos de WhatsApp padronizados para reduzir suporte manual.</small></div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.compact-select {
  width: 140px;
}

.analytics-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(min(100%, 280px), .65fr);
  gap: 22px;
}

.bar-chart {
  margin-top: 28px;
  display: grid;
  gap: 18px;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(min(100%, 110px), 110px) minmax(0, 1fr) minmax(min(100%, 70px), 70px);
  align-items: center;
  gap: 14px;
}

.bar-row span,
.bar-row strong {
  font-weight: 820;
}

.bar-row div {
  height: 14px;
  border-radius: 999px;
  background: var(--gj2-surface-muted);
  overflow: hidden;
}

.bar-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

@media (max-width: 920px) {
  .analytics-layout,
  .bar-row {
    grid-template-columns: 1fr;
  }

  .compact-select {
    width: 100%;
  }
}
</style>
