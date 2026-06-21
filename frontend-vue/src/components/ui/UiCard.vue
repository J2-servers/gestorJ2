<template>
  <section class="ui-card">
    <slot />
  </section>
</template>

<style scoped>
.ui-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--gj2-radius-lg);
  border: 1px solid rgba(223, 228, 225, .92);
  background:
    linear-gradient(145deg, rgba(255,255,255,.98), rgba(250,251,250,.94));
  box-shadow: var(--gj2-shadow-card);
  transition:
    transform .2s var(--gj2-ease),
    box-shadow .2s var(--gj2-ease),
    border-color .2s var(--gj2-ease);
}

.ui-card::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 74px;
  height: 4px;
  border-radius: 0 0 999px 0;
  background: linear-gradient(90deg, var(--gj2-accent), rgba(143, 190, 168, .72));
  opacity: .74;
}

@media (hover: hover) {
  .ui-card:hover {
    transform: translateY(-2px);
    border-color: rgba(207, 215, 210, .98);
    box-shadow: var(--gj2-shadow-hover);
  }
}
</style>
