<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  CheckCheck,
  Clock,
  MessageSquareDot,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
  X,
} from '@lucide/vue'

import { chatService } from '@/services/api/chat.service'
import { useAuthStore } from '@/stores/auth.store'
import type { ChatMessage, ChatThread } from '@/types/domain'
import { asArray } from '@/utils/format'

// ─── types ────────────────────────────────────────────────────────────────────
interface MsgMeta extends ChatMessage {
  kind: 'message'
  isFirst: boolean   // first in consecutive group from same sender
  isLast: boolean    // last in consecutive group — shows tail
}
type ListItem =
  | { kind: 'separator'; label: string; id: string }
  | MsgMeta

// ─── paleta de avatares (determinística) ─────────────────────────────────────
const AVATAR_COLORS: [string, string][] = [
  ['#1A8754', '#fff'],
  ['#0D6EFD', '#fff'],
  ['#6F42C1', '#fff'],
  ['#D63384', '#fff'],
  ['#FD7E14', '#fff'],
  ['#20C997', '#fff'],
  ['#DC3545', '#fff'],
  ['#0DCAF0', '#111'],
]
function avatarColor(name = ''): [string, string] {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function initials(name = 'J2') {
  return name.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || 'J2'
}

// ─── quick replies ────────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  'Pedido recebido. Você entrou na fila de recarga. ✅',
  'Sua recarga foi concluída. Os créditos já estão disponíveis. 🎉',
  'Envie o comprovante para agilizar a conferência. 📎',
  'Vou verificar no painel do fornecedor e retorno em instantes.',
  'Aguarde, estou processando seu pedido. ⏳',
  'Qual o valor e o servidor desejado?',
]

// ─── state ────────────────────────────────────────────────────────────────────
const threads         = ref<ChatThread[]>([])
const messages        = ref<ChatMessage[]>([])
const selectedId      = ref('')
const draft           = ref('')
const searchQuery     = ref('')
const loading         = ref(false)
const sending         = ref(false)
const archiving       = ref(false)
const error           = ref('')
const messageList     = ref<HTMLElement | null>(null)
const draftEl         = ref<HTMLTextAreaElement | null>(null)
const atBottom        = ref(true)
const newMsgCount     = ref(0)
const mobilePanel     = ref<'list' | 'chat'>('list')
const showTyping      = ref(false)
const showSearch      = ref(false)
let typingTimer: ReturnType<typeof setTimeout> | null = null
const auth = useAuthStore()

// ─── computed ─────────────────────────────────────────────────────────────────
const selectedThread = computed(
  () => threads.value.find((t) => t.resellerId === selectedId.value) ?? null,
)

const filteredThreads = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return threads.value
  return threads.value.filter(
    (t) =>
      (t.resellerName ?? '').toLowerCase().includes(q) ||
      (t.lastMessage  ?? '').toLowerCase().includes(q),
  )
})

const totalUnread = computed(() =>
  threads.value.reduce((s, t) => s + (t.unreadCount ?? 0), 0),
)

// mensagens agrupadas com separadores de data e metadados de grupo
const listItems = computed<ListItem[]>(() => {
  const result: ListItem[] = []
  let lastDay = ''

  for (let i = 0; i < messages.value.length; i++) {
    const msg  = messages.value[i]
    const prev = messages.value[i - 1]
    const next = messages.value[i + 1]

    const day = dayKey(msg.createdAt ?? msg.created_date ?? '')
    if (day && day !== lastDay) {
      lastDay = day
      result.push({ kind: 'separator', label: dayLabel(day), id: `sep-${day}` })
    }

    const mine     = isMine(msg)
    const prevMine = prev ? isMine(prev) : !mine
    const nextMine = next ? isMine(next) : !mine
    const prevDay  = prev ? dayKey(prev.createdAt ?? prev.created_date ?? '') : ''

    result.push({
      ...msg,
      kind: 'message',
      isFirst: mine !== prevMine || prevDay !== day,
      isLast:  mine !== nextMine || !next || dayKey(next.createdAt ?? next.created_date ?? '') !== day,
    })
  }
  return result
})

// ─── helpers de data / hora ───────────────────────────────────────────────────
function dayKey(iso: string): string {
  if (!iso) return ''
  try { return new Date(iso).toDateString() } catch { return '' }
}

function dayLabel(key: string): string {
  const today     = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86_400_000).toDateString()
  if (key === today)     return 'Hoje'
  if (key === yesterday) return 'Ontem'
  try {
    return new Date(key).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    })
  } catch { return key }
}

