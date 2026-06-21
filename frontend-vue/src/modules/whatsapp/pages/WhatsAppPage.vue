<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { whatsappService } from '@/services/api/whatsapp.service'
import { asArray, asRecord } from '@/utils/format'

const status = ref<Record<string, unknown>>({})
const queue = ref<Record<string, unknown>[]>([])
const logs = ref<Record<string, unknown>[]>([])
const notice = ref('')
const testing = ref(false)
const testForm = reactive({ phone: '', message: 'Mensagem de teste do Gestor J2.' })

const connected = computed(() => Boolean(status.value.connected || status.value.ready))
const queueCount = computed(() => queue.value.length)
const failedCount = computed(() => queue.value.filter((item) => String(item.status || '').includes('fail')).length)

async function load() {
  notice.value = ''
  try {
    status.value = asRecord(await whatsappService.status())
  } catch (error) {
    status.value = {}
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel carregar status real do WhatsApp.'
  }
  try {
    queue.value = asArray<Record<string, unknown>>(await whatsappService.queue())
  } catch {
    queue.value = []
  }
  try {
    logs.value = asArray<Record<string, unknown>>(await whatsappService.logs(20))
  } catch {
    logs.value = []
  }
}

async function sendTest() {
  if (!testForm.phone.trim()) {
    notice.value = 'Informe um telefone para enviar teste.'
    return
  }
  testing.value = true
  try {
    await whatsappService.test(testForm.phone, testForm.message)
    notice.value = 'Mensagem de teste enviada.'
  } catch {
    notice.value = 'A API nao confirmou o envio do teste.'
  } finally {
    testing.value = false
  }
}

async function retryFailed() {
  try {
    await whatsappService.retryFailed()
    await load()
  } catch {
    notice.value = 'Nao foi possivel reenfileirar mensagens falhas agora.'
  }
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <section class="module-hero">
      <div>
        <h1>WhatsApp</h1>
        <p>Monitore conexao, fila de envios, testes e logs sem expor chaves ou detalhes sensiveis aos revendedores.</p>
      </div>
      <div class="module-actions">
        <UiButton @click="retryFailed">Retentar falhas</UiButton>
      </div>
    </section>

    <section class="module-grid three">
      <div class="module-stat" :style="{ '--stat-color': connected ? 'var(--gj2-green)' : 'var(--gj2-red)' }"><span>Status</span><strong>{{ connected ? 'Online' : 'Offline' }}</strong><small>{{ status.provider || 'provedor' }}</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Fila</span><strong>{{ queueCount }}</strong><small>mensagens aguardando</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-red)"><span>Falhas</span><strong>{{ failedCount }}</strong><small>precisam de acao</small></div>
    </section>

    <p v-if="notice" class="module-row">{{ notice }}</p>

    <section class="whatsapp-layout">
      <article class="module-card pad">
        <h2>Teste de envio</h2>
        <form class="test-form" @submit.prevent="sendTest">
          <label class="module-label">Telefone<input v-model="testForm.phone" class="module-input" placeholder="5511999990000" /></label>
          <label class="module-label">Mensagem<textarea v-model="testForm.message" class="module-textarea" /></label>
          <UiButton type="submit" :disabled="testing">{{ testing ? 'Enviando...' : 'Enviar teste' }}</UiButton>
        </form>
      </article>

      <article class="module-card pad">
        <h2>Fila recente</h2>
        <div class="module-list queue-list">
          <div v-for="item in queue" :key="String(item.id || item.to)" class="module-row">
            <div class="module-row-line">
              <strong>{{ item.type || 'mensagem' }}</strong>
              <span class="module-pill">{{ item.status || 'pending' }}</span>
            </div>
            <small>{{ item.to || item.phone || 'destino oculto' }}</small>
          </div>
        </div>
      </article>

      <article class="module-card pad">
        <h2>Logs</h2>
        <div class="module-list queue-list">
          <div v-for="item in logs" :key="String(item.id || item.message)" class="module-row">
            <strong>{{ item.level || 'info' }}</strong>
            <small>{{ item.message || item.error || 'evento sem descricao' }}</small>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.whatsapp-layout {
  display: grid;
  grid-template-columns: minmax(280px, .8fr) minmax(0, 1fr) minmax(280px, .8fr);
  gap: 20px;
}

.test-form {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.queue-list {
  margin-top: 18px;
  max-height: 420px;
  overflow: auto;
}

@media (max-width: 1180px) {
  .whatsapp-layout {
    grid-template-columns: 1fr;
  }
}
</style>
