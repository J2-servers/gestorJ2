<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { creditRequestsService } from '@/services/api/creditRequests.service'
import { resellerServersService } from '@/services/api/resellerServers.service'
import { serversService } from '@/services/api/servers.service'
import { settingsService } from '@/services/api/settings.service'
import { uploadsService } from '@/services/api/uploads.service'
import type { ResellerServer, Server } from '@/types/domain'
import { asArray, formatCurrency } from '@/utils/format'

import RequestList from '../components/RequestList.vue'
import { useCreditRequests } from '../composables/useCreditRequests'
import { STATUS_FILTERS } from '../types'

type RequestServer = Server & { username?: string }

const auth = useAuthStore()
const route = useRoute()
const isAdmin = computed(() => auth.isAdmin)
const isReseller = computed(() => auth.user?.role === 'user' || auth.user?.role === 'reseller')
const userHasWhatsapp = computed(() => Boolean(auth.user?.phone))
const showForm = ref(false)
const servers = ref<Server[]>([])
const resellerLinks = ref<ResellerServer[]>([])
const pixKeys = ref<any[]>([])
const proofFile = ref<File | null>(null)
const creating = ref(false)
const formError = ref('')
const copiedPix = ref('')

const form = reactive({
  server_id: '',
  requested_credits: '',
  notes: '',
})

const {
  filtered,
  counts,
  totals,
  loading,
  error,
  notice,
  filter,
  search,
  actingId,
  load,
  analyze,
  approve,
  reject,
  cancel,
} = useCreditRequests()

const revenueLabel = computed(() =>
  totals.value.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
)

const availableServers = computed<RequestServer[]>(() => {
  if (!isReseller.value) return servers.value.map((server) => ({ ...server, username: '' }))
  return servers.value
    .map<RequestServer | null>((server) => {
      const link = resellerLinks.value.find((item) => item.server_id === server.id)
      if (!link) return null
      return {
        ...server,
        username: link.login,
        value_per_credit: link.value_per_credit ?? server.value_per_credit,
      }
    })
    .filter((item): item is RequestServer => Boolean(item))
})

const selectedServer = computed(() => availableServers.value.find((server) => server.id === form.server_id))
const totalValue = computed(() => Number(form.requested_credits || 0) * Number(selectedServer.value?.value_per_credit || 0))
const isPostpaid = computed(() => auth.user?.payment_type === 'postpaid')

function normalizePixKeys(payload: unknown) {
  const raw = Array.isArray((payload as { pix_keys?: unknown[] } | null)?.pix_keys)
    ? (payload as { pix_keys: unknown[] }).pix_keys
    : []
  return raw
    .filter((key: any) => key && key.is_active !== false)
    .map((key: any) => (typeof key === 'string' ? { key_value: key, bank: 'Pix', type: 'chave' } : key))
}

async function loadMeta() {
  if (!isReseller.value) return
  const [serverPayload, linkPayload, settings] = await Promise.all([
    serversService.list().catch(() => []),
    resellerServersService.list().catch(() => []),
    settingsService.getPublic().catch(() => null),
  ])
  servers.value = asArray<Server>(serverPayload)
  resellerLinks.value = asArray<ResellerServer>(linkPayload)
  pixKeys.value = normalizePixKeys(settings)
  if (!form.server_id && availableServers.value[0]) form.server_id = availableServers.value[0].id
}

function handleProof(event: Event) {
  const input = event.target as HTMLInputElement
  proofFile.value = input.files?.[0] || null
}

async function copyPix(key: any) {
  const value = key?.key_value || key?.value || ''
  if (!value) return
  await navigator.clipboard?.writeText(value).catch(() => undefined)
  copiedPix.value = value
  window.setTimeout(() => {
    if (copiedPix.value === value) copiedPix.value = ''
  }, 1400)
}

async function createRequest() {
  formError.value = ''
  const currentServer = selectedServer.value
  const credits = Number.parseInt(form.requested_credits, 10)
  const login = String(currentServer?.username || '').trim()

  if (!currentServer) {
    formError.value = 'Selecione um servidor cadastrado para voce.'
    return
  }
  if (!login) {
    formError.value = 'Este servidor esta sem login cadastrado. Atualize em Servidores antes de pedir.'
    return
  }
  if (!Number.isFinite(credits) || credits <= 0) {
    formError.value = 'Informe uma quantidade de creditos valida.'
    return
  }
  if (!isPostpaid.value && !proofFile.value) {
    formError.value = 'Comprovante obrigatorio para pedidos pre-pagos.'
    return
  }

  creating.value = true
  try {
    let fileUrl = ''
    if (proofFile.value) {
      const uploaded = (await uploadsService.upload(proofFile.value)) as Record<string, string>
      fileUrl = uploaded.fileUrl || uploaded.file_url || uploaded.url || ''
    }
    await creditRequestsService.create({
      server_id: currentServer.id,
      requested_credits: credits,
      login,
      proof_of_payment_url: fileUrl,
      notes: form.notes.trim(),
      payment_type: isPostpaid.value ? 'postpaid' : 'prepaid',
    })
    Object.assign(form, { server_id: availableServers.value[0]?.id || '', requested_credits: '', notes: '' })
    proofFile.value = null
    showForm.value = false
    await load()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Falha ao criar pedido.'
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await Promise.all([load(), loadMeta()])
  if (isReseller.value && route.query.new === '1' && userHasWhatsapp.value) showForm.value = true
})