function bubbleTime(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function threadTime(iso?: string): string {
  if (!iso) return ''
  try {
    const d   = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
    if (diffDays < 7)
      return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

// ─── role helpers ─────────────────────────────────────────────────────────────
function isMine(msg: ChatMessage) {
  const sid = msg.senderId ?? msg.sender_id ?? ''
  return msg.id.startsWith('pending-') || (!!auth.user?.id && sid === auth.user.id)
}

function threadName(thread?: ChatThread | null) {
  return thread?.resellerName || 'Revendedor'
}

function threadAvatarUrl(thread?: ChatThread | null) {
  return auth.isAdmin ? (thread?.resellerImageUrl || '') : (thread?.counterpartImageUrl || '')
}

function counterpartAvatarUrl(thread?: ChatThread | null) {
  return thread?.counterpartImageUrl || thread?.resellerImageUrl || ''
}

function messageAvatarUrl(msg: ChatMessage) {
  if (isMine(msg)) return auth.user?.profile_image_url || auth.user?.profileImageUrl || ''
  return msg.senderImageUrl || msg.sender_image_url || counterpartAvatarUrl(selectedThread.value)
}

function tickStatus(msg: MsgMeta): 'pending' | 'sent' {
  return msg.id.startsWith('pending-') ? 'pending' : 'sent'
}

// ─── scroll ───────────────────────────────────────────────────────────────────
function onScroll() {
  const el = messageList.value
  if (!el) return
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  atBottom.value = nearBottom
  if (nearBottom) newMsgCount.value = 0
}

async function scrollToBottom(force = false) {
  await nextTick()
  const el = messageList.value
  if (!el) return
  if (force || atBottom.value) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  else newMsgCount.value++
}

function jumpToBottom() {
  const el = messageList.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  newMsgCount.value = 0
}

// ─── data ─────────────────────────────────────────────────────────────────────
async function loadMessages(id: string) {
  try {
    messages.value = asArray<ChatMessage>(await chatService.messages(id))
  } catch (e) {
    messages.value = []
    error.value = e instanceof Error ? e.message : 'Não foi possível carregar as mensagens.'
  }
  await scrollToBottom(true)
}

async function selectThread(resellerId?: string) {
  if (!resellerId || resellerId === selectedId.value) {
    mobilePanel.value = 'chat'
    return
  }
  error.value      = ''
  selectedId.value = resellerId
  messages.value   = []
  newMsgCount.value = 0
  mobilePanel.value = 'chat'
  atBottom.value    = true

  // zera unread no store local
  const idx = threads.value.findIndex((t) => t.resellerId === resellerId)
  if (idx !== -1) threads.value[idx] = { ...threads.value[idx], unreadCount: 0 }

  await loadMessages(resellerId)
  await nextTick()
  draftEl.value?.focus()
  fakeTyping()
}

async function load() {
  loading.value = true
  error.value   = ''
  try {
    threads.value = asArray<ChatThread>(await chatService.threads())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar conversas.'
  } finally {
    loading.value = false
  }
  if (threads.value[0]?.resellerId) {
    selectedId.value = threads.value[0].resellerId
    await loadMessages(selectedId.value)
  }
}

// ─── envio ────────────────────────────────────────────────────────────────────
async function send() {
  const content = draft.value.trim()
  if (!content || !selectedId.value || sending.value) return
  sending.value = true
  draft.value   = ''

  const optimistic: ChatMessage = {
    id: `pending-${Date.now()}`,
    resellerId: selectedId.value,
    senderId: auth.user?.id || 'pending',
    senderName: auth.user?.name || 'Voce',
    senderRole: auth.isAdmin ? 'admin' : 'reseller',
    senderImageUrl: auth.user?.profile_image_url || auth.user?.profileImageUrl,
    content,
    createdAt: new Date().toISOString(),
  }
  messages.value.push(optimistic)
  await scrollToBottom(true)

  // atualiza preview na lista
  const idx = threads.value.findIndex((t) => t.resellerId === selectedId.value)
  if (idx !== -1)
    threads.value[idx] = {
      ...threads.value[idx],
      lastMessage: content,
      updatedAt: new Date().toISOString(),
    }

  try {
    const saved = await chatService.send(content, selectedId.value)
    messages.value = messages.value.map((m) => (m.id === optimistic.id ? saved : m))
  } catch (e) {
    messages.value = messages.value.filter((m) => m.id !== optimistic.id)
    draft.value    = content
    error.value    = e instanceof Error ? e.message : 'Falha ao enviar.'
  } finally {
    sending.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

function insertQuick(text: string) {
  draft.value = draft.value ? `${draft.value}\n${text}` : text
  draftEl.value?.focus()
}

// ─── archive ──────────────────────────────────────────────────────────────────
async function archiveThread() {
  if (!selectedId.value) return
  archiving.value = true
  const id = selectedId.value
  try {
    await chatService.archive(id)
    threads.value    = threads.value.filter((t) => t.resellerId !== id)
    selectedId.value = threads.value[0]?.resellerId ?? ''
    messages.value   = []
    mobilePanel.value = 'list'
    if (selectedId.value) await loadMessages(selectedId.value)
  } catch {
    error.value = 'Não foi possível arquivar.'
  } finally {
    archiving.value = false
  }
}

// ─── typing indicator (demo) ──────────────────────────────────────────────────
function fakeTyping() {
  if (typingTimer) clearTimeout(typingTimer)
  showTyping.value = false
  if (Math.random() > 0.5) {
    typingTimer = setTimeout(() => {
      showTyping.value = true
      typingTimer = setTimeout(() => { showTyping.value = false }, 3000)
    }, 1200)
  }
}

watch(selectedId, (v) => { if (v) fakeTyping() })
onMounted(load)
onUnmounted(() => { if (typingTimer) clearTimeout(typingTimer) })
</script>

<template>
  <div class="chat-root">

    <!-- ══════════════════════════════════════════════════════════
         PAINEL ESQUERDO — lista de conversas
    ══════════════════════════════════════════════════════════════ -->
    <aside class="chat-sidebar" :class="{ 'mob-hide': mobilePanel === 'chat' }">

      <!-- cabeçalho fixo da sidebar -->
      <header class="sb-header">
        <div class="sb-header-main">
          <div class="sb-brand">
            <span class="sb-brand-dot" />
            <span>Conversas</span>
            <span v-if="totalUnread" class="sb-unread-pill">{{ totalUnread }}</span>
          </div>
          <div class="sb-header-actions">
            <button
              class="sb-icon-btn"
              :class="{ active: showSearch }"
              title="Buscar"
              type="button"
              @click="showSearch = !showSearch"
            >
              <Search v-if="!showSearch" :size="18" :stroke-width="2.3" />
              <X v-else :size="18" :stroke-width="2.3" />
            </button>
          </div>
        </div>

        <transition name="search-slide">
          <div v-if="showSearch" class="sb-search">
            <Search :size="15" :stroke-width="2.4" class="sb-search-icon" />
            <input
              v-model="searchQuery"
              class="sb-search-input"
              placeholder="Buscar conversa..."
              autofocus
            />
            <button v-if="searchQuery" class="sb-search-clear" type="button" @click="searchQuery = ''">
              <X :size="13" :stroke-width="2.5" />
            </button>
          </div>
        </transition>
      </header>

      <!-- lista -->
      <div class="sb-list" role="listbox">
        <!-- skeleton de carregamento -->
        <template v-if="loading">
          <div v-for="i in 6" :key="i" class="sb-skeleton">
            <div class="sk-av" />
            <div class="sk-body">
              <div class="sk-line sk-ln-name" />
              <div class="sk-line sk-ln-msg" />
            </div>
          </div>
        </template>

        <!-- threads -->
        <template v-else>
          <button
            v-for="t in filteredThreads"
            :key="t.resellerId"
            class="sb-thread"
            :class="{ selected: selectedId === t.resellerId }"
            role="option"
            :aria-selected="selectedId === t.resellerId"
            @click="selectThread(t.resellerId)"
          >
            <!-- avatar -->
            <span
              class="sb-av"
              :style="{
                background: avatarColor(threadName(t))[0],
                color: avatarColor(threadName(t))[1],
              }"
            >
              <img v-if="threadAvatarUrl(t)" :src="threadAvatarUrl(t)" :alt="threadName(t)" />
              <span v-else>{{ initials(threadName(t)) }}</span>
              <span class="sb-av-online" />
            </span>

            <!-- info -->
            <span class="sb-info">
              <span class="sb-info-row">
                <strong class="sb-name">{{ threadName(t) }}</strong>
                <time class="sb-time">{{ threadTime(t.updatedAt) }}</time>
              </span>
              <span class="sb-info-row">
                <span class="sb-preview">{{ t.lastMessage ?? 'Nenhuma mensagem' }}</span>
                <span v-if="t.unreadCount" class="sb-badge">{{ t.unreadCount }}</span>
              </span>
            </span>
          </button>

          <div v-if="!loading && !filteredThreads.length" class="sb-empty">
            <MessageSquareDot :size="40" :stroke-width="1.4" />
            <span>Nenhuma conversa encontrada</span>
          </div>
        </template>
      </div>
    </aside>

    <!-- ══════════════════════════════════════════════════════════
         PAINEL DIREITO — conversa
    ══════════════════════════════════════════════════════════════ -->
    <section class="chat-conv" :class="{ 'mob-hide': mobilePanel === 'list' }">

      <!-- ── estado vazio ─────────────────────────────────────── -->
      <div v-if="!selectedId" class="conv-empty">
        <div class="conv-empty-icon">
          <MessageSquareDot :size="64" :stroke-width="1.1" />
        </div>
        <h2>Central de Atendimento</h2>
        <p>Selecione uma conversa para iniciar o suporte ao revendedor.</p>
      </div>

      <template v-else>
        <!-- ── cabeçalho da conversa ────────────────────────────── -->
        <header class="conv-header">
          <button class="conv-back" type="button" aria-label="Voltar" @click="mobilePanel = 'list'">
            <ArrowLeft :size="20" :stroke-width="2.4" />
          </button>

          <span
            class="conv-av"
            :style="{
              background: avatarColor(threadName(selectedThread))[0],
              color: avatarColor(threadName(selectedThread))[1],
            }"
          >
            <img v-if="counterpartAvatarUrl(selectedThread)" :src="counterpartAvatarUrl(selectedThread)" :alt="threadName(selectedThread)" />
            <span v-else>{{ initials(threadName(selectedThread)) }}</span>
          </span>

          <div class="conv-id">
            <strong>{{ threadName(selectedThread) }}</strong>
            <transition name="fade-status" mode="out-in">
              <small v-if="showTyping" key="typing" class="status-typing">
                <span class="tdot" /><span class="tdot" /><span class="tdot" />
                digitando&hellip;
              </small>
              <small v-else key="online" class="status-online">Online</small>
            </transition>
          </div>

          <div class="conv-actions">
            <button type="button" class="conv-icon-btn" title="Chamada de voz">
              <Phone :size="17" :stroke-width="2.2" />
            </button>
            <button type="button" class="conv-icon-btn" title="Vídeo">
              <Video :size="17" :stroke-width="2.2" />
            </button>
            <button
              type="button"
              class="conv-archive-btn"
              :disabled="archiving"
              title="Arquivar conversa"
              @click="archiveThread"
            >
              <Archive :size="15" :stroke-width="2.2" />
              <span class="archive-label">{{ archiving ? 'Arquivando…' : 'Arquivar' }}</span>
            </button>
          </div>
        </header>

        <!-- ── área de mensagens ────────────────────────────────── -->
        <div ref="messageList" class="conv-messages" @scroll="onScroll">

          <!-- aviso de erro inline -->
          <transition name="fade-in">
            <div v-if="error" class="msg-error">
              <span>{{ error }}</span>
              <button type="button" @click="error = ''"><X :size="13" /></button>
            </div>
          </transition>

          <template v-for="item in listItems" :key="item.id">

            <!-- separador de data ──────────────────────────── -->
            <div v-if="item.kind === 'separator'" class="msg-day">
              <span>{{ item.label }}</span>
            </div>

            <!-- bolha de mensagem ─────────────────────────── -->
            <div
              v-else-if="item.kind === 'message'"
              class="msg-row"
              :class="{
                'msg-mine':  isMine(item),
                'msg-first': item.isFirst,
                'msg-last':  item.isLast,
              }"
            >
              <!-- avatar lateral (apenas primeira mensagem do grupo, lado delas) -->
              <span
                v-if="!isMine(item) && item.isLast"
                class="msg-av"
                :style="{
                  background: avatarColor(item.senderName || threadName(selectedThread))[0],
                  color: avatarColor(item.senderName || threadName(selectedThread))[1],
                }"
              >
                <img v-if="messageAvatarUrl(item)" :src="messageAvatarUrl(item)" :alt="item.senderName || threadName(selectedThread)" />
                <span v-else>{{ initials(item.senderName || threadName(selectedThread)) }}</span>
              </span>
              <span v-else-if="!isMine(item)" class="msg-av-gap" />

              <article
                class="bubble"
                :class="{
                  'bubble-mine':  isMine(item),
                  'bubble-tail':  item.isLast,
                  'bubble-first': item.isFirst,
                }"
              >
                <p class="bubble-text">{{ item.content }}</p>
                <footer class="bubble-foot">
                  <time>{{ bubbleTime(item.createdAt ?? item.created_date) }}</time>
                  <span v-if="isMine(item)" class="bubble-ticks">
                    <Clock v-if="tickStatus(item) === 'pending'" :size="11" :stroke-width="2.5" class="tick-pending" />
                    <CheckCheck v-else :size="13" :stroke-width="2.7" class="tick-done" />
                  </span>
                </footer>
              </article>
            </div>
          </template>

          <!-- indicador de digitação ─────────────────────── -->
          <transition name="typing-in">
            <div v-if="showTyping" class="typing-row">
              <span
                class="msg-av"
                :style="{
                  background: avatarColor(threadName(selectedThread))[0],
                  color: avatarColor(threadName(selectedThread))[1],
                }"
              >
                <img v-if="counterpartAvatarUrl(selectedThread)" :src="counterpartAvatarUrl(selectedThread)" :alt="threadName(selectedThread)" />
                <span v-else>{{ initials(threadName(selectedThread)) }}</span>
              </span>
              <div class="typing-bubble">
                <span class="tdot" /><span class="tdot" /><span class="tdot" />
              </div>
            </div>
          </transition>

          <div class="conv-anchor" />
        </div>

        <!-- botão scroll-to-bottom ──────────────────────────── -->
        <transition name="fab-in">
          <button
            v-if="!atBottom"
            class="scroll-fab"
            type="button"
            aria-label="Ir para o final"
            @click="jumpToBottom"
          >
            <span v-if="newMsgCount" class="fab-count">{{ newMsgCount }}</span>
            <ArrowDown :size="18" :stroke-width="2.4" />
          </button>
        </transition>

        <!-- ── compositor ───────────────────────────────────── -->
        <footer class="conv-footer">
          <!-- frases prontas -->
          <div class="quick-bar">
            <button
              v-for="r in QUICK_REPLIES"
              :key="r"
              type="button"
              class="quick-chip"
              @click="insertQuick(r)"
            >{{ r }}</button>
          </div>

          <!-- barra de input -->
          <div class="compose-bar">
            <button type="button" class="compose-icon" title="Emoji">
              <Smile :size="22" :stroke-width="1.9" />
            </button>
            <button type="button" class="compose-icon" title="Anexar arquivo">
              <Paperclip :size="20" :stroke-width="2" />
            </button>
            <div class="compose-input-wrap">
              <textarea
                ref="draftEl"
                v-model="draft"
                class="compose-input"
                placeholder="Mensagem"
                rows="1"
                @keydown="onKeydown"
              />
            </div>
            <button
              class="compose-send"
              type="button"
              :class="{ active: draft.trim() }"
              :disabled="!draft.trim() || sending"
              @click="send"
            >
              <Send :size="18" :stroke-width="2.4" />
            </button>
          </div>
        </footer>
      </template>
    </section>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════════
   VARIÁVEIS
