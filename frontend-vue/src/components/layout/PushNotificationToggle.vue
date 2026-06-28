<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { disablePush, enablePush, getPushState, isPushSupported } from '@/services/pushManager'

const supported = ref(false)
const permission = ref<NotificationPermission | 'unsupported'>('unsupported')
const subscribed = ref(false)
const loading = ref(false)
const message = ref('')

async function refreshState() {
  if (!isPushSupported()) return
  supported.value = true
  const state = await getPushState()
  permission.value = state.permission
  subscribed.value = state.subscribed
}

async function togglePush() {
  loading.value = true
  message.value = ''
  try {
    if (subscribed.value && permission.value === 'granted') {
      await disablePush()
      subscribed.value = false
      message.value = 'Push desativado neste dispositivo.'
    } else {
      await enablePush()
      permission.value = 'granted'
      subscribed.value = true
      message.value = 'Push ativo neste dispositivo.'
    }
  } catch (error) {
    permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
    message.value = error instanceof Error ? error.message : 'Nao foi possivel alterar o push.'
  } finally {
    loading.value = false
  }
}

onMounted(refreshState)
</script>

<template>
  <div v-if="supported" class="push-toggle">
    <button
      type="button"
      :class="{ active: subscribed && permission === 'granted', blocked: permission === 'denied' }"
      :disabled="loading || permission === 'denied'"
      @click="togglePush"
    >
      <span aria-hidden="true">{{ subscribed && permission === 'granted' ? 'ON' : permission === 'denied' ? '!' : 'P' }}</span>
      <strong>
        {{
          loading
            ? 'Aguarde...'
            : permission === 'denied'
              ? 'Push bloqueado'
              : subscribed && permission === 'granted'
                ? 'Push ativo'
                : 'Ativar push'
        }}
      </strong>
    </button>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<style scoped>
.push-toggle {
  display: grid;
  gap: 7px;
}

.push-toggle button {
  width: 100%;
  min-height: 42px;
  border: 0;
  border-radius: 15px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--gj2-muted);
  background: var(--gj2-surface-muted);
  box-shadow: inset 0 1px var(--gj2-modal-border), 0 12px 24px rgba(92, 104, 112, .12);
  cursor: pointer;
  font-size: 12px;
  font-weight: 860;
  transition: background .18s var(--gj2-ease), color .18s var(--gj2-ease);
}

.push-toggle button.active {
  color: #fff;
  background: linear-gradient(145deg, #8fbea8, #687582);
}

.push-toggle button.blocked {
  color: var(--gj2-red);
  background: rgba(255, 72, 64, .08);
}

.push-toggle button:disabled {
  cursor: not-allowed;
  opacity: .7;
}

.push-toggle span {
  width: 25px;
  height: 25px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.42);
  font-size: 10px;
  font-weight: 950;
}

.push-toggle strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.push-toggle p {
  margin: 0;
  color: var(--gj2-muted);
  font-size: 11px;
  line-height: 1.35;
}
</style>
