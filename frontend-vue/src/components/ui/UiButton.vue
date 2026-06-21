<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'soft' | 'secondary' | 'danger'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    disabled: false,
  },
)
</script>

<template>
  <button class="ui-button" :class="`ui-button--${variant}`" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.ui-button {
  min-height: 51px;
  border: 0;
  border-radius: 15px;
  padding: 0 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 780;
  transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
}

.ui-button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.ui-button:not(:disabled):active {
  transform: translateY(1px);
}

.ui-button--primary {
  color: #fff;
  background: var(--gj2-green-deep);
  box-shadow: 0 14px 28px rgba(126, 170, 148, .24);
}

.ui-button--ghost {
  color: var(--gj2-muted);
  background: rgba(255, 255, 255, .25);
  border: 1px solid var(--gj2-line);
}

.ui-button--soft {
  color: var(--gj2-ink);
  background: #fff;
  box-shadow: var(--gj2-shadow-card);
}

.ui-button--secondary {
  color: var(--gj2-ink);
  background: #eef0ee;
  border: 1px solid var(--gj2-line);
}

.ui-button--danger {
  color: #fff;
  background: linear-gradient(135deg, #ff5a2a, #b51f12);
  box-shadow: 0 14px 28px rgba(181, 31, 18, .22);
}
</style>
