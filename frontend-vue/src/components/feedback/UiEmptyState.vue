<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <slot name="icon">
      <span class="empty-mark" aria-hidden="true" />
    </slot>
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 28px;
  text-align: center;
  color: var(--gj2-muted);
  border: 1px dashed rgba(207, 215, 210, .94);
  border-radius: var(--gj2-radius-lg);
  background:
    linear-gradient(145deg, rgba(255,255,255,.86), rgba(247,249,247,.72));
}

.empty-mark {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background:
    radial-gradient(circle at 68% 34%, var(--gj2-accent) 0 12%, transparent 13%),
    linear-gradient(145deg, rgba(143, 190, 168, .28), rgba(255,255,255,.88));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.88), 0 12px 26px rgba(95, 109, 118, .11);
}

.empty-state strong {
  color: var(--gj2-ink);
  font-size: 20px;
  letter-spacing: -.015em;
}

.empty-state p {
  max-width: 360px;
  margin: 0;
  line-height: 1.5;
}
</style>
