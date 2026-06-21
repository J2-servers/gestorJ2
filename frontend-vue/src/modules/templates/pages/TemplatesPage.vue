<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { templatesService } from '@/services/api/templates.service'
import type { MessageTemplate } from '@/types/domain'
import { asArray } from '@/utils/format'

type TemplateType = 'queue' | 'approval' | 'rejection' | 'payment_reminder' | 'custom'

interface Preset {
  key: string
  name: string
  type: TemplateType
  content: string
}

const TYPE_OPTIONS: { value: TemplateType; label: string }[] = [
  { value: 'queue', label: 'Entrada na fila' },
  { value: 'approval', label: 'Aprovacao de pedido' },
  { value: 'rejection', label: 'Rejeicao de pedido' },
  { value: 'payment_reminder', label: 'Lembrete de pagamento' },
  { value: 'custom', label: 'Personalizado' },
]

const VARIABLES = [
  ['{{resellerName}}', 'Nome do revendedor'],
  ['{{requestId}}', 'ID do pedido'],
  ['{{serverName}}', 'Nome do servidor'],
  ['{{login}}', 'Login de recebimento'],
  ['{{credits}}', 'Quantidade de creditos'],
  ['{{value}}', 'Valor total'],
  ['{{adminNotes}}', 'Observacao do admin'],
  ['{{rejectionReason}}', 'Motivo da rejeicao'],
]

const PRESETS: Preset[] = [
  {
    key: 'approval-success-celebration',
    name: 'Recarga efetuada com sucesso',
    type: 'approval',
    content: `🎉🎉RECARGA EFETUADA COM SUCESSO🎉🎉
*{{resellerName}}* sua recarga ja esta disponivel.
> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*
____________
Obs, _{{adminNotes}}_`,
  },
  {
    key: 'approval-success-direct',
    name: 'Recarga liberada - direto',
    type: 'approval',
    content: `✅ *RECARGA LIBERADA*

*{{resellerName}}*, sua recarga foi concluida e os creditos ja estao disponiveis.

> Servidor: {{serverName}}
> Login: {{login}}
> Creditos: {{credits}}
> Valor: *{{value}}*

_{{adminNotes}}_`,
  },
  {
    key: 'queue-received',
    name: 'Pedido recebido na fila',
    type: 'queue',
    content: `⏳ *PEDIDO RECEBIDO*

*{{resellerName}}*, seu pedido #{{requestId}} entrou na fila de recarga.

> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*

Aguarde. Assim que a recarga for concluida voce recebera outro aviso.`,
  },
  {
    key: 'rejection-proof',
    name: 'Pedido rejeitado com motivo',
    type: 'rejection',
    content: `⚠️ *PEDIDO NAO APROVADO*

*{{resellerName}}*, seu pedido #{{requestId}} foi rejeitado.

> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*
____________
Motivo: _{{rejectionReason}}_

Corrija a informacao e envie novamente pelo painel.`,
  },
  {
    key: 'payment-reminder-pix',
    name: 'Lembrete de pagamento Pix',
    type: 'payment_reminder',
    content: `💳 *PAGAMENTO PENDENTE*

*{{resellerName}}*, seu pedido #{{requestId}} ainda aguarda comprovante.

> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*

Copie a chave Pix no painel, realize o pagamento e anexe o comprovante para liberar a analise.`,
  },
]

const templates = ref<MessageTemplate[]>([])
const selectedId = ref('')
const notice = ref('')
const copied = ref('')
const saving = ref(false)
const creatingPack = ref(false)

const form = reactive({
  name: '',
  type: 'approval' as TemplateType,
  presetKey: 'approval-success-celebration',
  content: '',
  active: true,
})

const selectedTemplate = computed(() => templates.value.find((item) => item.id === selectedId.value))
const activeCount = computed(() => templates.value.filter((template) => isActive(template)).length)
const typesCount = computed(() => new Set(templates.value.map((template) => template.type).filter(Boolean)).size)
const presetsForType = computed(() => PRESETS.filter((preset) => preset.type === form.type))
const preview = computed(() =>
  form.content
    .replaceAll('{{resellerName}}', 'Matheus Nobre')
    .replaceAll('{{serverName}}', 'TVS Original')
    .replaceAll('{{login}}', 'matheusnobre')
    .replaceAll('{{credits}}', '100 creditos')
    .replaceAll('{{value}}', 'R$ 525,00')
    .replaceAll('{{adminNotes}}', 'Obrigado pela preferencia.')
    .replaceAll('{{rejectionReason}}', 'Comprovante invalido.')
    .replaceAll('{{requestId}}', '#RXA643A2'),
)

function getContent(template: MessageTemplate) {
  return template.content || template.message_content || ''
}

