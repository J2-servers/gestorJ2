<script setup lang="ts">
import UiSkeleton from '@/components/feedback/UiSkeleton.vue'
</script>

<template>
  <section class="skeleton-card" aria-label="Carregando">
    <UiSkeleton width="44px" height="44px" radius="16px" />
    <div>
      <UiSkeleton width="42%" height="12px" />
      <UiSkeleton width="72%" height="28px" radius="12px" />
    </div>
  </section>
</template>

<style scoped>
.skeleton-card {
  min-height: 132px;
  border-radius: 28px;
  display: grid;
  align-content: space-between;
  gap: 20px;
  padding: 20px;
  background: var(--gj2-surface-soft);
  border: 1px solid var(--gj2-card-border);
  box-shadow: var(--gj2-shadow-card);
  transition: background .3s var(--gj2-ease);
}

.skeleton-card > div {
  display: grid;
  gap: 10px;
}
</style>
