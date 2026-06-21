<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { creditRequestsService } from '@/services/api/creditRequests.service'
import { financeService } from '@/services/api/finance.service'
import { settingsService } from '@/services/api/settings.service'
import { useAuthStore } from '@/stores/auth.store'
import type { CreditRequest, Invoice } from '@/types/domain'
import { formatCurrency, formatDate, formatNumber } from '@/utils/format'

type PixKey = {
  bank?: string
  type?: string
  key_value?: string
  value?: string
  is_active?: boolean
}

type MonthPoint = {
  month: string
  value: number
}

const auth = useAuthStore()
const invoices = ref<Invoice[]>([])
const requests = ref<CreditRequest[]>([])
const pixKeys = ref<PixKey[]>([])
const monthlyData = ref<MonthPoint[]>([])
const selectedInvoice = ref<Invoice | null>(null)
const copiedPix = ref('')
const notice = ref('')
const loading = ref(false)
const tab = ref<'all' | 'pending' | 'paid'>('all')

const isPostpaidReseller = computed(() => auth.user?.role === 'user' && auth.user?.payment_type === 'postpaid')
const userId = computed(() => auth.user?.id || '')
const userRequests = computed(() =>
  requests.value.filter((request) => !request.reseller_id || request.reseller_id === userId.value),
)
const unbilledRequests = computed(() =>
  userRequests.value.filter(
    (request) => request.status === 'recharged' && request.payment_type === 'postpaid' && !request.invoice_id,
  ),
)
const pendingInvoices = computed(() => invoices.value.filter((invoice) => invoice.status !== 'paid'))
const paidInvoices = computed(() => invoices.value.filter((invoice) => invoice.status === 'paid'))
const filteredInvoices = computed(() => {
  if (tab.value === 'paid') return paidInvoices.value
  if (tab.value === 'pending') return pendingInvoices.value
  return invoices.value
})

const selectedRequests = computed(() =>
  selectedInvoice.value
    ? userRequests.value.filter((request) => request.invoice_id === selectedInvoice.value?.id)
    : [],
)

const stats = computed(() => {
  const nextDue = [...pendingInvoices.value].sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())[0]
  const unbilledValue = unbilledRequests.value.reduce((sum, request) => sum + Number(request.total_value || 0), 0)
  const unbilledCredits = unbilledRequests.value.reduce((sum, request) => sum + Number(request.requested_credits || 0), 0)
  const pendingValue = pendingInvoices.value.reduce((sum, invoice) => sum + Number(invoice.total_value || 0), 0)
  const paidValue = paidInvoices.value.reduce((sum, invoice) => sum + Number(invoice.total_value || 0), 0)

  return {
    nextDue,
    pendingValue,
    paidValue,
    unbilledCredits,
    unbilledRequests: unbilledRequests.value.length,
    unbilledValue,
  }
})

const maxMonthValue = computed(() => Math.max(...monthlyData.value.map((item) => item.value), 1))

function normalizePixKeys(payload: unknown): PixKey[] {
  const raw = Array.isArray((payload as { pix_keys?: unknown[] } | null)?.pix_keys)
    ? (payload as { pix_keys: unknown[] }).pix_keys
    : []
  return raw
    .map((key) => (typeof key === 'string' ? { key_value: key, bank: 'Pix', type: 'chave' } : (key as PixKey)))
    .filter((key) => key && key.is_active !== false)
}

function buildMonthlyData(items: Invoice[]) {
  const now = new Date()
  return Array.from({ length: 6 }).map((_, index) => {
    const offset = 5 - index
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    const value = items
      .filter((invoice) => {
        const created = new Date(invoice.created_date || invoice.paid_date || '')
        return invoice.status === 'paid' && created >= start && created <= end
      })
      .reduce((sum, invoice) => sum + Number(invoice.total_value || 0), 0)
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      value,
    }
  })
}

async function load() {
  loading.value = true
  notice.value = ''
  try {
    const [invs, reqs, settings] = await Promise.all([
      financeService.invoices().catch(() => []),
      creditRequestsService.list(500).then((result) => result?.data || []).catch(() => []),
      settingsService.getPublic().catch(() => null),
    ])
    invoices.value = invs
    requests.value = reqs
    pixKeys.value = normalizePixKeys(settings)
    monthlyData.value = buildMonthlyData(invs)
  } catch (err) {
    notice.value = err instanceof Error ? err.message : 'Nao foi possivel carregar financeiro.'
  } finally {
    loading.value = false
  }
}

