<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
  color: var(--gj2-muted);
}

.empty-state strong {
  color: var(--gj2-ink);
  font-size: 20px;
}

.empty-state p {
  max-width: 360px;
  margin: 0;
  line-height: 1.5;
}
</style>
