<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { recoveryService } from '@/services/api/recovery.service'

const admin = ref<Record<string, unknown> | null>(null)
const status = ref('')
const error = ref('')
const loading = ref(false)
const credentials = reactive({ email: '', password: '' })
const own = reactive({ password: '' })

async function load() {
  try {
    admin.value = (await recoveryService.operationalAdmin()) as Record<string, unknown>
    credentials.email = String(admin.value?.email || '')
  } catch {
    admin.value = null
  }
}

async function resetAdmin() {
  loading.value = true
  error.value = ''
  status.value = ''
  try {
    await recoveryService.resetCredentials(credentials)
    status.value = 'Credenciais do admin operacional atualizadas.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao atualizar credenciais.'
  } finally {
    loading.value = false
  }
}

async function changeOwnPassword() {
  loading.value = true
  error.value = ''
  status.value = ''
  try {
    await recoveryService.changeOwnPassword(own.password)
    own.password = ''
    status.value = 'Senha da conta de recuperacao atualizada.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao trocar senha.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="module-page recovery-page">
    <header class="module-hero">
      <div>
        <h1>Painel de recuperação</h1>
        <p>Área isolada para restaurar o admin operacional e trocar a senha da conta de recuperação.</p>
      </div>
    </header>

    <div class="module-grid two">
      <section class="module-card pad">
        <h2>Admin operacional</h2>
        <p class="module-muted">Conta atual: {{ admin?.email || 'nao localizada' }}</p>
        <form class="module-form-grid" @submit.prevent="resetAdmin">
          <label class="module-label">
            Email
            <input v-model="credentials.email" class="module-input" type="email" required />
          </label>
          <label class="module-label">
            Nova senha
            <input v-model="credentials.password" class="module-input" type="password" required />
          </label>
          <UiButton type="submit" :disabled="loading">Salvar admin</UiButton>
        </form>
      </section>

      <section class="module-card pad">
        <h2>Senha da recuperação</h2>
        <p class="module-muted">Mantenha esta conta guardada para emergências.</p>
        <form class="module-form-grid" @submit.prevent="changeOwnPassword">
          <label class="module-label">
            Nova senha
            <input v-model="own.password" class="module-input" type="password" required />
          </label>
          <UiButton type="submit" :disabled="loading">Trocar senha</UiButton>
        </form>
      </section>
    </div>

    <div v-if="status" class="recovery-ok">{{ status }}</div>
    <div v-if="error" class="recovery-error">{{ error }}</div>
  </div>
</template>

<style scoped>
.recovery-ok,
.recovery-error {
  padding: 15px 18px;
  border-radius: 18px;
  font-weight: 850;
}

.recovery-ok {
  color: #426c55;
  background: #e8f7ee;
}

.recovery-error {
  color: #a42f2b;
  background: #ffe3e0;
}
</style>