async function copyPix(key: PixKey) {
  const value = key.key_value || key.value || ''
  if (!value) return
  await navigator.clipboard?.writeText(value).catch(() => undefined)
  copiedPix.value = value
  window.setTimeout(() => {
    if (copiedPix.value === value) copiedPix.value = ''
  }, 1500)
}

async function requestInvoice() {
  const settings = await settingsService.getPublic().catch(() => null)
  const adminWhatsapp = String((settings as { admin_whatsapp?: string } | null)?.admin_whatsapp || '').replace(/\D/g, '')
  if (!adminWhatsapp) {
    notice.value = 'O administrador ainda nao configurou o WhatsApp para solicitacao de fatura.'
    return
  }

  const total = unbilledRequests.value.reduce((sum, request) => sum + Number(request.total_value || 0), 0)
  const text =
    `Ola! Gostaria de solicitar a geracao da fatura dos meus pedidos nao faturados.\n\n` +
    `Pedidos: ${unbilledRequests.value.length}\n` +
    `Creditos: ${formatNumber(stats.value.unbilledCredits)}\n` +
    `Total estimado: ${formatCurrency(total)}`
  window.open(`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(text)}`, '_blank')
}

onMounted(load)
</script>

<template>
  <div class="module-page postpaid-page">
    <header class="module-hero postpaid-hero">
      <div>
        <h1>Financeiro pos-pago</h1>
        <p>Faturas, consumo, pedidos ainda nao faturados e chaves PIX ficam reunidos em um unico lugar.</p>
      </div>
    </header>

    <section v-if="!isPostpaidReseller" class="module-card pad postpaid-denied">
      <strong>Acesso exclusivo para revendedores pos-pago.</strong>
      <span>Se sua conta deveria ter esse acesso, solicite ao administrador a troca do tipo de pagamento.</span>
    </section>

    <template v-else>
      <p v-if="notice" class="module-row">{{ notice }}</p>

      <section class="module-grid four">
        <article class="module-stat"><span>Saldo devedor</span><strong>{{ formatCurrency(stats.pendingValue) }}</strong><small>{{ pendingInvoices.length }} fatura(s) pendente(s)</small></article>
        <article class="module-stat" style="--stat-color: var(--gj2-yellow)"><span>Proximo vencimento</span><strong>{{ stats.nextDue ? formatDate(stats.nextDue.due_date) : 'em dia' }}</strong><small>{{ stats.nextDue?.invoice_number || 'nenhuma fatura aberta' }}</small></article>
        <article class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Nao faturado</span><strong>{{ formatCurrency(stats.unbilledValue) }}</strong><small>{{ stats.unbilledRequests }} pedido(s)</small></article>
        <article class="module-stat" style="--stat-color: var(--gj2-green)"><span>Total pago</span><strong>{{ formatCurrency(stats.paidValue) }}</strong><small>{{ paidInvoices.length }} fatura(s) pagas</small></article>
      </section>

      <section class="postpaid-layout">
        <main class="module-card pad postpaid-invoices">
          <div class="module-row-line">
            <div>
              <h2>Faturas</h2>
              <small>Clique em uma fatura para ver os pedidos incluidos.</small>
            </div>
            <div class="module-chip-row">
              <button class="module-chip" :class="{ active: tab === 'all' }" @click="tab = 'all'">Todas</button>
              <button class="module-chip" :class="{ active: tab === 'pending' }" @click="tab = 'pending'">Pendentes</button>
              <button class="module-chip" :class="{ active: tab === 'paid' }" @click="tab = 'paid'">Pagas</button>
            </div>
          </div>

          <div class="postpaid-list">
            <button v-for="invoice in filteredInvoices" :key="invoice.id" type="button" class="postpaid-invoice" @click="selectedInvoice = invoice">
              <span class="postpaid-file">{{ invoice.status === 'paid' ? 'OK' : 'R$' }}</span>
              <span>
                <strong>{{ invoice.invoice_number || invoice.id }}</strong>
                <small>{{ invoice.request_count || invoice.requests?.length || 0 }} pedidos - {{ formatNumber(invoice.total_credits) }} creditos</small>
              </span>
              <span class="module-pill" :style="{ '--pill-color': invoice.status === 'paid' ? 'var(--gj2-green-deep)' : 'var(--gj2-yellow)' }">
                {{ invoice.status === 'paid' ? 'paga' : 'pendente' }}
              </span>
              <span class="postpaid-total">{{ formatCurrency(invoice.total_value) }}</span>
            </button>
            <div v-if="!filteredInvoices.length" class="postpaid-empty">Nenhuma fatura encontrada.</div>
          </div>
        </main>

        <aside class="postpaid-side">
          <section v-if="unbilledRequests.length" class="module-card pad">
            <div class="module-row-line">
              <div>
                <h2>Pedidos nao faturados</h2>
                <small>Entrarao na proxima fatura.</small>
              </div>
              <span class="module-pill">{{ unbilledRequests.length }}</span>
            </div>
            <div class="postpaid-mini-grid">
              <div><span>Creditos</span><strong>{{ formatNumber(stats.unbilledCredits) }}</strong></div>
              <div><span>Estimado</span><strong>{{ formatCurrency(stats.unbilledValue) }}</strong></div>
            </div>
            <UiButton class="full" @click="requestInvoice">Solicitar fatura no WhatsApp</UiButton>
          </section>

          <section class="module-card pad">
            <h2>Consumo mensal</h2>
            <div class="postpaid-bars">
              <div v-for="month in monthlyData" :key="month.month">
                <div><span>{{ month.month }}</span><strong>{{ formatCurrency(month.value) }}</strong></div>
                <i><b :style="{ width: `${(month.value / maxMonthValue) * 100}%` }" /></i>
              </div>
            </div>
          </section>

          <section class="module-card pad">
            <h2>Chaves PIX</h2>
            <div class="postpaid-pix-list">
              <button v-for="(key, index) in pixKeys" :key="`${key.key_value || key.value || index}`" type="button" :class="{ copied: copiedPix === (key.key_value || key.value) }" @click="copyPix(key)">
                <span>{{ key.bank || 'Pix' }} - {{ key.type || 'chave' }}</span>
                <strong>{{ key.key_value || key.value }}</strong>
              </button>
              <div v-if="!pixKeys.length" class="postpaid-empty mini">Nenhuma chave PIX configurada.</div>
            </div>
          </section>
        </aside>
      </section>
    </template>

    <div v-if="selectedInvoice" class="postpaid-overlay" @click="selectedInvoice = null">
      <section class="postpaid-modal" @click.stop>
        <header>
          <div>
            <strong>{{ selectedInvoice.invoice_number || selectedInvoice.id }}</strong>
            <span>{{ selectedInvoice.status === 'paid' ? 'Pago em ' + formatDate(selectedInvoice.paid_date) : 'Vence em ' + formatDate(selectedInvoice.due_date) }}</span>
          </div>
          <button type="button" @click="selectedInvoice = null">Fechar</button>
        </header>
        <div class="postpaid-modal-stats">
          <div><span>Pedidos</span><strong>{{ selectedInvoice.request_count || selectedRequests.length }}</strong></div>
          <div><span>Creditos</span><strong>{{ formatNumber(selectedInvoice.total_credits) }}</strong></div>
          <div><span>Total</span><strong>{{ formatCurrency(selectedInvoice.total_value) }}</strong></div>
        </div>
        <div class="postpaid-modal-list">
          <article v-for="request in selectedRequests" :key="request.id">
            <div>
              <strong>{{ request.server_snapshot?.name || 'Servidor' }}</strong>
              <small>Login {{ request.login }} - {{ formatDate(request.created_date) }}</small>
            </div>
            <span>{{ formatNumber(request.requested_credits) }} cr - {{ formatCurrency(request.total_value) }}</span>
          </article>
          <div v-if="!selectedRequests.length" class="postpaid-empty mini">Sem pedidos detalhados para esta fatura.</div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.postpaid-denied {
  display: grid;
  gap: 8px;
  color: var(--gj2-muted);
}