═══════════════════════════════════════════════════════════════════════════════ */
.chat-root {
  --wa-green:    var(--gj2-green-deep);
  --wa-green-dk: #4d8068;
  --wa-sent:     linear-gradient(145deg, rgba(117, 170, 142, .96), rgba(74, 132, 103, .96));
  --wa-recv:     rgba(255, 255, 255, .92);
  --wa-bg:       linear-gradient(145deg, rgba(236, 240, 237, .84), rgba(218, 226, 222, .72));
  --wa-sidebar:  rgba(255, 255, 255, .82);
  --wa-hdr:      rgba(248, 250, 248, .84);
  --wa-line:     rgba(212, 220, 216, .74);
  --wa-text:     var(--gj2-ink);
  --wa-muted:    var(--gj2-muted);
  --wa-shadow:   0 10px 24px rgba(80, 94, 104, .10), inset 0 1px 0 rgba(255,255,255,.56);
  --wa-radius:   16px;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SHELL
═══════════════════════════════════════════════════════════════════════════════ */
.chat-root {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  border-radius: 22px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px var(--gj2-card-border),
    0 24px 56px rgba(60,72,80,.14);
  background: var(--gj2-card-bg);
  backdrop-filter: blur(20px);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════════════════════════ */
.chat-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--wa-sidebar);
  border-right: 1px solid var(--wa-line);
  backdrop-filter: blur(18px);
}

