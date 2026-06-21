<script setup lang="ts">
import { X } from '@lucide/vue'

import { useToast } from '@/composables/useToast'

const toast = useToast()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="section" class="toast-host" aria-live="polite" aria-label="Avisos do sistema">
      <article
        v-for="item in toast.toasts"
        :key="item.id"
        class="toast-card"
        :class="`toast-card--${item.variant}`"
      >
        <div>
          <strong v-if="item.title">{{ item.title }}</strong>
          <p>{{ item.message }}</p>
        </div>
        <button
          v-if="item.action"
          class="toast-action"
          type="button"
          @click="item.action.onClick"
        >
          {{ item.action.label }}
        </button>
        <button class="toast-close" type="button" aria-label="Fechar aviso" @click="toast.remove(item.id)">
          <X :size="16" :stroke-width="2.4" />
        </button>
      </article>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  right: 22px;
  top: 22px;
  z-index: 300;
  width: min(380px, calc(100vw - 28px));
  display: grid;
  gap: 10px;
  pointer-events: none;
}

.toast-card {
  pointer-events: auto;
  position: relative;
  display: grid;
  grid-template-columns: 5px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 14px 12px;
  border: 1px solid rgba(226, 228, 225, .95);
  border-radius: 20px;
  color: #15191c;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 24px 52px rgba(67, 78, 87, .2);
  backdrop-filter: blur(18px);
}

.toast-card::before {
  content: "";
  width: 5px;
  align-self: stretch;
  border-radius: 999px;
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}

.toast-card > div {
  min-width: 0;
  grid-column: 2 / 3;
}

.toast-card strong,
.toast-card p {
  margin: 0;
}

.toast-card strong {
  display: block;
  margin-bottom: 3px;
  font-size: 13px;
  font-weight: 930;
}

.toast-card p {
  color: #687079;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
}

.toast-card--success::before {
  background: #78ad8e;
}

.toast-card--error::before {
  background: #d4584b;
}

.toast-card--warning::before {
  background: #d0a64a;
}

.toast-card--info::before {
  background: #6c8fa8;
}

.toast-action,
.toast-close {
  border: 0;
  cursor: pointer;
}

.toast-action {
  min-height: 35px;
  padding: 0 12px;
  border-radius: 999px;
  color: #fff;
  background: #111517;
  font-size: 11px;
  font-weight: 880;
  transition: transform .18s var(--gj2-ease), background .18s var(--gj2-ease);
}

.toast-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #687079;
  background: #f2f4f2;
  transition: transform .18s var(--gj2-ease), background .18s var(--gj2-ease), color .18s var(--gj2-ease);
}

.toast-action:hover,
.toast-close:hover {
  transform: translateY(-1px);
}

.toast-close:hover {
  color: var(--gj2-ink);
  background: #fff;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity .22s var(--gj2-ease), transform .22s var(--gj2-ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 620px) {
  .toast-host {
    inset: auto 14px max(14px, env(safe-area-inset-bottom)) 14px;
    top: auto;
    right: 14px;
    width: auto;
  }

  .toast-card {
    grid-template-columns: 4px minmax(0, 1fr) auto;
  }

  .toast-action {
    grid-column: 2 / 3;
    justify-self: start;
  }
}
</style>
