<template>
  <main class="not-found">
    <section>
      <strong>404</strong>
      <h1>Página não encontrada</h1>
      <RouterLink to="/dashboard">Voltar ao painel</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

section {
  width: min(460px, 100%);
  padding: 42px;
  border-radius: 34px;
  display: grid;
  gap: 12px;
  text-align: center;
  background: #fff;
  box-shadow: var(--gj2-shadow-big);
}

strong {
  color: var(--gj2-green-deep);
  font-size: 20px;
}

h1 {
  margin: 0;
}

a {
  color: var(--gj2-blue);
  font-weight: 800;
  text-decoration: none;
}
</style>