watch(
  () => route.query.new,
  (value) => {
    if (value === '1' && isReseller.value && userHasWhatsapp.value) showForm.value = true
  },
)
</script>

<template>
  <div class="cr-page">
    <header class="cr-header">
      <div class="cr-title">
        <h1>Pedidos de recarga</h1>
        <p>Acompanhe a fila, analise e finalize os pedidos dos revendedores.</p>
      </div>
      <div class="cr-totals">
        <div>
          <span>Pedidos</span>
          <strong>{{ totals.count }}</strong>
        </div>
        <div>
          <span>Receita efetivada</span>
          <strong class="accent">{{ revenueLabel }}</strong>
        </div>
        <button
          v-if="isReseller"
          type="button"
          class="cr-new-button"
          :disabled="!userHasWhatsapp"
          @click="showForm = !showForm"
        >
          {{ showForm ? 'Fechar pedido' : 'Novo pedido' }}
        </button>
      </div>
    </header>

    <section v-if="isReseller" class="cr-reseller-tools">
      <article v-if="!userHasWhatsapp" class="cr-whatsapp-warning">
        <strong>Cadastre seu WhatsApp</strong>
        <span>Ele e obrigatorio para receber avisos automaticos e liberar pedidos.</span>
      </article>

      <aside v-if="pixKeys.length" class="cr-pix-wallet" aria-label="Carteira Pix">
        <div>
          <strong>Carteira Pix</strong>
          <span>Copie uma chave antes de anexar o comprovante.</span>
        </div>
        <button v-for="(key, index) in pixKeys" :key="`${key.key_value || index}`" type="button" :class="{ copied: copiedPix === key.key_value }" @click="copyPix(key)">
          <span>{{ key.bank || 'Pix' }} · {{ key.type || 'chave' }}</span>
          <strong>{{ key.key_value || key.value }}</strong>
        </button>
      </aside>
    </section>

    <form v-if="isReseller && showForm" class="cr-create-form" @submit.prevent="createRequest">
      <div class="cr-create-head">
        <div>
          <h2>Pedido rapido</h2>
          <p>O login usado sera puxado automaticamente do cadastro do servidor.</p>
        </div>
        <strong>{{ formatCurrency(totalValue) }}</strong>
      </div>

      <p v-if="formError" class="cr-form-error">{{ formError }}</p>

      <div class="cr-server-grid">
        <button
          v-for="server in availableServers"
          :key="server.id"
          type="button"
          class="cr-server-option"
          :class="{ active: form.server_id === server.id }"
          @click="form.server_id = server.id"
        >
          <strong>{{ server.name }}</strong>
          <span>{{ formatCurrency(server.value_per_credit) }}/credito</span>
          <small>Login: {{ server.username || 'nao cadastrado' }}</small>
        </button>
      </div>

      <div class="cr-form-grid">
        <label>Creditos
          <input v-model="form.requested_credits" type="number" min="1" max="1000000" placeholder="Ex: 100" />
        </label>
        <label>Comprovante {{ isPostpaid ? '(opcional)' : '' }}
          <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf" @change="handleProof" />
        </label>
        <label class="wide">Observacoes
          <textarea v-model="form.notes" maxlength="500" placeholder="Observacao opcional para o admin" />
        </label>
      </div>

      <div class="cr-form-summary" v-if="selectedServer">
        <span>{{ selectedServer.name }}</span>
        <strong>{{ Number(form.requested_credits || 0).toLocaleString('pt-BR') }} creditos · {{ formatCurrency(totalValue) }}</strong>
        <small>Login cadastrado: {{ selectedServer.username || 'sem login' }}</small>
        <small v-if="proofFile">Comprovante: {{ proofFile.name }}</small>
      </div>

      <button class="cr-submit" type="submit" :disabled="creating || !userHasWhatsapp">{{ creating ? 'Enviando...' : 'Criar pedido' }}</button>
    </form>

    <div class="cr-toolbar">
      <div class="cr-filters">
        <button
          v-for="item in STATUS_FILTERS"
          :key="item.value"
          type="button"
          class="cr-filter"
          :class="{ active: filter === item.value }"
          @click="filter = item.value"
        >
          {{ item.label }}
          <span class="cr-filter-count">{{ counts[item.value] ?? 0 }}</span>
        </button>
      </div>
      <div class="cr-search">
        <input v-model="search" type="search" placeholder="Buscar servidor, revendedor ou login" />
      </div>
    </div>

    <div v-if="notice" class="cr-notice">{{ notice }}</div>

    <RequestList
      :requests="filtered"
      :is-admin="isAdmin"
      :current-user="auth.user"
      :loading="loading"
      :error="error"
      :acting-id="actingId"
      @analyze="analyze"
      @approve="(id, notes) => approve(id, notes)"
      @reject="reject"
      @cancel="cancel"
      @retry="load"
    />
  </div>