/* cabeçalho */
.sb-header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--wa-line);
}

.sb-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  min-height: 58px;
  background: var(--wa-hdr);
  box-shadow: inset 0 -1px 0 rgba(255,255,255,.26);
}

.sb-brand {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 870;
  color: var(--wa-text);
}

.sb-brand span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sb-brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--wa-green);
  flex-shrink: 0;
}

.sb-unread-pill {
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--wa-green);
  color: #fff;
  font-size: 11px;
  font-weight: 950;
  display: grid;
  place-items: center;
}

.sb-header-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 4px;
}

.sb-icon-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--wa-line);
  border-radius: 13px;
  background: rgba(255,255,255,.46);
  color: var(--wa-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .15s ease, color .15s ease;
}

.sb-icon-btn:hover,
.sb-icon-btn.active {
  background: var(--gj2-sidebar);
  color: #fff;
}

/* barra de busca */
.sb-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 10px;
  padding: 0 12px;
  height: 36px;
  border: 1px solid var(--wa-line);
  border-radius: 16px;
  background: rgba(255,255,255,.68);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.48);
}

.sb-search-icon {
  color: var(--wa-muted);
  flex-shrink: 0;
}

.sb-search-input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
  color: var(--wa-text);
}

.sb-search-input::placeholder { color: #adb3b8; }

.sb-search-clear {
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  background: rgba(0,0,0,.1);
  color: var(--wa-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* lista de threads */
.sb-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(150,160,168,.35) transparent;
}

.sb-thread {
  width: calc(100% - 20px);
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 10px 0;
  padding: 11px;
  border: 1px solid transparent;
  border-radius: 19px;
  background: rgba(255,255,255,.38);
  cursor: pointer;
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3);
  transition: background .16s ease, border-color .16s ease, transform .16s ease;
}

.sb-thread > * {
  min-width: 0;
}

.sb-thread:hover {
  background: rgba(255,255,255,.66);
  transform: translateY(-1px);
}

.sb-thread.selected {
  border-color: rgba(126, 170, 148, .42);
  background: linear-gradient(145deg, rgba(143, 190, 168, .3), rgba(255,255,255,.64));
}

/* avatar da thread */
.sb-av {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -.02em;
  user-select: none;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.38);
}

