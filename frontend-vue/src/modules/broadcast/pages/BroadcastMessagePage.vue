<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { usersService } from '@/services/api/users.service'
import { whatsappService } from '@/services/api/whatsapp.service'
import type { User } from '@/types/domain'

type BroadcastDetail = {
  name?: string
  phone?: string
  success?: boolean
  error?: string
}

type BroadcastResult = {
  sent?: number
  failed?: number
  total?: number
  error?: string
  details?: BroadcastDetail[]
}

const users = ref<User[]>([])
const selectedIds = ref<string[]>([])
const mode = ref<'all' | 'custom'>('all')
const search = ref('')
const message = ref('')
const loading = ref(false)
const sending = ref(false)
const result = ref<BroadcastResult | null>(null)
const error = ref('')
const showDetails = ref(false)
const messagePlaceholder = `Ola! Temos um comunicado importante para voce.

Use *negrito*, _italico_ e linhas curtas para facilitar a leitura.`

const resellers = computed(() => users.value.filter((item) => item.role === 'user'))
const withPhone = computed(() => resellers.value.filter((item) => String(item.phone || '').trim()))
const withoutPhone = computed(() => resellers.value.filter((item) => !String(item.phone || '').trim()))
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return withPhone.value.filter((item) => {
    if (!term) return true
    return `${item.name || ''} ${item.full_name || ''} ${item.email} ${item.phone || ''}`.toLowerCase().includes(term)
  })
})

const targetUsers = computed(() => (mode.value === 'all' ? withPhone.value : withPhone.value.filter((item) => selectedIds.value.includes(item.id))))
const targetCount = computed(() => targetUsers.value.length)
const selectedVisibleCount = computed(() => filtered.value.filter((item) => selectedIds.value.includes(item.id)).length)
const allVisibleSelected = computed(() => filtered.value.length > 0 && selectedVisibleCount.value === filtered.value.length)
const charCount = computed(() => message.value.length)
const cannotSend = computed(() => sending.value || !message.value.trim() || targetCount.value === 0)

function resellerName(user: User) {
  return user.full_name || user.name || user.email || 'Revendedor'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    users.value = await usersService.list()
  } catch (err) {
    users.value = []
    const message = err instanceof Error ? err.message : ''
    error.value = /unauthorized|401/i.test(message)
      ? 'Sessao sem permissao para listar revendedores. Entre novamente ou verifique o backend.'
      : message || 'Nao foi possivel carregar revendedores.'
  } finally {
    loading.value = false
  }
}

function toggle(id: string) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

function toggleVisible() {
  const ids = filtered.value.map((item) => item.id)
  selectedIds.value = allVisibleSelected.value
    ? selectedIds.value.filter((id) => !ids.includes(id))
    : Array.from(new Set([...selectedIds.value, ...ids]))
}

function resetComposer() {
  message.value = ''
  result.value = null
  showDetails.value = false
  selectedIds.value = []
  mode.value = 'all'
}

