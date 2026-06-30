<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CheckCircle2, ChevronDown, ExternalLink, Power, Save, ShieldCheck } from '@lucide/vue'
import { settingsService } from '@/services/api/settings.service'
import type { PaymentProviderDefinition, PaymentSettings, PaymentSettingsResponse } from '../types'

const loading = ref(true)
const saving = ref(false)
const success = ref('')
const error = ref('')
const providers = ref<PaymentProviderDefinition[]>([])
const settings = ref<PaymentSettings[]>([])
const selectedProviderId = ref('manual_pix')

const emptyForm = (): PaymentSettings => ({
  provider: 'manual_pix',
  name: '',
  environment: 'sandbox',
  active: false,
  priority: 100,
  pixKey: '',
  clientId: '',
  clientSecret: '',
  token: '',
  webhookUrl: '',
  webhookSecret: '',
  certificate: '',
  agency: '',
  accountNumber: '',
  depixAddress: '',
  depixSplitAddress: '',
  splitFee: null,
  delayDepixInHours: null,
  bankName: '',
  accountLabel: '',
  instructions: '',
  autoApprove: false,
  hasClientSecret: false,
  hasToken: false,
  hasWebhookSecret: false,
  hasCertificate: false,
})

const form = reactive<PaymentSettings>(emptyForm())

const selectedProvider = computed(() => providers.value.find((provider) => provider.id === selectedProviderId.value))
const activeSettings = computed(() => settings.value.filter((setting) => setting.active))

const fieldLabels: Record<string, string> = {
  pixKey: 'Chave PIX / copia e cola',
  bankName: 'Banco exibido',
  accountLabel: 'Nome da conta',
  clientId: 'Client ID',
  clientSecret: 'Client secret',
  token: 'Access token / API key',
  webhookUrl: 'Webhook configurado no provedor',
  webhookSecret: 'Webhook secret',
  certificate: 'Certificado / conteudo PEM',
  agency: 'Agencia',
  accountNumber: 'Conta',
  depixAddress: 'Endereco Liquid/DePix',
  depixSplitAddress: 'Endereco split',
  splitFee: 'Split fee (%)',
  delayDepixInHours: 'Delay em horas',
}

function settingFor(provider: PaymentProviderDefinition) {
  return settings.value.find((item) => item.provider === provider.id)
}

function providerStatus(provider: PaymentProviderDefinition) {
  const setting = settingFor(provider)
  if (!setting) return 'Nao configurado'
  return setting.active ? 'Ativo' : 'Desativado'
}

function statusTone(provider: PaymentProviderDefinition) {
  const status = providerStatus(provider)
  if (status === 'Ativo') return 'active'
  if (status === 'Desativado') return 'paused'
  return 'empty'
}

function missingFields(provider: PaymentProviderDefinition) {
  const setting = settingFor(provider)
  return provider.requiredFields.filter((field) => {
    if (field === 'clientSecret') return !setting?.hasClientSecret
    if (field === 'token') return !setting?.hasToken
    if (field === 'certificate') return !setting?.hasCertificate
    if (field === 'webhookSecret') return !setting?.hasWebhookSecret
    return !String((setting as Record<string, unknown> | undefined)?.[field] ?? '').trim()
  })
}

function applyForm(setting?: PaymentSettings, provider?: PaymentProviderDefinition) {
  Object.assign(form, emptyForm(), {
    provider: provider?.id ?? setting?.provider ?? 'manual_pix',
    name: setting?.name ?? provider?.name ?? '',
    environment: setting?.environment ?? 'sandbox',
    active: setting?.active ?? false,
    priority: setting?.priority ?? 100,
    pixKey: setting?.pixKey ?? '',
    clientId: setting?.clientId ?? '',
    webhookUrl: setting?.webhookUrl ?? '',
    agency: setting?.agency ?? '',
    accountNumber: setting?.accountNumber ?? '',
    depixAddress: setting?.depixAddress ?? '',
    depixSplitAddress: setting?.depixSplitAddress ?? '',
    splitFee: setting?.splitFee ?? null,
    delayDepixInHours: setting?.delayDepixInHours ?? null,
    bankName: setting?.bankName ?? '',
    accountLabel: setting?.accountLabel ?? '',
    instructions: setting?.instructions ?? provider?.notes ?? '',
    autoApprove: setting?.autoApprove ?? false,
    hasClientSecret: setting?.hasClientSecret ?? false,
    hasToken: setting?.hasToken ?? false,
    hasWebhookSecret: setting?.hasWebhookSecret ?? false,
    hasCertificate: setting?.hasCertificate ?? false,
    id: setting?.id,
  })
}

