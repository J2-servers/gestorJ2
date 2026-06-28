<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { financeService } from '@/services/api/finance.service'
import { uploadsService } from '@/services/api/uploads.service'
import type { Invoice } from '@/types/domain'
import { asArray, formatCurrency, formatDate } from '@/utils/format'

const invoices = ref<Invoice[]>([])
const statusFilter = ref('all')
const notice = ref('')
const busy = ref('')
const proofFiles = ref<Record<string, File | null>>({})

const filtered = computed(() => {
  if (statusFilter.value === 'all') return invoices.value
  return invoices.value.filter((invoice) => statusKey(invoice) === statusFilter.value)
})

const totals = computed(() => {
  const paid = invoices.value.filter((invoice) => invoice.status === 'paid')
  const open = invoices.value.filter((invoice) => invoice.status !== 'paid')
  return {
    total: invoices.value.reduce((sum, invoice) => sum + Number(invoice.total_value || 0), 0),
    paid: paid.reduce((sum, invoice) => sum + Number(invoice.total_value || 0), 0),
    open: open.reduce((sum, invoice) => sum + Number(invoice.total_value || 0), 0),
    credits: invoices.value.reduce((sum, invoice) => sum + Number(invoice.total_credits || 0), 0),
  }
})

async function load() {
  notice.value = ''
  try {
    invoices.value = asArray<Invoice>(await financeService.invoices())
  } catch (error) {
    invoices.value = []
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel carregar faturas reais.'
  }
}

function statusKey(invoice: Invoice) {
  if (invoice.status === 'paid') return 'paid'
  if (invoice.status === 'overdue') return 'overdue'
  if (invoice.due_date && new Date(invoice.due_date) < new Date()) return 'overdue'
  if (invoice.status === 'canceled') return 'canceled'
  return 'pending'
}

function statusLabel(invoice: Invoice) {
  const key = statusKey(invoice)
  if (key === 'paid') return 'paga'
  if (key === 'overdue') return 'vencida'
  if (key === 'canceled') return 'cancelada'
  return 'pendente'
}

function statusColor(invoice: Invoice) {
  const key = statusKey(invoice)
  if (key === 'paid') return 'var(--gj2-green-deep)'
  if (key === 'overdue') return 'var(--gj2-red)'
  if (key === 'canceled') return 'var(--gj2-muted)'
  return 'var(--gj2-blue)'
}

function handleProof(invoiceId: string, event: Event) {
  proofFiles.value = {
    ...proofFiles.value,
    [invoiceId]: (event.target as HTMLInputElement).files?.[0] || null,
  }
}

async function markPaid(invoice: Invoice) {
  busy.value = invoice.id
  try {
    let proofUrl = ''
    const file = proofFiles.value[invoice.id]
    if (file) {
      const uploaded = (await uploadsService.upload(file)) as Record<string, string>
      proofUrl = uploaded.fileUrl || uploaded.file_url || uploaded.url || ''
    }
    const updated = await financeService.markPaid(invoice.id, proofUrl || undefined)
    invoices.value = invoices.value.map((item) => (item.id === invoice.id ? updated : item))
    proofFiles.value = { ...proofFiles.value, [invoice.id]: null }
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'A API nao confirmou a baixa da fatura.'
  } finally {
    busy.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <section class="module-hero">
      <div>
        <h1>Financeiro</h1>
        <p>Controle faturas, valores em aberto, pagos e creditos vendidos por revendedor.</p>
      </div>
    </section>

    <section class="module-grid four">
      <div class="module-stat"><span>Total</span><strong>{{ formatCurrency(totals.total) }}</strong><small>movimento geral</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-green)"><span>Pago</span><strong>{{ formatCurrency(totals.paid) }}</strong><small>faturas quitadas</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-red)"><span>Aberto</span><strong>{{ formatCurrency(totals.open) }}</strong><small>a receber</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Creditos</span><strong>{{ totals.credits }}</strong><small>em faturas</small></div>
    </section>

    <p v-if="notice" class="module-row">{{ notice }}</p>

    <section class="module-card pad">
      <div class="module-toolbar">
        <h2>Faturas</h2>
        <div class="module-chip-row">
          <button class="module-chip" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">Todas</button>
          <button class="module-chip" :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">Pendentes</button>
          <button class="module-chip" :class="{ active: statusFilter === 'paid' }" @click="statusFilter = 'paid'">Pagas</button>
          <button class="module-chip" :class="{ active: statusFilter === 'overdue' }" @click="statusFilter = 'overdue'">Vencidas</button>
        </div>
      </div>
      <div class="invoice-list">
        <article v-for="invoice in filtered" :key="invoice.id" class="invoice-row">
          <div>
            <strong>{{ invoice.invoice_number || invoice.id }}</strong>
            <small>{{ invoice.reseller_name || 'Revendedor' }} · venc. {{ formatDate(invoice.due_date) }}</small>
          </div>
          <div><small>Creditos</small><strong>{{ invoice.total_credits || 0 }}</strong></div>
          <div><small>Valor</small><strong>{{ formatCurrency(invoice.total_value) }}</strong></div>
          <span class="module-pill" :style="{ '--pill-color': statusColor(invoice) }">{{ statusLabel(invoice) }}</span>
          <label class="invoice-proof" :class="{ disabled: invoice.status === 'paid' }">
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf" :disabled="invoice.status === 'paid'" @change="handleProof(invoice.id, $event)" />
            {{ proofFiles[invoice.id]?.name || 'Comprovante' }}
          </label>
          <button type="button" :disabled="invoice.status === 'paid' || busy === invoice.id" @click="markPaid(invoice)">
            {{ busy === invoice.id ? 'Salvando...' : 'Marcar pago' }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.invoice-list {
  margin-top: 20px;
  display: grid;
  gap: 12px;
}

.invoice-row {
  padding: 16px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 110px 130px auto minmax(130px, auto) auto;
  align-items: center;
  gap: 14px;
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
  box-shadow: 0 12px 24px rgba(95,105,112,.07);
  transition: background .3s var(--gj2-ease);
}

.invoice-row strong,
.invoice-row small {
  display: block;
}

.invoice-row small {
  color: var(--gj2-muted);
}

.invoice-row button {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  border: 0;
  border-radius: 13px;
  color: #fff;
  background: var(--gj2-sidebar);
  font-weight: 800;
  cursor: pointer;
}

.invoice-proof {
  min-width: 0;
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gj2-muted);
  border: 1px solid var(--gj2-line);
  background: var(--gj2-surface-muted);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
  font-size: 12px;
  font-weight: 820;
  cursor: pointer;
  text-align: center;
  overflow-wrap: anywhere;
}

.invoice-proof input {
  display: none;
}

.invoice-proof.disabled {
  opacity: .4;
  cursor: not-allowed;
}

.invoice-row button:disabled {
  opacity: .35;
}

@media (max-width: 920px) {
  .invoice-row {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .invoice-row > * {
    min-width: 0;
    width: 100%;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .invoice-proof {
  background: var(--gj2-surface-muted);
  box-shadow: none;
  color: var(--gj2-muted);
}
</style>
