<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
  }>(),
  {
    width: '100%',
    height: '16px',
    radius: '999px',
  },
)
</script>

<template>
  <span class="ui-skeleton" :style="{ width, height, borderRadius: radius }" aria-hidden="true" />
</template>

<style scoped>
.ui-skeleton {
  display: block;
  overflow: hidden;
  background: linear-gradient(90deg, #ecefed 0%, #f8f9f8 46%, #ecefed 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-skeleton {
    animation: none;
  }
}
</style>