async function send() {
  if (cannotSend.value) return
  const ok = window.confirm(`Enviar mensagem para ${targetCount.value} revendedor(es)?`)
  if (!ok) return

  sending.value = true
  result.value = null
  showDetails.value = false
  error.value = ''
  try {
    result.value = (await whatsappService.broadcast({
      message: message.value.trim(),
      reseller_ids: mode.value === 'custom' ? selectedIds.value : [],
    })) as BroadcastResult
  } catch (err) {
    result.value = {
      error: err instanceof Error ? err.message : 'Falha ao enviar broadcast.',
      failed: 0,
      sent: 0,
      total: targetCount.value,
    }
  } finally {
    sending.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="module-page broadcast-page">
    <header class="module-hero broadcast-hero">
      <div>
        <h1>Envios em massa</h1>
        <p>Comunique revendedores pela fila segura do WhatsApp, com selecao clara e resultado rastreavel.</p>
      </div>
    </header>

    <section class="module-grid four">
      <article class="module-stat"><span>Revendedores</span><strong>{{ resellers.length }}</strong><small>cadastrados</small></article>
      <article class="module-stat" style="--stat-color: var(--gj2-green)"><span>Com WhatsApp</span><strong>{{ withPhone.length }}</strong><small>aptos para envio</small></article>
      <article class="module-stat" style="--stat-color: var(--gj2-red)"><span>Sem WhatsApp</span><strong>{{ withoutPhone.length }}</strong><small>fora da fila</small></article>
      <article class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Alvo atual</span><strong>{{ targetCount }}</strong><small>{{ mode === 'all' ? 'todos aptos' : 'selecao manual' }}</small></article>
    </section>

    <p v-if="error" class="broadcast-alert error">{{ error }}</p>

    <section class="broadcast-layout">
      <aside class="module-card pad broadcast-recipients">
        <div class="module-row-line">
          <div>
            <h2>Destinatarios</h2>
            <small>Use todos os contatos aptos ou monte uma lista manual.</small>
          </div>
          <span class="module-pill">{{ targetCount }} alvo(s)</span>
        </div>

        <div class="broadcast-tabs">
          <button type="button" :class="{ active: mode === 'all' }" @click="mode = 'all'">Todos</button>
          <button type="button" :class="{ active: mode === 'custom' }" @click="mode = 'custom'">Manual</button>
        </div>

        <template v-if="mode === 'custom'">
          <div class="broadcast-search">
            <input v-model="search" placeholder="Buscar revendedor" />
            <button v-if="search" type="button" @click="search = ''">Limpar</button>
          </div>

          <div class="broadcast-list-toolbar">
            <span>{{ selectedVisibleCount }} de {{ filtered.length }} visiveis</span>
            <button type="button" @click="toggleVisible">{{ allVisibleSelected ? 'Limpar visiveis' : 'Selecionar visiveis' }}</button>
          </div>

          <div class="broadcast-list">
            <button
              v-for="user in filtered"
              :key="user.id"
              type="button"
              class="broadcast-user"
              :class="{ selected: selectedIds.includes(user.id) }"
              @click="toggle(user.id)"
            >
              <span class="broadcast-check">{{ selectedIds.includes(user.id) ? 'OK' : '' }}</span>
              <span class="broadcast-avatar">{{ resellerName(user).slice(0, 1).toUpperCase() }}</span>
              <span class="broadcast-user-main">
                <strong>{{ resellerName(user) }}</strong>
                <small>{{ user.phone }}</small>
              </span>
            </button>
            <div v-if="!filtered.length" class="broadcast-empty">Nenhum revendedor com WhatsApp encontrado.</div>
          </div>
        </template>

        <div v-else class="broadcast-all-target">
          <strong>{{ withPhone.length }}</strong>
          <span>revendedores com WhatsApp receberao este comunicado.</span>
        </div>

        <div v-if="withoutPhone.length" class="broadcast-warning">
          {{ withoutPhone.length }} revendedor(es) ainda precisam cadastrar WhatsApp.
        </div>
      </aside>

      <main class="module-card pad broadcast-composer">
        <div class="module-row-line">
          <div>
            <h2>Mensagem</h2>
            <small>{{ charCount }}/2000 caracteres</small>
          </div>
          <span class="module-pill">{{ sending ? 'enviando' : 'rascunho' }}</span>
        </div>

        <textarea
          v-model="message"
          maxlength="2000"
          :placeholder="messagePlaceholder"
        />

        <section class="broadcast-preview">
          <span>Previa WhatsApp</span>
          <p>{{ message.trim() || 'A mensagem aparece aqui antes do envio.' }}</p>
        </section>

        <section v-if="result" class="broadcast-result" :class="{ error: result.error }">
          <div>
            <strong>{{ result.error ? 'Erro no envio' : 'Envio processado' }}</strong>
            <span>
              {{
                result.error
                  ? result.error
                  : `${result.sent || 0} enviados, ${result.failed || 0} falhas, ${result.total || targetCount} total`
              }}
            </span>
          </div>
          <button v-if="result.details?.length" type="button" @click="showDetails = !showDetails">{{ showDetails ? 'Ocultar' : 'Detalhes' }}</button>
        </section>

        <div v-if="showDetails && result?.details?.length" class="broadcast-details">
          <article v-for="(detail, index) in result.details" :key="`${detail.phone || detail.name}-${index}`" :class="{ fail: !detail.success }">
            <strong>{{ detail.name || 'Revendedor' }}</strong>
            <small>{{ detail.phone }}{{ detail.error ? ` - ${detail.error}` : '' }}</small>
          </article>
        </div>

        <div class="broadcast-actions">
          <UiButton :disabled="cannotSend" @click="send">{{ sending ? `Enviando para ${targetCount}` : `Enviar para ${targetCount}` }}</UiButton>
          <UiButton v-if="result && !sending" variant="secondary" @click="resetComposer">Novo envio</UiButton>
        </div>
      </main>
    </section>
  </div>
</template>

<style scoped>
.broadcast-layout {
  display: grid;
  grid-template-columns: minmax(min(100%, 310px), 410px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.broadcast-tabs {
  min-height: 48px;
  margin-top: 18px;
  padding: 5px;
  border-radius: 17px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-surface-muted);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}

.broadcast-tabs button {
  border: 0;
  border-radius: 13px;
  color: var(--gj2-muted);
  background: transparent;
  cursor: pointer;
  font-weight: 900;
}

.broadcast-tabs button.active {
  color: #fff;
  background: var(--gj2-sidebar);
  box-shadow: 0 12px 24px rgba(100, 115, 126, .18);
}

.broadcast-search {
  min-height: 48px;
  margin-top: 14px;
  padding: 0 14px;
  border-radius: 17px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--gj2-line);
  background: var(--gj2-input-bg);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}

.broadcast-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: none;
  color: var(--gj2-ink);
  background: transparent;
  font: inherit;
}

.broadcast-search button,
.broadcast-list-toolbar button,
.broadcast-result button {
  border: 0;
  color: var(--gj2-green-deep);
  background: transparent;
  cursor: pointer;
  font-weight: 900;
}

.broadcast-list-toolbar {
  margin: 12px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 820;
}

.broadcast-list {
  max-height: 500px;
  overflow: auto;
  display: grid;
  gap: 9px;
  padding-right: 2px;
}

.broadcast-user {
  width: 100%;
  min-width: 0;
  min-height: 62px;
  border: 0;
  border-radius: 18px;
  padding: 10px;
  display: grid;
  grid-template-columns: 24px 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  color: inherit;
  text-align: left;
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-row-bg);
  box-shadow: var(--gj2-shadow-soft);
  cursor: pointer;
}