function configure(provider: PaymentProviderDefinition) {
  selectedProviderId.value = provider.id
  applyForm(settingFor(provider), provider)
  success.value = ''
  error.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await settingsService.getPayments<PaymentSettingsResponse>()
    providers.value = response.providers
    settings.value = response.settings
    selectedProviderId.value = settings.value[0]?.provider ?? providers.value[0]?.id ?? 'manual_pix'
    const provider = providers.value.find((item) => item.id === selectedProviderId.value)
    applyForm(provider ? settingFor(provider) : undefined, provider)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar pagamentos.'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  success.value = ''
  error.value = ''
  try {
    const payload = {
      id: form.id,
      provider: form.provider,
      name: form.name,
      environment: form.environment,
      active: form.active,
      priority: Number(form.priority || 100),
      pixKey: form.pixKey,
      clientId: form.clientId,
      clientSecret: form.clientSecret || undefined,
      token: form.token || undefined,
      webhookUrl: form.webhookUrl,
      webhookSecret: form.webhookSecret || undefined,
      certificate: form.certificate || undefined,
      agency: form.agency,
      accountNumber: form.accountNumber,
      depixAddress: form.depixAddress,
      depixSplitAddress: form.depixSplitAddress,
      splitFee: form.splitFee,
      delayDepixInHours: form.delayDepixInHours,
      bankName: form.bankName,
      accountLabel: form.accountLabel,
      instructions: form.instructions,
      autoApprove: form.autoApprove,
    }
    const saved = await settingsService.updatePayments<PaymentSettings>(payload)
    const index = settings.value.findIndex((setting) => setting.id === saved.id || setting.provider === saved.provider)
    if (index >= 0) settings.value[index] = saved
    else settings.value.unshift(saved)
    selectedProviderId.value = saved.provider
    applyForm(saved, selectedProvider.value)
    form.clientSecret = ''
    form.token = ''
    form.webhookSecret = ''
    form.certificate = ''
    success.value = 'Banco/gateway salvo para o checkout.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel salvar pagamentos.'
  } finally {
    saving.value = false
  }
}

async function toggleProvider(provider: PaymentProviderDefinition) {
  configure(provider)
  const setting = settingFor(provider)
  if (!setting?.id) {
    form.active = true
    await save()
    return
  }
  error.value = ''
  success.value = ''
  const updated = await settingsService.togglePayment<PaymentSettings>(setting.id, !setting.active)
  const index = settings.value.findIndex((item) => item.id === updated.id)
  if (index >= 0) settings.value[index] = updated
  applyForm(updated, provider)
  success.value = updated.active ? 'Forma de pagamento ativada.' : 'Forma de pagamento pausada.'
}

function setupSteps(provider: PaymentProviderDefinition) {
  if (provider.id === 'manual_pix') {
    return ['Informe chave PIX e nome exibido.', 'Ative o banco para aparecer no checkout.', 'Aprovacao dos pedidos sera manual pelo admin.']
  }
  return ['Contrate a conta no provedor e copie as credenciais oficiais.', 'Cole token, client id/secret ou certificado nos campos indicados.', 'Configure o webhook do provedor apontando para a URL exibida no backend.']
}

function resellerSteps(provider: PaymentProviderDefinition) {
  if (provider.id === 'manual_pix') return ['Escolhe PIX manual no checkout.', 'Copia a chave exibida e paga no app do banco.', 'Aguarda a conferencia do admin para receber os codigos.']
  return ['Escolhe este banco/gateway no checkout.', 'Informa CPF/CNPJ quando exigido e gera o pedido.', 'Paga pelo link ou QR Code retornado pelo gateway.']
}