.postpaid-denied strong {
  color: var(--gj2-ink);
  font-size: 20px;
}

.postpaid-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.postpaid-list,
.postpaid-side,
.postpaid-bars,
.postpaid-pix-list,
.postpaid-modal-list {
  display: grid;
  gap: 12px;
}

.postpaid-list {
  margin-top: 18px;
}

.postpaid-invoice {
  width: 100%;
  border: 0;
  border-radius: 20px;
  padding: 14px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  color: inherit;
  background: #fff;
  box-shadow: 0 12px 24px rgba(95, 105, 112, .08);
  cursor: pointer;
  text-align: left;
}

.postpaid-file {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--gj2-sidebar);
  font-weight: 950;
}

.postpaid-invoice strong,
.postpaid-invoice small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.postpaid-invoice small {
  margin-top: 4px;
  color: var(--gj2-muted);
}

.postpaid-total {
  color: var(--gj2-green-deep);
  font-weight: 950;
}

.postpaid-mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 16px 0;
}

.postpaid-mini-grid div,
.postpaid-empty,
.postpaid-pix-list button {
  border: 0;
  border-radius: 18px;
  padding: 14px;
  background: #f6f7f5;
  box-shadow: inset 8px 8px 16px rgba(159, 167, 172, .13), inset -8px -8px 16px rgba(255, 255, 255, .82);
}

