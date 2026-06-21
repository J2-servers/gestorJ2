import { computed } from 'vue'
import { useField } from 'vee-validate'

export function useFormField<TValue = string>(name: string) {
  const field = useField<TValue>(name)

  return {
    value: field.value,
    errorMessage: field.errorMessage,
    meta: field.meta,
    handleChange: field.handleChange,
    handleBlur: field.handleBlur,
    resetField: field.resetField,
    inputProps: computed(() => ({
      modelValue: field.value.value as TValue,
      error: field.errorMessage.value,
      'onUpdate:modelValue': field.handleChange,
      onBlur: field.handleBlur,
    })),
  }
}
