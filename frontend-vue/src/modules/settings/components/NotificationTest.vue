<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { useWhatsappTest } from '../composables/useWhatsappTest'
import type { AdminSettings } from '../types'

const props = defineProps<{
  settings: AdminSettings | null
}>()

const { conn, queue, testing, result, loadQueue, checkConnection, sendTest } = useWhatsappTest()

const hasEvolution = computed(
  () => Boolean(props.settings?.evolution_api_url && props.settings?.evolution_instance && props.settings?.evolution_api_key),
)
const adminPhone = computed(() => props.settings?.admin_whatsapp ?? '')

const TESTS: { type: string; label: string; message: string }[] = [
  { type: 'admin', label: 'Testar novo pedido', message: 'Teste de novo pedido: uma recarga entrou na fila e aguarda processamento.' },
  { type: 'approval', label: 'Testar aprovação', message: 'Teste de aprovação: créditos liberados no painel.' },
  { type: 'rejection', label: 'Testar rejeição', message: 'Teste de rejeição: pedido recusado com motivo demonstrativo.' },
]

const statusRows = computed(() => [
  { label: 'URL Base', ok: Boolean(props.settings?.evolution_api_url), value: props.settings?.evolution_api_url },
  { label: 'Instância', ok: Boolean(props.settings?.evolution_instance), value: props.settings?.evolution_instance },
  { label: 'API Key', ok: Boolean(props.settings?.evolution_api_key), value: props.settings?.evolution_api_key ? `${props.settings.evolution_api_key.slice(0, 8)}...` : '' },
  { label: 'Admin WhatsApp', ok: Boolean(adminPhone.value), value: adminPhone.value },
])

const sec = (ms?: number) => Math.round((ms || 0) / 1000)

function runTest(type: string, message: string) {
  if (!adminPhone.value) return
  sendTest(type, adminPhone.value, message)
}

onMounted(loadQueue)
</script>

<template>
  <div class="set-form">
    <div class="set-head">
      <div class="set-head-icon">📨</div>
      <div>
        <h2>Testes de notificação</h2>
        <p>Verifique Evolution API, fila anti-ban e mensagens de teste.</p>
      </div>
    </div>

    <section class="set-section">
      <h3>Diagnóstico Evolution API</h3>
      <p>Configuração atual usada pelo backend.</p>
      <div class="nt-status">
        <div v-for="row in statusRows" :key="row.label" class="nt-status-row">
          <span>{{ row.label }}</span>
          <strong>{{ row.value || (row.ok ? 'configurado' : 'pendente') }}</strong>
          <em :class="row.ok ? 'ok' : 'off'">{{ row.ok ? '✓' : '✕' }}</em>
        </div>
      </div>
      <div class="set-actions">
        <button class="set-btn" type="button" :disabled="!hasEvolution || conn?.loading" @click="checkConnection">
          {{ conn?.loading ? 'Checando...' : 'Checar conexão' }}
        </button>
      </div>
      <div v-if="conn && !conn.loading" :class="conn.ok ? 'set-success' : 'set-error'">
        {{ conn.ok ? 'Conectado' : `Desconectado${conn.message ? ' — ' + conn.message : ''}` }}
      </div>
    </section>

    <section v-if="queue" class="set-section">
      <h3>Fila anti-ban</h3>
      <p>Status atual dos disparos enfileirados.</p>
      <div class="nt-queue">
        <div><span>Aguardando</span><strong>{{ queue.waiting ?? 0 }}</strong></div>
        <div><span>Agendadas</span><strong>{{ queue.delayed ?? 0 }}</strong></div>
        <div><span>Ativas</span><strong>{{ queue.active ?? 0 }}</strong></div>
        <div><span>Falhas</span><strong>{{ queue.failed ?? 0 }}</strong></div>
      </div>
      <p class="set-note">
        Delay aleatório: {{ sec(queue.throttle?.minDelayMs) }}s a {{ sec(queue.throttle?.maxDelayMs) }}s.
        Intervalo mínimo: {{ sec(queue.throttle?.minSendIntervalMs) }}s.
      </p>
    </section>

    <div v-if="!hasEvolution" class="set-error">
      Configure a Evolution API na aba WhatsApp antes de testar.
    </div>

    <section class="set-section">
      <h3>Mensagens de teste</h3>
      <p>Destino: {{ adminPhone || 'número não configurado' }}</p>
      <div class="nt-tests">
        <button
          v-for="test in TESTS"
          :key="test.type"
          class="set-btn"
          type="button"
          :disabled="!hasEvolution || !adminPhone || Boolean(testing)"
          @click="runTest(test.type, test.message)"
        >
          {{ testing === test.type ? 'Enviando...' : test.label }}
        </button>
      </div>
      <div v-if="result" :class="result.success ? 'set-success' : 'set-error'">
        {{ result.success ? `Enfileirado. Log: ${result.logId || '-'}` : result.error }}
      </div>
    </section>
  </div>
</template>

<style scoped>
.nt-status {
  display: grid;
  gap: 9px;
}

.nt-status-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--gj2-row-bg);
  border: 1px solid var(--gj2-line);
}

.nt-status-row span {
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 760;
}

.nt-status-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--gj2-ink);
  font-size: 13px;
}

.nt-status-row em {
  font-style: normal;
  font-weight: 900;
}

.nt-status-row em.ok { color: #3f7d63; }
.nt-status-row em.off { color: #c23b34; }

.nt-queue {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.nt-queue div {
  padding: 12px;
  border-radius: 14px;
  background: var(--gj2-row-bg);
  border: 1px solid var(--gj2-line);
}

.nt-queue span {
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 760;
  text-transform: uppercase;
}

.nt-queue strong {
  display: block;
  margin-top: 5px;
  color: var(--gj2-green-deep);
  font-size: 24px;
  font-weight: 870;
}

.nt-tests {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 720px) {
  .nt-status-row,
  .nt-queue,
  .nt-tests {
    grid-template-columns: 1fr;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .nt-status-row,
html[data-theme="dark"] .nt-queue div {
  background: var(--gj2-surface-muted);
}
</style>
