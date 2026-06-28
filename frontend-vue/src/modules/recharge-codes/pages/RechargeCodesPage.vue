<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Archive,
  Ban,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileSpreadsheet,
  History,
  Layers3,
  PackageCheck,
  Pencil,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  TicketCheck,
  Upload,
  X,
} from '@lucide/vue'

import { rechargeCodesService } from '@/services/api/rechargeCodes.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  RechargeCode,
  RechargeCodeBatch,
  RechargeCodeImportMapping,
  RechargeCodeImportPreview,
  RechargeCodeProduct,
  RechargeCodeSale,
  RechargeCodeStatus,
} from '@/types/domain'
import { formatCurrency } from '@/utils/format'

// ─── role helpers ───────────────────────────────────────────────────────────
const auth = useAuthStore()
const isStaff = computed(() => auth.isAdmin)
const isReseller = computed(() => auth.user?.role === 'reseller')

// ─── tabs ────────────────────────────────────────────────────────────────────
type AdminTab = 'stock' | 'checkout' | 'sales'
type ResellerTab = 'buy' | 'history'

const adminTab = ref<AdminTab>('stock')
const resellerTab = ref<ResellerTab>('buy')

// ─── shared state ────────────────────────────────────────────────────────────
const products = ref<RechargeCodeProduct[]>([])
const loading = ref(true)
const notice = ref('')
const error = ref('')

// ─── admin state ─────────────────────────────────────────────────────────────
const codes = ref<RechargeCode[]>([])
const batches = ref<RechargeCodeBatch[]>([])
const sales = ref<RechargeCode[]>([])
const loadingCodes = ref(false)
const loadingBatches = ref(false)
const loadingSales = ref(false)
const saving = ref(false)
const updating = ref(false)
const importingId = ref('')
const voidingId = ref('')
const selectedStockProductId = ref('')
const codeStatus = ref<RechargeCodeStatus | ''>('available')
const codeSearch = ref('')
const salesSearch = ref('')
const salesProductId = ref('')
const importNotes = ref('')
const importFileRef = ref<File | null>(null)
const importProductId = ref('')
const importPreview = ref<RechargeCodeImportPreview | null>(null)
const importMapping = reactive<RechargeCodeImportMapping>({
  codeColumn: '',
  pinColumn: '',
  serialColumn: '',
  expiresAtColumn: '',
  sheetName: '',
})
const editingProductId = ref('')
const form = reactive({ name: '', description: '', denomination: 1, costValue: 0, saleValue: 0, instructions: '', active: true })
const editForm = reactive({ name: '', description: '', denomination: 1, costValue: 0, saleValue: 0, instructions: '', active: true })

// ─── checkout state (shared between admin and reseller) ─────────────────────
const selling = ref(false)
const lastSale = ref<RechargeCodeSale | null>(null)
const selectedCheckoutProductId = ref('')
const checkoutQuantity = ref(1)
const checkoutCustomer = ref('')
const checkoutContact = ref('')

// ─── reseller purchase history ───────────────────────────────────────────────
const myPurchases = ref<RechargeCode[]>([])
const loadingPurchases = ref(false)
const purchaseSearch = ref('')
const purchaseProductFilter = ref('')

// ─── computed ────────────────────────────────────────────────────────────────
const totalAvailable = computed(() => products.value.reduce((s, p) => s + Number(p.stock?.available || 0), 0))
const totalSold = computed(() => products.value.reduce((s, p) => s + Number(p.stock?.sold || 0), 0))
const lowStockProducts = computed(() => products.value.filter((p) => Number(p.stock?.available || 0) <= 5))
const selectedStockProduct = computed(() => products.value.find((p) => p.id === selectedStockProductId.value) || products.value[0])
const selectedCheckoutProduct = computed(() => products.value.find((p) => p.id === selectedCheckoutProductId.value) || products.value[0])
const checkoutAvailable = computed(() => Number(selectedCheckoutProduct.value?.stock?.available || 0))
const checkoutPrice = computed(() => Number(selectedCheckoutProduct.value?.sale_value || selectedCheckoutProduct.value?.saleValue || 0))
const checkoutSubtotal = computed(() => checkoutPrice.value * checkoutQuantity.value)
const canCheckout = computed(() => Boolean(selectedCheckoutProduct.value) && checkoutQuantity.value >= 1 && checkoutQuantity.value <= checkoutAvailable.value)

const filteredCodes = computed(() => {
  const term = codeSearch.value.trim().toLowerCase()
  if (!term) return codes.value
  return codes.value.filter((c) =>
    [c.code, c.pin, c.serial, c.soldTo?.name, c.soldTo?.email].some((v) => String(v || '').toLowerCase().includes(term)),
  )
})

const filteredSales = computed(() => {
  const term = salesSearch.value.trim().toLowerCase()
  return sales.value.filter((s) => {
    const matchProd = !salesProductId.value || s.productId === salesProductId.value || s.product?.id === salesProductId.value
    const matchTerm = !term || [s.code, s.product?.name, s.soldTo?.name, s.soldTo?.email].some((v) => String(v || '').toLowerCase().includes(term))
    return matchProd && matchTerm
  })
})
const salesRevenue = computed(() => filteredSales.value.reduce((s, sale) => s + Number(sale.product?.sale_value || sale.product?.saleValue || 0), 0))
const todaySales = computed(() => filteredSales.value.filter((s) => isToday(s.soldAt || s.sold_at)).length)

const filteredPurchases = computed(() => {
  const term = purchaseSearch.value.trim().toLowerCase()
  return myPurchases.value.filter((p) => {
    const matchProd = !purchaseProductFilter.value || p.productId === purchaseProductFilter.value || p.product?.id === purchaseProductFilter.value
    const matchTerm = !term || [p.code, p.pin, p.serial, p.product?.name].some((v) => String(v || '').toLowerCase().includes(term))
    return matchProd && matchTerm
  })
})
const purchasesToday = computed(() => myPurchases.value.filter((p) => isToday(p.soldAt || p.sold_at)).length)
const purchasesTotal = computed(() => myPurchases.value.reduce((s, p) => s + Number(p.product?.saleValue || p.product?.sale_value || 0), 0))

// ─── helpers ─────────────────────────────────────────────────────────────────
function money(v: unknown) { return formatCurrency(Number(v || 0)) }

function dateText(v?: string | null) {
  if (!v) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v))
}