function isActive(template: MessageTemplate) {
  return template.active ?? template.is_active ?? true
}

function selectTemplate(template: MessageTemplate) {
  selectedId.value = template.id
  const content = getContent(template)
  const preset = PRESETS.find((item) => item.content === content)
  Object.assign(form, {
    name: template.name,
    type: (template.type || 'custom') as TemplateType,
    presetKey: preset?.key || 'custom',
    content,
    active: isActive(template),
  })
}

async function load() {
  notice.value = ''
  try {
    templates.value = asArray<MessageTemplate>(await templatesService.list())
  } catch (error) {
    templates.value = []
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel carregar templates reais.'
  }
  if (templates.value[0]) selectTemplate(templates.value[0])
  else newTemplate()
}

function newTemplate() {
  const first = PRESETS[0]
  selectedId.value = ''
  Object.assign(form, {
    name: first.name,
    type: first.type,
    presetKey: first.key,
    content: first.content,
    active: true,
  })
}

function applyPreset(key: string) {
  const preset = PRESETS.find((item) => item.key === key)
  if (!preset) {
    form.presetKey = 'custom'
    return
  }
  Object.assign(form, {
    name: preset.name,
    type: preset.type,
    presetKey: preset.key,
    content: preset.content,
  })
}

function changeType(type: TemplateType) {
  form.type = type
  const preset = PRESETS.find((item) => item.type === type)
  if (preset) applyPreset(preset.key)
  else form.presetKey = 'custom'
}

function buildPayload() {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    content: form.content.trim(),
    active: Boolean(form.active),
  }
  if (!payload.name) throw new Error('Informe o nome do template.')
  if (!TYPE_OPTIONS.some((item) => item.value === payload.type)) throw new Error('Tipo de template invalido.')
  if (!payload.content) throw new Error('Informe a mensagem do template.')
  if (payload.content.length > 4000) throw new Error('A mensagem deve ter no maximo 4000 caracteres.')
  return payload
}

async function saveTemplate() {
  saving.value = true
  notice.value = ''
  try {
    const payload = buildPayload()
    const saved = selectedId.value
      ? await templatesService.update(selectedId.value, payload)
      : await templatesService.create(payload)
    if (selectedId.value) {
      templates.value = templates.value.map((item) => (item.id === saved.id ? saved : item))
    } else {
      templates.value.unshift(saved)
    }
    selectTemplate(saved)
    notice.value = 'Template salvo.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel salvar.'
  } finally {
    saving.value = false
  }
}

async function removeTemplate() {
  if (!selectedId.value) {
    notice.value = 'Selecione um template para remover.'
    return
  }
  saving.value = true
  const id = selectedId.value
  try {
    const removed = await templatesService.remove(id)
    templates.value = templates.value.map((item) => (item.id === id ? removed : item))
    selectTemplate(removed)
    notice.value = 'Template desativado.'
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel desativar.'
  } finally {
    saving.value = false
  }
}

async function createPresetPack() {
  creatingPack.value = true
  notice.value = ''
  try {
    const existing = new Map(
      templates.value.map((template) => [`${template.type}:${template.name}`.toLowerCase(), template]),
    )
    let changed = 0
    for (const preset of PRESETS) {
      const key = `${preset.type}:${preset.name}`.toLowerCase()
      const found = existing.get(key)
      if (found) {
        if (!isActive(found)) {
          const updated = await templatesService.update(found.id, { active: true })
          templates.value = templates.value.map((item) => (item.id === found.id ? updated : item))
          changed++
        }
        continue
      }
      const created = await templatesService.create({
        name: preset.name,
        type: preset.type,
        content: preset.content,
        active: true,
      })
      templates.value.unshift(created)
      changed++
    }
    notice.value = changed ? `${changed} template(s) criados ou reativados.` : 'Pacote J2 ja esta completo.'
    if (templates.value[0]) selectTemplate(templates.value[0])
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel criar o pacote J2.'
  } finally {
    creatingPack.value = false
  }
}