function recognitionSteps(provider: PaymentProviderDefinition) {
  if (!provider.webhookEvents.length) return ['Sem webhook: o admin aprova o pagamento na tela de pedidos.', 'Apos aprovacao, os codigos reservados sao entregues ao revendedor.']
  return ['O gateway envia webhook de pagamento aprovado.', 'O backend valida a referencia do pedido.', 'O estoque reservado vira vendido e os codigos aparecem para o revendedor.']
}

onMounted(load)
</script>

<template>
  <section class="pay-page">
    <div class="pay-hero">
      <div>
        <span>Pagamentos dos codigos</span>
        <h2>Bancos e gateways</h2>
        <p>Ative somente os bancos prontos para vender. O checkout do revendedor mostra apenas opcoes ativas e instrucoes do metodo escolhido.</p>
      </div>
      <div class="pay-score">
        <strong>{{ activeSettings.length }}</strong>
        <small>ativos</small>
      </div>
    </div>

    <div v-if="loading" class="pay-empty">Carregando bancos...</div>
    <div v-else class="pay-stack">
      <div v-if="success" class="pay-success">{{ success }}</div>
      <div v-if="error" class="pay-error">{{ error }}</div>

      <div class="provider-list">
        <article v-for="provider in providers" :key="provider.id" class="provider-row" :class="{ open: provider.id === selectedProviderId }">
          <div class="provider-summary" @click="configure(provider)">
            <div class="provider-main">
              <span class="provider-kind">{{ provider.kind }}</span>
              <h3>{{ provider.name }}</h3>
              <p>{{ provider.notes }}</p>
            </div>
            <div class="provider-side">
              <span class="status-pill" :class="statusTone(provider)">{{ providerStatus(provider) }}</span>
              <small>{{ missingFields(provider).length ? `${missingFields(provider).length} campo(s) pendente(s)` : 'Cadastro pronto' }}</small>
            </div>
            <button class="round-btn" type="button" :aria-label="`Abrir ${provider.name}`">
              <ChevronDown :size="18" />
            </button>
          </div>

          <div v-if="provider.id === selectedProviderId" class="provider-detail">
            <div class="detail-top">
              <div>
                <strong>{{ provider.feeSummary || 'Taxa sob consulta' }}</strong>
                <p>{{ provider.contractNotes || 'Confira contrato, limites e prazos diretamente com o banco ou gateway antes de ativar.' }}</p>
              </div>
              <button class="power-btn" type="button" @click="toggleProvider(provider)">
                <Power :size="17" />
                {{ providerStatus(provider) === 'Ativo' ? 'Desativar' : 'Ativar' }}
              </button>
            </div>

            <div class="explain-grid">
              <div class="explain-card">
                <ShieldCheck :size="18" />
                <strong>Como configurar</strong>
                <span v-for="step in setupSteps(provider)" :key="step">{{ step }}</span>
              </div>
              <div class="explain-card">
                <CheckCircle2 :size="18" />
                <strong>No checkout do revendedor</strong>
                <span v-for="step in resellerSteps(provider)" :key="step">{{ step }}</span>
              </div>
              <div class="explain-card">
                <CheckCircle2 :size="18" />
                <strong>Baixa e entrega</strong>
                <span v-for="step in recognitionSteps(provider)" :key="step">{{ step }}</span>
              </div>
            </div>

            <div class="docs-line">
              <a :href="provider.officialDocsUrl" target="_blank" rel="noreferrer">
                Documentacao oficial
                <ExternalLink :size="15" />
              </a>
              <a v-if="provider.webhookDocsUrl" :href="provider.webhookDocsUrl" target="_blank" rel="noreferrer">
                Webhooks
                <ExternalLink :size="15" />
              </a>
              <span>Eventos: {{ provider.webhookEvents.join(', ') || 'aprovacao manual' }}</span>
            </div>

            <form class="pay-form" @submit.prevent="save">
              <div class="form-grid">
                <label>
                  Nome exibido
                  <input v-model="form.name" class="pay-input" placeholder="Ex: DePix principal" />
                </label>
                <label>
                  Ambiente
                  <select v-model="form.environment" class="pay-input">
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Producao</option>
                  </select>
                </label>
                <label>
                  Prioridade
                  <input v-model.number="form.priority" class="pay-input" type="number" min="1" />
                </label>
                <label>
                  Webhook no sistema
                  <input class="pay-input" :value="`/api/payment-webhooks/recharge-codes/${provider.id}`" readonly />
                </label>
              </div>

              <div class="field-list">
                <label v-for="field in provider.requiredFields" :key="field">
                  {{ fieldLabels[field] || field }}
                  <textarea
                    v-if="field === 'certificate'"
                    v-model="(form as Record<string, unknown>)[field] as string"
                    class="pay-input"
                    rows="4"
                    :placeholder="form.hasCertificate ? 'Certificado ja salvo. Preencha para substituir.' : 'Cole o conteudo do certificado.'"
                  />
                  <input
                    v-else
                    v-model="(form as Record<string, unknown>)[field] as string"
                    class="pay-input"
                    :type="['clientSecret', 'token', 'webhookSecret'].includes(field) ? 'password' : field.includes('Fee') || field.includes('Hours') ? 'number' : 'text'"
                    :placeholder="['clientSecret', 'token', 'webhookSecret'].includes(field) ? 'Preencha para salvar ou substituir segredo' : fieldLabels[field] || field"
                  />
                </label>
              </div>

              <label>
                Instrucoes para o revendedor
                <textarea v-model="form.instructions" class="pay-input" rows="4" placeholder="Explique exatamente como pagar por este metodo." />
              </label>

              <div class="form-actions">
                <label class="switch-line">
                  <input v-model="form.active" type="checkbox" />
                  Mostrar este banco no checkout
                </label>
                <label class="switch-line">
                  <input v-model="form.autoApprove" type="checkbox" />
                  Permitir baixa automatica por webhook
                </label>
                <button class="save-btn" type="submit" :disabled="saving">
                  <Save :size="17" />
                  {{ saving ? 'Salvando...' : 'Salvar banco' }}
                </button>
              </div>
            </form>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pay-page {
  --pay-surface: rgba(255, 255, 255, .94);
  --pay-raised: rgba(255, 255, 255, .98);
  --pay-sunken: rgba(244, 247, 246, .92);
  --pay-border: rgba(17, 24, 39, .1);
  --pay-text: #15191b;
  --pay-muted: #6b747b;
  --pay-accent: #ff4b12;
  --pay-good: #178a52;
  --pay-danger: #ad2b25;
  --pay-shadow: 14px 18px 36px rgba(18, 28, 36, .12), -8px -8px 22px rgba(255, 255, 255, .9);
  color: var(--pay-text);
  display: grid;
  gap: 18px;
}

