<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UiButton from '@/components/ui/UiButton.vue'

const route = useRoute()
const router = useRouter()

const message = computed(() => String(route.query.message || 'O sistema encontrou um erro inesperado.'))
</script>

<template>
  <main class="error-page">
    <section>
      <span>500</span>
      <h1>Algo saiu do trilho</h1>
      <p>{{ message }}</p>
      <div>
        <UiButton @click="router.push('/dashboard')">Voltar para o painel</UiButton>
        <UiButton variant="secondary" @click="router.go(0)">Tentar novamente</UiButton>
      </div>
    </section>
  </main>
</template>

<style scoped>
.error-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #eef0ef;
}

.error-page section {
  width: min(100%, 520px);
  display: grid;
  gap: 18px;
  padding: 38px;
  border-radius: 32px;
  background: #fff;
  box-shadow: var(--gj2-shadow-card);
  text-align: center;
}

.error-page span {
  color: #87ad98;
  font-size: 13px;
  font-weight: 930;
  letter-spacing: .16em;
}

.error-page h1,
.error-page p {
  margin: 0;
}

.error-page h1 {
  color: #15191c;
  font-size: clamp(30px, 7vw, 48px);
  line-height: 1;
}

.error-page p {
  color: #687079;
  line-height: 1.6;
}

.error-page div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
</style>
