<template>
  <div class="loading-state" role="status">
    <span />
    <strong>Carregando</strong>
  </div>
</template>

<style scoped>
.loading-state {
  min-height: 210px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  color: var(--gj2-muted);
}

.loading-state span {
  width: 38px;
  height: 38px;
  border: 4px solid rgba(126, 170, 148, .2);
  border-top-color: var(--gj2-green-deep);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