.postpaid-mini-grid span,
.postpaid-bars span,
.postpaid-pix-list span {
  display: block;
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.postpaid-mini-grid strong,
.postpaid-bars strong,
.postpaid-pix-list strong {
  display: block;
  margin-top: 5px;
  color: var(--gj2-ink);
  font-weight: 950;
}

.full {
  width: 100%;
}

.postpaid-bars > div > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}

.postpaid-bars i {
  display: block;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #eef0ec;
  box-shadow: inset 4px 4px 8px rgba(159, 167, 172, .18);
}

.postpaid-bars b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--gj2-sidebar);
}

.postpaid-pix-list button {
  min-width: 0;
  text-align: left;
  cursor: pointer;
}

.postpaid-pix-list button.copied {
  background: #e8f7ee;
}

.postpaid-pix-list strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.postpaid-empty {
  color: var(--gj2-muted);
  text-align: center;
  font-weight: 800;
}

.postpaid-empty.mini {
  font-size: 13px;
}

.postpaid-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  padding: 18px;
  display: grid;
  place-items: center;
  background: rgba(8, 10, 12, .72);
}

.postpaid-modal {
  width: min(880px, 100%);
  max-height: min(850px, 92dvh);
  overflow: auto;
  border-radius: 28px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 30px 90px rgba(0, 0, 0, .28);
}

.postpaid-modal header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: start;
}

.postpaid-modal header strong,
.postpaid-modal header span {
  display: block;
}

.postpaid-modal header strong {
  color: var(--gj2-ink);
  font-size: 22px;
  font-weight: 950;
}

.postpaid-modal header span {
  margin-top: 4px;
  color: var(--gj2-muted);
}

.postpaid-modal header button {
  border: 0;
  border-radius: 14px;
  padding: 10px 13px;
  color: #fff;
  background: var(--gj2-sidebar);
  cursor: pointer;
  font-weight: 900;
}

.postpaid-modal-stats {
  margin: 18px 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.postpaid-modal-stats div {
  padding: 13px;
  border-radius: 16px;
  background: #f6f7f5;
}

.postpaid-modal-stats span {
  display: block;
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.postpaid-modal-stats strong {
  display: block;
  margin-top: 5px;
  color: var(--gj2-ink);
  font-size: 20px;
  font-weight: 950;
}

.postpaid-modal-list article {
  padding: 13px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: #f8f9f7;
}

.postpaid-modal-list strong,
.postpaid-modal-list small {
  display: block;
}

.postpaid-modal-list small {
  margin-top: 4px;
  color: var(--gj2-muted);
}

.postpaid-modal-list span {
  flex: 0 0 auto;
  color: var(--gj2-green-deep);
  font-weight: 950;
}

@media (max-width: 1040px) {
  .postpaid-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .postpaid-invoice,
  .postpaid-modal-stats,
  .postpaid-modal-list article {
    grid-template-columns: 1fr;
  }

  .postpaid-invoice {
    display: grid;
  }

  .postpaid-modal-list article {
    display: grid;
  }

  .postpaid-total {
    justify-self: start;
  }
}
</style>