.sb-av img,
.conv-av img,
.msg-av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sb-av-online {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #25D366;
  border: 2.5px solid var(--wa-sidebar);
}

/* info da thread */
.sb-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sb-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.sb-name {
  flex: 1;
  font-size: 14.5px;
  font-weight: 840;
  color: var(--wa-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sb-time {
  font-size: 11.5px;
  color: var(--wa-muted);
  flex-shrink: 0;
}

.sb-preview {
  flex: 1;
  font-size: 13px;
  color: var(--wa-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sb-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--wa-green);
  color: #fff;
  font-size: 11.5px;
  font-weight: 950;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* skeleton */
.sb-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #F5F6F5;
}

.sk-av {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(90deg, #EBEBEA 25%, #F5F5F4 50%, #EBEBEA 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.5s ease infinite;
}

.sk-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #EBEBEA 25%, #F5F5F4 50%, #EBEBEA 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.5s ease infinite;
}

.sk-ln-name { width: 50%; }
.sk-ln-msg  { width: 80%; }

@keyframes sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* empty state na sidebar */
.sb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  color: #B3BBC1;
}

.sb-empty span { font-size: 13px; font-weight: 760; }

/* ═══════════════════════════════════════════════════════════════════════════════
   CONVERSA
═══════════════════════════════════════════════════════════════════════════════ */
.chat-conv {
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  background: var(--wa-bg);
  /* padrão WhatsApp sutil */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e5ddd5'/%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%23c8bfb4' opacity='.6'/%3E%3Ccircle cx='0'  cy='0'  r='1.5' fill='%23c8bfb4' opacity='.6'/%3E%3Ccircle cx='80' cy='0'  r='1.5' fill='%23c8bfb4' opacity='.6'/%3E%3Ccircle cx='0'  cy='80' r='1.5' fill='%23c8bfb4' opacity='.6'/%3E%3Ccircle cx='80' cy='80' r='1.5' fill='%23c8bfb4' opacity='.6'/%3E%3C/svg%3E");
}

/* estado vazio */
.conv-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 40px;
  background: #F7F8F8;
}

