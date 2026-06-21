<script setup lang="ts">
import type { NotificationItem } from '@/types/domain'

defineProps<{
  notifications: NotificationItem[]
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  markRead: [id: string]
  markAllRead: []
  refresh: []
}>()

const typeLabel: Record<string, string> = {
  approval: 'Aprovado',
  rejection: 'Recusado',
  invoice: 'Fatura',
  message: 'Mensagem',
  payment_reminder: 'Cobranca',
  system: 'Sistema',
}

function isUnread(notification: NotificationItem) {
  return !(notification.isRead ?? notification.read)
}

function relativeTime(value?: string) {
  if (!value) return ''
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return ''

  const seconds = Math.floor((Date.now() - time) / 1000)
  if (seconds < 60) return 'agora'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}
</script>

<template>
  <section class="notification-popover" aria-label="Notificacoes">
    <header>
      <div>
        <strong>Notificacoes</strong>
        <span>{{ notifications.length }} registro(s)</span>
      </div>
      <div class="notification-head-actions">
        <button type="button" @click="emit('refresh')">Atualizar</button>
        <button v-if="notifications.some(isUnread)" type="button" @click="emit('markAllRead')">Marcar todas</button>
      </div>
    </header>

    <div v-if="loading" class="notification-state">Carregando notificacoes...</div>
    <div v-else-if="error" class="notification-state error">{{ error }}</div>
    <div v-else-if="notifications.length === 0" class="notification-state">Nenhuma notificacao por enquanto.</div>

    <div v-else class="notification-list">
      <button
        v-for="notification in notifications"
        :key="notification.id"
        type="button"
        class="notification-item"
        :class="{ unread: isUnread(notification) }"
        @click="emit('markRead', notification.id)"
      >
        <span class="notification-type">{{ typeLabel[notification.type || 'system'] || 'Sistema' }}</span>
        <strong>{{ notification.message || notification.title || 'Notificacao do sistema' }}</strong>
        <small>{{ relativeTime(notification.createdAt || notification.created_date) }}</small>
      </button>
    </div>
  </section>
</template>

<style scoped>
.notification-popover {
  width: min(390px, calc(100vw - 32px));
  max-height: min(480px, calc(100dvh - 120px));
  padding: 14px;
  border-radius: 24px;
  color: var(--gj2-ink);
  background: rgba(255,255,255,.94);
  box-shadow: 0 30px 70px rgba(58, 69, 76, .28), inset 0 1px rgba(255,255,255,.88);
  backdrop-filter: blur(18px);
  overflow: hidden;
}

.notification-popover header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.notification-popover header strong,
.notification-popover header span {
  display: block;
}

.notification-popover header strong {
  font-size: 16px;
  font-weight: 900;
}

.notification-popover header span {
  margin-top: 2px;
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 720;
}

.notification-head-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.notification-head-actions button {
  border: 0;
  min-height: 31px;
  padding: 0 9px;
  border-radius: 999px;
  color: #fff;
  background: var(--gj2-sidebar);
  cursor: pointer;
  font-size: 11px;
  font-weight: 850;
}

.notification-list {
  max-height: 380px;
  overflow: auto;
  display: grid;
  gap: 8px;
  padding-right: 3px;
}

.notification-item {
  width: 100%;
  border: 0;
  border-radius: 17px;
  padding: 12px 13px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 5px 10px;
  text-align: left;
  color: var(--gj2-ink);
  background: #f5f6f4;
  cursor: pointer;
}

.notification-item.unread {
  background: linear-gradient(135deg, rgba(143, 190, 168, .24), #f7fbf9);
}

.notification-type {
  color: var(--gj2-green-deep);
  font-size: 10px;
  font-weight: 920;
  text-transform: uppercase;
}

.notification-item strong {
  grid-column: 1 / -1;
  color: var(--gj2-ink);
  font-size: 13px;
  line-height: 1.35;
}

.notification-item small {
  grid-column: 2;
  grid-row: 1;
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 760;
}

.notification-state {
  min-height: 110px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--gj2-muted);
  font-size: 13px;
  font-weight: 760;
}

.notification-state.error {
  color: #b6473c;
}
</style>