</template>

<style scoped>
.cr-page {
  display: grid;
  gap: 24px;
}

.cr-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.cr-title h1 {
  margin: 0;
  font-size: 40px;
  font-weight: 880;
  letter-spacing: .01em;
}

.cr-title p {
  margin: 10px 0 0;
  color: var(--gj2-muted);
  font-size: 16px;
}

.cr-totals {
  display: flex;
  align-items: center;
  gap: 30px;
}

.cr-totals span {
  display: block;
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.cr-totals strong {
  display: block;
  margin-top: 4px;
  font-size: 24px;
  font-weight: 870;
}

.cr-totals .accent {
  color: var(--gj2-green-deep);
}

.cr-new-button,
.cr-submit {
  border: 0;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 16px;
  color: #fff;
  background: var(--gj2-sidebar);
  box-shadow: 0 18px 34px rgba(100, 115, 126, .2);
  font-weight: 850;
  cursor: pointer;
}

.cr-new-button:disabled,
.cr-submit:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.cr-reseller-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.cr-whatsapp-warning,
.cr-pix-wallet,
.cr-create-form {
  border-radius: 24px;
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-card-bg);
  box-shadow: var(--gj2-shadow-card);
}

.cr-whatsapp-warning {
  padding: 17px 20px;
  display: grid;
  gap: 5px;
}

.cr-whatsapp-warning strong {
  color: #b6473c;
  font-weight: 900;
}

.cr-whatsapp-warning span {
  color: var(--gj2-muted);
}

.cr-pix-wallet {
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(min(100%, 180px), 1fr) repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 10px;
  align-items: stretch;
}

.cr-pix-wallet > div {
  display: grid;
  gap: 4px;
  align-content: center;
}

.cr-pix-wallet > div strong {
  color: var(--gj2-ink);
  font-size: 16px;
  font-weight: 900;
}

.cr-pix-wallet > div span {
  color: var(--gj2-muted);
  font-size: 13px;
}

.cr-pix-wallet button {
  border: 0;
  min-width: 0;
  padding: 13px 14px;
  border-radius: 18px;
  display: grid;
  gap: 4px;
  text-align: left;
  color: var(--gj2-muted);
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-row-bg);
  cursor: pointer;
}

.cr-pix-wallet button.copied {
  color: var(--gj2-green-deep);
  background: color-mix(in srgb, var(--gj2-green-deep) 16%, var(--gj2-surface));
}

.cr-pix-wallet button span,
.cr-pix-wallet button strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cr-pix-wallet button span {
  font-size: 11px;
  font-weight: 840;
  text-transform: uppercase;
}

.cr-pix-wallet button strong {
  color: var(--gj2-ink);
  font-size: 13px;
}

.cr-create-form {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.cr-create-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cr-create-head h2 {
  margin: 0;
  color: var(--gj2-ink);
  font-size: 24px;
  font-weight: 900;
}

.cr-create-head p {
  margin: 5px 0 0;
  color: var(--gj2-muted);
}

.cr-create-head > strong {
  color: var(--gj2-green-deep);
  font-size: 24px;
  font-weight: 900;
}

.cr-form-error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 15px;
  color: var(--gj2-red);
  background: rgba(255, 72, 64, .1);
  font-weight: 800;
}

.cr-server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 10px;
}

.cr-server-option {
  border: 0;
  min-width: 0;
  padding: 14px;
  border-radius: 18px;
  display: grid;
  gap: 5px;
  text-align: left;
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-row-bg);
  cursor: pointer;
}

.cr-server-option.active {
  color: #fff;
  background: var(--gj2-sidebar);
}

.cr-server-option strong,
.cr-server-option span,
.cr-server-option small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cr-server-option strong {
  font-weight: 900;
}

