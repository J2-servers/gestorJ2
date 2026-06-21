<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { settingsService } from '@/services/api/settings.service'
import { whatsappService } from '@/services/api/whatsapp.service'

const settings = ref<Record<string, any> | null>(null)
const status = ref<Record<string, any> | null>(null)
const queue = ref<Record<string, any> | null>(null)
const logs = ref<any[]>([])
const qr = ref<Record<string, any> | null>(null)
const phone = ref('')
const message = ref('Teste Gestor J2')
const notice = ref('')
const busy = ref('')

const connected = computed(() => Boolean(status.value?.connected || status.value?.state === 'open'))

async function load() {
  busy.value = 'load'
  notice.value = ''
  const [cfg, st, q, l] = await Promise.all([
    settingsService.get().catch(() => null),
    whatsappService.status().catch((err) => ({ connected: false, state: 'error', message: err.message })),
    whatsappService.queue().catch(() => null),
    whatsappService.logs(80).catch(() => []),
  ])
  settings.value = cfg as Record<string, any> | null
  status.value = st as Record<string, any>
  queue.value = q as Record<string, any> | null
  logs.value = Array.isArray(l) ? l : []
  busy.value = ''
}

async function getQr() {
  busy.value = 'qr'
  qr.value = (await whatsappService.qr().catch((err) => ({ error: err.message }))) as Record<string, any>
  busy.value = ''
}

async function sendTest() {
  busy.value = 'test'
  const res = await whatsappService.test(phone.value, message.value).catch((err) => ({ error: err.message }))
  notice.value = JSON.stringify(res)
  busy.value = ''
  await load()
}

async function retryFailed() {
  busy.value = 'retry'
  await whatsappService.retryFailed().catch((err) => {
    notice.value = err.message
  })
  busy.value = ''
  await load()
}

async function clearPending() {
  busy.value = 'clear'
  await whatsappService.clearPending().catch((err) => {
    notice.value = err.message
  })
  busy.value = ''
  await load()
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Diagnóstico WhatsApp</h1>
        <p>Verifique Evolution API, QR, fila anti-ban, logs e mensagens de teste.</p>
      </div>
    </header>

    <section class="module-grid four">
      <article class="module-stat"><span>Status</span><strong>{{ connected ? 'Online' : 'Offline' }}</strong><small>{{ status?.state || status?.message || '-' }}</small></article>
      <article class="module-stat"><span>Fila</span><strong>{{ queue?.pending ?? queue?.queued ?? 0 }}</strong><small>pendentes</small></article>
      <article class="module-stat"><span>Falhas</span><strong>{{ queue?.failed ?? 0 }}</strong><small>aguardando retry</small></article>
      <article class="module-stat"><span>Logs</span><strong>{{ logs.length }}</strong><small>ultimos envios</small></article>
    </section>

    <div class="module-grid two">
      <section class="module-card pad">
        <h2>Configuração</h2>
        <div class="module-list">
          <div class="module-row"><strong>URL</strong><small>{{ settings?.evolution_api_url || 'nao configurada' }}</small></div>
          <div class="module-row"><strong>Instância</strong><small>{{ settings?.evolution_instance || 'nao configurada' }}</small></div>
          <div class="module-row"><strong>Admin WhatsApp</strong><small>{{ settings?.admin_whatsapp || 'nao configurado' }}</small></div>
        </div>
      </section>

      <section class="module-card pad">
        <h2>Teste e fila</h2>
        <label class="module-label">Telefone<input v-model="phone" class="module-input" placeholder="11999999999" /></label>
        <label class="module-label">Mensagem<textarea v-model="message" class="module-textarea" /></label>
        <div class="module-actions">
          <UiButton :disabled="busy === 'test'" @click="sendTest">Enviar teste</UiButton>
          <UiButton variant="secondary" :disabled="busy === 'qr'" @click="getQr">Buscar QR</UiButton>
          <UiButton variant="secondary" :disabled="busy === 'retry'" @click="retryFailed">Reprocessar falhas</UiButton>
          <UiButton variant="secondary" :disabled="busy === 'clear'" @click="clearPending">Limpar pendentes</UiButton>
        </div>
        <pre v-if="qr" class="wa-box">{{ qr }}</pre>
        <pre v-if="notice" class="wa-box">{{ notice }}</pre>
      </section>
    </div>

    <section class="module-card pad">
      <h2>Logs recentes</h2>
      <div class="module-list">
        <article v-for="log in logs" :key="log.id || log.created_date" class="module-row">
          <div class="module-row-line"><strong>{{ log.phone || log.to || 'Destino' }}</strong><span class="module-pill">{{ log.status || 'log' }}</span></div>
          <small>{{ log.message || log.error || log.created_date }}</small>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.wa-box {
  overflow: auto;
  margin: 14px 0 0;
  padding: 14px;
  border-radius: 16px;
  background: #f3f4f2;
}
</style>
