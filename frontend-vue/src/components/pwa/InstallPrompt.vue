<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { enablePush, isInstalledPWA, isIos, isPushSupported, notificationPermission } from '@/lib/pwa'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SNOOZE_KEY = 'gestor_j2_install_snooze'
const COUNT_KEY = 'gestor_j2_install_count'
const MAX_PROMPTS = 3
const REINSIST_MS = 1000 * 90
const LONG_SNOOZE_MS = 1000 * 60 * 60 * 24 * 3

const deferred = ref<BeforeInstallPromptEvent | null>(null)
const mode = ref<'install' | 'ios' | 'notify' | ''>('')
const installing = ref(false)
let reinsist: ReturnType<typeof setTimeout> | null = null

const getCount = () => Number(localStorage.getItem(COUNT_KEY) || 0)
const isSnoozed = () => Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0)

const visible = computed(() => mode.value !== '')

function evaluate() {
  // 1) Ja instalado: oferece ativar notificacoes se ainda nao concedeu.
  if (isInstalledPWA()) {
    if (isPushSupported() && notificationPermission() === 'default') {
      mode.value = 'notify'
    } else {
      mode.value = ''
    }
    return
  }
  // 2) Nao instalado: insiste na instalacao (ate 3x).
  if (isSnoozed() || getCount() >= MAX_PROMPTS) {
    mode.value = ''
    return
  }
  if (deferred.value) mode.value = 'install'
  else if (isIos()) mode.value = 'ios'
  else mode.value = ''
}

async function install() {
  if (!deferred.value) return
  installing.value = true
  try {
    await deferred.value.prompt()
    const choice = await deferred.value.userChoice
    deferred.value = null
    mode.value = ''
    if (choice.outcome === 'accepted') {
      // Apos instalar, ja pede a permissao de notificacao.
      await enablePush().catch(() => undefined)
    } else {
      dismiss()
    }
  } finally {
    installing.value = false
  }
}

async function activateNotifications() {
  await enablePush().catch(() => undefined)
  mode.value = ''
}

// Fecha e reaparece ate o limite (insiste). Esgotado, descansa 3 dias.
function dismiss() {
  mode.value = ''
  if (reinsist) clearTimeout(reinsist)
  if (isInstalledPWA()) {
    // banner de notificacao: descansa um dia
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 1000 * 60 * 60 * 24))
    return
  }
  const next = getCount() + 1
  localStorage.setItem(COUNT_KEY, String(next))
  if (next >= MAX_PROMPTS) {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + LONG_SNOOZE_MS))
    return
  }
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + REINSIST_MS))
  reinsist = setTimeout(evaluate, REINSIST_MS + 200)
}

function onBeforeInstall(event: Event) {
  event.preventDefault()
  deferred.value = event as BeforeInstallPromptEvent
  evaluate()
}

function onInstalled() {
  deferred.value = null
  localStorage.removeItem(SNOOZE_KEY)
  localStorage.removeItem(COUNT_KEY)
  evaluate()
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
  setTimeout(evaluate, 1500)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  window.removeEventListener('appinstalled', onInstalled)
  if (reinsist) clearTimeout(reinsist)
})
</script>

<template>
  <transition name="install-pop">
    <div v-if="visible" class="install-prompt" role="dialog" aria-label="Instalar aplicativo">
      <button class="install-close" type="button" aria-label="Fechar" @click="dismiss">×</button>

      <div class="install-main">
        <div class="install-icon">
          <img src="/icon-192.png" alt="Gestor J2" />
        </div>
        <div class="install-copy">
          <strong>
            {{ mode === 'notify' ? 'Ative as notificações' : 'Instale o app Gestor J2' }}
          </strong>
          <p>
            <template v-if="mode === 'notify'">
              Receba avisos de pedidos, pagamentos e mensagens na tela — mesmo com o app fechado.
            </template>
            <template v-else-if="mode === 'ios'">
              Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b> para instalar.
            </template>
            <template v-else>
              Acesso instantâneo na tela inicial e notificações em tempo real de pedidos e mensagens.
            </template>
          </p>
        </div>
      </div>

      <div class="install-actions">
        <button v-if="mode !== 'ios'" class="install-ghost" type="button" @click="dismiss">Agora não</button>
        <button v-if="mode === 'install'" class="install-cta" type="button" :disabled="installing" @click="install">
          {{ installing ? 'Instalando...' : 'Instalar app' }}
        </button>
        <button v-else-if="mode === 'notify'" class="install-cta" type="button" @click="activateNotifications">
          Ativar notificações
        </button>
        <button v-else class="install-cta" type="button" @click="dismiss">Entendi</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.install-prompt {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: calc(var(--gj2-z-modal) - 1);
  max-width: 460px;
  margin: 0 auto;
  padding: 16px 16px 14px;
  border-radius: 22px;
  background: var(--gj2-surface);
  box-shadow: 0 24px 60px rgba(40, 48, 54, .28), inset 0 1px 0 var(--gj2-modal-border);
  border: 1px solid var(--gj2-line);
  transition: background .3s var(--gj2-ease);
}

.install-close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 10px;
  background: var(--gj2-surface-muted);
  color: var(--gj2-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.install-main {
  display: flex;
  gap: 13px;
  align-items: flex-start;
  padding-right: 26px;
}

.install-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--gj2-shadow-card);
}

.install-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.install-copy strong {
  display: block;
  font-size: 15px;
  font-weight: 870;
  color: var(--gj2-ink);
}

.install-copy p {
  margin: 4px 0 0;
  color: var(--gj2-muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.install-copy b {
  color: var(--gj2-ink);
}

.install-actions {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 9px;
  margin-top: 13px;
}

.install-ghost,
.install-cta {
  min-height: 44px;
  border-radius: 13px;
  cursor: pointer;
  font-weight: 820;
  font-size: 13px;
  border: 0;
}

.install-ghost {
  color: var(--gj2-muted);
  background: var(--gj2-surface-muted);
}

.install-cta {
  color: #fff;
  background: var(--gj2-green-deep);
  box-shadow: 0 14px 28px rgba(126, 170, 148, .26);
}

.install-cta:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.install-pop-enter-active,
.install-pop-leave-active {
  transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), opacity .25s ease;
}

.install-pop-enter-from,
.install-pop-leave-to {
  transform: translateY(120%);
  opacity: 0;
}

@media (max-width: 760px) {
  .install-prompt {
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }
}

@media (max-width: 420px) {
  .install-main {
    padding-right: 18px;
  }

  .install-actions {
    grid-template-columns: 1fr;
  }

  .install-ghost,
  .install-cta {
    width: 100%;
  }
}
</style>