.conv-empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #EDEDED;
  color: #B3BBC1;
}

.conv-empty h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 780;
  color: #41525D;
}

.conv-empty p {
  margin: 0;
  font-size: 14px;
  color: #8696A0;
  max-width: 340px;
  line-height: 1.5;
}

/* ── cabeçalho da conversa ─────────────────────────────────── */
.conv-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  min-height: 62px;
  flex-shrink: 0;
  background: var(--wa-hdr);
  border-bottom: 1px solid var(--wa-line);
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  position: relative;
  z-index: var(--gj2-z-sticky);
}

.conv-back {
  display: none;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--wa-muted);
  cursor: pointer;
  place-items: center;
  transition: background .15s ease;
  flex-shrink: 0;
}

.conv-back:hover { background: rgba(0,0,0,.06); }

.conv-av {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 900;
  user-select: none;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.38);
}

.conv-id {
  flex: 1;
  min-width: 0;
}

.conv-id strong {
  display: block;
  font-size: 15px;
  font-weight: 840;
  color: var(--wa-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-online {
  display: block;
  font-size: 12px;
  color: var(--wa-green);
  font-weight: 700;
}

.status-typing {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--wa-green);
  font-weight: 700;
  font-style: italic;
}

/* pontos digitando (header) */
.tdot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
  animation: tdot-bounce .9s ease-in-out infinite;
}

.tdot:nth-child(2) { animation-delay: .16s; }
.tdot:nth-child(3) { animation-delay: .32s; }

@keyframes tdot-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%            { transform: translateY(-4px); }
}

/* ações do header */
.conv-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
  min-width: 0;
}

.conv-icon-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--wa-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .15s ease, color .15s ease;
}

.conv-icon-btn:hover {
  background: rgba(0,0,0,.06);
  color: var(--wa-text);
}

.conv-archive-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  height: 32px;
  border: 1px solid #D4D4D2;
  border-radius: 999px;
  background: #fff;
  color: var(--wa-muted);
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}

.conv-archive-btn:hover {
  background: #FFF0F0;
  border-color: #E0B4B4;
  color: #C0392B;
}

.conv-archive-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── mensagens ─────────────────────────────────────────────── */
.conv-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 6% 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(160,170,178,.38) transparent;
}

/* erro inline */
.msg-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #FFF3CD;
  border: 1px solid #FFEAA7;
  color: #6D5312;
  font-size: 13px;
  font-weight: 720;
  margin-bottom: 8px;
}

.msg-error button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: .7;
}

/* separador de data */
.msg-day {
  display: flex;
  justify-content: center;
  margin: 14px 0 10px;
}

.msg-day span {
  padding: 5px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,.85);
  box-shadow: var(--wa-shadow);
  font-size: 12px;
  font-weight: 800;
  color: #54656F;
  letter-spacing: .02em;
  user-select: none;
}

/* linha de mensagem */
.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  max-width: 74%;
  align-self: flex-start;
}

.msg-row.msg-mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}

/* margem extra entre grupos */
.msg-first { margin-top: 6px; }

/* avatar lateral */
.msg-av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 900;
  user-select: none;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.14);
}

.msg-av-gap {
  width: 28px;
  flex-shrink: 0;
}

/* bolha */
.bubble {
  position: relative;
  padding: 7px 10px 5px;
  border-radius: var(--wa-radius);
  background: var(--wa-recv);
  box-shadow: var(--wa-shadow);
  word-break: break-word;
  overflow-wrap: anywhere;
  animation: bubble-pop .18s cubic-bezier(.2,.9,.4,1) both;
}

.bubble-mine {
  background: var(--wa-sent);
  border-radius: var(--wa-radius);
}

/* cauda (apenas na última bolha do grupo) */
.bubble-tail:not(.bubble-mine)::before {
  content: '';
  position: absolute;
  left: -6px;
  bottom: 0;
  width: 0; height: 0;
  border-top: 6px solid transparent;
  border-right: 7px solid var(--wa-recv);
  pointer-events: none;
}

.bubble-tail.bubble-mine::after {
  content: '';
  position: absolute;
  right: -6px;
  bottom: 0;
  width: 0; height: 0;
  border-top: 6px solid transparent;
  border-left: 7px solid var(--wa-sent);
  pointer-events: none;
}

.bubble-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.46;
  color: var(--wa-text);
  white-space: pre-wrap;
}

.bubble-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  margin-top: 2px;
}

.bubble-foot time {
  font-size: 11px;
  color: var(--wa-muted);
  user-select: none;
}

.bubble-ticks {
  display: flex;
  align-items: center;
}

.tick-pending { color: var(--wa-muted); opacity: .7; }
.tick-done    { color: #53BDEB; }

@keyframes bubble-pop {
  from { opacity: 0; transform: scale(.92) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* indicador de digitação (bolha) */
.typing-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin-top: 6px;
  animation: bubble-pop .22s cubic-bezier(.2,.9,.4,1) both;
}

.typing-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 13px;
  border-radius: var(--wa-radius) var(--wa-radius) var(--wa-radius) 0;
  background: var(--wa-recv);
  box-shadow: var(--wa-shadow);
  position: relative;
}

.typing-bubble::before {
  content: '';
  position: absolute;
  left: -6px;
  bottom: 0;
  width: 0; height: 0;
  border-top: 6px solid transparent;
  border-right: 7px solid var(--wa-recv);
  pointer-events: none;
}

.typing-bubble .tdot {
  width: 7px;
  height: 7px;
  background: #B3BBC1;
}

.conv-anchor { height: 4px; flex-shrink: 0; }

/* FAB scroll-to-bottom */
.scroll-fab {
  position: absolute;
  right: 20px;
  bottom: 130px;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: var(--wa-muted);
  box-shadow: 0 2px 8px rgba(0,0,0,.22);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease;
  z-index: var(--gj2-z-sticky);
}

.scroll-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 14px rgba(0,0,0,.28);
}

