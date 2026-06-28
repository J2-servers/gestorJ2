<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import { PIX_KEY_TYPES, type AdminSettings, type PixKey } from '../types'

const props = defineProps<{
  settings: AdminSettings | null
  save: (patch: Partial<AdminSettings>) => Promise<AdminSettings>
}>()

const keys = ref<PixKey[]>([...(props.settings?.pix_keys ?? [])])
const newKey = reactive<PixKey>({ type: '', key_value: '', bank: '', is_active: true })
const saving = ref(false)
const success = ref(false)
const error = ref('')

watch(
  () => props.settings?.pix_keys,
  (pixKeys) => {
    keys.value = [...(pixKeys ?? [])]
  },
  { immediate: true },
)

function addKey() {
  if (!newKey.type || !newKey.key_value || !newKey.bank) {
    error.value = 'Preencha tipo, valor e banco antes de adicionar.'
    return
  }
  error.value = ''
  keys.value.push({ ...newKey, id: Date.now() })
  newKey.type = ''
  newKey.key_value = ''
  newKey.bank = ''
  newKey.is_active = true
}

function removeKey(index: number) {
  keys.value.splice(index, 1)
}

function toggleActive(index: number) {
  keys.value[index].is_active = !keys.value[index].is_active
}

async function save() {
  saving.value = true
  success.value = false
  error.value = ''
  try {
    await props.save({ pix_keys: keys.value })
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
  <div class="set-form">
    <div class="set-head">
      <div class="set-head-icon">🔑</div>
      <div>
        <h2>Chaves PIX</h2>
        <p>Gerencie as chaves disponíveis para recebimento.</p>
      </div>
    </div>

    <div v-if="success" class="set-success">Chaves PIX salvas com sucesso.</div>
    <div v-if="error" class="set-error">{{ error }}</div>

    <section class="set-section">
      <h3>Chaves cadastradas</h3>
      <p>{{ keys.length }} chave(s) configurada(s).</p>

      <div v-if="keys.length === 0" class="set-empty">Nenhuma chave PIX cadastrada.</div>
      <div v-else class="pix-list">
        <article v-for="(key, index) in keys" :key="`${key.key_value}-${index}`" class="pix-row" :class="{ off: !key.is_active }">
          <div class="pix-info">
            <strong>{{ PIX_KEY_TYPES[key.type] || key.type }} · {{ key.bank }}</strong>
            <span>{{ key.key_value }}</span>
          </div>
          <div class="pix-actions">
            <button class="set-btn" type="button" @click="toggleActive(index)">
              {{ key.is_active ? 'Desativar' : 'Ativar' }}
            </button>
            <button class="set-btn set-btn--danger" type="button" @click="removeKey(index)">Remover</button>
          </div>
        </article>
      </div>
    </section>

    <section class="set-section">
      <h3>Adicionar nova chave</h3>
      <p>Preencha os dados e clique em adicionar antes de salvar.</p>

      <div class="set-grid">
        <label class="set-field">
          <span>Tipo de chave</span>
          <select v-model="newKey.type">
            <option value="">Selecione</option>
            <option v-for="(label, value) in PIX_KEY_TYPES" :key="value" :value="value">{{ label }}</option>
          </select>
        </label>
        <label class="set-field">
          <span>Valor da chave PIX</span>
          <input v-model="newKey.key_value" placeholder="ex: 00000000000" />
        </label>
        <label class="set-field full">
          <span>Nome do banco</span>
          <input v-model="newKey.bank" placeholder="ex: Nubank" />
        </label>
      </div>

      <div class="set-actions">
        <button class="set-btn" type="button" @click="addKey">Adicionar chave</button>
        <button class="set-btn set-btn--primary" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Salvando...' : 'Salvar configurações' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pix-list {
  display: grid;
  gap: 10px;
}

.pix-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 16px;
  background: var(--gj2-row-bg);
  border: 1px solid var(--gj2-line);
}

.pix-row.off {
  opacity: 0.6;
}

.pix-info strong {
  display: block;
  color: var(--gj2-ink);
  font-size: 14px;
  font-weight: 830;
}

.pix-info span {
  display: block;
  margin-top: 3px;
  color: var(--gj2-muted);
  font-size: 13px;
  word-break: break-word;
}

.pix-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pix-actions .set-btn {
  min-height: 40px;
  padding: 0 14px;
  font-size: 13px;
}

@media (max-width: 560px) {
  .pix-row {
    grid-template-columns: 1fr;
  }

  .pix-actions {
    justify-content: stretch;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .pix-row {
  background: var(--gj2-surface-muted);
}
</style>
