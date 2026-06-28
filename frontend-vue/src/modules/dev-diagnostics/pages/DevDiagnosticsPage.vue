<script setup lang="ts">
import { onMounted, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { maintenanceService } from '@/services/api/maintenance.service'
import { formatDate } from '@/utils/format'

const overview = ref<Record<string, any> | null>(null)
const scripts = ref<any[]>([])
const errors = ref<any[]>([])
const queue = ref<Record<string, any> | null>(null)
const migrations = ref<Record<string, any> | null>(null)
const busy = ref('')
const toast = ref('')

async function load() {
  busy.value = 'load'
  const [ov, scr, err, q, mig] = await Promise.all([
    maintenanceService.overview().catch(() => null),
    maintenanceService.scripts().catch(() => []),
    maintenanceService.errors(100).catch(() => []),
    maintenanceService.whatsappQueue().catch(() => null),
    maintenanceService.migrations().catch(() => null),
  ])
  overview.value = ov as Record<string, any> | null
  scripts.value = Array.isArray(scr) ? scr : []
  errors.value = Array.isArray(err) ? err : []
  queue.value = q as Record<string, any> | null
  migrations.value = mig as Record<string, any> | null
  busy.value = ''
}

async function run(label: string, action: () => Promise<unknown>) {
  busy.value = label
  const result = await action().catch((err) => ({ error: err.message }))
  toast.value = JSON.stringify(result)
  busy.value = ''
  await load()
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Dev diagnostics</h1>
        <p>Ferramentas de diagnóstico, fila WhatsApp, erros e migrations.</p>
      </div>
    </header>

    <section class="module-grid four">
      <article class="module-stat"><span>Scripts</span><strong>{{ scripts.length }}</strong></article>
      <article class="module-stat"><span>Erros</span><strong>{{ errors.length }}</strong></article>
      <article class="module-stat"><span>Fila WA</span><strong>{{ queue?.pending ?? queue?.queued ?? 0 }}</strong></article>
      <article class="module-stat"><span>Migrations</span><strong>{{ migrations?.pending ?? 0 }}</strong></article>
    </section>

    <div class="module-grid two">
      <section class="module-card pad">
        <h2>Scripts</h2>
        <div class="module-list">
          <article v-for="script in scripts" :key="script.id" class="module-row">
            <strong>{{ script.name }}</strong>
            <small>{{ script.description || script.status }}</small>
            <div class="module-actions">
              <UiButton variant="secondary" :disabled="busy === script.id" @click="run(script.id, () => maintenanceService.diagnoseScript(script.id))">Diagnosticar</UiButton>
              <UiButton :disabled="busy === script.id" @click="run(script.id, () => maintenanceService.applyScript(script.id))">Aplicar</UiButton>
            </div>
          </article>
        </div>
      </section>

      <section class="module-card pad">
        <h2>Erros</h2>
        <div class="module-actions">
          <UiButton variant="secondary" @click="run('retry-wa', () => maintenanceService.retryWhatsappQueue())">Reprocessar WhatsApp</UiButton>
          <UiButton variant="secondary" @click="run('migrations', () => maintenanceService.deployMigrations())">Aplicar migrations</UiButton>
          <UiButton variant="secondary" @click="run('clear-errors', () => maintenanceService.clearErrors())">Limpar erros</UiButton>
        </div>
        <div class="module-list">
          <article v-for="error in errors" :key="error.id || error.created_date" class="module-row">
            <div class="module-row-line"><strong>{{ error.message || 'Erro' }}</strong><span>{{ formatDate(error.created_date) }}</span></div>
            <small>{{ error.route || error.stack || error.context }}</small>
            <UiButton v-if="error.id" variant="secondary" @click="run(error.id, () => maintenanceService.resolveError(error.id))">Resolver</UiButton>
          </article>
        </div>
      </section>
    </div>

    <section class="module-card pad">
      <h2>Overview bruto</h2>
      <pre class="dev-pre">{{ overview || 'Sem dados' }}</pre>
      <pre v-if="toast" class="dev-pre">{{ toast }}</pre>
    </section>
  </div>
</template>

<style scoped>
.dev-pre {
  overflow: auto;
  padding: 16px;
  border-radius: 18px;
  white-space: pre-wrap;
  background: #f3f4f2;
}

html[data-theme="dark"] .dev-pre {
  background: var(--gj2-surface-muted);
  color: var(--gj2-ink);
}
</style>
