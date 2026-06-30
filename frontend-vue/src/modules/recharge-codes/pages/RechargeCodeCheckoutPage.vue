<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Copy, Download, ExternalLink, Plus, RefreshCw, ShoppingCart, Trash2 } from '@lucide/vue'
import { rechargeCodesService } from '@/services/api/rechargeCodes.service'
import type { RechargeCodeOrder, RechargeCodePaymentOption, RechargeCodeProduct } from '@/types/domain'
import { formatCurrency } from '@/utils/format'

interface CartItem {
  product: RechargeCodeProduct
  quantity: number
}

const loading = ref(true)
const creating = ref(false)
const error = ref('')
const notice = ref('')
const catalog = ref<RechargeCodeProduct[]>([])
const orders = ref<RechargeCodeOrder[]>([])
const paymentOptions = ref<RechargeCodePaymentOption[]>([])
const selectedProvider = ref('')
const cart = ref<CartItem[]>([])
const payerTaxNumber = ref('')

const total = computed(() => cart.value.reduce((sum, item) => sum + priceOf(item.product) * item.quantity, 0))
const availableProducts = computed(() => catalog.value.filter((product) => product.availableForSale))
const selectedPayment = computed(() => paymentOptions.value.find((option) => option.provider === selectedProvider.value) ?? paymentOptions.value[0])
const requiresTaxNumber = computed(() => Boolean(selectedPayment.value?.requiresPayerTaxNumber))

function priceOf(product: RechargeCodeProduct) {
  return Number(product.sale_value ?? product.saleValue ?? 0)
}

function productTitle(product: RechargeCodeProduct) {
  const server = product.server?.name || 'Servidor'
  const modality = product.modality?.name || product.name
  return `${server} - ${modality}`
}

function add(product: RechargeCodeProduct) {
  const current = cart.value.find((item) => item.product.id === product.id)
  if (current) current.quantity += 1
  else cart.value.push({ product, quantity: 1 })
}

function remove(productId: string) {
  cart.value = cart.value.filter((item) => item.product.id !== productId)
}

function paymentLabel(provider?: string) {
  return paymentOptions.value.find((option) => option.provider === provider)?.name || provider || 'Pagamento'
}

function codeLines(order: RechargeCodeOrder) {
  return order.items.flatMap((item) =>
    item.codes.map((code) => [item.product.server?.name, item.product.modality?.name, code.code, code.pin].filter(Boolean).join(' | ')),
  )
}

async function copyCodes(order: RechargeCodeOrder) {
  await navigator.clipboard.writeText(codeLines(order).join('\n'))
  notice.value = 'Codigos copiados.'
}