.fab-count {
  position: absolute;
  top: -6px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--wa-green);
  color: #fff;
  font-size: 10px;
  font-weight: 950;
  display: grid;
  place-items: center;
}

/* ── compositor ────────────────────────────────────────────── */
.conv-footer {
  flex-shrink: 0;
  background: var(--wa-hdr);
  border-top: 1px solid var(--wa-line);
  box-shadow: 0 -1px 8px rgba(0,0,0,.04);
  overflow: hidden;
}

/* frases prontas */
.quick-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px 0;
  overflow: hidden;
  max-width: 100%;
  max-height: 78px;
  scrollbar-width: none;
}

.quick-bar::-webkit-scrollbar { display: none; }

.quick-chip {
  flex: 0 1 auto;
  min-width: 0;
  max-width: min(100%, 310px);
  padding: 5px 11px;
  border: 1px solid #D1D7DB;
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  font-weight: 760;
  color: #54656F;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: border-color .14s ease, background .14s ease, color .14s ease;
}

.quick-chip:hover {
  border-color: var(--wa-green);
  background: rgba(0,168,132,.07);
  color: var(--wa-green-dk);
}

/* barra de input */
.compose-bar {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 8px 10px 10px;
}

.compose-icon {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #8696A0;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: color .15s ease;
}

.compose-icon:hover { color: var(--wa-text); }

.compose-input-wrap {
  flex: 1;
  min-width: 0;
}

.compose-input {
  width: 100%;
  min-height: 42px;
  max-height: 140px;
  padding: 10px 14px;
  border: 0;
  border-radius: 21px;
  background: #fff;
  font: inherit;
  font-size: 14.5px;
  color: var(--wa-text);
  resize: none;
  outline: 0;
  box-shadow: var(--wa-shadow);
  field-sizing: content;
  display: block;
}

.compose-input::placeholder { color: #8696A0; }

.compose-send {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: #AEBAC1;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .18s ease, transform .12s ease;
}

.compose-send.active {
  background: var(--wa-green);
  box-shadow: 0 2px 8px rgba(0,168,132,.36);
}

.compose-send.active:hover {
  background: var(--wa-green-dk);
  transform: scale(1.06);
}

.compose-send:disabled:not(.active) { cursor: not-allowed; }

/* Refinamento visual Gestor J2: integra o chat ao tema sem alterar fluxo. */
.chat-conv {
  background-image:
    radial-gradient(circle at 16% 14%, rgba(255,255,255,.5), transparent 18%),
    radial-gradient(circle at 90% 92%, rgba(126, 170, 148, .22), transparent 26%),
    linear-gradient(90deg, rgba(255,255,255,.22) 0, transparent 1px);
  background-size: auto, auto, 28px 28px;
}

.conv-empty {
  background: transparent;
}

.conv-header {
  box-shadow: 0 12px 28px rgba(80, 94, 104, .08);
}

.conv-back,
.conv-icon-btn {
  border: 1px solid var(--wa-line);
  border-radius: 14px;
  background: rgba(255,255,255,.42);
}

.conv-archive-btn {
  border-color: var(--wa-line);
  background: rgba(255,255,255,.52);
}

.conv-footer {
  box-shadow: 0 -16px 28px rgba(80, 94, 104, .08);
}

.quick-chip {
  border-color: var(--wa-line);
  background: rgba(255,255,255,.58);
}

.compose-icon {
  border-radius: 14px;
  background: rgba(255,255,255,.34);
}

.compose-input {
  border: 1px solid var(--wa-line);
  background: rgba(255,255,255,.72);
}

.compose-send {
  border-radius: 15px;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TRANSIÇÕES
═══════════════════════════════════════════════════════════════════════════════ */
.search-slide-enter-active,
.search-slide-leave-active {
  transition: max-height .24s ease, opacity .2s ease;
  overflow: hidden;
  max-height: 60px;
}
.search-slide-enter-from,
.search-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.fade-status-enter-active,
.fade-status-leave-active { transition: opacity .18s ease; }
.fade-status-enter-from,
.fade-status-leave-to     { opacity: 0; }

.fade-in-enter-active { transition: opacity .2s ease; }
.fade-in-enter-from   { opacity: 0; }

.typing-in-enter-active,
.typing-in-leave-active { transition: opacity .2s ease, transform .2s ease; }
.typing-in-enter-from,
.typing-in-leave-to     { opacity: 0; transform: translateY(8px); }

.fab-in-enter-active,
.fab-in-leave-active { transition: opacity .18s ease, transform .2s cubic-bezier(.34,1.56,.64,1); }
.fab-in-enter-from,
.fab-in-leave-to     { opacity: 0; transform: scale(.7); }

/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSIVO
═══════════════════════════════════════════════════════════════════════════════ */
@media (max-width: 900px) {
  .chat-root {
    grid-template-columns: 1fr;
    height: 100%;
    border-radius: 22px 22px 0 0;
    box-shadow: none;
  }

  .chat-sidebar,
  .chat-conv {
    grid-row: 1;
    grid-column: 1;
    transition: transform .3s cubic-bezier(.22,.9,.3,1), opacity .25s ease;
  }

  .mob-hide {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transform: none;
    z-index: var(--gj2-z-base);
  }

  .chat-conv:not(.mob-hide) { position: relative; z-index: var(--gj2-z-sticky); }

  .conv-back { display: grid; }
  .archive-label { display: none; }
  .conv-archive-btn { padding: 0 10px; }
  .scroll-fab { bottom: 90px; }
}

@media (max-width: 580px) {
  .chat-root {
    height: 100%;
    border-radius: 22px 22px 0 0;
  }

  .chat-sidebar {
    border-right: 0;
  }

  .sb-list {
    padding-bottom: 12px;
  }

  .sb-header-main,
  .sb-thread {
    padding-inline: 12px;
  }

  .sb-brand {
    font-size: 16px;
  }

  .conv-header {
    min-height: 60px;
    padding: 8px 10px;
    gap: 8px;
  }
  .conv-av {
    width: 38px;
    height: 38px;
  }
  .conv-icon-btn {
    display: none;
  }
  .conv-archive-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    justify-content: center;
  }
  .conv-messages { padding: 12px 4% 10px; }
  .msg-row { max-width: 92%; }
  .quick-bar { display: none; }
  .compose-bar {
    gap: 6px;
    padding: 9px 8px 10px;
  }
  .compose-icon {
    width: 36px;
    height: 36px;
  }
  .compose-icon:nth-child(2) {
    display: none;
  }
  .compose-send {
    width: 40px;
    height: 40px;
  }
  .compose-icon:first-child { display: grid; } /* emoji sempre visível */
}

@media (max-width: 360px) {
  .conv-archive-btn {
    display: none;
  }

  .compose-icon {
    width: 34px;
    height: 34px;
  }

  .compose-send {
    width: 38px;
    height: 38px;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .conv-archive-btn {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line);
  color: var(--gj2-muted);
}

html[data-theme="dark"] .scroll-fab {
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-line);
}

html[data-theme="dark"] .quick-chip {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line);
  color: var(--gj2-muted);
}

