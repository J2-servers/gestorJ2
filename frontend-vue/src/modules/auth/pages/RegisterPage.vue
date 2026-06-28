<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import UiButton from '@/components/ui/UiButton.vue'
import { authService } from '@/services/api/auth.service'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '102030Ab',
})
const loading = ref(false)
const error = ref('')
const parentId = computed(() => String(route.query.parent || ''))

async function submit() {
  loading.value = true
  error.value = ''
  try {
    const user = await authService.register({
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      parent_id: parentId.value || undefined,
    })
    auth.user = user
    auth.ready = true
    await router.replace('/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel concluir o cadastro.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="register-page">
    <section class="register-card">
      <div class="register-brand">
        <span>Gestor J2</span>
        <h1>Criar conta de revendedor</h1>
        <p>Preencha seus dados para acessar o painel de pedidos e receber avisos pelo WhatsApp.</p>
      </div>

      <form class="register-form" @submit.prevent="submit">
        <label class="module-label">
          Nome
          <input v-model="form.name" class="module-input" required placeholder="Seu nome" />
        </label>
        <label class="module-label">
          Email
          <input v-model="form.email" class="module-input" required type="email" placeholder="voce@email.com" />
        </label>
        <label class="module-label">
          WhatsApp
          <input v-model="form.phone" class="module-input" required type="tel" placeholder="11999999999" />
        </label>
        <label class="module-label">
          Senha
          <input v-model="form.password" class="module-input" required type="password" />
        </label>

        <div v-if="parentId" class="register-note">Convite vinculado ao admin: {{ parentId }}</div>
        <div v-if="error" class="register-error">{{ error }}</div>

        <UiButton type="submit" :disabled="loading">{{ loading ? 'Criando...' : 'Criar conta' }}</UiButton>
      </form>
    </section>
  </main>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 22px;
  background: radial-gradient(circle at 30% 20%, rgba(143, 190, 168, .34), transparent 28%), var(--gj2-stage);
}

.register-card {
  width: min(520px, 100%);
  padding: clamp(24px, 6vw, 44px);
  border-radius: 34px;
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
  box-shadow: var(--gj2-shadow-big);
  transition: background .3s var(--gj2-ease);
}

.register-brand span {
  color: var(--gj2-green-deep);
  font-weight: 900;
}

.register-brand h1 {
  margin: 10px 0 8px;
  font-size: clamp(32px, 8vw, 50px);
  line-height: .98;
  font-weight: 900;
}

.register-brand p {
  margin: 0 0 24px;
  color: #45494d;
  line-height: 1.5;
}

.register-form {
  display: grid;
  gap: 14px;
}

.register-note,
.register-error {
  padding: 12px 14px;
  border-radius: 16px;
  font-weight: 800;
}

.register-note {
  color: #52665b;
  background: #edf7f0;
}

.register-error {
  color: #a42f2b;
  background: #ffe3e0;
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .register-brand p {
  color: var(--gj2-muted);
}

html[data-theme="dark"] .register-note {
  color: #6abf96;
  background: rgba(92, 148, 120, .15);
}

html[data-theme="dark"] .register-error {
  color: #ff8278;
  background: rgba(194, 59, 52, .15);
}
</style>