.broadcast-user.selected {
  outline: 2px solid rgba(142, 190, 163, .55);
  background: color-mix(in srgb, var(--gj2-green-deep) 14%, var(--gj2-surface));
}

.broadcast-check {
  color: var(--gj2-green-deep);
  font-size: 9px;
  font-weight: 950;
}

.broadcast-avatar {
  width: 40px;
  height: 40px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--gj2-sidebar);
  font-weight: 950;
}

.broadcast-user-main {
  min-width: 0;
}

.broadcast-user-main strong,
.broadcast-user-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-user-main small {
  margin-top: 3px;
  color: var(--gj2-muted);
}

.broadcast-all-target,
.broadcast-empty,
.broadcast-warning,
.broadcast-preview,
.broadcast-result,
.broadcast-details article {
  border-radius: 20px;
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-surface-muted);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}

.broadcast-all-target {
  min-height: 210px;
  margin-top: 14px;
  padding: 22px;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

.broadcast-all-target strong {
  color: var(--gj2-green-deep);
  font-size: 66px;
  line-height: .9;
  font-weight: 950;
}

.broadcast-all-target span,
.broadcast-warning,
.broadcast-empty {
  color: var(--gj2-muted);
  font-size: 13px;
}

.broadcast-warning,
.broadcast-empty {
  margin-top: 14px;
  padding: 14px;
  font-weight: 820;
}

.broadcast-warning {
  color: #9b4f19;
  background: color-mix(in srgb, var(--gj2-yellow) 22%, var(--gj2-surface));
}

.broadcast-composer {
  display: grid;
  gap: 16px;
}

.broadcast-composer textarea {
  width: 100%;
  min-height: 230px;
  border: 0;
  outline: none;
  resize: vertical;
  border-radius: 24px;
  padding: 18px;
  color: var(--gj2-ink);
  border: 1px solid var(--gj2-line);
  background: var(--gj2-input-bg);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
  font: inherit;
  line-height: 1.55;
}

.broadcast-preview {
  min-height: 132px;
  padding: 16px;
}

.broadcast-preview span {
  display: block;
  margin-bottom: 10px;
  color: var(--gj2-green-deep);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.broadcast-preview p {
  margin: 0;
  color: var(--gj2-ink);
  white-space: pre-wrap;
  line-height: 1.55;
}

.broadcast-result {
  padding: 15px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: #426c55;
  background: color-mix(in srgb, var(--gj2-green-deep) 15%, var(--gj2-surface));
}

.broadcast-result.error {
  color: #a42f2b;
  background: rgba(255, 72, 64, .12);
}

.broadcast-result strong,
.broadcast-result span {
  display: block;
}

.broadcast-result span {
  margin-top: 4px;
  font-size: 13px;
}

.broadcast-details {
  display: grid;
  gap: 8px;
}

.broadcast-details article {
  padding: 12px;
}

.broadcast-details article.fail {
  color: #a42f2b;
  background: rgba(255, 72, 64, .12);
}

.broadcast-details strong,
.broadcast-details small {
  display: block;
}

.broadcast-details small {
  margin-top: 3px;
  color: var(--gj2-muted);
}

.broadcast-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), max-content));
  justify-content: flex-end;
  gap: 10px;
}

