<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'red' | 'green' | 'blue' | 'yellow'
  }>(),
  { tone: 'red' },
)
</script>

<template>
  <span class="ui-badge" :class="`ui-badge--${tone}`">
    <slot />
  </span>
</template>

<style scoped>
.ui-badge {
  min-height: 22px;
  padding: 3px 9px;
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  line-height: 1;
  font-weight: 820;
}

.ui-badge--red { background: #ff6b61; }
.ui-badge--green { background: var(--gj2-green-deep); }
.ui-badge--blue { background: var(--gj2-blue); }
.ui-badge--yellow { background: #d9b84e; }
</style>
