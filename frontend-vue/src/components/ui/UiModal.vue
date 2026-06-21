<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    size: 'md',
  },
)

const emit = defineEmits<{
  close: []
}>()

function close() {
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) close()
}

watch(
  () => props.open,
  (open) => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  },
)

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-layer" role="presentation" @mousedown.self="close">
        <section
          class="modal-panel"
          :class="`modal-panel--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Janela'"
        >
          <header v-if="title || description || $slots.header" class="modal-header">
            <slot name="header">
              <div>
                <strong v-if="title">{{ title }}</strong>
                <p v-if="description">{{ description }}</p>
              </div>
            </slot>
            <button type="button" aria-label="Fechar" @click="close">
              <X :size="18" :stroke-width="2.4" />
            </button>
          </header>

          <div class="modal-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 240;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, .16), transparent 28%),
    rgba(24, 30, 35, .5);
  backdrop-filter: blur(14px) saturate(1.05);
}

.modal-panel {
  width: min(100%, 620px);
  max-height: min(760px, calc(100dvh - 42px));
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-radius: 30px;
  border: 1px solid rgba(255,255,255,.72);
  background:
    linear-gradient(145deg, rgba(255,255,255,.99), rgba(247,249,247,.96));
  box-shadow: 0 34px 90px rgba(34, 43, 50, .34), inset 0 1px 0 rgba(255,255,255,.9);
}

.modal-panel--sm {
  width: min(100%, 420px);
}

.modal-panel--lg {
  width: min(100%, 840px);
}

.modal-panel--xl {
  width: min(100%, 1060px);
}

.modal-header,
.modal-footer {
  padding: 20px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.modal-header {
  border-bottom: 1px solid #ecefed;
  background: rgba(255,255,255,.62);
}

.modal-footer {
  border-top: 1px solid #ecefed;
  background: rgba(248,250,248,.74);
}

.modal-header strong {
  display: block;
  color: #15191c;
  font-size: 18px;
  font-weight: 940;
}

.modal-header p {
  margin: 4px 0 0;
  color: #687079;
  font-size: 13px;
  line-height: 1.45;
}

.modal-header button {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #687079;
  background: #f2f4f2;
  cursor: pointer;
  transition: transform .18s var(--gj2-ease), background .18s var(--gj2-ease), color .18s var(--gj2-ease);
}

.modal-header button:hover {
  color: var(--gj2-ink);
  background: #fff;
  transform: translateY(-1px);
}

.modal-body {
  min-height: 0;
  overflow: auto;
  padding: 22px;
  scrollbar-width: none;
}

.modal-body::-webkit-scrollbar {
  display: none;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity .2s ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform .24s var(--gj2-ease), opacity .24s var(--gj2-ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: translateY(14px) scale(.98);
}

@media (max-width: 620px) {
  .modal-layer {
    align-items: end;
    padding: 10px;
  }

  .modal-panel {
    max-height: calc(100dvh - 20px);
    border-radius: 28px 28px 18px 18px;
  }
}
</style>
