<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    loading?: boolean
  }>(),
  {
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    danger: false,
    loading: false,
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <UiModal :open="open" :title="title" :description="description" size="sm" @close="emit('close')">
    <div class="confirm-copy">
      <slot />
    </div>

    <template #footer>
      <div class="confirm-actions">
        <UiButton variant="secondary" :disabled="loading" @click="emit('close')">{{ cancelLabel }}</UiButton>
        <button
          class="confirm-button"
          :class="{ danger }"
          type="button"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ loading ? 'Processando...' : confirmLabel }}
        </button>
      </div>
    </template>
  </UiModal>
</template>

<style scoped>
.confirm-copy {
  color: #687079;
  font-size: 14px;
  line-height: 1.55;
}

.confirm-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.confirm-button {
  min-height: 51px;
  border: 0;
  border-radius: 15px;
  padding: 0 22px;
  color: #fff;
  background: var(--gj2-green-deep);
  box-shadow: 0 14px 28px rgba(126, 170, 148, .24);
  cursor: pointer;
  font-weight: 880;
}

.confirm-button.danger {
  background: #c94c42;
  box-shadow: 0 14px 28px rgba(201, 76, 66, .2);
}

.confirm-button:disabled {
  cursor: not-allowed;
  opacity: .58;
}

@media (max-width: 520px) {
  .confirm-actions {
    display: grid;
  }
}
</style>
