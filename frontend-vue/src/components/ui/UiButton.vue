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
  line-height: 1;
  user-select: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2);
  transition:
    transform .18s var(--gj2-ease),
    box-shadow .18s var(--gj2-ease),
    border-color .18s var(--gj2-ease),
    background .18s var(--gj2-ease),
    opacity .18s var(--gj2-ease);
}

.ui-button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.ui-button:not(:disabled):active {
  transform: translateY(1px);
}

.ui-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.ui-button--primary {
  color: #fff;
  background: linear-gradient(135deg, var(--gj2-green-deep), #6e9f88);
  box-shadow: 0 15px 30px rgba(126, 170, 148, .25);
}

.ui-button--ghost {
  color: var(--gj2-muted);
  background: rgba(255, 255, 255, .38);
  border: 1px solid var(--gj2-line);
}

.ui-button--soft {
  color: var(--gj2-ink);
  background: rgba(255,255,255,.92);
  box-shadow: var(--gj2-shadow-card);
}

.ui-button--secondary {
  color: var(--gj2-ink);
  background: #eef1ef;
  border: 1px solid var(--gj2-line);
}

.ui-button--danger {
  color: #fff;
  background: linear-gradient(135deg, #ff5a2a, #b51f12);
  box-shadow: 0 14px 28px rgba(181, 31, 18, .22);
}

.ui-button--primary:not(:disabled):hover,
.ui-button--danger:not(:disabled):hover {
  box-shadow: var(--gj2-shadow-hover);
}

.ui-button--secondary:not(:disabled):hover,
.ui-button--ghost:not(:disabled):hover {
  border-color: var(--gj2-line-strong);
  background: #fff;
}

@media (max-width: 620px) {
  .ui-button {
    min-height: 47px;
    padding: 0 18px;
  }
}
</style>