function isToday(v?: string | null) {
  if (!v) return false
  const d = new Date(v), n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function productProgress(p: RechargeCodeProduct) {
  const total = Number(p.stock?.total || 0)
  return total ? Math.round((Number(p.stock?.available || 0) / total) * 100) : 0
}

function statusLabel(status?: RechargeCodeStatus) {
  const map: Record<RechargeCodeStatus, string> = { available: 'Disponivel', reserved: 'Reservado', sold: 'Vendido', voided: 'Inutilizado' }
  return status ? map[status] : 'Todos'
}

function saleLines(sale: RechargeCodeSale) {
  const customer = checkoutCustomer.value ? `Cliente: ${checkoutCustomer.value}\n` : ''
  const contact = checkoutContact.value ? `Contato: ${checkoutContact.value}\n` : ''
  const header = `${customer}${contact}Produto: ${sale.product.name}\nTotal: ${money(sale.totalValue)}\n\nCodigos:\n`
  return header + sale.codes.map((c, i) => {
    const parts = [`${i + 1}. ${c.code}`]
    if (c.pin) parts.push(`PIN: ${c.pin}`)
    if (c.serial) parts.push(`Serial: ${c.serial}`)
    return parts.join(' | ')
  }).join('\n')
}

async function copyText(payload: string, msg: string) {
  try {
    await navigator.clipboard?.writeText(payload)
    notice.value = msg
  } catch {
    error.value = 'Nao foi possivel copiar automaticamente.'
  }
}

// ─── load functions ──────────────────────────────────────────────────────────
async function loadProducts() {
  products.value = await rechargeCodesService.listProducts()
  if (!selectedStockProductId.value && products.value[0]) selectedStockProductId.value = products.value[0].id
  if (!selectedCheckoutProductId.value && products.value[0]) selectedCheckoutProductId.value = products.value[0].id
}

async function loadCodes() {
  if (!isStaff.value || !selectedStockProduct.value) return
  loadingCodes.value = true
  try { codes.value = await rechargeCodesService.listCodes(selectedStockProduct.value.id, codeStatus.value || undefined) }
  finally { loadingCodes.value = false }
}

async function loadBatches() {
  if (!isStaff.value || !selectedStockProduct.value) return
  loadingBatches.value = true
  try { batches.value = await rechargeCodesService.listBatches(selectedStockProduct.value.id) }
  finally { loadingBatches.value = false }
}

async function loadSales() {
  if (!isStaff.value) return
  loadingSales.value = true
  try { sales.value = await rechargeCodesService.listSales() }
  finally { loadingSales.value = false }
}

async function loadMyPurchases() {
  if (!isReseller.value && !isStaff.value) return
  loadingPurchases.value = true
  try { myPurchases.value = await rechargeCodesService.listMyPurchases() }
  finally { loadingPurchases.value = false }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await loadProducts()
    if (isStaff.value) {
      await Promise.all([loadCodes(), loadBatches(), loadSales()])
    } else {
      await loadMyPurchases()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar os dados.'
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await load()
  notice.value = 'Dados atualizados.'
}

// ─── admin product management ────────────────────────────────────────────────
async function saveProduct() {
  saving.value = true; notice.value = ''; error.value = ''
  try {
    await rechargeCodesService.createProduct({ name: form.name, description: form.description, denomination: Number(form.denomination), costValue: Number(form.costValue), saleValue: Number(form.saleValue), instructions: form.instructions, active: form.active })
    notice.value = 'Produto criado.'
    Object.assign(form, { name: '', description: '', denomination: 1, costValue: 0, saleValue: 0, instructions: '', active: true })
    await load()
  } catch (err) { error.value = err instanceof Error ? err.message : 'Nao foi possivel salvar.' }
  finally { saving.value = false }
}

function startEdit(p: RechargeCodeProduct) {
  editingProductId.value = p.id
  Object.assign(editForm, { name: p.name, description: p.description || '', denomination: Number(p.denomination || 1), costValue: Number(p.cost_value || p.costValue || 0), saleValue: Number(p.sale_value || p.saleValue || 0), instructions: p.instructions || '', active: p.active !== false })
}

async function updateProduct() {
  if (!editingProductId.value) return
  updating.value = true; notice.value = ''; error.value = ''
  try {
    await rechargeCodesService.updateProduct(editingProductId.value, { name: editForm.name, description: editForm.description, denomination: Number(editForm.denomination), costValue: Number(editForm.costValue), saleValue: Number(editForm.saleValue), instructions: editForm.instructions, active: editForm.active })
    notice.value = 'Produto atualizado.'
    editingProductId.value = ''
    await load()
  } catch (err) { error.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar.' }
  finally { updating.value = false }
}

// ─── import ──────────────────────────────────────────────────────────────────
function applyPreviewMapping(preview: RechargeCodeImportPreview) {
  importMapping.codeColumn = preview.mapping.codeColumn || ''
  importMapping.pinColumn = preview.mapping.pinColumn || ''
  importMapping.serialColumn = preview.mapping.serialColumn || ''
  importMapping.expiresAtColumn = preview.mapping.expiresAtColumn || ''
  importMapping.sheetName = preview.selectedSheetName || preview.mapping.sheetName || ''
}

function clearImportPreview() {
  importFileRef.value = null; importProductId.value = ''; importPreview.value = null
  Object.assign(importMapping, { codeColumn: '', pinColumn: '', serialColumn: '', expiresAtColumn: '', sheetName: '' })
}

async function previewImportFile(event: Event, productId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importingId.value = productId; notice.value = ''; error.value = ''
  try {
    importFileRef.value = file; importProductId.value = productId
    const preview = await rechargeCodesService.previewImport(productId, file)
    importPreview.value = preview; applyPreviewMapping(preview)
    selectedStockProductId.value = productId
    notice.value = `Previa pronta: ${preview.importableCount} codigos aptos para importar.`
  } catch (err) {
    clearImportPreview()
    error.value = err instanceof Error ? err.message : 'Nao foi possivel analisar a planilha.'
  } finally { importingId.value = ''; input.value = '' }
}

async function refreshImportPreview() {
  if (!importProductId.value || !importFileRef.value) return
  importingId.value = importProductId.value; notice.value = ''; error.value = ''
  try {
    const preview = await rechargeCodesService.previewImport(importProductId.value, importFileRef.value, importMapping)
    importPreview.value = preview; applyPreviewMapping(preview)
    notice.value = `Mapeamento atualizado: ${preview.importableCount} codigos aptos.`
  } catch (err) { error.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar a previa.' }
  finally { importingId.value = '' }
}

async function confirmImport() {
  if (!importProductId.value || !importFileRef.value || !importPreview.value) return
  importingId.value = importProductId.value; notice.value = ''; error.value = ''
  try {
    const result = await rechargeCodesService.importXlsx(importProductId.value, importFileRef.value, importNotes.value, importMapping)
    notice.value = `Importado: ${result.importedCount} novos, ${result.duplicateCount} duplicados, ${result.invalidCount} invalidos.`
    importNotes.value = ''; clearImportPreview(); await load()
  } catch (err) { error.value = err instanceof Error ? err.message : 'Nao foi possivel confirmar a importacao.' }
  finally { importingId.value = '' }
}

// ─── checkout (shared) ───────────────────────────────────────────────────────
async function sellCheckout() {
  if (!selectedCheckoutProduct.value) return
  if (!canCheckout.value) {
    error.value = `Estoque insuficiente. Disponivel: ${checkoutAvailable.value}. Solicitado: ${checkoutQuantity.value}.`
    notice.value = ''; return
  }
  selling.value = true; notice.value = ''; error.value = ''; lastSale.value = null
  try {
    lastSale.value = await rechargeCodesService.sellLocal(selectedCheckoutProduct.value.id, checkoutQuantity.value)
    notice.value = `Compra concluida: ${lastSale.value.quantity} codigo${lastSale.value.quantity > 1 ? 's' : ''} entregue${lastSale.value.quantity > 1 ? 's' : ''}.`
    checkoutQuantity.value = 1
    await load()
    if (isReseller.value) resellerTab.value = 'buy'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel concluir a compra.'
  } finally { selling.value = false }
}

async function voidCode(code: RechargeCode) {
  if (!window.confirm(`Inutilizar o codigo ${code.code}?`)) return
  voidingId.value = code.id; notice.value = ''; error.value = ''
  try {
    await rechargeCodesService.voidCode(code.id, 'Inutilizado pela tela de estoque')
    notice.value = 'Codigo inutilizado.'
    await load()
  } catch (err) { error.value = err instanceof Error ? err.message : 'Nao foi possivel inutilizar.' }
  finally { voidingId.value = '' }
}

watch([selectedStockProductId, codeStatus], () => { void Promise.all([loadCodes(), loadBatches()]) })
watch(resellerTab, (tab) => { if (tab === 'history') void loadMyPurchases() })
watch(adminTab, (tab) => { if (tab === 'sales') void loadSales() })

onMounted(load)
</script>

<template>
  <div class="rc-page">
    <!-- ── Hero ── -->
    <header class="rc-hero">
      <div>
        <h1>{{ isStaff ? 'Codigos de Recarga' : 'Loja de Codigos' }}</h1>
        <p>{{ isStaff ? 'Gerenciamento completo de estoque, vendas e historico.' : 'Compre codigos de recarga e acompanhe suas compras.' }}</p>
      </div>
      <div class="rc-hero-actions">
        <button class="rc-chip" type="button" :disabled="loading" @click="refreshAll">
          <RefreshCw :size="15" />
          Atualizar
        </button>
        <span class="rc-pill">{{ totalAvailable }} disponíveis</span>
        <span v-if="isStaff" class="rc-pill">{{ totalSold }} vendidos</span>
      </div>
    </header>

    <!-- ── Alerts ── -->
    <div v-if="notice" class="rc-banner rc-banner--ok">{{ notice }}</div>
    <div v-if="error" class="rc-banner rc-banner--err">{{ error }}</div>

    <!-- ══════════════════════════════════════════════════════════════
         ADMIN / DEV VIEW
         ══════════════════════════════════════════════════════════════ -->
    <template v-if="isStaff">
      <!-- stats row -->
      <section class="rc-stats">
        <article class="rc-stat">
          <span>Estoque livre</span>
          <strong>{{ totalAvailable }}</strong>
          <small>codigos disponiveis</small>
        </article>
        <article class="rc-stat">
          <span>Vendas</span>
          <strong>{{ totalSold }}</strong>
          <small>{{ todaySales }} hoje</small>
        </article>
        <article class="rc-stat">
          <span>Alertas</span>
          <strong>{{ lowStockProducts.length }}</strong>
          <small>produtos com estoque baixo</small>
        </article>
        <article class="rc-stat">
          <span>Receita (filtro)</span>
          <strong>{{ money(salesRevenue) }}</strong>
          <small>{{ filteredSales.length }} vendas</small>
        </article>
      </section>

      <!-- admin tabs -->
      <nav class="rc-tabs">
        <button :class="{ active: adminTab === 'stock' }" type="button" @click="adminTab = 'stock'">
          <Archive :size="17" /> Estoque
        </button>
        <button :class="{ active: adminTab === 'checkout' }" type="button" @click="adminTab = 'checkout'">
          <ShoppingCart :size="17" /> Checkout
        </button>
        <button :class="{ active: adminTab === 'sales' }" type="button" @click="adminTab = 'sales'">
          <ReceiptText :size="17" /> Vendas
        </button>
      </nav>

      <!-- ── STOCK TAB ── -->
      <section v-if="adminTab === 'stock'" class="rc-panel">
        <!-- new product form -->
        <article class="rc-card">
          <div class="rc-card-head">
            <PackageCheck :size="20" />
            <div>
              <h2>Cadastrar produto</h2>
              <p>Crie o produto que vai receber lotes de codigos importados.</p>
            </div>
            <button class="rc-chip rc-chip--sm" type="button" @click="copyText('code,pin,serial,expires_at', 'Modelo copiado.')">
              <FileSpreadsheet :size="14" /> Modelo XLSX
            </button>
          </div>
          <form class="rc-form" @submit.prevent="saveProduct">
            <label class="rc-label">Nome<input v-model="form.name" class="rc-input" required placeholder="Ex: Recarga IPTV 30 dias" /></label>
            <label class="rc-label">Creditos/dias<input v-model.number="form.denomination" class="rc-input" min="1" type="number" /></label>
            <label class="rc-label">Custo<input v-model.number="form.costValue" class="rc-input" min="0" step="0.01" type="number" /></label>
            <label class="rc-label">Preco de venda<input v-model.number="form.saleValue" class="rc-input" min="0" step="0.01" type="number" /></label>
            <label class="rc-label span2">Descricao<input v-model="form.description" class="rc-input" placeholder="Resumo rapido para a equipe" /></label>
            <label class="rc-label span2">Instrucoes<textarea v-model="form.instructions" class="rc-input rc-textarea" placeholder="Como entregar o codigo apos venda" /></label>
            <div class="rc-form-actions">
              <button class="rc-chip rc-chip--primary" type="submit" :disabled="saving">{{ saving ? 'Salvando...' : 'Criar produto' }}</button>
            </div>
          </form>
        </article>

        <!-- edit product panel -->
        <article v-if="editingProductId" class="rc-card rc-card--edit">
          <div class="rc-card-head">
            <Pencil :size="20" />
            <div><h2>Editar produto</h2><p>Ajuste preco, nome e instrucoes sem afetar codigos vendidos.</p></div>
          </div>
          <form class="rc-form" @submit.prevent="updateProduct">
            <label class="rc-label">Nome<input v-model="editForm.name" class="rc-input" required /></label>
            <label class="rc-label">Creditos/dias<input v-model.number="editForm.denomination" class="rc-input" min="1" type="number" /></label>
            <label class="rc-label">Custo<input v-model.number="editForm.costValue" class="rc-input" min="0" step="0.01" type="number" /></label>
            <label class="rc-label">Preco de venda<input v-model.number="editForm.saleValue" class="rc-input" min="0" step="0.01" type="number" /></label>
            <label class="rc-label span2">Descricao<input v-model="editForm.description" class="rc-input" /></label>
            <label class="rc-label span2">Instrucoes<textarea v-model="editForm.instructions" class="rc-input rc-textarea" /></label>
            <label class="rc-toggle span2"><input v-model="editForm.active" type="checkbox" /> Produto ativo para venda</label>
            <div class="rc-form-actions">
              <button class="rc-chip rc-chip--primary" type="submit" :disabled="updating"><Save :size="15" /> Salvar</button>
              <button class="rc-chip" type="button" @click="editingProductId = ''"><X :size="15" /> Cancelar</button>
            </div>
          </form>
        </article>

        <!-- products + import -->
        <div class="rc-stock-grid">
          <article class="rc-card">
            <div class="rc-card-head">
              <Layers3 :size="20" />
              <div><h2>Produtos e importacao</h2><p>Selecione o produto, suba o lote e veja o saldo.</p></div>
            </div>
            <label class="rc-label" style="margin-bottom: 14px">
              Observacao do lote
              <input v-model="importNotes" class="rc-input" placeholder="Ex: lote fornecedor junho" />
            </label>
            <div class="rc-product-list">
              <article v-for="p in products" :key="p.id" class="rc-product" :class="{ selected: selectedStockProduct?.id === p.id }">
                <button type="button" class="rc-product-main" @click="selectedStockProductId = p.id">
                  <span class="rc-icon"><TicketCheck :size="18" /></span>
                  <span>
                    <strong>{{ p.name }}</strong>
                    <small>{{ p.stock?.available || 0 }} / {{ p.stock?.total || 0 }} disp. · {{ money(p.sale_value || p.saleValue) }}</small>
                  </span>
                </button>
                <div class="rc-meter"><span :style="{ width: `${productProgress(p)}%` }" /></div>
                <div class="rc-product-actions">
                  <button class="rc-icon-btn" type="button" title="Editar produto" @click="startEdit(p)">
                    <Pencil :size="14" />
                  </button>
                  <label class="rc-chip rc-chip--sm rc-chip--upload">
                    <Upload :size="14" />
                    {{ importingId === p.id ? 'Analisando...' : 'Importar XLSX' }}
                    <input accept=".xlsx" type="file" :disabled="importingId === p.id" @change="previewImportFile($event, p.id)" />
                  </label>
                </div>
              </article>
            </div>
          </article>

          <!-- import preview -->
          <article v-if="importPreview" class="rc-card rc-card--import">
            <div class="rc-card-head">
              <FileSpreadsheet :size="20" />
              <div><h2>Previa e mapeamento</h2><p>{{ importPreview.fileName }} · {{ importPreview.totalRows }} linhas</p></div>
            </div>
            <div class="rc-import-scores">
              <span><strong>{{ importPreview.importableCount }}</strong><small>aptos</small></span>
              <span><strong>{{ importPreview.duplicateInSystemCount }}</strong><small>ja existem</small></span>
              <span><strong>{{ importPreview.duplicateInFileCount }}</strong><small>dup. arquivo</small></span>
              <span><strong>{{ importPreview.invalidCount }}</strong><small>invalidos</small></span>
            </div>
            <div class="rc-mapping">
              <label class="rc-label">Aba
                <select v-model="importMapping.sheetName" class="rc-input">
                  <option v-for="s in importPreview.sheetNames" :key="s" :value="s">{{ s }}</option>
                </select>
              </label>
              <label class="rc-label">Coluna codigo
                <select v-model="importMapping.codeColumn" class="rc-input">
                  <option value="">Selecionar</option>
                  <option v-for="h in importPreview.headers" :key="h" :value="h">{{ h }}</option>
                </select>
              </label>
              <label class="rc-label">Coluna PIN
                <select v-model="importMapping.pinColumn" class="rc-input">
                  <option value="">Nao importar</option>
                  <option v-for="h in importPreview.headers" :key="h" :value="h">{{ h }}</option>
                </select>
              </label>
              <label class="rc-label">Coluna serial
                <select v-model="importMapping.serialColumn" class="rc-input">
                  <option value="">Nao importar</option>
                  <option v-for="h in importPreview.headers" :key="h" :value="h">{{ h }}</option>
                </select>
              </label>
              <label class="rc-label">Coluna validade
                <select v-model="importMapping.expiresAtColumn" class="rc-input">
                  <option value="">Nao importar</option>
                  <option v-for="h in importPreview.headers" :key="h" :value="h">{{ h }}</option>
                </select>
              </label>
            </div>
            <div class="rc-preview-table">
              <article v-for="row in importPreview.sampleRows" :key="row.rowNumber" class="rc-preview-row" :class="{ invalid: !row.valid || row.duplicateInSystem }">
                <span>#{{ row.rowNumber }}</span>
                <strong>{{ row.code || 'sem codigo' }}</strong>
                <small>{{ row.pin || '-' }}</small>
                <em>{{ row.duplicateInSystem ? 'ja existe' : row.valid ? 'ok' : 'invalido' }}</em>
              </article>
            </div>
            <div class="rc-row-actions">
              <button class="rc-chip rc-chip--sm" type="button" :disabled="!!importingId" @click="refreshImportPreview"><RefreshCw :size="14" /> Reanalisar</button>
              <button class="rc-chip rc-chip--primary" type="button" :disabled="!importMapping.codeColumn || !!importingId || !importPreview.importableCount" @click="confirmImport"><Upload :size="14" /> Confirmar importacao</button>
              <button class="rc-chip rc-chip--sm" type="button" @click="clearImportPreview"><X :size="14" /> Cancelar</button>
            </div>
          </article>

          <!-- code list -->
          <article class="rc-card">
            <div class="rc-card-head">
              <ClipboardList :size="20" />
              <div><h2>Gestao de codigos</h2><p>Consulte, busque e inutilize codigos com problema.</p></div>
            </div>
            <div class="rc-toolbar">
              <select v-model="selectedStockProductId" class="rc-input">
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <select v-model="codeStatus" class="rc-input">
                <option value="">Todos</option>
                <option value="available">Disponiveis</option>
                <option value="sold">Vendidos</option>
                <option value="voided">Inutilizados</option>
              </select>
              <label class="rc-search">
                <Search :size="15" />
                <input v-model="codeSearch" placeholder="Buscar codigo, PIN ou cliente" />
              </label>
            </div>
            <div v-if="loadingCodes" class="rc-empty">Carregando codigos...</div>
            <div v-else-if="!filteredCodes.length" class="rc-empty">Nenhum codigo para este filtro.</div>
            <div v-else class="rc-code-list">
              <article v-for="c in filteredCodes" :key="c.id" class="rc-code-row">
                <div>
                  <strong>{{ c.code }}</strong>
                  <small>{{ statusLabel(c.status) }}<span v-if="c.pin"> · PIN {{ c.pin }}</span><span v-if="c.serial"> · {{ c.serial }}</span></small>
                </div>
                <div class="rc-row-actions">
                  <button class="rc-icon-btn" type="button" @click="copyText(c.code, 'Codigo copiado.')"><Copy :size="13" /></button>
                  <button v-if="c.status === 'available'" class="rc-icon-btn danger" type="button" :disabled="voidingId === c.id" @click="voidCode(c)"><Ban :size="13" /></button>
                </div>
              </article>
            </div>
          </article>

          <!-- batches -->
          <article class="rc-card">
            <div class="rc-card-head">
              <FileSpreadsheet :size="20" />
              <div><h2>Lotes importados</h2><p>Auditoria de origem e resultados por lote.</p></div>
            </div>
            <div v-if="loadingBatches" class="rc-empty">Carregando lotes...</div>
            <div v-else-if="!batches.length" class="rc-empty">Nenhum lote importado para este produto.</div>
            <div v-else class="rc-batch-list">
              <article v-for="b in batches" :key="b.id" class="rc-batch-row">
                <div>
                  <strong>{{ b.sourceFilename || b.source_filename || 'Planilha XLSX' }}</strong>
                  <small>{{ dateText(b.createdAt || b.created_date) }}<span v-if="b.notes"> · {{ b.notes }}</span></small>
                </div>
                <div class="rc-batch-nums">
                  <span>{{ b.importedCount ?? b.imported_count }} novos</span>
                  <span>{{ b.duplicateCount ?? b.duplicate_count }} dup.</span>
                  <span>{{ b.invalidCount ?? b.invalid_count }} inv.</span>
                </div>
              </article>
            </div>
          </article>
        </div>
      </section>

      <!-- ── CHECKOUT TAB (admin) ── -->
      <section v-else-if="adminTab === 'checkout'" class="rc-checkout-layout">
        <article class="rc-card rc-card--checkout">
          <div class="rc-card-head">
            <ShoppingCart :size="20" />
            <div><h2>Checkout</h2><p>Venda local com validacao de estoque e entrega dos codigos.</p></div>
          </div>
          <div class="rc-checkout-form">
            <label class="rc-label">Produto
              <select v-model="selectedCheckoutProductId" class="rc-input">
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </label>
            <label class="rc-label">Quantidade
              <input v-model.number="checkoutQuantity" class="rc-input" min="1" :max="checkoutAvailable || 1" type="number" />
            </label>
            <label class="rc-label">Cliente
              <input v-model="checkoutCustomer" class="rc-input" placeholder="Nome do cliente" />
            </label>
            <label class="rc-label">Contato
              <input v-model="checkoutContact" class="rc-input" placeholder="WhatsApp ou identificador" />
            </label>
          </div>
          <div v-if="selectedCheckoutProduct" class="rc-checkout-summary">
            <span><strong>{{ checkoutAvailable }}</strong><small>em estoque</small></span>
            <span><strong>{{ money(checkoutPrice) }}</strong><small>unitario</small></span>
            <span><strong>{{ money(checkoutSubtotal) }}</strong><small>subtotal</small></span>
          </div>
          <p v-if="!canCheckout && checkoutQuantity > 0" class="rc-warn">Estoque insuficiente para esta quantidade.</p>
          <button class="rc-chip rc-chip--primary rc-chip--full" type="button" :disabled="selling || !canCheckout" @click="sellCheckout">
            <ShoppingCart :size="16" />
            {{ selling ? 'Finalizando...' : 'Finalizar venda e entregar codigos' }}
          </button>
        </article>

        <article v-if="lastSale" class="rc-card rc-card--delivered">
          <div class="rc-delivered-head">
            <div>
              <h2>Entrega concluida</h2>
              <p>{{ lastSale.quantity }} codigo{{ lastSale.quantity > 1 ? 's' : '' }} de {{ lastSale.product.name }} · {{ money(lastSale.totalValue) }}</p>
            </div>
            <button class="rc-chip rc-chip--primary" type="button" @click="copyText(saleLines(lastSale!), 'Codigos copiados.')">
              <Copy :size="15" /> Copiar tudo
            </button>
          </div>
          <div class="rc-delivered-codes">
            <article v-for="c in lastSale.codes" :key="c.id" class="rc-delivered-code">
              <strong>{{ c.code }}</strong>
              <small v-if="c.pin">PIN: {{ c.pin }}</small>
              <small v-if="c.serial">Serial: {{ c.serial }}</small>
            </article>
          </div>
        </article>
      </section>

      <!-- ── SALES TAB ── -->
      <section v-else class="rc-panel">
        <article class="rc-card">
          <div class="rc-card-head">
            <BarChart3 :size="20" />
            <div><h2>Historico de vendas</h2><p>Todos os codigos entregues, por produto, usuario e horario.</p></div>
            <button class="rc-chip rc-chip--sm" type="button" :disabled="!filteredSales.length" @click="copyText(filteredSales.map((s) => `${dateText(s.soldAt || s.sold_at)} | ${s.product?.name || '-'} | ${s.code} | ${money(s.product?.sale_value || s.product?.saleValue)}`).join('\n'), 'Relatorio copiado.')">
              <Copy :size="14" /> Copiar relatorio
            </button>
          </div>
          <div class="rc-toolbar">
            <select v-model="salesProductId" class="rc-input">
              <option value="">Todos os produtos</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <label class="rc-search">
              <Search :size="15" />
              <input v-model="salesSearch" placeholder="Buscar codigo, produto ou usuario" />
            </label>
          </div>
          <div v-if="loadingSales" class="rc-empty">Carregando vendas...</div>
          <div v-else-if="!filteredSales.length" class="rc-empty">Nenhuma venda encontrada.</div>
          <div v-else class="rc-sales-list">
            <article v-for="s in filteredSales" :key="s.id" class="rc-sale-row">
              <div>
                <strong>{{ s.product?.name || 'Produto removido' }}</strong>
                <small>{{ dateText(s.soldAt || s.sold_at) }} · {{ s.soldTo?.name || s.soldTo?.email || 'venda local' }}</small>
              </div>
              <div class="rc-sale-right">
                <code>{{ s.code }}</code>
                <span>{{ money(s.product?.sale_value || s.product?.saleValue) }}</span>
              </div>
            </article>
          </div>
        </article>
      </section>
    </template>

    <!-- ══════════════════════════════════════════════════════════════
         RESELLER VIEW
         ══════════════════════════════════════════════════════════════ -->
    <template v-else>
      <!-- reseller stats -->
      <section class="rc-stats">
        <article class="rc-stat">
          <span>Compras hoje</span>
          <strong>{{ purchasesToday }}</strong>
          <small>codigos comprados</small>
        </article>
        <article class="rc-stat">
          <span>Total gasto</span>
          <strong>{{ money(purchasesTotal) }}</strong>
          <small>{{ myPurchases.length }} codigos</small>
        </article>
        <article class="rc-stat">
          <span>Produtos</span>
          <strong>{{ products.length }}</strong>
          <small>disponíveis para compra</small>
        </article>
      </section>

      <!-- reseller tabs -->
      <nav class="rc-tabs">
        <button :class="{ active: resellerTab === 'buy' }" type="button" @click="resellerTab = 'buy'">
          <ShoppingCart :size="17" /> Comprar
        </button>
        <button :class="{ active: resellerTab === 'history' }" type="button" @click="resellerTab = 'history'">
          <History :size="17" /> Meu Historico
        </button>
      </nav>

      <!-- ── BUY TAB ── -->
      <section v-if="resellerTab === 'buy'" class="rc-buy-layout">
        <!-- product cards -->
        <div class="rc-product-cards">
          <article
            v-for="p in products"
            :key="p.id"
            class="rc-product-card"
            :class="{ selected: selectedCheckoutProductId === p.id, unavailable: !p.stock?.available }"
            @click="selectedCheckoutProductId = p.id"
          >
            <span class="rc-icon"><TicketCheck :size="20" /></span>
            <div class="rc-product-card-info">
              <strong>{{ p.name }}</strong>
              <p v-if="p.description">{{ p.description }}</p>
              <div class="rc-product-card-meta">
                <span class="rc-price">{{ money(p.sale_value || p.saleValue) }}</span>
                <span :class="p.stock?.available ? 'rc-badge--ok' : 'rc-badge--empty'" class="rc-badge">
                  {{ p.stock?.available || 0 }} em estoque
                </span>
              </div>
            </div>
            <CheckCircle2 v-if="selectedCheckoutProductId === p.id" :size="20" class="rc-product-card-check" />
          </article>
        </div>

        <!-- checkout form -->
        <article class="rc-card rc-card--checkout sticky-checkout">
          <div class="rc-card-head">
            <ShoppingCart :size="20" />
            <div><h2>Finalizar compra</h2><p>Os codigos sao entregues imediatamente apos confirmar.</p></div>
          </div>

          <div v-if="selectedCheckoutProduct" class="rc-selected-product">
            <span class="rc-icon"><TicketCheck :size="18" /></span>
            <div>
              <strong>{{ selectedCheckoutProduct.name }}</strong>
              <small>{{ money(checkoutPrice) }} por unidade · {{ checkoutAvailable }} disponíveis</small>
            </div>
          </div>
          <div v-else class="rc-empty">Selecione um produto ao lado.</div>

          <label v-if="selectedCheckoutProduct" class="rc-label" style="margin-top: 16px">
            Quantidade
            <input v-model.number="checkoutQuantity" class="rc-input" min="1" :max="checkoutAvailable || 1" type="number" />
          </label>

          <div v-if="selectedCheckoutProduct && checkoutQuantity >= 1" class="rc-total-box">
            <span>Total</span>
            <strong>{{ money(checkoutSubtotal) }}</strong>
          </div>

          <p v-if="selectedCheckoutProduct && !canCheckout && checkoutQuantity > 0" class="rc-warn">Estoque insuficiente para esta quantidade.</p>

          <button v-if="selectedCheckoutProduct" class="rc-chip rc-chip--primary rc-chip--full" type="button" :disabled="selling || !canCheckout" @click="sellCheckout" style="margin-top: 16px">
            <ShoppingCart :size="16" />
            {{ selling ? 'Processando...' : `Comprar ${checkoutQuantity} codigo${checkoutQuantity !== 1 ? 's' : ''}` }}
          </button>

          <!-- delivered codes after purchase -->
          <div v-if="lastSale" class="rc-delivered-result">
            <div class="rc-delivered-head">
              <div>
                <h3>Codigos entregues</h3>
                <small>{{ lastSale.quantity }} codigo{{ lastSale.quantity > 1 ? 's' : '' }} · {{ money(lastSale.totalValue) }}</small>
              </div>
              <button class="rc-chip rc-chip--sm rc-chip--primary" type="button" @click="copyText(saleLines(lastSale!), 'Codigos copiados.')">
                <Copy :size="13" /> Copiar
              </button>
            </div>
            <div class="rc-delivered-codes rc-delivered-codes--compact">
              <article v-for="c in lastSale.codes" :key="c.id" class="rc-delivered-code">
                <strong>{{ c.code }}</strong>
                <small v-if="c.pin">PIN: {{ c.pin }}</small>
                <small v-if="c.serial">{{ c.serial }}</small>
              </article>
            </div>
          </div>
        </article>
      </section>

      <!-- ── HISTORY TAB ── -->
      <section v-else class="rc-panel">
        <article class="rc-card">
          <div class="rc-card-head">
            <History :size="20" />
            <div><h2>Meu historico de compras</h2><p>Todos os codigos que voce comprou, com data e produto.</p></div>
          </div>
          <div class="rc-toolbar">
            <select v-model="purchaseProductFilter" class="rc-input">
              <option value="">Todos os produtos</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <label class="rc-search">
              <Search :size="15" />
              <input v-model="purchaseSearch" placeholder="Buscar codigo, PIN ou produto" />
            </label>
          </div>
          <div v-if="loadingPurchases" class="rc-empty">Carregando historico...</div>
          <div v-else-if="!filteredPurchases.length" class="rc-empty">Nenhuma compra encontrada.</div>
          <div v-else class="rc-history-list">
            <article v-for="p in filteredPurchases" :key="p.id" class="rc-history-row">
              <span class="rc-history-icon"><TicketCheck :size="16" /></span>
              <div class="rc-history-main">
                <strong>{{ p.code }}</strong>
                <small>{{ p.product?.name || '-' }} · {{ dateText(p.soldAt || p.sold_at) }}</small>
                <small v-if="p.pin" class="rc-history-pin">PIN: {{ p.pin }}</small>
              </div>
              <div class="rc-history-right">
                <span>{{ money(p.product?.saleValue || p.product?.sale_value) }}</span>
                <button class="rc-icon-btn" type="button" title="Copiar codigo" @click="copyText(p.pin ? `${p.code} | PIN: ${p.pin}` : p.code, 'Codigo copiado.')">
                  <Copy :size="13" />
                </button>
              </div>
            </article>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* ── base ── */
.rc-page {
  --rc-bg: #020303;
  --rc-surface: rgba(6,7,7,.97);
  --rc-surface2: rgba(10,11,11,.96);
  --rc-sunken: rgba(3,4,4,.75);
  --rc-text: #fff8f2;
  --rc-muted: #9a9691;
  --rc-faint: #5c5855;
  --rc-accent: #ff4b12;
  --rc-accent2: #8f1608;
  --rc-ok: #56b882;
  --rc-err: #ff6a50;
  display: grid;
  gap: 18px;
}

/* ── hero ── */
.rc-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.rc-hero h1 { margin: 0; font-size: 1.6rem; }
.rc-hero p { margin: 5px 0 0; color: var(--rc-muted); }
.rc-hero-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* ── chips / pills ── */
.rc-chip {
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 800;
  font-size: .85rem;
  cursor: pointer;
  color: var(--rc-muted);
  background: var(--rc-surface);
  box-shadow: 4px 6px 14px rgba(0,0,0,.4), -2px -2px 7px rgba(255,255,255,.015);
  transition: opacity .15s;
}
.rc-chip:disabled { opacity: .45; cursor: not-allowed; }
.rc-chip--sm { height: 34px; padding: 0 12px; font-size: .78rem; }
.rc-chip--primary { color: #fff; background: linear-gradient(135deg, var(--rc-accent), var(--rc-accent2)); }
.rc-chip--full { width: 100%; justify-content: center; font-size: .92rem; height: 48px; border-radius: 16px; }
.rc-chip--upload { cursor: pointer; }
.rc-chip--upload input { display: none; }
.rc-pill {
  height: 34px;
  padding: 0 14px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  font-weight: 900;
  font-size: .82rem;
  color: var(--rc-text);
  background: var(--rc-sunken);
  box-shadow: inset 2px 2px 6px rgba(0,0,0,.35);
}

/* ── banners ── */
.rc-banner {
  padding: 14px 18px;
  border-radius: 16px;
  font-weight: 800;
  background: var(--rc-surface);
  box-shadow: 4px 6px 14px rgba(0,0,0,.3);
}
.rc-banner--ok { color: var(--rc-ok); }
.rc-banner--err { color: var(--rc-err); }

/* ── stats ── */
.rc-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.rc-stat {
  padding: 18px;
  border-radius: 20px;
  display: grid;
  gap: 4px;
  background: var(--rc-surface);
  box-shadow: 6px 8px 18px rgba(0,0,0,.42), -3px -3px 9px rgba(255,255,255,.013);
}
.rc-stat span { font-size: .78rem; color: var(--rc-muted); font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
.rc-stat strong { font-size: 1.5rem; color: var(--rc-text); }
.rc-stat small { font-size: .78rem; color: var(--rc-faint); }

/* ── tabs ── */
.rc-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}
.rc-tabs button {
  height: 52px;
  border: 0;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 900;
  font-size: .88rem;
  cursor: pointer;
  color: var(--rc-muted);
  background: var(--rc-surface);
  box-shadow: 6px 8px 18px rgba(0,0,0,.42), -3px -3px 9px rgba(255,255,255,.013);
  transition: color .15s, background .15s;
}
.rc-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--rc-accent), var(--rc-accent2));
}

/* ── card ── */
.rc-card {
  padding: 22px;
  border-radius: 22px;
  background: var(--rc-surface);
  box-shadow: 8px 10px 22px rgba(0,0,0,.44), -4px -4px 12px rgba(255,255,255,.015), inset 1px 1px 0 rgba(255,255,255,.013);
}
.rc-card--edit { border: 1px solid rgba(255,75,18,.22); }
.rc-card--import { grid-column: 1 / -1; }
.rc-card--checkout { }

.rc-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.rc-card-head h2 { margin: 0; font-size: 1.05rem; }
.rc-card-head p { margin: 4px 0 0; font-size: .83rem; color: var(--rc-muted); }
.rc-card-head > :first-child { flex-shrink: 0; margin-top: 2px; color: var(--rc-accent); }
.rc-card-head > div { flex: 1; min-width: 0; }
.rc-card-head > .rc-chip { flex-shrink: 0; }

/* ── form ── */
.rc-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.rc-label {
  display: grid;
  gap: 6px;
  font-size: .82rem;
  font-weight: 800;
  color: var(--rc-muted);
}
.rc-label.span2 { grid-column: 1 / -1; }
.rc-input {
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: 14px;
  font: inherit;
  font-size: .88rem;
  color: var(--rc-text);
  background: var(--rc-sunken);
  box-shadow: inset 3px 3px 7px rgba(0,0,0,.34), inset -2px -2px 6px rgba(255,255,255,.013);
  outline: none;
}
.rc-input:focus { box-shadow: inset 3px 3px 7px rgba(0,0,0,.34), 0 0 0 1px rgba(255,75,18,.4); }
.rc-textarea { min-height: 76px; resize: vertical; padding: 12px 14px; }
.rc-toggle {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .82rem;
  font-weight: 800;
  color: var(--rc-muted);
  cursor: pointer;
}
.rc-form-actions { grid-column: 1 / -1; display: flex; gap: 10px; flex-wrap: wrap; }

/* ── panel ── */
.rc-panel { display: grid; gap: 16px; }

/* ── stock grid ── */
.rc-stock-grid {
  display: grid;
  grid-template-columns: minmax(0,.9fr) minmax(0,1.1fr);
  gap: 16px;
}

/* ── product list ── */
.rc-product-list { display: grid; gap: 10px; }
.rc-product {
  padding: 12px;
  border-radius: 18px;
  background: var(--rc-surface2);
  box-shadow: 4px 6px 14px rgba(0,0,0,.34), inset 0 0 0 1px transparent;
  transition: box-shadow .15s;
}
.rc-product.selected { box-shadow: 4px 6px 14px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,75,18,.36); }
.rc-product-main {
  width: 100%;
  border: 0;
  padding: 0;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}
.rc-product-main span:last-child { display: grid; gap: 3px; min-width: 0; }
.rc-product-main strong { color: var(--rc-text); font-size: .9rem; }
.rc-product-main small { color: var(--rc-muted); font-size: .76rem; }
.rc-meter {
  height: 6px;
  margin: 10px 0 8px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--rc-sunken);
}
.rc-meter span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--rc-accent), var(--rc-ok)); }
.rc-product-actions { display: flex; gap: 8px; }