:global(html[data-theme="dark"]) .pay-page,
:global(body.dark) .pay-page {
  --pay-surface: rgba(8, 9, 9, .94);
  --pay-raised: rgba(14, 15, 15, .96);
  --pay-sunken: rgba(4, 5, 5, .72);
  --pay-border: rgba(255, 255, 255, .08);
  --pay-text: var(--gj2-text, #fff8f2);
  --pay-muted: var(--gj2-muted, #9aa2a7);
  --pay-good: #91d2a4;
  --pay-danger: #ff8b7c;
  --pay-shadow: 10px 14px 30px rgba(0, 0, 0, .42), -5px -5px 16px rgba(255, 255, 255, .018);
}

.pay-hero,
.provider-row,
.pay-success,
.pay-error,
.pay-empty {
  background: var(--pay-surface);
  border: 1px solid var(--pay-border);
  box-shadow: var(--pay-shadow);
}

.pay-hero {
  border-radius: 28px;
  padding: 22px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
}

.pay-hero span,
.provider-kind {
  color: var(--pay-accent);
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.pay-hero h2,
.provider-main h3 {
  margin: 4px 0;
  line-height: 1.05;
}

.pay-hero p,
.provider-main p,
.detail-top p,
.provider-side small,
.docs-line span,
.explain-card span {
  color: var(--pay-muted);
  line-height: 1.45;
  margin: 0;
}

.pay-score {
  width: 88px;
  height: 88px;
  border-radius: 24px;
  background: var(--pay-sunken);
  display: grid;
  place-items: center;
  text-align: center;
  box-shadow: inset 5px 6px 14px rgba(0, 0, 0, .08), inset -5px -5px 14px rgba(255, 255, 255, .45);
}

.pay-score strong {
  font-size: 28px;
}

.pay-stack,
.provider-list {
  display: grid;
  gap: 12px;
}

.pay-success,
.pay-error,
.pay-empty {
  border-radius: 18px;
  padding: 14px 16px;
  font-weight: 850;
}

.pay-success {
  color: var(--pay-good);
}

.pay-error {
  color: var(--pay-danger);
}

.provider-row {
  border-radius: 22px;
  overflow: hidden;
}

.provider-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 42px;
  gap: 16px;
  align-items: center;
  padding: 16px;
  cursor: pointer;
}

.provider-side {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.status-pill,
.round-btn,
.power-btn,
.save-btn,
.docs-line a {
  border: 0;
  border-radius: 999px;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 900;
}

.status-pill {
  padding: 0 12px;
  background: var(--pay-sunken);
  color: var(--pay-muted);
}

.status-pill.active {
  color: var(--pay-good);
}

.status-pill.paused {
  color: var(--pay-danger);
}

.round-btn {
  width: 42px;
  background: var(--pay-sunken);
  color: var(--pay-text);
}

.provider-row.open .round-btn svg {
  transform: rotate(180deg);
}

.provider-detail {
  border-top: 1px solid var(--pay-border);
  padding: 16px;
  display: grid;
  gap: 14px;
  background: linear-gradient(180deg, transparent, rgba(255, 75, 18, .035));
}

.detail-top,
.form-actions,
.docs-line {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.power-btn,
.save-btn {
  padding: 0 16px;
  background: linear-gradient(135deg, var(--pay-accent), #b5210c);
  color: #fff;
  cursor: pointer;
}

.explain-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.explain-card,
.pay-form {
  background: var(--pay-sunken);
  border: 1px solid var(--pay-border);
  border-radius: 18px;
  padding: 14px;
}

.explain-card {
  display: grid;
  gap: 8px;
}

.explain-card svg {
  color: var(--pay-accent);
}

.docs-line {
  justify-content: flex-start;
}

.docs-line a {
  padding: 0 13px;
  background: var(--pay-raised);
  color: var(--pay-text);
  text-decoration: none;
}

.pay-form,
.form-grid,
.field-list {
  display: grid;
  gap: 12px;
}

.form-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.field-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

label {
  display: grid;
  gap: 7px;
  color: var(--pay-muted);
  font-size: 13px;
  font-weight: 850;
}

.pay-input {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--pay-border);
  border-radius: 15px;
  padding: 0 14px;
  background: var(--pay-raised);
  color: var(--pay-text);
  font: inherit;
  outline: none;
}

textarea.pay-input {
  padding: 12px 14px;
  resize: vertical;
}

.switch-line {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  grid-auto-flow: column;
  align-items: center;
  background: var(--pay-raised);
  color: var(--pay-text);
}

@media (max-width: 980px) {
  .pay-hero,
  .provider-summary,
  .detail-top {
    align-items: stretch;
  }

  .pay-hero,
  .provider-summary,
  .detail-top,
  .form-actions {
    flex-direction: column;
  }

  .provider-summary {
    grid-template-columns: 1fr;
  }

  .provider-side {
    justify-items: start;
  }

  .explain-grid,
  .form-grid,
  .field-list {
    grid-template-columns: 1fr;
  }
}
</style>
