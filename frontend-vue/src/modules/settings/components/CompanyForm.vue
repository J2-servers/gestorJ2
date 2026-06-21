<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import type { AdminSettings } from '../types'

const props = defineProps<{
  settings: AdminSettings | null
  save: (patch: Partial<AdminSettings>) => Promise<AdminSettings>
}>()

const form = reactive({
  company_name: props.settings?.company_name ?? '',
  cnpj: props.settings?.cnpj ?? '',
  phone: props.settings?.phone ?? '',
  email: props.settings?.email ?? '',
  address: props.settings?.address ?? '',
})

const saving = ref(false)
const success = ref(false)
const error = ref('')

watch(
  () => props.settings,
  (settings) => {
    form.company_name = settings?.company_name ?? ''
    form.cnpj = settings?.cnpj ?? ''
    form.phone = settings?.phone ?? ''
    form.email = settings?.email ?? ''
    form.address = settings?.address ?? ''
  },
  { immediate: true },
)

async function submit() {
  saving.value = true
  success.value = false
  error.value = ''
  try {
    await props.save({ ...form })
    success.value = true
    setTimeout(() => (success.value = false), 3000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível salvar.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="set-form" @submit.prevent="submit">
    <div class="set-head">
      <div class="set-head-icon">🏢</div>
      <div>
        <h2>Dados da empresa</h2>
        <p>Informações usadas em comprovantes, faturas e comunicações.</p>
      </div>
    </div>

    <div v-if="success" class="set-success">Configurações salvas com sucesso.</div>
    <div v-if="error" class="set-error">{{ error }}</div>

    <div class="set-grid">
      <label class="set-field full">
        <span>Nome da empresa</span>
        <input v-model="form.company_name" placeholder="Digite o nome da empresa" />
      </label>
      <label class="set-field">
        <span>CNPJ</span>
        <input v-model="form.cnpj" placeholder="00.000.000/0000-00" />
      </label>
      <label class="set-field">
        <span>Telefone</span>
        <input v-model="form.phone" placeholder="(11) 99999-9999" />
      </label>
      <label class="set-field full">
        <span>Email</span>
        <input v-model="form.email" type="email" placeholder="contato@empresa.com" />
      </label>
      <label class="set-field full">
        <span>Endereço</span>
        <textarea v-model="form.address" rows="4" placeholder="Rua, número, cidade, estado" />
      </label>
    </div>

    <div class="set-actions">
      <button class="set-btn set-btn--primary" type="submit" :disabled="saving">
        {{ saving ? 'Salvando...' : 'Salvar configurações' }}
      </button>
    </div>
  </form>
</template>
