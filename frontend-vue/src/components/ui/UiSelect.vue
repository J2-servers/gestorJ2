<script setup lang="ts">
export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    placeholder?: string
    options: SelectOption[]
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: 'Selecionar',
    disabled: false,
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="ui-select">
    <span v-if="label">{{ label }}</span>
    <select
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.ui-select {
  display: grid;
  gap: 8px;
  color: #4f5960;
  font-size: 13px;
  font-weight: 820;
}

.ui-select select {
  width: 100%;
  min-height: 52px;
  border: 1px solid var(--gj2-line);
  border-radius: 16px;
  padding: 0 42px 0 18px;
  color: var(--gj2-ink);
  background:
    linear-gradient(45deg, transparent 50%, #687079 50%) calc(100% - 23px) 52% / 6px 6px no-repeat,
    linear-gradient(135deg, #687079 50%, transparent 50%) calc(100% - 17px) 52% / 6px 6px no-repeat,
    rgba(255, 255, 255, .9);
  outline: none;
  appearance: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
  transition:
    border-color .18s var(--gj2-ease),
    box-shadow .18s var(--gj2-ease),
    background-color .18s var(--gj2-ease);
}

.ui-select select:hover {
  border-color: var(--gj2-line-strong);
  background-color: #fff;
}

.ui-select select:focus {
  border-color: rgba(255, 104, 70, .58);
  box-shadow: var(--gj2-shadow-focus);
}

.ui-select select:disabled {
  cursor: not-allowed;
  color: #8d969d;
  opacity: .78;
}
</style>