.broadcast-alert {
  margin: 0;
  padding: 13px 16px;
  border-radius: 16px;
  font-weight: 820;
}

.broadcast-alert.error {
  color: #a42f2b;
  background: rgba(255, 72, 64, .12);
}

@media (max-width: 980px) {
  .broadcast-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .broadcast-page {
    gap: 16px;
  }

  .broadcast-actions,
  .broadcast-actions :deep(button) {
    width: 100%;
  }

  .broadcast-actions {
    grid-template-columns: 1fr;
  }

  .broadcast-tabs button {
    min-width: 0;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .broadcast-result {
    grid-template-columns: 1fr;
  }

  .broadcast-user {
    grid-template-columns: 20px 38px minmax(0, 1fr);
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .broadcast-user {
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
  box-shadow: none;
}

html[data-theme="dark"] .broadcast-user.selected {
  background: rgba(93, 148, 120, .12);
  outline-color: rgba(93, 148, 120, .35);
}

html[data-theme="dark"] .broadcast-warning {
  background: rgba(212, 165, 20, .12);
  color: #d4a514;
}

html[data-theme="dark"] .broadcast-tabs {
  background: var(--gj2-surface-muted);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}

html[data-theme="dark"] .broadcast-search {
  background: var(--gj2-input-bg);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}

html[data-theme="dark"] .broadcast-search input {
  color: var(--gj2-ink);
}

html[data-theme="dark"] .broadcast-all-target,
html[data-theme="dark"] .broadcast-empty,
html[data-theme="dark"] .broadcast-preview,
html[data-theme="dark"] .broadcast-result,
html[data-theme="dark"] .broadcast-details article {
  background: var(--gj2-surface-muted);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}

html[data-theme="dark"] .broadcast-composer textarea {
  background: var(--gj2-input-bg);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.28);
  color: var(--gj2-ink);
}
</style>
