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
  color: #4f5960;
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
  background: rgba(255, 255, 255, .9);
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
  transition:
    border-color .18s var(--gj2-ease),
    box-shadow .18s var(--gj2-ease),
    background .18s var(--gj2-ease);
}

.ui-input input::placeholder {
  color: #9ca3a9;
}

.ui-input input:hover {
  border-color: var(--gj2-line-strong);
  background: #fff;
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
  color: #8d969d;
  background: #f1f3f1;
  opacity: .78;
}

.ui-input small {
  color: #778087;
  font-size: 12px;
  font-weight: 700;
}

.ui-input small.error {
  color: #c94c42;
}
</style>
