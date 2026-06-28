<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { importsService } from '@/services/api/imports.service'
import { formatCurrency, formatNumber } from '@/utils/format'

const csv = ref('')
const fileName = ref('')
const preview = ref<Record<string, any> | null>(null)
const mapping = reactive<Record<string, string>>({})
const costs = reactive<Record<string, number>>({})
const statusMode = ref('keep')
const loading = ref(false)
const committing = ref(false)
const error = ref('')
const result = ref<Record<string, any> | null>(null)

const groups = computed(() => {
  const rawGroups = preview.value?.canonicalGroups || []
  return rawGroups.map((group: any) => {
    const cost = Number(costs[group.canonical] || 0)
    const margin = Number(group.totalValue || 0) - Number(group.totalCredits || 0) * cost
    return { ...group, cost, margin }
  })
})

async function readFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileName.value = file.name
  csv.value = await file.text()
  await runPreview()
}

async function runPreview() {
  loading.value = true
  error.value = ''
  result.value = null
  try {
    preview.value = (await importsService.previewOrders(csv.value, mapping, costs)) as Record<string, any>
    if (Object.keys(mapping).length === 0) {
      for (const item of preview.value?.rawServers || []) mapping[item.raw] = item.raw
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao analisar CSV.'
  } finally {
    loading.value = false
  }
}

function groupByBrand() {
  const rules: [RegExp, string][] = [
    [/BLADE/i, 'BLADE'],
    [/TVS/i, 'TVS ORIGINAL'],
    [/NOBRE/i, 'NOBRE TV'],
    [/UNITV|UNI\s*TV/i, 'UNITV'],
    [/X\s*PRIME|XPRIME/i, 'XPRIME'],
  ]
  for (const item of preview.value?.rawServers || []) {
    mapping[item.raw] = rules.find(([pattern]) => pattern.test(item.raw))?.[1] || String(item.raw).split(/\s+/)[0].toUpperCase()
  }
}

async function commit() {
  committing.value = true
  error.value = ''
  try {
    result.value = (await importsService.commitOrders(csv.value, mapping, costs, statusMode.value)) as Record<string, any>
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao importar.'
  } finally {
    committing.value = false
  }
}
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Importar pedidos</h1>
        <p>Analise CSVs, agrupe servidores iguais, crie revendedores com senha padrão e grave o histórico de vendas.</p>
      </div>
    </header>

    <section class="module-card pad import-drop">
      <input type="file" accept=".csv,text/csv" @change="readFile" />
      <strong>{{ fileName || 'Escolha um arquivo CSV' }}</strong>
      <small>O backend fará a prévia antes de gravar qualquer dado.</small>
    </section>

    <div v-if="error" class="import-error">{{ error }}</div>

    <template v-if="preview">
      <section class="module-grid four">
        <article class="module-stat"><span>Movimentações</span><strong>{{ formatNumber(preview.totalRows) }}</strong></article>
        <article class="module-stat"><span>Servidores</span><strong>{{ groups.length }}</strong></article>
        <article class="module-stat"><span>Receita</span><strong>{{ formatCurrency(preview.totals?.totalValue) }}</strong></article>
        <article class="module-stat"><span>Revendedores novos</span><strong>{{ preview.reseller?.willCreate || 0 }}</strong><small>senha 102030Ab</small></article>
      </section>

      <section class="module-card pad">
        <div class="module-toolbar">
          <h2>Unificação de servidores</h2>
          <div class="module-actions">
            <button class="module-chip active" @click="groupByBrand">Agrupar por marca</button>
            <button class="module-chip" @click="runPreview">{{ loading ? 'Atualizando...' : 'Atualizar previa' }}</button>
          </div>
        </div>
        <div class="import-table">
          <label v-for="item in preview.rawServers || []" :key="item.raw" class="module-label">
            {{ item.raw }}
            <input v-model="mapping[item.raw]" class="module-input" />
          </label>
        </div>
      </section>

      <section class="module-card pad">
        <h2>Custo por servidor final</h2>
        <div class="import-table">
          <label v-for="group in groups" :key="group.canonical" class="module-label">
            {{ group.canonical }} · margem {{ formatCurrency(group.margin) }}
            <input v-model.number="costs[group.canonical]" class="module-input" type="number" min="0" step="0.01" placeholder="Custo por credito" />
          </label>
        </div>
      </section>

      <section class="module-card pad">
        <h2>Gravar no sistema</h2>
        <div class="module-chip-row">
          <button class="module-chip" :class="{ active: statusMode === 'keep' }" @click="statusMode = 'keep'">Manter status CSV</button>
          <button class="module-chip" :class="{ active: statusMode === 'recharged' }" @click="statusMode = 'recharged'">Marcar como recarregado</button>
        </div>
        <UiButton :disabled="committing" @click="commit">{{ committing ? 'Importando...' : 'Importar agora' }}</UiButton>
        <pre v-if="result" class="import-result">{{ result }}</pre>
      </section>
    </template>
  </div>
</template>

<style scoped>
.import-drop {
  display: grid;
  gap: 8px;
}

.import-table {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.import-error,
.import-result {
  padding: 16px;
  border-radius: 18px;
}

.import-error {
  color: #a42f2b;
  background: #ffe3e0;
}

.import-result {
  overflow: auto;
  color: #426c55;
  background: #e8f7ee;
}

@media (max-width: 880px) {
  .import-table {
    grid-template-columns: 1fr;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .import-error {
  color: #ff8278;
  background: rgba(194, 59, 52, .15);
}

html[data-theme="dark"] .import-result {
  color: #6abf96;
  background: rgba(66, 108, 85, .18);
}
</style>
