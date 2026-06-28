<script setup lang="ts">
import UiSkeleton from '@/components/feedback/UiSkeleton.vue'
</script>

<template>
  <div class="skeleton-stat" aria-label="Carregando indicador">
    <UiSkeleton width="36px" height="36px" radius="14px" />
    <UiSkeleton width="58%" height="12px" />
    <UiSkeleton width="76%" height="30px" radius="13px" />
  </div>
</template>

<style scoped>
.skeleton-stat {
  min-height: 118px;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 18px;
  border-radius: 24px;
  background: var(--gj2-surface-soft);
  border: 1px solid var(--gj2-card-border);
  box-shadow: var(--gj2-shadow-card);
  transition: background .3s var(--gj2-ease);
}
</style>
