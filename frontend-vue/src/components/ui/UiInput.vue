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
  color: var(--gj2-muted);
  font-size: 13px;
  font-weight: 760;
}

.ui-input input {
  width: 100%;
  min-height: 52px;
  border: 1px solid var(--gj2-line);
  border-radius: 16px;
  padding: 0 18px;
  color: var(--gj2-ink);
  background: rgba(255, 255, 255, .82);
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
}

.ui-input input:focus {
  border-color: rgba(126, 170, 148, .58);
  box-shadow: 0 0 0 4px rgba(143, 190, 168, .16);
}

.ui-input input[aria-invalid="true"] {
  border-color: rgba(201, 76, 66, .58);
  box-shadow: 0 0 0 4px rgba(201, 76, 66, .12);
}

.ui-input input:disabled {
  cursor: not-allowed;
  opacity: .58;
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