/* ── icon ── */
.rc-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--rc-accent), var(--rc-accent2));
}

/* ── icon button ── */
.rc-icon-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: var(--rc-muted);
  background: var(--rc-sunken);
  cursor: pointer;
}
.rc-icon-btn.danger { color: var(--rc-err); }

/* ── toolbar / search ── */
.rc-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.rc-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  min-height: 44px;
  border-radius: 14px;
  color: var(--rc-muted);
  background: var(--rc-sunken);
  box-shadow: inset 3px 3px 7px rgba(0,0,0,.34);
}
.rc-search input { flex: 1; min-width: 0; border: 0; outline: 0; color: var(--rc-text); background: transparent; font: inherit; font-size: .88rem; }

/* ── code list ── */
.rc-code-list { display: grid; gap: 8px; max-height: 400px; overflow-y: auto; }
.rc-code-row {
  padding: 10px 12px;
  border-radius: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: var(--rc-surface2);
}
.rc-code-row > div:first-child { display: grid; gap: 3px; min-width: 0; }
.rc-code-row strong { color: var(--rc-text); font-size: .88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-code-row small { color: var(--rc-muted); font-size: .76rem; }
.rc-row-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

/* ── batch list ── */
.rc-batch-list { display: grid; gap: 8px; }
.rc-batch-row {
  padding: 10px 14px;
  border-radius: 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  background: var(--rc-surface2);
}
.rc-batch-row > div:first-child { display: grid; gap: 3px; min-width: 0; }
.rc-batch-row strong { color: var(--rc-text); font-size: .88rem; }
.rc-batch-row small { color: var(--rc-muted); font-size: .76rem; }
.rc-batch-nums { display: flex; gap: 10px; font-size: .76rem; color: var(--rc-faint); flex-shrink: 0; }

/* ── import preview ── */
.rc-import-scores {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.rc-import-scores span {
  padding: 12px;
  border-radius: 14px;
  display: grid;
  gap: 4px;
  background: var(--rc-sunken);
  box-shadow: inset 2px 2px 6px rgba(0,0,0,.3);
}
.rc-import-scores strong { font-size: 1.2rem; color: var(--rc-text); }
.rc-import-scores small { font-size: .75rem; color: var(--rc-muted); }
.rc-mapping {
  display: grid;
  grid-template-columns: repeat(5, minmax(0,1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.rc-preview-table { display: grid; gap: 6px; margin-bottom: 16px; }
.rc-preview-row {
  padding: 9px 12px;
  border-radius: 12px;
  display: grid;
  grid-template-columns: 56px minmax(0,1.5fr) minmax(0,.7fr) 80px;
  gap: 8px;
  align-items: center;
  background: var(--rc-surface2);
  font-size: .82rem;
}
.rc-preview-row strong, .rc-preview-row small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-preview-row em { font-style: normal; font-weight: 900; color: var(--rc-ok); }
.rc-preview-row.invalid em { color: var(--rc-err); }

/* ── checkout ── */
.rc-checkout-layout {
  display: grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap: 16px;
}
.rc-checkout-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.rc-checkout-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.rc-checkout-summary span {
  padding: 12px;
  border-radius: 14px;
  display: grid;
  gap: 4px;
  background: var(--rc-sunken);
}
.rc-checkout-summary strong { color: var(--rc-text); font-size: 1.15rem; }
.rc-checkout-summary small { color: var(--rc-muted); font-size: .76rem; }
.rc-warn { color: var(--rc-err); font-weight: 800; font-size: .85rem; margin: 0 0 12px; }

/* ── delivered ── */
.rc-delivered-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}
.rc-delivered-head h2 { margin: 0; font-size: 1rem; }
.rc-delivered-head h3 { margin: 0; font-size: .95rem; }
.rc-delivered-head p, .rc-delivered-head small { color: var(--rc-muted); font-size: .8rem; }
.rc-delivered-codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 8px;
}
.rc-delivered-codes--compact { grid-template-columns: 1fr; }
.rc-delivered-code {
  padding: 10px 14px;
  border-radius: 14px;
  display: grid;
  gap: 4px;
  background: var(--rc-sunken);
}
.rc-delivered-code strong { color: var(--rc-text); font-size: .9rem; font-family: monospace; }
.rc-delivered-code small { color: var(--rc-muted); font-size: .76rem; }

/* ── sales list ── */
.rc-sales-list { display: grid; gap: 8px; max-height: 560px; overflow-y: auto; }
.rc-sale-row {
  padding: 10px 14px;
  border-radius: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: var(--rc-surface2);
}
.rc-sale-row > div:first-child { display: grid; gap: 3px; min-width: 0; }
.rc-sale-row strong { color: var(--rc-text); font-size: .88rem; }
.rc-sale-row small { color: var(--rc-muted); font-size: .76rem; }
.rc-sale-right { display: grid; justify-items: end; gap: 3px; flex-shrink: 0; }
.rc-sale-right code { color: var(--rc-text); font-size: .82rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-sale-right span { color: var(--rc-muted); font-size: .78rem; }

/* ── reseller buy layout ── */
.rc-buy-layout {
  display: grid;
  grid-template-columns: minmax(0,1.3fr) minmax(280px,.7fr);
  gap: 16px;
  align-items: start;
}
.sticky-checkout { position: sticky; top: 80px; }
.rc-product-cards { display: grid; gap: 12px; }
.rc-product-card {
  padding: 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  background: var(--rc-surface);
  box-shadow: 6px 8px 18px rgba(0,0,0,.38), inset 0 0 0 1px transparent;
  transition: box-shadow .15s;
}
.rc-product-card:hover { box-shadow: 6px 8px 18px rgba(0,0,0,.44), inset 0 0 0 1px rgba(255,75,18,.2); }
.rc-product-card.selected { box-shadow: 6px 8px 18px rgba(0,0,0,.44), inset 0 0 0 2px rgba(255,75,18,.5); }
.rc-product-card.unavailable { opacity: .5; cursor: not-allowed; }
.rc-product-card-info { flex: 1; min-width: 0; display: grid; gap: 5px; }
.rc-product-card-info strong { color: var(--rc-text); font-size: .95rem; }
.rc-product-card-info p { margin: 0; color: var(--rc-muted); font-size: .8rem; }
.rc-product-card-meta { display: flex; align-items: center; gap: 10px; }
.rc-price { font-size: 1.05rem; font-weight: 900; color: var(--rc-text); }
.rc-badge {
  height: 24px;
  padding: 0 10px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  font-size: .74rem;
  font-weight: 900;
}
.rc-badge--ok { color: var(--rc-ok); background: rgba(86,184,130,.12); }
.rc-badge--empty { color: var(--rc-err); background: rgba(255,106,80,.1); }
.rc-product-card-check { color: var(--rc-accent); flex-shrink: 0; }

/* selected product display */
.rc-selected-product {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: var(--rc-sunken);
}
.rc-selected-product > div { display: grid; gap: 3px; }
.rc-selected-product strong { color: var(--rc-text); font-size: .9rem; }
.rc-selected-product small { color: var(--rc-muted); font-size: .78rem; }

.rc-total-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: var(--rc-sunken);
  margin-top: 12px;
  font-weight: 800;
  color: var(--rc-muted);
}
.rc-total-box strong { font-size: 1.2rem; color: var(--rc-text); }

.rc-delivered-result {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,.06);
}

/* ── history list ── */
.rc-history-list { display: grid; gap: 8px; }
.rc-history-row {
  padding: 12px 14px;
  border-radius: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--rc-surface2);
}
.rc-history-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--rc-accent);
  background: rgba(255,75,18,.1);
}
.rc-history-main { flex: 1; min-width: 0; display: grid; gap: 3px; }
.rc-history-main strong { color: var(--rc-text); font-size: .9rem; font-family: monospace; }
.rc-history-main small { color: var(--rc-muted); font-size: .76rem; }
.rc-history-pin { color: var(--rc-faint) !important; }
.rc-history-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.rc-history-right span { color: var(--rc-muted); font-size: .82rem; font-weight: 800; }

