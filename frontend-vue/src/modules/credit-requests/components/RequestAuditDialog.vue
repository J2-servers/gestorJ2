<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { auditService } from '@/services/api/audit.service'
import type { AuditLog, CreditRequest } from '@/types/domain'
import { asArray } from '@/utils/format'

const props = defineProps<{
  request: CreditRequest
}>()

const emit = defineEmits<{
  close: []
}>()

const logs = ref<AuditLog[]>([])
const loading = ref(false)
const error = ref('')

const filteredLogs = computed(() =>
  logs.value.filter((log) => (log.credit_request_id || log.creditRequestId || '') === props.request.id),
)

function getUser(log: AuditLog) {
  return log.user_name || log.userName || log.user_email || 'Sistema'
}

function getDate(log: AuditLog) {
  const raw = log.created_date || log.createdAt
  if (!raw) return 'sem data'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString('pt-BR')
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    logs.value = asArray<AuditLog>(await auditService.list())
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar auditoria.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dialog-backdrop" role="presentation" @click.self="emit('close')">
    <section class="request-dialog" role="dialog" aria-modal="true" aria-label="Historico do pedido">
      <header class="dialog-head">
        <div>
          <span>Pedido #{{ request.id.slice(-6).toUpperCase() }}</span>
          <strong>Historico operacional</strong>
        </div>
        <button type="button" aria-label="Fechar historico" @click="emit('close')">Fechar</button>
      </header>

      <div class="audit-list">
        <p v-if="loading" class="empty-message">Carregando historico...</p>
        <p v-else-if="error" class="dialog-error">{{ error }}</p>
        <p v-else-if="filteredLogs.length === 0" class="empty-message">Nenhum evento encontrado para este pedido.</p>

        <article v-for="(log, index) in filteredLogs" :key="log.id || index" class="audit-row">
          <time>{{ getDate(log) }}</time>
          <div>
            <strong>{{ log.action || 'Evento' }}</strong>
            <span>por {{ getUser(log) }}</span>
            <p v-if="log.details">{{ log.details }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(3, 4, 4, .72);
  backdrop-filter: blur(10px);
}

.request-dialog {
  width: min(620px, 100%);
  max-height: min(720px, 92dvh);
  display: grid;
  grid-template-rows: auto minmax(220px, 1fr);
  gap: 12px;
  padding: 16px;
  border-radius: 28px;
  color: var(--gj2-ink);
  background: #fff;
  box-shadow: 0 28px 70px rgba(0, 0, 0, .32);
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-head span {
  display: block;
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 760;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.dialog-head strong {
  display: block;
  margin-top: 3px;
  font-size: 20px;
  font-weight: 900;
}

.dialog-head button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  color: var(--gj2-muted);
  background: #f2f4f1;
  font-weight: 850;
}

.audit-list {
  min-height: 220px;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: #f4f6f3;
}

.audit-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 14px;
  padding: 13px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 24px rgba(92, 104, 113, .12);
}

.audit-row time {
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 760;
}

.audit-row div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.audit-row strong {
  color: var(--gj2-ink);
  font-size: 14px;
  font-weight: 900;
}

.audit-row span,
.audit-row p,
.empty-message {
  margin: 0;
  color: var(--gj2-muted);
  font-size: 13px;
}

.dialog-error {
  margin: auto;
  padding: 10px 12px;
  border-radius: 14px;
  color: #a3362b;
  background: #fff0ed;
  font-weight: 760;
}

.empty-message {
  margin: auto;
  text-align: center;
  font-weight: 760;
}

@media (max-width: 560px) {
  .dialog-backdrop {
    padding: 10px;
  }

  .request-dialog {
    border-radius: 22px;
  }

  .audit-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