async function copyVariable(value: string) {
  await navigator.clipboard?.writeText(value).catch(() => undefined)
  copied.value = value
  window.setTimeout(() => {
    if (copied.value === value) copied.value = ''
  }, 1400)
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <section class="module-hero">
      <div>
        <h1>Templates de envio</h1>
        <p>Mensagens padrao para fila, aprovacao, rejeicao e lembretes do WhatsApp.</p>
      </div>
      <div class="module-actions">
        <UiButton variant="secondary" :disabled="creatingPack" @click="createPresetPack">
          {{ creatingPack ? 'Criando...' : 'Pacote J2' }}
        </UiButton>
        <UiButton variant="secondary" @click="newTemplate">Novo</UiButton>
        <UiButton v-if="selectedId" variant="secondary" :disabled="saving" @click="removeTemplate">Desativar</UiButton>
        <UiButton :disabled="saving" @click="saveTemplate">{{ saving ? 'Salvando...' : 'Salvar' }}</UiButton>
      </div>
    </section>

    <section class="module-grid four">
      <div class="module-stat"><span>Total</span><strong>{{ templates.length }}</strong><small>modelos cadastrados</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-green)"><span>Ativos</span><strong>{{ activeCount }}</strong><small>disponiveis para envio</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Tipos</span><strong>{{ typesCount }}</strong><small>fluxos cobertos</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-red)"><span>Variaveis</span><strong>{{ VARIABLES.length }}</strong><small>tokens documentados</small></div>
    </section>

    <p v-if="notice" class="module-row">{{ notice }}</p>

    <section class="variables-card module-card pad">
      <h2>Variaveis disponiveis</h2>
      <div class="variables-grid">
        <button v-for="[variable, desc] in VARIABLES" :key="variable" type="button" class="variable-item" @click="copyVariable(variable)">
          <code>{{ variable }}</code>
          <span>{{ copied === variable ? 'Copiado' : desc }}</span>
        </button>
      </div>
    </section>

    <section class="templates-layout">
      <aside class="module-card pad">
        <h2>Modelos</h2>
        <div class="module-list template-list">
          <button
            v-for="template in templates"
            :key="template.id"
            type="button"
            class="template-item"
            :class="{ active: selectedTemplate?.id === template.id, off: !isActive(template) }"
            @click="selectTemplate(template)"
          >
            <strong>{{ template.name }}</strong>
            <small>{{ TYPE_OPTIONS.find((item) => item.value === template.type)?.label || template.type }}</small>
          </button>
        </div>
      </aside>

      <main class="module-card pad">
        <h2>Editor</h2>
        <form class="template-form" @submit.prevent="saveTemplate">
          <div class="module-form-grid">
            <label class="module-label">Nome<input v-model="form.name" class="module-input" maxlength="100" /></label>
            <label class="module-label">Tipo
              <select :value="form.type" class="module-select" @change="changeType(($event.target as HTMLSelectElement).value as TemplateType)">
                <option v-for="option in TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </div>
          <label class="module-label">Modelo pronto
            <select v-model="form.presetKey" class="module-select" @change="applyPreset(form.presetKey)">
              <option value="custom">Personalizado / manual</option>
              <option v-for="preset in presetsForType" :key="preset.key" :value="preset.key">{{ preset.name }}</option>
            </select>
          </label>
          <label class="module-label">Conteudo
            <textarea v-model="form.content" class="module-textarea" maxlength="4000" @input="form.presetKey = 'custom'" />
            <small>{{ form.content.length }}/4000 caracteres</small>
          </label>
          <label class="switch-line">
            <input v-model="form.active" type="checkbox" />
            Template ativo
          </label>
        </form>
      </main>

      <aside class="module-card pad preview-card">
        <h2>Preview</h2>
        <pre>{{ preview }}</pre>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.variables-card {
  display: grid;
  gap: 14px;
}

.variables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}

.variable-item {
  min-width: 0;
  min-height: 58px;
  display: grid;
  gap: 3px;
  border: 0;
  border-radius: 16px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: #f7f8f6;
}

.variable-item code {
  min-width: 0;
  overflow: hidden;
  color: var(--gj2-green-deep);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-item span {
  min-width: 0;
  overflow: hidden;
  color: var(--gj2-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.templates-layout {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) 320px;
  gap: 20px;
}

.template-list {
  margin-top: 18px;
  max-height: 560px;
  overflow: auto;
}

.template-item {
  padding: 14px;
  border: 0;
  border-radius: 16px;
  text-align: left;
  background: #fff;
  box-shadow: 0 10px 22px rgba(95,105,112,.07);
  cursor: pointer;
}

.template-item.off {
  opacity: .55;
}

.template-item.active {
  color: #fff;
  background: var(--gj2-sidebar);
}

.template-item strong,
.template-item small {
  display: block;
}

.template-form {
  margin-top: 18px;
  display: grid;
  gap: 16px;
}

.template-form small {
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 700;
}

.switch-line {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
}

.preview-card {
  align-content: start;
}

.preview-card pre {
  min-height: 280px;
  max-height: 560px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
  padding: 16px;
  border-radius: 18px;
  background: #f7f8f6;
  font-family: inherit;
  font-weight: 650;
}

@media (max-width: 1180px) {
  .templates-layout {
    grid-template-columns: 1fr;
  }
}
</style>
