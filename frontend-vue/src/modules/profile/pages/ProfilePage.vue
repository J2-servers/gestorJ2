<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { usersService } from '@/services/api/users.service'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const form = reactive({
  name: auth.user?.name || '',
  phone: auth.user?.phone || '',
})
const loading = ref(false)
const status = ref('')
const error = ref('')

const missingPhone = computed(() => auth.user?.role === 'user' && !String(form.phone || '').trim())

async function save() {
  loading.value = true
  status.value = ''
  error.value = ''
  try {
    auth.user = await usersService.updateMe({ name: form.name, phone: form.phone })
    status.value = 'Perfil atualizado. Os pedidos ja podem usar seu WhatsApp cadastrado.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel salvar o perfil.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Meu perfil</h1>
        <p>Atualize os dados usados para notificações, atendimento e criação de pedidos.</p>
      </div>
    </header>

    <section v-if="missingPhone" class="profile-warning">
      <strong>WhatsApp obrigatório</strong>
      <span>Cadastre seu número para receber avisos automáticos e liberar pedidos sem bloqueio.</span>
    </section>

    <div class="profile-layout">
      <aside class="module-card pad profile-summary">
        <div class="profile-avatar">{{ (form.name || auth.user?.email || 'J').slice(0, 1).toUpperCase() }}</div>
        <h2>{{ form.name || auth.user?.email || 'Usuario' }}</h2>
        <p>{{ auth.isAdmin ? 'Administrador' : 'Revendedor' }}</p>
        <div class="module-divider" />
        <small>Email</small>
        <strong>{{ auth.user?.email || '-' }}</strong>
        <small>WhatsApp</small>
        <strong>{{ form.phone || 'Nao cadastrado' }}</strong>
      </aside>

      <form class="module-card pad profile-form" @submit.prevent="save">
        <label class="module-label">
          Nome
          <input v-model="form.name" class="module-input" required />
        </label>
        <label class="module-label">
          WhatsApp
          <input v-model="form.phone" class="module-input" placeholder="11999999999" required type="tel" />
        </label>
        <label class="module-label">
          Email
          <input class="module-input" disabled :value="auth.user?.email || ''" />
        </label>

        <div v-if="status" class="profile-ok">{{ status }}</div>
        <div v-if="error" class="profile-error">{{ error }}</div>
        <UiButton type="submit" :disabled="loading">{{ loading ? 'Salvando...' : 'Salvar alteracoes' }}</UiButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.profile-summary {
  display: grid;
  gap: 10px;
  align-content: start;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 28px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, var(--gj2-green), var(--gj2-blue));
  font-size: 38px;
  font-weight: 900;
}

.profile-summary p,
.profile-summary small {
  color: var(--gj2-muted);
}

.profile-form {
  display: grid;
  gap: 16px;
}

.profile-warning,
.profile-ok,
.profile-error {
  padding: 16px 18px;
  border-radius: 20px;
  font-weight: 820;
}

.profile-warning {
  display: grid;
  gap: 4px;
  color: #7a5814;
  background: #fff1c2;
}

.profile-ok {
  color: #426c55;
  background: #e8f7ee;
}

.profile-error {
  color: #a42f2b;
  background: #ffe3e0;
}

@media (max-width: 860px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
