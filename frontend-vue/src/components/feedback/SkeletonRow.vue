<script setup lang="ts">
import UiSkeleton from '@/components/feedback/UiSkeleton.vue'
</script>

<template>
  <div class="skeleton-row" aria-label="Carregando linha">
    <UiSkeleton width="38px" height="38px" radius="14px" />
    <div>
      <UiSkeleton width="55%" height="12px" />
      <UiSkeleton width="82%" height="11px" />
    </div>
    <UiSkeleton width="78px" height="28px" radius="999px" />
  </div>
</template>

<style scoped>
.skeleton-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, .68);
}

.skeleton-row > div {
  display: grid;
  gap: 8px;
}
</style>
