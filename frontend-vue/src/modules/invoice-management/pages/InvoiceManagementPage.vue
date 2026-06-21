<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { creditRequestsService } from '@/services/api/creditRequests.service'
import { financeService } from '@/services/api/finance.service'
import { usersService } from '@/services/api/users.service'
import type { CreditRequest, Invoice, User } from '@/types/domain'
import { formatCurrency, formatDate, formatNumber } from '@/utils/format'

const users = ref<User[]>([])
const requests = ref<CreditRequest[]>([])
const invoices = ref<Invoice[]>([])
const busy = ref('')
const notice = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  notice.value = ''
  try {
    const [allUsers, reqs, invs] = await Promise.all([
      usersService.list(),
      creditRequestsService.list(1000).then((result) => result?.data || []),
      financeService.invoices(),
    ])
    users.value = allUsers
    requests.value = reqs
    invoices.value = invs
  } catch (err) {
    notice.value = err instanceof Error ? err.message : 'Nao foi possivel carregar faturas.'
  } finally {
    loading.value = false
  }
}

const postpaid = computed(() => users.value.filter((item) => item.role === 'user' && item.payment_type === 'postpaid'))
const pendingByReseller = computed(() =>
  postpaid.value
    .map((reseller) => {
      const items = requests.value.filter(
        (request) =>
          request.reseller_id === reseller.id &&
          request.payment_type === 'postpaid' &&
          request.status === 'recharged' &&
          !request.invoice_id,
      )
      return {
        reseller,
        requests: items,
        totalValue: items.reduce((sum, item) => sum + Number(item.total_value || 0), 0),
        totalCredits: items.reduce((sum, item) => sum + Number(item.requested_credits || 0), 0),
      }
    })
    .filter((item) => item.requests.length > 0),
)
const openInvoices = computed(() => invoices.value.filter((item) => item.status !== 'paid'))
const paidInvoices = computed(() => invoices.value.filter((item) => item.status === 'paid'))

async function generate(resellerId: string) {
  busy.value = `g-${resellerId}`
  await financeService.generate(resellerId).finally(() => {
    busy.value = ''
    load()
  })
}

async function markPaid(id: string) {
  busy.value = `p-${id}`
  await financeService.markPaid(id).finally(() => {
    busy.value = ''
    load()
  })
}

async function resend(id: string) {
  busy.value = `r-${id}`
  await financeService.resend(id).finally(() => {
    busy.value = ''
  })
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Gestão de faturas</h1>
        <p>Gere cobranças de pós-pago, marque pagamentos e reenvie comprovantes aos revendedores.</p>
      </div>
    </header>

    <div v-if="notice" class="module-card pad">{{ notice }}</div>

    <section class="module-grid four">
      <article class="module-stat"><span>Pós-pagos</span><strong>{{ postpaid.length }}</strong></article>
      <article class="module-stat"><span>A gerar</span><strong>{{ pendingByReseller.length }}</strong></article>
      <article class="module-stat"><span>Em aberto</span><strong>{{ openInvoices.length }}</strong></article>
      <article class="module-stat"><span>Pagas</span><strong>{{ paidInvoices.length }}</strong></article>
    </section>

    <section class="invoice-board">
      <div class="module-card pad">
        <h2>Pedidos prontos para fatura</h2>
        <div class="module-list">
          <article v-for="item in pendingByReseller" :key="item.reseller.id" class="module-row">
            <div class="module-row-line">
              <strong>{{ item.reseller.name || item.reseller.email }}</strong>
              <span class="module-pill">{{ item.requests.length }} pedidos</span>
            </div>
            <small>{{ formatNumber(item.totalCredits) }} créditos · {{ formatCurrency(item.totalValue) }}</small>
            <UiButton :disabled="busy === `g-${item.reseller.id}`" @click="generate(item.reseller.id)">Gerar fatura</UiButton>
          </article>
        </div>
      </div>

      <div class="module-card pad">
        <h2>Faturas em aberto</h2>
        <div class="module-list">
          <article v-for="invoice in openInvoices" :key="invoice.id" class="module-row">
            <div class="module-row-line">
              <strong>{{ invoice.invoice_number || invoice.id }}</strong>
              <span>{{ formatCurrency(invoice.total_value) }}</span>
            </div>
            <small>{{ invoice.reseller_name || invoice.reseller_id }} · vence {{ formatDate(invoice.due_date) }}</small>
            <UiButton :disabled="busy === `p-${invoice.id}`" @click="markPaid(invoice.id)">Marcar pago</UiButton>
          </article>
        </div>
      </div>

      <div class="module-card pad">
        <h2>Faturas pagas</h2>
        <div class="module-list">
          <article v-for="invoice in paidInvoices" :key="invoice.id" class="module-row">
            <strong>{{ invoice.invoice_number || invoice.id }}</strong>
            <small>{{ invoice.reseller_name || invoice.reseller_id }} · pago {{ formatDate(invoice.paid_date) }}</small>
            <UiButton variant="secondary" :disabled="busy === `r-${invoice.id}`" @click="resend(invoice.id)">Reenviar</UiButton>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.invoice-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

@media (max-width: 1100px) {
  .invoice-board {
    grid-template-columns: 1fr;
  }
}
</style>
