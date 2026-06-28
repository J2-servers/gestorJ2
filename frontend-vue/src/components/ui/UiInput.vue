<script setup lang="ts">
defineProps<{
  modelValue?: string
  label?: string
  type?: string
  placeholder?: string
  autocomplete?: string
  hint?: string
  error?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="ui-input">
    <span v-if="label">{{ label }}</span>
    <input
      :type="type || 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error || hint ? `${label || placeholder || 'campo'}-hint` : undefined"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <small v-if="error || hint" :id="`${label || placeholder || 'campo'}-hint`" :class="{ error: Boolean(error) }">
      {{ error || hint }}
    </small>
  </label>
</template>

<style scoped>
.ui-input {
  display: grid;
  gap: 8px;
  color: var(--gj2-label-color);
  font-size: 13px;
  font-weight: 820;
}

.ui-input input {
  width: 100%;
  min-height: 52px;
  border: 1px solid var(--gj2-line);
  border-radius: 16px;
  padding: 0 18px;
  color: var(--gj2-ink);
  background: var(--gj2-input-bg);
  outline: none;
  font: inherit;
  box-shadow: inset 0 1px 0 var(--gj2-modal-border);
  transition:
    border-color .18s var(--gj2-ease),
    box-shadow .18s var(--gj2-ease),
    background .18s var(--gj2-ease);
}

.ui-input input::placeholder {
  color: var(--gj2-muted);
}

.ui-input input:hover {
  border-color: var(--gj2-line-strong);
  background: var(--gj2-input-bg-focus);
}

.ui-input input:focus {
  border-color: rgba(255, 104, 70, .58);
  box-shadow: var(--gj2-shadow-focus);
}

.ui-input input[aria-invalid="true"] {
  border-color: rgba(201, 76, 66, .58);
  box-shadow: 0 0 0 4px rgba(201, 76, 66, .12);
}

.ui-input input:disabled {
  cursor: not-allowed;
  color: var(--gj2-muted);
  background: var(--gj2-surface-muted);
  opacity: .78;
}

.ui-input small {
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 700;
}

.ui-input small.error {
  color: var(--gj2-red);
}
</style>
