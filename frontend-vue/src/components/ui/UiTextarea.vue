<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    placeholder?: string
    rows?: number
    hint?: string
    error?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    rows: 4,
    disabled: false,
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="ui-textarea">
    <span v-if="label">{{ label }}</span>
    <textarea
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <small v-if="error || hint" :class="{ error: Boolean(error) }">{{ error || hint }}</small>
  </label>
</template>

<style scoped>
.ui-textarea {
  display: grid;
  gap: 8px;
  color: #4f5960;
  font-size: 13px;
  font-weight: 820;
}

.ui-textarea textarea {
  width: 100%;
  min-height: 116px;
  border: 1px solid var(--gj2-line);
  border-radius: 18px;
  padding: 16px 18px;
  color: var(--gj2-ink);
  background: rgba(255, 255, 255, .9);
  outline: none;
  resize: vertical;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
  font: inherit;
  line-height: 1.5;
  transition:
    border-color .18s var(--gj2-ease),
    box-shadow .18s var(--gj2-ease),
    background .18s var(--gj2-ease);
}

.ui-textarea textarea::placeholder {
  color: #9ca3a9;
}

.ui-textarea textarea:hover {
  border-color: var(--gj2-line-strong);
  background: #fff;
}

.ui-textarea textarea:focus {
  border-color: rgba(255, 104, 70, .58);
  box-shadow: var(--gj2-shadow-focus);
}

.ui-textarea textarea[aria-invalid="true"] {
  border-color: rgba(201, 76, 66, .58);
  box-shadow: 0 0 0 4px rgba(201, 76, 66, .12);
}

.ui-textarea textarea:disabled {
  cursor: not-allowed;
  color: #8d969d;
  background: #f1f3f1;
  opacity: .78;
}

.ui-textarea small {
  color: #778087;
  font-size: 12px;
  font-weight: 700;
}

.ui-textarea small.error {
  color: #c94c42;
}
</style>