function downloadCodes(order: RechargeCodeOrder) {
  const blob = new Blob([codeLines(order).join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `codigos-${order.id}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [products, orderList, options] = await Promise.all([
      rechargeCodesService.catalog(),
      rechargeCodesService.listOrders(),
      rechargeCodesService.paymentOptions(),
    ])
    catalog.value = products
    orders.value = orderList
    paymentOptions.value = options
    selectedProvider.value = selectedProvider.value || options[0]?.provider || ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar checkout.'
  } finally {
    loading.value = false
  }
}

async function createOrder() {
  if (!cart.value.length) return
  if (!selectedPayment.value) {
    error.value = 'Nenhuma forma de pagamento ativa no momento.'
    return
  }
  creating.value = true
  error.value = ''
  notice.value = ''
  try {
    const order = await rechargeCodesService.createOrder(
      cart.value.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      payerTaxNumber.value,
      selectedPayment.value.provider,
    )
    cart.value = []
    notice.value = `Pedido criado em ${paymentLabel(order.payment?.provider)}. Pague ${formatCurrency(Number(order.totalValue ?? order.total_value ?? 0))} para liberar os codigos.`
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel criar pedido.'
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="checkout-page">
    <header class="checkout-hero">
      <div>
        <span>Compra de codigos</span>
        <h1>Checkout de recargas</h1>
        <p>Escolha os servidores disponiveis, selecione o banco ativo e gere o pedido. O estoque real fica oculto para o revendedor.</p>
      </div>
      <button class="cx-btn" type="button" :disabled="loading" @click="load">
        <RefreshCw :size="17" />
        Atualizar
      </button>
    </header>

    <div v-if="notice" class="cx-toast ok">{{ notice }}</div>
    <div v-if="error" class="cx-toast error">{{ error }}</div>

    <section class="checkout-grid">
      <main class="cx-panel">
        <div class="section-head">
          <h2>Disponiveis para compra</h2>
          <small>{{ availableProducts.length }} opcoes</small>
        </div>
        <div v-if="loading" class="cx-empty">Carregando catalogo...</div>
        <div v-else-if="!catalog.length" class="cx-empty">Nenhum produto cadastrado.</div>
        <div v-else class="product-grid">
          <article v-for="product in catalog" :key="product.id" class="product-card" :class="{ off: !product.availableForSale }">
            <div>
              <strong>{{ productTitle(product) }}</strong>
              <p>{{ product.description || product.instructions || 'Codigo de recarga pronto para entrega apos pagamento aprovado.' }}</p>
            </div>
            <div class="product-foot">
              <span :class="{ ok: product.availableForSale }">{{ product.availableForSale ? 'Disponivel' : 'Indisponivel' }}</span>
              <b>{{ formatCurrency(priceOf(product)) }}</b>
            </div>
            <button class="cx-btn primary" type="button" :disabled="!product.availableForSale" @click="add(product)">
              <Plus :size="16" />
              Adicionar
            </button>
          </article>
        </div>
      </main>

      <aside class="cx-panel cart-panel">
        <div class="section-head">
          <h2>Carrinho</h2>
          <ShoppingCart :size="21" />
        </div>
        <div v-if="!cart.length" class="cx-empty">Selecione ao menos um codigo.</div>
        <div v-else class="cart-list">
          <article v-for="item in cart" :key="item.product.id" class="cart-row">
            <div>
              <strong>{{ productTitle(item.product) }}</strong>
              <small>{{ formatCurrency(priceOf(item.product)) }} por unidade</small>
            </div>
            <input v-model.number="item.quantity" class="cx-input qty" type="number" min="1" max="100" />
            <button class="icon-btn" type="button" @click="remove(item.product.id)">
              <Trash2 :size="16" />
            </button>
          </article>

          <div class="payment-methods">
            <div class="section-head compact">
              <h3>Forma de pagamento</h3>
              <small>{{ paymentOptions.length }} ativa(s)</small>
            </div>
            <div v-if="!paymentOptions.length" class="cx-empty">O admin ainda nao ativou nenhum banco para venda.</div>
            <button
              v-for="option in paymentOptions"
              :key="option.id"
              class="payment-option"
              :class="{ selected: selectedPayment?.provider === option.provider }"
              type="button"
              @click="selectedProvider = option.provider"
            >
              <span>
                <strong>{{ option.name }}</strong>
                <small>{{ option.paymentMode === 'manual' ? 'Conferencia manual' : 'Checkout/QR Code' }}</small>
              </span>
              <b>{{ option.feeSummary || 'Taxa conforme contrato' }}</b>
            </button>
          </div>

          <div v-if="selectedPayment" class="payment-help">
            <strong>Como pagar por {{ selectedPayment.name }}</strong>
            <p>{{ selectedPayment.instructions }}</p>
            <small>{{ selectedPayment.contractNotes }}</small>
          </div>

          <label v-if="requiresTaxNumber" class="tax-field">
            CPF/CNPJ para gerar este checkout
            <input v-model="payerTaxNumber" class="cx-input" inputmode="numeric" placeholder="Somente numeros" />
          </label>

          <div class="total-box">
            <span>Total</span>
            <strong>{{ formatCurrency(total) }}</strong>
          </div>
          <button class="cx-btn primary full" type="button" :disabled="creating || !selectedPayment" @click="createOrder">
            {{ creating ? 'Criando pedido...' : 'Criar pedido e reservar codigos' }}
          </button>
          <p class="hint">Os codigos ficam reservados temporariamente e so aparecem apos pagamento aprovado.</p>
        </div>
      </aside>
    </section>

    <section class="cx-panel">
      <div class="section-head">
        <h2>Meus pedidos</h2>
        <small>{{ orders.length }} registros</small>
      </div>
      <div v-if="!orders.length" class="cx-empty">Nenhum pedido criado ainda.</div>
      <article v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-head">
          <div>
            <strong>Pedido {{ order.id.slice(-6) }}</strong>
            <small>{{ order.status }} · {{ formatCurrency(Number(order.totalValue ?? order.total_value ?? 0)) }}</small>
          </div>
          <span>{{ paymentLabel(order.payment?.provider) }} · {{ order.payment?.status || 'sem pagamento' }}</span>
        </div>
        <div class="order-items">
          <div v-for="item in order.items" :key="item.id" class="order-item">
            <span>{{ productTitle(item.product) }}</span>
            <b>{{ item.quantity }}x</b>
          </div>
        </div>
        <div v-if="codeLines(order).length" class="delivered-box">
          <pre>{{ codeLines(order).join('\n') }}</pre>
          <div class="order-actions">
            <button class="cx-btn" type="button" @click="copyCodes(order)"><Copy :size="16" /> Copiar</button>
            <button class="cx-btn" type="button" @click="downloadCodes(order)"><Download :size="16" /> TXT</button>
          </div>
        </div>
        <p v-else class="hint">Codigos ocultos ate o pagamento ser aprovado.</p>
        <div v-if="order.payment?.paymentCode" class="payment-box">
          <strong>Pagamento</strong>
          <span>{{ order.payment.instructions }}</span>
          <code>{{ order.payment.paymentCode }}</code>
          <a v-if="order.payment.proofUrl || order.payment.proof_url" :href="order.payment.proofUrl || order.payment.proof_url || '#'" target="_blank" rel="noreferrer">
            Abrir checkout de pagamento
            <ExternalLink :size="15" />
          </a>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.checkout-page {
  --cx-surface: rgba(255, 255, 255, .95);
  --cx-raised: rgba(255, 255, 255, .98);
  --cx-sunken: rgba(244, 247, 246, .92);
  --cx-border: rgba(17, 24, 39, .1);
  --cx-text: #15191b;
  --cx-muted: #6b747b;
  --cx-accent: #ff4b12;
  --cx-good: #178a52;
  --cx-danger: #ad2b25;
  --cx-shadow: 14px 18px 36px rgba(18, 28, 36, .12), -8px -8px 22px rgba(255, 255, 255, .9);
  color: var(--cx-text);
  display: grid;
  gap: 18px;
}

:global(html[data-theme="dark"]) .checkout-page,
:global(body.dark) .checkout-page {
  --cx-surface: rgba(8, 9, 9, .94);
  --cx-raised: rgba(14, 15, 15, .96);
  --cx-sunken: rgba(4, 5, 5, .72);
  --cx-border: rgba(255, 255, 255, .08);
  --cx-text: var(--gj2-text, #fff8f2);
  --cx-muted: var(--gj2-muted, #9aa2a7);
  --cx-good: #91d2a4;
  --cx-danger: #ff8b7c;
  --cx-shadow: 10px 14px 30px rgba(0, 0, 0, .42), -5px -5px 16px rgba(255, 255, 255, .018);
}

.checkout-hero,
.cx-panel,
.cx-toast {
  background: var(--cx-surface);
  border: 1px solid var(--cx-border);
  box-shadow: var(--cx-shadow);
}

.checkout-hero {
  padding: 20px;
  border-radius: 26px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
}

.checkout-hero span {
  color: var(--cx-accent);
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.checkout-hero h1,
.section-head h2,
.section-head h3 {
  margin: 0;
}

.checkout-hero p,
.product-card p,
.hint,
.section-head small,
.cart-row small,
.order-head small,
.payment-help p,
.payment-help small {
  color: var(--cx-muted);
  margin: 6px 0 0;
  line-height: 1.45;
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 14px;
  align-items: start;
}

.cx-panel {
  padding: 16px;
  border-radius: 24px;
  display: grid;
  gap: 14px;
}

.section-head,
.product-foot,
.order-head,
.order-item,
.total-box {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.section-head.compact h3 {
  font-size: 15px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.product-card,
.cart-row,
.order-card,
.payment-box,
.payment-help,
.total-box {
  padding: 14px;
  border-radius: 18px;
  background: var(--cx-sunken);
  border: 1px solid var(--cx-border);
  display: grid;
  gap: 10px;
}

.product-card.off {
  opacity: .58;
}

.product-foot span {
  color: var(--cx-danger);
  font-weight: 900;
}

.product-foot span.ok {
  color: var(--cx-good);
}

.cx-btn,
.icon-btn,
.payment-option {
  min-height: 42px;
  border: 0;
  border-radius: 14px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: var(--cx-text);
  background: var(--cx-raised);
  font-weight: 900;
  cursor: pointer;
}

.cx-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--cx-accent), #9f1b08);
}

.cx-btn.full {
  width: 100%;
}

.cx-btn:disabled,
.icon-btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.cart-list,
.payment-methods,
.order-items {
  display: grid;
  gap: 10px;
}

.cart-row {
  grid-template-columns: minmax(0, 1fr) 78px 42px;
  align-items: center;
}

.cx-input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--cx-border);
  border-radius: 14px;
  padding: 0 12px;
  background: var(--cx-raised);
  color: var(--cx-text);
  outline: none;
  font: inherit;
}

.payment-option {
  width: 100%;
  justify-content: space-between;
  text-align: left;
  padding: 12px 14px;
  background: var(--cx-raised);
  border: 1px solid var(--cx-border);
}

.payment-option.selected {
  border-color: rgba(255, 75, 18, .56);
  box-shadow: inset 0 0 0 1px rgba(255, 75, 18, .18);
}

.payment-option span {
  display: grid;
  gap: 2px;
}

.payment-option small,
.payment-option b {
  color: var(--cx-muted);
  font-size: 12px;
}

.tax-field {
  display: grid;
  gap: 7px;
  color: var(--cx-muted);
  font-size: 13px;
  font-weight: 850;
}

.cx-toast {
  border-radius: 18px;
  padding: 12px 14px;
  font-weight: 850;
}

.cx-toast.ok {
  color: var(--cx-good);
}

.cx-toast.error {
  color: var(--cx-danger);
}

.cx-empty {
  padding: 18px;
  border-radius: 18px;
  background: var(--cx-sunken);
  color: var(--cx-muted);
  text-align: center;
}

.payment-box code,
.delivered-box pre {
  white-space: pre-wrap;
  word-break: break-word;
  border-radius: 14px;
  padding: 12px;
  margin: 0;
  background: var(--cx-raised);
  color: var(--cx-text);
}

.payment-box a {
  color: var(--cx-accent);
  font-weight: 900;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.order-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 980px) {
  .checkout-grid,
  .product-grid {
    grid-template-columns: 1fr;
  }

  .checkout-hero {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
