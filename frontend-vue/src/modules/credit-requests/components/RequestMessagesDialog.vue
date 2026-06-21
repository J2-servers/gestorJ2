<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { creditRequestsService } from '@/services/api/creditRequests.service'
import type { ChatMessage, CreditRequest, User } from '@/types/domain'
import { asArray } from '@/utils/format'

const props = defineProps<{
  request: CreditRequest
  user?: User | null
}>()

const emit = defineEmits<{
  close: []
}>()

const messages = ref<ChatMessage[]>([])
const loading = ref(false)
const sending = ref(false)
const error = ref('')
const draft = ref('')
const messagesEl = ref<HTMLElement | null>(null)
let poll: number | undefined

function getSenderId(message: ChatMessage) {
  return message.sender_id || message.senderId || ''
}

function getSenderName(message: ChatMessage) {
  return message.sender_name || message.senderName || 'Sistema'
}

function getContent(message: ChatMessage) {
  return message.message_content || message.content || ''
}

function getDate(message: ChatMessage) {
  const raw = message.created_date || message.createdAt
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function isNearBottom() {
  const el = messagesEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 90
}

async function scrollToBottom() {
  await nextTick()
  const el = messagesEl.value
  if (el) el.scrollTop = el.scrollHeight
}

async function load(silent = false) {
  const shouldStick = isNearBottom()
  if (!silent) loading.value = true
  error.value = ''
  try {
    messages.value = asArray<ChatMessage>(await creditRequestsService.messages(props.request.id))
    if (!silent || shouldStick) await scrollToBottom()
  } catch (err) {
    if (!silent) error.value = err instanceof Error ? err.message : 'Falha ao carregar mensagens.'
  } finally {
    if (!silent) loading.value = false
  }
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  draft.value = ''
  sending.value = true
  error.value = ''
  try {
    await creditRequestsService.sendMessage(props.request.id, text)
    await load(true)
    await scrollToBottom()
  } catch (err) {
    draft.value = text
    error.value = err instanceof Error ? err.message : 'Falha ao enviar mensagem.'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await load()
  poll = window.setInterval(() => load(true), 4000)
})

onBeforeUnmount(() => {
  if (poll) window.clearInterval(poll)
})
</script>

<template>
  <div class="dialog-backdrop" role="presentation" @click.self="emit('close')">
    <section class="request-dialog request-chat" role="dialog" aria-modal="true" aria-label="Chat do pedido">
      <header class="dialog-head">
        <div>
          <span>Pedido #{{ request.id.slice(-6).toUpperCase() }}</span>
          <strong>Conversa do pedido</strong>
        </div>
        <button type="button" aria-label="Fechar chat" @click="emit('close')">Fechar</button>
      </header>

      <div ref="messagesEl" class="messages-panel">
        <p v-if="loading && messages.length === 0" class="empty-message">Carregando mensagens...</p>
        <p v-else-if="messages.length === 0" class="empty-message">Nenhuma mensagem ainda.</p>

        <article
          v-for="(message, index) in messages"
          :key="message.id || index"
          class="message-bubble"
          :class="{ mine: getSenderId(message) === user?.id }"
        >
          <p>{{ getContent(message) }}</p>
          <span>{{ getSenderName(message) }}<template v-if="getDate(message)"> - {{ getDate(message) }}</template></span>
        </article>
      </div>

      <p v-if="error" class="dialog-error">{{ error }}</p>

      <footer class="composer">
        <textarea
          v-model="draft"
          rows="2"
          placeholder="Digite sua mensagem..."
          @keydown.enter.exact.prevent="send"
        />
        <button type="button" :disabled="sending || !draft.trim()" @click="send">
          {{ sending ? '...' : 'Enviar' }}
        </button>
      </footer>
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
  max-height: min(760px, 92dvh);
  display: grid;
  grid-template-rows: auto minmax(260px, 1fr) auto auto;
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

.dialog-head span,
.message-bubble span {
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

.dialog-head button,
.composer button {
  border: 0;
  cursor: pointer;
  font-weight: 850;
}

.dialog-head button {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 14px;
  color: var(--gj2-muted);
  background: #f2f4f1;
}

.messages-panel {
  min-height: 260px;
  max-height: 54dvh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 14px;
  border-radius: 22px;
  background: #f4f6f3;
}

.message-bubble {
  width: fit-content;
  max-width: 82%;
  display: grid;
  gap: 5px;
}

.message-bubble p {
  margin: 0;
  padding: 11px 13px;
  border-radius: 17px 17px 17px 6px;
  color: var(--gj2-ink);
  background: #fff;
  box-shadow: 0 12px 24px rgba(92, 104, 113, .12);
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-bubble.mine {
  align-self: flex-end;
}

.message-bubble.mine p {
  border-radius: 17px 17px 6px 17px;
  color: #fff;
  background: var(--gj2-sidebar);
}

.message-bubble.mine span {
  text-align: right;
}

.empty-message,
.dialog-error {
  margin: auto;
  color: var(--gj2-muted);
  text-align: center;
  font-weight: 760;
}

.dialog-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  color: #a3362b;
  background: #fff0ed;
}

.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 10px;
}

.composer textarea {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--gj2-line);
  border-radius: 17px;
  outline: none;
  resize: none;
  padding: 12px 14px;
  color: var(--gj2-ink);
  background: #fff;
  font: inherit;
}

.composer button {
  border-radius: 17px;
  color: #fff;
  background: var(--gj2-green-deep);
}

.composer button:disabled {
  cursor: not-allowed;
  opacity: .5;
}

@media (max-width: 560px) {
  .dialog-backdrop {
    padding: 10px;
  }

  .request-dialog {
    border-radius: 22px;
    max-height: 90dvh;
  }

  .messages-panel {
    max-height: 50dvh;
  }

  .message-bubble {
    max-width: 92%;
  }

  .composer {
    grid-template-columns: 1fr;
  }

  .composer button {
    min-height: 46px;
  }
}
</style>
