<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  url: string
}>()

const emit = defineEmits<{
  close: []
}>()

const isPdf = computed(() => /\.pdf($|\?)/i.test(props.url))
const isImage = computed(() => /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(props.url) || !isPdf.value)
</script>

<template>
  <div class="dialog-backdrop" role="presentation" @click.self="emit('close')">
    <section class="proof-dialog" role="dialog" aria-modal="true" aria-label="Comprovante do pedido">
      <header class="dialog-head">
        <div>
          <span>Comprovante</span>
          <strong>Arquivo anexado ao pedido</strong>
        </div>
        <div class="proof-actions">
          <a :href="url" target="_blank" rel="noreferrer">Abrir</a>
          <button type="button" aria-label="Fechar comprovante" @click="emit('close')">Fechar</button>
        </div>
      </header>

      <div class="proof-frame">
        <iframe v-if="isPdf" :src="url" title="Comprovante em PDF" />
        <img v-else-if="isImage" :src="url" alt="Comprovante enviado pelo revendedor" />
        <a v-else :href="url" target="_blank" rel="noreferrer">Abrir comprovante</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--gj2-z-modal);
  display: grid;
  place-items: center;
  padding: clamp(10px, 2vw, 18px);
  background: rgba(3, 4, 4, .72);
  backdrop-filter: blur(10px);
}

.proof-dialog {
  width: min(760px, 100%);
  max-height: min(760px, 92dvh);
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(280px, 1fr);
  gap: 12px;
  padding: 16px;
  border-radius: 28px;
  border: 1px solid var(--gj2-modal-border);
  color: var(--gj2-ink);
  background: var(--gj2-modal-bg);
  box-shadow: 0 28px 70px rgba(0, 0, 0, .32);
  isolation: isolate;
  overflow: hidden;
}

.dialog-head {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, auto) auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-head > div {
  min-width: 0;
}

.dialog-head span {
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
  overflow-wrap: anywhere;
}

.proof-actions {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.proof-actions a,
.proof-actions button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 14px;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  text-decoration: none;
  color: var(--gj2-muted);
  background: var(--gj2-chip-bg);
  font: inherit;
  font-weight: 850;
}

.proof-actions a {
  color: #fff;
  background: var(--gj2-green-deep);
}

.proof-frame {
  min-height: 280px;
  min-width: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: var(--gj2-surface-muted);
}

.proof-frame iframe,
.proof-frame img {
  width: 100%;
  height: 100%;
  min-height: 420px;
  border: 0;
}

.proof-frame img {
  object-fit: contain;
}

.proof-frame a {
  color: var(--gj2-green-deep);
  font-weight: 900;
}

@media (max-width: 560px) {
  .dialog-backdrop {
    padding: 10px;
    place-items: end center;
  }

  .proof-dialog {
    width: 100%;
    max-height: calc(100dvh - 20px);
    border-radius: 22px;
    padding: 12px;
  }

  .dialog-head {
    align-items: flex-start;
    grid-template-columns: 1fr;
  }

  .proof-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .proof-frame iframe,
  .proof-frame img {
    min-height: 360px;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .proof-dialog {
  background: var(--gj2-modal-bg);
  border: 1px solid var(--gj2-modal-border);
}
</style>