html[data-theme="dark"] .compose-input {
  background: var(--gj2-input-bg);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .chat-root {
  --wa-sent: linear-gradient(145deg, rgba(92, 148, 120, .96), rgba(57, 103, 80, .96));
  --wa-recv: rgba(34, 39, 45, .96);
  --wa-bg: linear-gradient(145deg, rgba(24, 28, 33, .98), rgba(18, 22, 26, .98));
  --wa-sidebar: rgba(30, 35, 41, .94);
  --wa-hdr: rgba(34, 39, 45, .94);
  --wa-line: rgba(255,255,255,.08);
  --wa-text: #dde1e5;
  --wa-muted: #7c858d;
  --wa-shadow: 0 12px 26px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.04);
}

html[data-theme="dark"] .sb-thread {
  background: rgba(255,255,255,.035);
}

html[data-theme="dark"] .sb-thread:hover,
html[data-theme="dark"] .sb-thread.selected {
  background: rgba(255,255,255,.07);
}

html[data-theme="dark"] .sb-search,
html[data-theme="dark"] .sb-icon-btn,
html[data-theme="dark"] .conv-back,
html[data-theme="dark"] .conv-icon-btn,
html[data-theme="dark"] .quick-chip,
html[data-theme="dark"] .compose-icon,
html[data-theme="dark"] .compose-input {
  background: rgba(255,255,255,.055);
}

html[data-theme="dark"] .bubble-mine .bubble-text,
html[data-theme="dark"] .bubble-mine .bubble-foot time {
  color: #fff;
}

html[data-theme="dark"] .conv-empty {
  background: var(--wa-bg, rgba(18,22,26,.98));
  color: var(--wa-text, #dde1e5);
}

html[data-theme="dark"] .conv-empty-icon {
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.3);
}

html[data-theme="dark"] .conv-empty h2 {
  color: var(--wa-text, #dde1e5);
}

html[data-theme="dark"] .typing-bubble .tdot {
  background: rgba(255,255,255,.3);
}

html[data-theme="dark"] .compose-send {
  background: var(--gj2-sidebar);
}

html[data-theme="dark"] .sb-skeleton {
  border-bottom-color: rgba(255,255,255,.07);
}

html[data-theme="dark"] .conv-archive-btn {
  background: rgba(255,255,255,.07);
  border-color: rgba(255,255,255,.12);
  color: var(--wa-muted, #7c858d);
}

html[data-theme="dark"] .conv-archive-btn:hover {
  background: rgba(255, 72, 64, .1);
  border-color: rgba(255, 72, 64, .3);
  color: #ff8278;
}

html[data-theme="dark"] .msg-error {
  background: rgba(212, 165, 20, .12);
  border-color: rgba(212, 165, 20, .25);
  color: #e8c55a;
}

html[data-theme="dark"] .msg-day span {
  background: rgba(255, 255, 255, .10);
  box-shadow: none;
  color: rgba(255, 255, 255, .55);
}
</style>
