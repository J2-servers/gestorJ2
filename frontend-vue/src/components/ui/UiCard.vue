<template>
  <section class="ui-card">
    <slot />
  </section>
</template>

<style scoped>
.ui-card {
  border-radius: var(--gj2-radius-lg);
  background: #fff;
  box-shadow: var(--gj2-shadow-card);
}
</style>
