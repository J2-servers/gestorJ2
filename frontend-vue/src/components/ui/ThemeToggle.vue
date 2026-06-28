<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { useTheme } from '@/composables/useTheme'

const { theme, toggle } = useTheme()
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
    :title="theme === 'dark' ? 'Tema claro' : 'Tema escuro'"
    @click="toggle"
  >
    <span class="theme-toggle-icon" :class="{ spinning: true }">
      <Moon v-if="theme === 'dark'" :size="19" :stroke-width="2.2" aria-hidden="true" />
      <Sun v-else :size="19" :stroke-width="2.2" aria-hidden="true" />
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 51px;
  height: 51px;
  border: 1px solid var(--gj2-topbar-btn-border);
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: var(--gj2-topbar-btn-color);
  background: var(--gj2-topbar-btn-bg);
  box-shadow: inset 0 1px var(--gj2-modal-border);
  cursor: pointer;
  transition:
    background .18s var(--gj2-ease),
    border-color .18s var(--gj2-ease),
    color .18s var(--gj2-ease),
    transform .18s var(--gj2-ease);
}

.theme-toggle:hover {
  color: var(--gj2-ink);
  background: var(--gj2-surface);
  border-color: var(--gj2-line-strong);
  transform: translateY(-1px);
}

.theme-toggle:active {
  transform: translateY(1px);
}

.theme-toggle-icon {
  display: grid;
  place-items: center;
  animation: theme-pop .22s var(--gj2-ease) both;
}

@keyframes theme-pop {
  from {
    opacity: 0;
    transform: rotate(-30deg) scale(.8);
  }
  to {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}
</style>
