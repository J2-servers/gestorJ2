<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import type { AdminSettings } from '../types'

const props = defineProps<{
  settings: AdminSettings | null
  save: (patch: Partial<AdminSettings>) => Promise<AdminSettings>
}>()

const form = reactive({
  evolution_api_url: props.settings?.evolution_api_url ?? '',
  evolution_instance: props.settings?.evolution_instance ?? props.settings?.evolution_instance_id ?? '',
  evolution_api_key: props.settings?.evolution_api_key ?? '',
  admin_whatsapp: props.settings?.admin_whatsapp ?? '',
  n8n_webhook_url: props.settings?.n8n_webhook_url ?? '',
  fcm_server_key: props.settings?.fcm_server_key ?? '',
})

const saving = ref(false)
const success = ref(false)
const error = ref('')

watch(
  () => props.settings,
  (settings) => {
    form.evolution_api_url = settings?.evolution_api_url ?? ''
    form.evolution_instance = settings?.evolution_instance ?? settings?.evolution_instance_id ?? ''
    form.evolution_api_key = settings?.evolution_api_key ?? ''
    form.admin_whatsapp = settings?.admin_whatsapp ?? ''
    form.n8n_webhook_url = settings?.n8n_webhook_url ?? ''
    form.fcm_server_key = settings?.fcm_server_key ?? ''
  },
  { immediate: true },
)

const hasEvolution = computed(
  () => Boolean(form.evolution_api_url && form.evolution_api_key && form.evolution_instance),
)

const diagnostics = computed(() => [
  { label: 'URL Base', value: form.evolution_api_url },
  { label: 'Instância', value: form.evolution_instance },
  { label: 'API Key', value: form.evolution_api_key ? `${form.evolution_api_key.slice(0, 8)}...` : '' },
  { label: 'Admin WhatsApp', value: form.admin_whatsapp },
])

async function submit() {
  saving.value = true
  success.value = false
  error.value = ''
  try {
    await props.save({ ...form, whatsapp_provider: 'evolution' })
    success.value = true
    setTimeout(() => (success.value = false), 4000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="set-form" @submit.prevent="submit">
    <div class="set-head">
      <div class="set-head-icon">💬</div>
      <div>
        <h2>Integrações</h2>
        <p>Configure WhatsApp, automações e notificações externas.</p>
      </div>
    </div>

    <div v-if="success" class="set-success">Configurações salvas.</div>
    <div v-if="error" class="set-error">{{ error }}</div>

    <section class="set-section">
      <h3>Evolution API</h3>
      <p>Envio de notificações via WhatsApp com fila segura.</p>

      <div :class="hasEvolution ? 'set-success' : 'set-error'">
        {{ hasEvolution ? 'Evolution API configurada.' : 'Preencha URL, instância e API key para ativar o WhatsApp.' }}
      </div>

      <div class="set-grid">
        <label class="set-field">
          <span>URL Base da Evolution API</span>
          <input v-model="form.evolution_api_url" placeholder="https://evolution.suaempresa.com" />
          <small>Ex: https://evolution.suaempresa.com</small>
        </label>
        <label class="set-field">
          <span>Instância</span>
          <input v-model="form.evolution_instance" placeholder="gestor-j2" />
          <small>Nome/id da instância criada na Evolution API.</small>
        </label>
        <label class="set-field">
          <span>API Key Global</span>
          <input v-model="form.evolution_api_key" type="password" placeholder="sua-api-key-aqui" />
          <small>Chave enviada no header apikey.</small>
        </label>
        <label class="set-field">
          <span>WhatsApp do admin</span>
          <input v-model="form.admin_whatsapp" placeholder="49998298148" />
          <small>Número que recebe alertas de novos pedidos (só dígitos com DDD).</small>
        </label>
      </div>

      <router-link class="set-btn" to="/whatsapp">Abrir WhatsApp / Diagnóstico →</router-link>
    </section>

    <section class="set-section">
      <h3>n8n Webhook</h3>
      <p>Automações opcionais quando pedidos mudam de estado.</p>
      <label class="set-field full">
        <span>URL do webhook</span>
        <input v-model="form.n8n_webhook_url" placeholder="https://n8n.exemplo.com/webhook/..." />
        <small>Opcional.</small>
      </label>
    </section>

    <section class="set-section">
      <h3>Firebase Cloud Messaging</h3>
      <p>Chave opcional para notificações push no navegador.</p>
      <label class="set-field full">
        <span>FCM Server Key</span>
        <textarea v-model="form.fcm_server_key" rows="3" placeholder="AAAA..." />
        <small>Opcional.</small>
      </label>
    </section>

    <section class="set-section diag">
      <div v-for="item in diagnostics" :key="item.label" class="diag-row">
        <span>{{ item.value ? '✓' : '✕' }} {{ item.label }}</span>
        <strong>{{ item.value || 'não configurado' }}</strong>
      </div>
    </section>

    <div class="set-actions">
      <button class="set-btn set-btn--primary" type="submit" :disabled="saving">
        {{ saving ? 'Salvando...' : 'Salvar integrações' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.diag {
  gap: 8px;
}

.diag-row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  color: var(--gj2-muted);
  font-size: 12.5px;
}

.diag-row strong {
  color: var(--gj2-ink);
  font-weight: 760;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .diag-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
