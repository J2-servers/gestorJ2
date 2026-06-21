<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { maintenanceService } from '@/services/api/maintenance.service'
import { asArray, asRecord } from '@/utils/format'

const overview = ref<Record<string, unknown>>({})
const errors = ref<Record<string, unknown>[]>([])
const scripts = ref<Record<string, unknown>[]>([])
const notice = ref('')

const health = computed(() => String(overview.value.status || overview.value.health || 'monitorando'))
const pendingErrors = computed(() => errors.value.filter((item) => !item.resolved).length)

async function load() {
  notice.value = ''
  try {
    overview.value = asRecord(await maintenanceService.overview())
  } catch (error) {
    overview.value = {}
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel carregar manutencao real.'
  }
  try {
    errors.value = asArray<Record<string, unknown>>(await maintenanceService.errors(30))
  } catch {
    errors.value = []
  }
  try {
    scripts.value = asArray<Record<string, unknown>>(await maintenanceService.scripts())
  } catch {
    scripts.value = []
  }
}

async function resolveError(id?: unknown) {
  if (!id) return
  try {
    await maintenanceService.resolveError(String(id))
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'A API nao confirmou a atualizacao.'
    return
  }
  errors.value = errors.value.map((item) => (item.id === id ? { ...item, resolved: true } : item))
}

async function runScript(id?: unknown) {
  if (!id) return
  try {
    await maintenanceService.diagnoseScript(String(id))
    notice.value = 'Diagnostico solicitado.'
  } catch {
    notice.value = 'A API nao confirmou a execucao do diagnostico.'
  }
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <section class="module-hero">
      <div>
        <h1>Manutencao</h1>
        <p>Ferramentas administrativas para saude do sistema, erros, scripts e operacoes tecnicas controladas.</p>
      </div>
    </section>

    <section class="module-grid three">
      <div class="module-stat"><span>Saude</span><strong>{{ health }}</strong><small>visao geral</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-red)"><span>Erros</span><strong>{{ pendingErrors }}</strong><small>pendentes</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Scripts</span><strong>{{ scripts.length }}</strong><small>rotinas tecnicas</small></div>
    </section>

    <p v-if="notice" class="module-row">{{ notice }}</p>

    <section class="maintenance-layout">
      <article class="module-card pad">
        <h2>Erros recentes</h2>
        <div class="module-list maint-list">
          <div v-for="item in errors" :key="String(item.id || item.message)" class="module-row">
            <div class="module-row-line">
              <strong>{{ item.message || item.error || 'Evento sem descricao' }}</strong>
              <span class="module-pill">{{ item.severity || 'info' }}</span>
            </div>
            <small>{{ item.resolved ? 'Resolvido' : 'Pendente' }}</small>
            <button type="button" @click="resolveError(item.id)">Resolver</button>
          </div>
        </div>
      </article>

      <article class="module-card pad">
        <h2>Scripts seguros</h2>
        <div class="module-list maint-list">
          <div v-for="script in scripts" :key="String(script.id || script.name)" class="module-row">
            <div class="module-row-line">
              <strong>{{ script.name || script.id }}</strong>
              <span class="module-pill">{{ script.status || 'ready' }}</span>
            </div>
            <small>Executar primeiro diagnostico, depois aplicar somente com decisao registrada.</small>
            <button type="button" @click="runScript(script.id)">Diagnosticar</button>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.maintenance-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 22px;
}

.maint-list {
  margin-top: 18px;
}

.maint-list button {
  justify-self: start;
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: var(--gj2-sidebar);
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 900px) {
  .maintenance-layout {
    grid-template-columns: 1fr;
  }
}
</style>
