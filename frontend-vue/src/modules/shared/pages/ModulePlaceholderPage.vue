<script setup lang="ts">
defineProps<{
  title: string
  moduleName: string
}>()
</script>

<template>
  <section class="placeholder-page">
    <span>{{ moduleName }}</span>
    <h1>{{ title }}</h1>
    <p>
      Módulo reservado para reconstrução Vue. O agente responsável deve marcar a tarefa no checklist antes de iniciar.
    </p>
  </section>
</template>

<style scoped>
.placeholder-page {
  min-height: 520px;
  border-radius: 30px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
  box-shadow: var(--gj2-shadow-card);
  transition: background .3s var(--gj2-ease);
}

.placeholder-page span {
  color: var(--gj2-green-deep);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.placeholder-page h1 {
  margin: 0;
  font-size: clamp(32px, 5vw, 62px);
}

.placeholder-page p {
  max-width: 520px;
  margin: 0;
  color: var(--gj2-muted);
  line-height: 1.5;
}
</style>