/* ── empty ── */
.rc-empty {
  padding: 18px;
  border-radius: 16px;
  color: var(--rc-muted);
  background: var(--rc-sunken);
  font-size: .88rem;
}

/* ── responsive ── */

/* search sempre ocupa linha inteira no toolbar de 2 colunas */
.rc-toolbar .rc-search { grid-column: 1 / -1; }

@media (max-width: 1024px) {
  .rc-stock-grid { grid-template-columns: 1fr; }
  .rc-checkout-layout { grid-template-columns: 1fr; }
  .rc-buy-layout { grid-template-columns: 1fr; }
  .sticky-checkout { position: static; }
  .rc-mapping { grid-template-columns: repeat(3, minmax(0,1fr)); }
}

@media (max-width: 700px) {
  .rc-page { gap: 14px; }
  .rc-card { padding: 16px; border-radius: 18px; }
  .rc-hero h1 { font-size: 1.35rem; }
  .rc-hero-actions { gap: 8px; }

  /* formulário de produto/edição → 1 col */
  .rc-form { grid-template-columns: 1fr; }
  .rc-label.span2 { grid-column: auto; }

  /* import */
  .rc-mapping { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .rc-import-scores { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .rc-preview-row { grid-template-columns: 40px minmax(0,1fr) 72px; }
  .rc-preview-row small { display: none; }

  /* checkout */
  .rc-checkout-form { grid-template-columns: 1fr; }
  .rc-checkout-summary { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .rc-delivered-codes { grid-template-columns: 1fr; }

  /* listas */
  .rc-sale-row { flex-wrap: wrap; }
  .rc-sale-right { width: 100%; justify-items: start; }
  .rc-sale-right code { max-width: 100%; }
  .rc-batch-row { flex-direction: column; gap: 8px; }
  .rc-batch-nums { flex-wrap: wrap; gap: 6px; }

  /* toolbar: cada input em linha separada */
  .rc-toolbar { grid-template-columns: 1fr; }

  /* product actions em coluna */
  .rc-product-actions { flex-wrap: wrap; }
  .rc-chip--upload { flex: 1; justify-content: center; }
}

@media (max-width: 480px) {
  .rc-card { padding: 14px; border-radius: 16px; }
  .rc-hero h1 { font-size: 1.2rem; }

  /* stats em 2 colunas pequenas */
  .rc-stats { grid-template-columns: repeat(2, 1fr); }
  .rc-stat { padding: 14px; }
  .rc-stat strong { font-size: 1.25rem; }

  /* tabs: auto-fit já cuida de 3 tabs em linha, mas em 375px
     3 colunas de 120px somam 360px — ok; para segurança: */
  .rc-tabs { grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); }
  .rc-tabs button { height: 46px; font-size: .82rem; gap: 6px; }

  /* checkout summary vira 1 coluna em telas muito pequenas */
  .rc-checkout-summary { grid-template-columns: 1fr; }

  /* form actions empilham */
  .rc-form-actions { flex-direction: column; }
  .rc-form-actions .rc-chip { width: 100%; justify-content: center; }

  /* row actions de import */
  .rc-row-actions { flex-wrap: wrap; }
  .rc-row-actions .rc-chip { flex: 1; justify-content: center; }

  /* mapping em 1 col */
  .rc-mapping { grid-template-columns: 1fr; }
  .rc-import-scores { grid-template-columns: repeat(2, 1fr); }

  /* preview row simplificado */
  .rc-preview-row { grid-template-columns: 36px minmax(0,1fr) 68px; font-size: .78rem; }

  /* product card compacto */
  .rc-product-card { padding: 12px; gap: 10px; }
  .rc-icon { width: 36px; height: 36px; border-radius: 12px; }

  /* history code truncate */
  .rc-history-main strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
</style>