.cr-server-option span,
.cr-server-option small {
  color: inherit;
  opacity: .72;
}

.cr-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.cr-form-grid label {
  display: grid;
  gap: 7px;
  color: var(--gj2-label-color);
  font-size: 13px;
  font-weight: 820;
}

.cr-form-grid input,
.cr-form-grid textarea {
  width: 100%;
  border: 1px solid var(--gj2-line);
  border-radius: 15px;
  outline: none;
  color: var(--gj2-ink);
  background: var(--gj2-input-bg);
  font: inherit;
}

.cr-form-grid input {
  min-height: 46px;
  padding: 0 14px;
}

.cr-form-grid textarea {
  min-height: 90px;
  padding: 13px 14px;
  resize: vertical;
}

.cr-form-grid .wide {
  grid-column: 1 / -1;
}

.cr-form-summary {
  padding: 14px;
  border-radius: 18px;
  display: grid;
  gap: 4px;
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-surface-muted);
}

.cr-form-summary span,
.cr-form-summary small {
  color: var(--gj2-muted);
}

.cr-form-summary strong {
  color: var(--gj2-ink);
  font-size: 18px;
}

.cr-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(min(100%, 360px), .65fr);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cr-filters {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 118px), max-content));
  gap: 8px;
}

.cr-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 15px;
  border: 1px solid var(--gj2-line);
  border-radius: 999px;
  cursor: pointer;
  color: var(--gj2-muted);
  background: var(--gj2-chip-bg);
  font-weight: 760;
  font-size: 13.5px;
  min-width: 0;
}

.cr-filter.active {
  color: #fff;
  border-color: transparent;
  background: var(--gj2-sidebar);
}

.cr-filter-count {
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 820;
  background: rgba(0, 0, 0, .08);
}

.cr-filter.active .cr-filter-count {
  background: rgba(255, 255, 255, .22);
}

.cr-search {
  min-width: 0;
  width: 100%;
  max-width: 360px;
}

.cr-search input {
  width: 100%;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--gj2-line);
  border-radius: 15px;
  outline: none;
  color: var(--gj2-ink);
  background: var(--gj2-input-bg);
}

.cr-search input:focus {
  border-color: var(--gj2-green-deep);
}

.cr-notice {
  padding: 13px 16px;
  border-radius: 16px;
  color: #6f5619;
  background: linear-gradient(135deg, #fff3c7, #fff9e8);
  box-shadow: 0 18px 40px rgba(98, 78, 39, .12);
  font-weight: 800;
}

@media (max-width: 720px) {
  .cr-title h1 {
    font-size: 32px;
  }

  .cr-title p {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.35;
  }

  .cr-totals,
  .cr-toolbar {
    align-items: stretch;
  }

  .cr-toolbar {
    grid-template-columns: 1fr;
  }

  .cr-filters {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 132px), 1fr));
  }

  .cr-filter {
    justify-content: center;
    width: 100%;
    padding: 0 10px;
  }

  .cr-totals,
  .cr-create-head {
    width: 100%;
    flex-direction: column;
  }

  .cr-totals {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .cr-totals strong {
    font-size: 20px;
  }

  .cr-new-button,
  .cr-submit {
    width: 100%;
  }

  .cr-pix-wallet,
  .cr-form-grid {
    grid-template-columns: 1fr;
  }

  .cr-search {
    min-width: 0;
    max-width: none;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .cr-whatsapp-warning,
html[data-theme="dark"] .cr-pix-wallet,
html[data-theme="dark"] .cr-create-form {
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
}

html[data-theme="dark"] .cr-form-error {
  background: rgba(255, 72, 64, .1);
  color: #ff9086;
}

html[data-theme="dark"] .cr-form-grid input,
html[data-theme="dark"] .cr-form-grid textarea,
html[data-theme="dark"] .cr-search input {
  background: var(--gj2-input-bg);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .cr-filter {
  background: var(--gj2-surface-muted);
  color: var(--gj2-muted);
}

html[data-theme="dark"] .cr-notice {
  background: rgba(212, 165, 20, .1);
  color: #d4a514;
  box-shadow: none;
}

html[data-theme="dark"] .cr-pix-wallet button {
  background: var(--gj2-surface-muted);
  color: var(--gj2-muted);
}

html[data-theme="dark"] .cr-pix-wallet button.copied {
  background: rgba(92, 148, 120, .2);
  color: var(--gj2-green-deep);
}

html[data-theme="dark"] .cr-server-option {
  background: var(--gj2-surface-muted);
  color: var(--gj2-muted);
}

html[data-theme="dark"] .cr-form-summary {
  background: var(--gj2-surface-muted);
}
</style>
