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
  UserRound,
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

type TabKey = 'stock' | 'checkout' | 'sales'

const auth = useAuthStore()
const activeTab = ref<TabKey>('stock')
const products = ref<RechargeCodeProduct[]>([])
const codes = ref<RechargeCode[]>([])
const batches = ref<RechargeCodeBatch[]>([])
const sales = ref<RechargeCode[]>([])
const loading = ref(true)
const loadingCodes = ref(false)
const loadingBatches = ref(false)
const loadingSales = ref(false)
const saving = ref(false)
const updating = ref(false)
const importingId = ref('')
const selling = ref(false)
const voidingId = ref('')
const notice = ref('')
const error = ref('')
const lastSale = ref<RechargeCodeSale | null>(null)
const selectedStockProductId = ref('')
const selectedCheckoutProductId = ref('')
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
const checkoutQuantity = ref(1)
const checkoutCustomer = ref('')
const checkoutContact = ref('')
const editingProductId = ref('')

const form = reactive({
  name: '',
  description: '',
  denomination: 1,
  costValue: 0,
  saleValue: 0,
  instructions: '',
  active: true,
})

const editForm = reactive({
  name: '',
  description: '',
  denomination: 1,
  costValue: 0,
  saleValue: 0,
  instructions: '',
  active: true,
})

const tabs = [
  { key: 'stock' as const, label: 'Estoque', icon: Archive },
  { key: 'checkout' as const, label: 'Checkout', icon: ShoppingCart },
  { key: 'sales' as const, label: 'Vendas', icon: ReceiptText },
]

const isStaff = computed(() => auth.isAdmin)
const totalAvailable = computed(() => products.value.reduce((sum, item) => sum + Number(item.stock?.available || 0), 0))
const totalSold = computed(() => products.value.reduce((sum, item) => sum + Number(item.stock?.sold || 0), 0))
const totalVoided = computed(() => products.value.reduce((sum, item) => sum + Number(item.stock?.voided || 0), 0))
const selectedStockProduct = computed(() => products.value.find((item) => item.id === selectedStockProductId.value) || products.value[0])
const selectedCheckoutProduct = computed(() => products.value.find((item) => item.id === selectedCheckoutProductId.value) || products.value[0])
const checkoutAvailable = computed(() => Number(selectedCheckoutProduct.value?.stock?.available || 0))
const checkoutPrice = computed(() => Number(selectedCheckoutProduct.value?.sale_value || selectedCheckoutProduct.value?.saleValue || 0))
const checkoutSubtotal = computed(() => checkoutPrice.value * checkoutQuantity.value)
const canCheckout = computed(() => Boolean(selectedCheckoutProduct.value) && checkoutQuantity.value > 0 && checkoutQuantity.value <= checkoutAvailable.value)
const lowStockProducts = computed(() => products.value.filter((item) => Number(item.stock?.available || 0) <= 5))
const filteredCodes = computed(() => {
  const term = codeSearch.value.trim().toLowerCase()
  if (!term) return codes.value
  return codes.value.filter((code) => [code.code, code.pin, code.serial, code.soldTo?.name, code.soldTo?.email].some((value) => String(value || '').toLowerCase().includes(term)))
})
const filteredSales = computed(() => {
  const term = salesSearch.value.trim().toLowerCase()
  return sales.value.filter((sale) => {
    const matchesProduct = !salesProductId.value || sale.productId === salesProductId.value || sale.product_id === salesProductId.value || sale.product?.id === salesProductId.value
    const matchesTerm = !term || [sale.code, sale.product?.name, sale.soldTo?.name, sale.soldTo?.email].some((value) => String(value || '').toLowerCase().includes(term))
    return matchesProduct && matchesTerm
  })
})
const salesRevenue = computed(() => filteredSales.value.reduce((sum, sale) => sum + Number(sale.product?.sale_value || sale.product?.saleValue || 0), 0))
const todaySales = computed(() => filteredSales.value.filter((sale) => isToday(sale.soldAt || sale.sold_at)).length)

function statusLabel(status?: RechargeCodeStatus) {
  const labels: Record<RechargeCodeStatus, string> = {
    available: 'Disponivel',
    reserved: 'Reservado',
    sold: 'Vendido',
    voided: 'Inutilizado',
  }
  return status ? labels[status] : 'Todos'
}

function money(value: unknown) {
  return formatCurrency(Number(value || 0))
}

function dateText(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function dateOnly(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function isToday(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function productProgress(product: RechargeCodeProduct) {
  const total = Number(product.stock?.total || 0)
  if (!total) return 0
  return Math.round((Number(product.stock?.available || 0) / total) * 100)
}

function saleLines(sale: RechargeCodeSale) {
  const customer = checkoutCustomer.value ? `Cliente: ${checkoutCustomer.value}\n` : ''
  const contact = checkoutContact.value ? `Contato: ${checkoutContact.value}\n` : ''
  const header = `${customer}${contact}Produto: ${sale.product.name}\nTotal: ${money(sale.totalValue)}\n\nCodigos:\n`
  return header + sale.codes
    .map((code, index) => {
      const parts = [`${index + 1}. ${code.code}`]
      if (code.pin) parts.push(`PIN: ${code.pin}`)
      if (code.serial) parts.push(`Serial: ${code.serial}`)
      return parts.join(' | ')
    })
    .join('\n')
}

function checkoutMessage() {
  if (!selectedCheckoutProduct.value) return ''
  return [
    checkoutCustomer.value ? `Cliente: ${checkoutCustomer.value}` : '',
    `Produto: ${selectedCheckoutProduct.value.name}`,
    `Quantidade: ${checkoutQuantity.value}`,
    `Total: ${money(checkoutSubtotal.value)}`,
    selectedCheckoutProduct.value.instructions ? `Instrucao: ${selectedCheckoutProduct.value.instructions}` : '',
  ].filter(Boolean).join('\n')
}

async function copyText(payload: string, message: string) {
  try {
    await navigator.clipboard?.writeText(payload)
    notice.value = message
  } catch {
    error.value = 'Nao foi possivel copiar automaticamente. Selecione o texto e copie manualmente.'
  }
}

async function copySale() {
  if (!lastSale.value) return
  await copyText(saleLines(lastSale.value), 'Codigos copiados para enviar ao cliente.')
}

async function copySalesReport() {
  const lines = filteredSales.value.map((sale) => `${dateText(sale.soldAt || sale.sold_at)} | ${sale.product?.name || '-'} | ${sale.code} | ${money(sale.product?.sale_value || sale.product?.saleValue)}`)
  await copyText(lines.join('\n'), 'Relatorio de vendas copiado.')
}

async function copyTemplateHeaders() {
  await copyText('code,pin,serial,expires_at', 'Cabecalhos do modelo XLSX copiados.')
}

async function loadProducts() {
  products.value = await rechargeCodesService.listProducts()
  if (!selectedStockProductId.value && products.value[0]) selectedStockProductId.value = products.value[0].id
  if (!selectedCheckoutProductId.value && products.value[0]) selectedCheckoutProductId.value = products.value[0].id
}

async function loadCodes() {
  if (!isStaff.value || !selectedStockProduct.value) return
  loadingCodes.value = true
  try {
    codes.value = await rechargeCodesService.listCodes(selectedStockProduct.value.id, codeStatus.value || undefined)
  } finally {
    loadingCodes.value = false
  }
}

async function loadBatches() {
  if (!isStaff.value || !selectedStockProduct.value) return
  loadingBatches.value = true
  try {
    batches.value = await rechargeCodesService.listBatches(selectedStockProduct.value.id)
  } finally {
    loadingBatches.value = false
  }
}

async function loadSales() {
  if (!isStaff.value) return
  loadingSales.value = true
  try {
    sales.value = await rechargeCodesService.listSales()
  } finally {
    loadingSales.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await loadProducts()
    await Promise.all([loadCodes(), loadBatches(), loadSales()])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar codigos.'
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await load()
  notice.value = 'Dados de codigos atualizados.'
}

async function saveProduct() {
  saving.value = true
  notice.value = ''
  error.value = ''
  try {
    await rechargeCodesService.createProduct({
      name: form.name,
      description: form.description,
      denomination: Number(form.denomination),
      costValue: Number(form.costValue),
      saleValue: Number(form.saleValue),
      instructions: form.instructions,
      active: form.active,
    })
    notice.value = 'Produto de codigo criado no estoque.'
    Object.assign(form, { name: '', description: '', denomination: 1, costValue: 0, saleValue: 0, instructions: '', active: true })
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel salvar o produto.'
  } finally {
    saving.value = false
  }
}

function startEdit(product: RechargeCodeProduct) {
  editingProductId.value = product.id
  Object.assign(editForm, {
    name: product.name,
    description: product.description || '',
    denomination: Number(product.denomination || 1),
    costValue: Number(product.cost_value || product.costValue || 0),
    saleValue: Number(product.sale_value || product.saleValue || 0),
    instructions: product.instructions || '',
    active: product.active !== false,
  })
}

async function updateProduct() {
  if (!editingProductId.value) return
  updating.value = true
  notice.value = ''
  error.value = ''
  try {
    await rechargeCodesService.updateProduct(editingProductId.value, {
      name: editForm.name,
      description: editForm.description,
      denomination: Number(editForm.denomination),
      costValue: Number(editForm.costValue),
      saleValue: Number(editForm.saleValue),
      instructions: editForm.instructions,
      active: editForm.active,
    })
    notice.value = 'Produto atualizado.'
    editingProductId.value = ''
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar o produto.'
  } finally {
    updating.value = false
  }
}

function applyPreviewMapping(preview: RechargeCodeImportPreview) {
  importMapping.codeColumn = preview.mapping.codeColumn || ''
  importMapping.pinColumn = preview.mapping.pinColumn || ''
  importMapping.serialColumn = preview.mapping.serialColumn || ''
  importMapping.expiresAtColumn = preview.mapping.expiresAtColumn || ''
  importMapping.sheetName = preview.selectedSheetName || preview.mapping.sheetName || ''
}

function clearImportPreview() {
  importFileRef.value = null
  importProductId.value = ''
  importPreview.value = null
  Object.assign(importMapping, { codeColumn: '', pinColumn: '', serialColumn: '', expiresAtColumn: '', sheetName: '' })
}

async function previewImportFile(event: Event, productId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importingId.value = productId
  notice.value = ''
  error.value = ''
  try {
    importFileRef.value = file
    importProductId.value = productId
    const preview = await rechargeCodesService.previewImport(productId, file)
    importPreview.value = preview
    applyPreviewMapping(preview)
    selectedStockProductId.value = productId
    notice.value = `Previa pronta: ${preview.importableCount} codigos aptos para importar.`
  } catch (err) {
    clearImportPreview()
    error.value = err instanceof Error ? err.message : 'Nao foi possivel analisar a planilha.'
  } finally {
    importingId.value = ''
    input.value = ''
  }
}

async function refreshImportPreview() {
  if (!importProductId.value || !importFileRef.value) return
  importingId.value = importProductId.value
  notice.value = ''
  error.value = ''
  try {
    const preview = await rechargeCodesService.previewImport(importProductId.value, importFileRef.value, importMapping)
    importPreview.value = preview
    applyPreviewMapping(preview)
    notice.value = `Mapeamento atualizado: ${preview.importableCount} codigos aptos.`
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel atualizar a previa.'
  } finally {
    importingId.value = ''
  }
}

async function confirmImport() {
  if (!importProductId.value || !importFileRef.value || !importPreview.value) return
  importingId.value = importProductId.value
  notice.value = ''
  error.value = ''
  try {
    const result = await rechargeCodesService.importXlsx(importProductId.value, importFileRef.value, importNotes.value, importMapping)
    notice.value = `Estoque importado: ${result.importedCount} novos, ${result.duplicateCount} duplicados, ${result.invalidCount} invalidos.`
    importNotes.value = ''
    clearImportPreview()
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel confirmar a importacao.'
  } finally {
    importingId.value = ''
  }
}

async function sellCheckout() {
  if (!selectedCheckoutProduct.value) return
  if (!canCheckout.value) {
    error.value = `Estoque insuficiente. Disponivel: ${checkoutAvailable.value}. Solicitado: ${checkoutQuantity.value}.`
    notice.value = ''
    return
  }
  selling.value = true
  notice.value = ''
  error.value = ''
  lastSale.value = null
  try {
    lastSale.value = await rechargeCodesService.sellLocal(selectedCheckoutProduct.value.id, checkoutQuantity.value)
    notice.value = `Venda concluida: ${lastSale.value.quantity} codigo${lastSale.value.quantity > 1 ? 's' : ''} entregue${lastSale.value.quantity > 1 ? 's' : ''}.`
    activeTab.value = 'checkout'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel concluir o checkout.'
  } finally {
    selling.value = false
  }
}

async function voidCode(code: RechargeCode) {
  if (!window.confirm(`Inutilizar o codigo ${code.code}?`)) return
  voidingId.value = code.id
  notice.value = ''
  error.value = ''
  try {
    await rechargeCodesService.voidCode(code.id, 'Inutilizado pela tela de estoque')
    notice.value = 'Codigo inutilizado e removido do estoque vendavel.'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel inutilizar o codigo.'
  } finally {
    voidingId.value = ''
  }
}

watch([selectedStockProductId, codeStatus], () => {
  void Promise.all([loadCodes(), loadBatches()])
})

onMounted(load)
</script>

<template>
  <div class="module-page recharge-page j2-page">
    <header class="module-hero recharge-hero">
      <div>
        <h1>Codigos de recarga</h1>
        <p>Operacao completa para importar estoque, vender no checkout e acompanhar cada codigo entregue.</p>
      </div>
      <div class="module-actions">
        <button class="module-chip" type="button" :disabled="loading" @click="refreshAll">
          <RefreshCw :size="16" />
          Atualizar
        </button>
        <strong class="module-pill">{{ totalAvailable }} em estoque</strong>
        <strong class="module-pill">{{ totalSold }} vendidos</strong>
      </div>
    </header>

    <div v-if="notice" class="module-card pad recharge-notice">{{ notice }}</div>
    <div v-if="error" class="module-card pad recharge-error">{{ error }}</div>

    <section class="module-grid three">
      <article class="module-stat">
        <span>Estoque livre</span>
        <strong>{{ totalAvailable }}</strong>
        <small>codigos disponiveis</small>
      </article>
      <article class="module-stat">
        <span>Vendas</span>
        <strong>{{ totalSold }}</strong>
        <small>{{ todaySales }} vendidos hoje</small>
      </article>
      <article class="module-stat">
        <span>Alertas</span>
        <strong>{{ lowStockProducts.length }}</strong>
        <small>produtos com estoque baixo</small>
      </article>
    </section>

    <nav class="recharge-tabs" aria-label="Fluxo de codigos">
      <button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <component :is="tab.icon" :size="18" />
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'stock'" class="recharge-panel">
      <div class="section-heading">
        <div>
          <h2>Pagina de estoque</h2>
          <p>Subir, importar, revisar, editar produto, consultar lotes e bloquear codigos ruins.</p>
        </div>
        <button class="module-chip" type="button" @click="copyTemplateHeaders">
          <FileSpreadsheet :size="16" />
          Modelo XLSX
        </button>
      </div>

      <article v-if="isStaff" class="module-card pad j2-panel">
        <div class="recharge-section-title">
          <PackageCheck :size="22" />
          <div>
            <h2>Cadastro de produto</h2>
            <p>Crie o produto que recebera lotes de codigos importados.</p>
          </div>
        </div>
        <form class="module-form-grid recharge-form" @submit.prevent="saveProduct">
          <label class="module-label">Nome<input v-model="form.name" class="module-input" required placeholder="Ex: Recarga IPTV 30 dias" /></label>
          <label class="module-label">Creditos/dias<input v-model.number="form.denomination" class="module-input" min="1" type="number" /></label>
          <label class="module-label">Custo<input v-model.number="form.costValue" class="module-input" min="0" step="0.01" type="number" /></label>
          <label class="module-label">Venda<input v-model.number="form.saleValue" class="module-input" min="0" step="0.01" type="number" /></label>
          <label class="module-label full">Descricao<input v-model="form.description" class="module-input" placeholder="Resumo que a equipe entende rapido" /></label>
          <label class="module-label full">Instrucoes<textarea v-model="form.instructions" class="module-textarea" placeholder="Como entregar/usar o codigo apos a venda" /></label>
          <button class="module-chip active" type="submit" :disabled="saving">{{ saving ? 'Salvando...' : 'Criar produto' }}</button>
        </form>
      </article>

      <article v-if="editingProductId" class="module-card pad j2-panel edit-panel">
        <div class="recharge-section-title">
          <Pencil :size="22" />
          <div>
            <h2>Editar produto</h2>
            <p>Ajuste preco, nome, instrucoes e disponibilidade sem mexer nos codigos ja vendidos.</p>
          </div>
        </div>
        <form class="module-form-grid recharge-form" @submit.prevent="updateProduct">
          <label class="module-label">Nome<input v-model="editForm.name" class="module-input" required /></label>
          <label class="module-label">Creditos/dias<input v-model.number="editForm.denomination" class="module-input" min="1" type="number" /></label>
          <label class="module-label">Custo<input v-model.number="editForm.costValue" class="module-input" min="0" step="0.01" type="number" /></label>
          <label class="module-label">Venda<input v-model.number="editForm.saleValue" class="module-input" min="0" step="0.01" type="number" /></label>
          <label class="module-label full">Descricao<input v-model="editForm.description" class="module-input" /></label>
          <label class="module-label full">Instrucoes<textarea v-model="editForm.instructions" class="module-textarea" /></label>
          <label class="toggle-row"><input v-model="editForm.active" type="checkbox" /> Produto ativo para venda</label>
          <div class="form-actions">
            <button class="module-chip active" type="submit" :disabled="updating"><Save :size="16" /> Salvar</button>
            <button class="module-chip" type="button" @click="editingProductId = ''"><X :size="16" /> Cancelar</button>
          </div>
        </form>
      </article>

      <div class="stock-layout">
        <article class="module-card pad j2-panel">
          <div class="recharge-section-title">
            <Layers3 :size="22" />
            <div>
              <h2>Produtos e importacao</h2>
              <p>Escolha o produto, suba o lote e acompanhe o saldo vendavel.</p>
            </div>
          </div>

          <label v-if="isStaff" class="module-label import-note">Observacao do lote
            <input v-model="importNotes" class="module-input" placeholder="Ex: lote fornecedor junho" />
          </label>

          <div class="stock-products">
            <article v-for="product in products" :key="product.id" class="stock-product" :class="{ selected: selectedStockProduct?.id === product.id }">
              <button type="button" class="stock-product-main" @click="selectedStockProductId = product.id">
                <span class="recharge-icon"><TicketCheck :size="20" /></span>
                <span>
                  <strong>{{ product.name }}</strong>
                  <small>{{ product.stock?.available || 0 }} disponiveis de {{ product.stock?.total || 0 }} / {{ money(product.sale_value || product.saleValue) }}</small>
                </span>
              </button>
              <div class="stock-meter"><span :style="{ width: `${productProgress(product)}%` }" /></div>
              <div class="product-actions">
                <button v-if="isStaff" class="icon-action" type="button" title="Editar produto" @click="startEdit(product)">
                  <Pencil :size="15" />
                </button>
                <label v-if="isStaff" class="module-chip upload-chip">
                  <Upload :size="16" />
                  {{ importingId === product.id ? 'Analisando...' : 'Analisar XLSX' }}
                  <input accept=".xlsx" type="file" :disabled="importingId === product.id" @change="previewImportFile($event, product.id)" />
                </label>
              </div>
            </article>
          </div>
        </article>

        <article v-if="importPreview" class="module-card pad j2-panel import-preview-panel">
          <div class="recharge-section-title">
            <FileSpreadsheet :size="22" />
            <div>
              <h2>Previa e mapeamento</h2>
              <p>{{ importPreview.fileName }} / {{ importPreview.totalRows }} linhas / limite {{ importPreview.limits.maxRows }} codigos.</p>
            </div>
          </div>

          <div class="import-score-grid">
            <span><strong>{{ importPreview.importableCount }}</strong><small>aptos</small></span>
            <span><strong>{{ importPreview.duplicateInSystemCount }}</strong><small>ja existem</small></span>
            <span><strong>{{ importPreview.duplicateInFileCount }}</strong><small>duplicados no arquivo</small></span>
            <span><strong>{{ importPreview.invalidCount }}</strong><small>invalidos</small></span>
          </div>

          <div class="mapping-grid">
            <label class="module-label">Aba
              <select v-model="importMapping.sheetName" class="module-input">
                <option v-for="sheet in importPreview.sheetNames" :key="sheet" :value="sheet">{{ sheet }}</option>
              </select>
            </label>
            <label class="module-label">Coluna do codigo
              <select v-model="importMapping.codeColumn" class="module-input">
                <option value="">Selecionar</option>
                <option v-for="header in importPreview.headers" :key="header" :value="header">{{ header }}</option>
              </select>
            </label>
            <label class="module-label">Coluna PIN/senha
              <select v-model="importMapping.pinColumn" class="module-input">
                <option value="">Nao importar</option>
                <option v-for="header in importPreview.headers" :key="header" :value="header">{{ header }}</option>
              </select>
            </label>
            <label class="module-label">Coluna serial/lote
              <select v-model="importMapping.serialColumn" class="module-input">
                <option value="">Nao importar</option>
                <option v-for="header in importPreview.headers" :key="header" :value="header">{{ header }}</option>
              </select>
            </label>
            <label class="module-label">Coluna validade
              <select v-model="importMapping.expiresAtColumn" class="module-input">
                <option value="">Nao importar</option>
                <option v-for="header in importPreview.headers" :key="header" :value="header">{{ header }}</option>
              </select>
            </label>
          </div>

          <div class="preview-table">
            <article v-for="row in importPreview.sampleRows" :key="row.rowNumber" class="preview-row" :class="{ invalid: !row.valid || row.duplicateInSystem }">
              <span>#{{ row.rowNumber }}</span>
              <strong>{{ row.code || 'sem codigo' }}</strong>
              <small>{{ row.pin || '-' }}</small>
              <small>{{ row.serial || '-' }}</small>
              <em>{{ row.duplicateInSystem ? 'ja existe' : row.valid ? 'ok' : 'invalido' }}</em>
            </article>
          </div>

          <div class="form-actions">
            <button class="module-chip" type="button" :disabled="importingId === importProductId" @click="refreshImportPreview">
              <RefreshCw :size="16" />
              Reanalisar colunas
            </button>
            <button class="module-chip active" type="button" :disabled="!importMapping.codeColumn || importingId === importProductId || !importPreview.importableCount" @click="confirmImport">
              <Upload :size="16" />
              Confirmar importacao
            </button>
            <button class="module-chip" type="button" @click="clearImportPreview">
              <X :size="16" />
              Cancelar
            </button>
          </div>
        </article>

        <article class="module-card pad j2-panel">
          <div class="recharge-section-title">
            <ClipboardList :size="22" />
            <div>
              <h2>Gestao dos codigos</h2>
              <p>Consulte status, procure codigo ou PIN e inutilize itens com problema.</p>
            </div>
          </div>

          <div class="code-toolbar">
            <select v-model="selectedStockProductId" class="module-input">
              <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
            <select v-model="codeStatus" class="module-input">
              <option value="">Todos</option>
              <option value="available">Disponiveis</option>
              <option value="sold">Vendidos</option>
              <option value="voided">Inutilizados</option>
            </select>
            <label class="search-field">
              <Search :size="16" />
              <input v-model="codeSearch" placeholder="Buscar codigo, PIN, serial ou cliente" />
            </label>
          </div>

          <div v-if="loadingCodes" class="module-muted">Carregando codigos...</div>
          <div v-else-if="!filteredCodes.length" class="empty-state">Nenhum codigo encontrado para este filtro.</div>
          <div v-else class="code-list">
            <article v-for="code in filteredCodes" :key="code.id" class="code-row">
              <div>
                <strong>{{ code.code }}</strong>
                <small>{{ statusLabel(code.status) }} <span v-if="code.pin">/ PIN {{ code.pin }}</span> <span v-if="code.serial">/ {{ code.serial }}</span></small>
              </div>
              <div class="code-row-actions">
                <button class="icon-action" type="button" title="Copiar codigo" @click="copyText(code.code, 'Codigo copiado.')">
                  <Copy :size="15" />
                </button>
                <button v-if="code.status === 'available'" class="icon-action danger" type="button" :disabled="voidingId === code.id" title="Inutilizar codigo" @click="voidCode(code)">
                  <Ban :size="15" />
                </button>
              </div>
            </article>
          </div>
        </article>
      </div>

      <article class="module-card pad j2-panel">
        <div class="recharge-section-title">
          <FileSpreadsheet :size="22" />
          <div>
            <h2>Lotes importados</h2>
            <p>Auditoria rapida de origem, linhas, duplicados e invalidos do produto selecionado.</p>
          </div>
        </div>
        <div v-if="loadingBatches" class="module-muted">Carregando lotes...</div>
        <div v-else-if="!batches.length" class="empty-state">Nenhum lote importado para este produto.</div>
        <div v-else class="batch-list">
          <article v-for="batch in batches" :key="batch.id" class="batch-row">
            <div>
              <strong>{{ batch.sourceFilename || batch.source_filename || 'Planilha XLSX' }}</strong>
              <small>{{ dateText(batch.createdAt || batch.created_date) }} <span v-if="batch.notes">/ {{ batch.notes }}</span></small>
            </div>
            <div class="batch-numbers">
              <span>{{ batch.importedCount ?? batch.imported_count }} novos</span>
              <span>{{ batch.duplicateCount ?? batch.duplicate_count }} duplicados</span>
              <span>{{ batch.invalidCount ?? batch.invalid_count }} invalidos</span>
            </div>
          </article>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'checkout'" class="checkout-layout">
      <article class="module-card pad j2-panel checkout-card">
        <div class="recharge-section-title">
          <ShoppingCart :size="22" />
          <div>
            <h2>Pagina de checkout</h2>
            <p>Venda local com validacao de estoque, dados do cliente e entrega dos codigos.</p>
          </div>
        </div>

        <div class="checkout-grid">
          <label class="module-label">Produto
            <select v-model="selectedCheckoutProductId" class="module-input">
              <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
          </label>
          <label class="module-label">Quantidade
            <input v-model.number="checkoutQuantity" class="module-input" min="1" :max="checkoutAvailable || 1" type="number" />
          </label>
          <label class="module-label">Cliente
            <input v-model="checkoutCustomer" class="module-input" placeholder="Nome do cliente" />
          </label>
          <label class="module-label">Contato
            <input v-model="checkoutContact" class="module-input" placeholder="WhatsApp ou identificador" />
          </label>
        </div>

        <div v-if="selectedCheckoutProduct" class="checkout-summary">
          <span><strong>{{ checkoutAvailable }}</strong><small>em estoque</small></span>
          <span><strong>{{ money(checkoutPrice) }}</strong><small>unitario</small></span>
          <span><strong>{{ money(checkoutSubtotal) }}</strong><small>subtotal</small></span>
        </div>

        <div class="checkout-message">
          <div class="recharge-section-title">
            <UserRound :size="20" />
            <div>
              <h3>Mensagem antes de finalizar</h3>
              <p>Confira os dados antes de baixar o estoque. Os codigos so aparecem depois da venda.</p>
            </div>
          </div>
          <pre>{{ checkoutMessage() }}</pre>
        </div>

        <p v-if="!canCheckout" class="stock-warning">Nao ha estoque suficiente para essa venda.</p>
        <button class="module-chip active checkout-button" type="button" :disabled="selling || !canCheckout" @click="sellCheckout">
          <ShoppingCart :size="17" />
          {{ selling ? 'Finalizando...' : 'Finalizar venda e entregar codigos' }}
        </button>
      </article>

      <article v-if="lastSale" class="module-card pad j2-panel sold-card">
        <div class="sold-header">
          <div>
            <h2>Entrega ao cliente</h2>
            <p>{{ lastSale.quantity }} codigo{{ lastSale.quantity > 1 ? 's' : '' }} de {{ lastSale.product.name }}. Total: {{ money(lastSale.totalValue) }}.</p>
          </div>
          <button class="module-chip active" type="button" @click="copySale">
            <Copy :size="16" />
            Copiar tudo
          </button>
        </div>
        <div class="sold-code-list">
          <article v-for="code in lastSale.codes" :key="code.id" class="sold-code">
            <strong>{{ code.code }}</strong>
            <span v-if="code.pin">PIN: {{ code.pin }}</span>
            <span v-if="code.serial">Serial: {{ code.serial }}</span>
          </article>
        </div>
      </article>
    </section>

    <section v-else class="recharge-panel">
      <div class="section-heading">
        <div>
          <h2>Pagina de vendas</h2>
          <p>Acompanhe saida de codigos, receita, produto, usuario e relatorios rapidos.</p>
        </div>
        <button class="module-chip" type="button" :disabled="!filteredSales.length" @click="copySalesReport">
          <Copy :size="16" />
          Copiar relatorio
        </button>
      </div>

      <section class="module-grid three">
        <article class="module-stat">
          <span>Receita filtrada</span>
          <strong>{{ money(salesRevenue) }}</strong>
          <small>{{ filteredSales.length }} codigos</small>
        </article>
        <article class="module-stat">
          <span>Hoje</span>
          <strong>{{ todaySales }}</strong>
          <small>codigos vendidos</small>
        </article>
        <article class="module-stat">
          <span>Produtos ativos</span>
          <strong>{{ products.filter((item) => item.active !== false).length }}</strong>
          <small>no checkout</small>
        </article>
      </section>

      <article class="module-card pad j2-panel">
        <div class="recharge-section-title">
          <BarChart3 :size="22" />
          <div>
            <h2>Acompanhamento de vendas</h2>
            <p>Historico dos codigos vendidos, produto, horario e usuario responsavel.</p>
          </div>
        </div>

        <div class="code-toolbar">
          <select v-model="salesProductId" class="module-input">
            <option value="">Todos os produtos</option>
            <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
          </select>
          <label class="search-field">
            <Search :size="16" />
            <input v-model="salesSearch" placeholder="Buscar venda, produto, codigo ou usuario" />
          </label>
        </div>

        <div v-if="loadingSales" class="module-muted">Carregando vendas...</div>
        <div v-else-if="!filteredSales.length" class="empty-state">Nenhuma venda encontrada para este filtro.</div>
        <div v-else class="sales-list">
          <article v-for="sale in filteredSales" :key="sale.id" class="sale-row">
            <div>
              <strong>{{ sale.product?.name || 'Produto removido' }}</strong>
              <small>{{ dateText(sale.soldAt || sale.sold_at) }} / {{ sale.soldTo?.name || sale.soldTo?.email || 'venda local' }}</small>
            </div>
            <div class="sale-code">
              <code>{{ sale.code }}</code>
              <span>{{ money(sale.product?.sale_value || sale.product?.saleValue) }}</span>
            </div>
          </article>
        </div>
      </article>
    </section>

    <section class="module-card pad j2-panel">
      <div class="recharge-section-title">
        <CheckCircle2 :size="22" />
        <div>
          <h2>Checklist operacional</h2>
          <p>Antes de vender: produto ativo, estoque disponivel, cliente confirmado, pagamento recebido e codigos copiados apos checkout.</p>
          <small class="module-muted">Modelo XLSX: <strong>code</strong>, <strong>pin</strong>, <strong>serial</strong>, <strong>expires_at</strong>. Tambem aceitamos codigo, senha, serie e validade.</small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.recharge-page {
  --j2-bg: #030404;
  --j2-surface: rgba(6, 7, 7, .96);
  --j2-surface-2: rgba(9, 10, 10, .96);
  --j2-sunken: rgba(3, 4, 4, .76);
  --j2-text: #fff8f2;
  --j2-muted: #a3a09b;
  --j2-faint: #67615c;
  --j2-accent: #ff4b12;
  --j2-accent-deep: #8f1608;
}

.j2-panel,
.recharge-tabs button,
.stock-product,
.code-row,
.sale-row,
.batch-row,
.checkout-summary span,
.sold-code,
.checkout-message {
  border: 0;
  background: var(--j2-surface);
  box-shadow:
    8px 10px 22px rgba(0,0,0,.44),
    -4px -4px 12px rgba(255,255,255,.016),
    inset 1px 1px 0 rgba(255,255,255,.014);
}

.recharge-hero :deep(.module-chip) {
  gap: 7px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.section-heading h2 {
  margin: 0;
}

.section-heading p {
  margin: 4px 0 0;
  color: var(--gj2-muted);
}

.recharge-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.recharge-tabs button {
  min-height: 54px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--j2-muted);
  font-weight: 900;
}

.recharge-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.recharge-panel,
.checkout-layout,
.stock-layout {
  display: grid;
  gap: 16px;
}

.stock-layout,
.checkout-layout {
  grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
}

.recharge-form .full {
  grid-column: 1 / -1;
}

.recharge-section-title,
.stock-product-main,
.sold-header,
.sale-row,
.batch-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.recharge-section-title p,
.sold-header p {
  margin: 4px 0 0;
  color: var(--gj2-muted);
}

.recharge-section-title h3 {
  margin: 0;
  font-size: 1rem;
}

.stock-products,
.code-list,
.sales-list,
.sold-code-list,
.batch-list {
  display: grid;
  gap: 10px;
}

.import-preview-panel {
  grid-column: 1 / -1;
}

.import-score-grid,
.mapping-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.mapping-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.import-score-grid span {
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  display: grid;
  gap: 4px;
  background: var(--j2-sunken);
  box-shadow:
    inset 3px 3px 8px rgba(0,0,0,.34),
    inset -2px -2px 6px rgba(255,255,255,.016);
}

.import-score-grid strong {
  color: var(--j2-text);
  font-size: 1.25rem;
}

.preview-table {
  display: grid;
  gap: 8px;
  margin: 12px 0 16px;
}

.preview-row {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 14px;
  display: grid;
  grid-template-columns: 64px minmax(0, 1.5fr) minmax(0, .8fr) minmax(0, .8fr) 86px;
  gap: 8px;
  align-items: center;
  background: var(--j2-surface-2);
}

.preview-row strong,
.preview-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-row em {
  color: #8bc7a3;
  font-style: normal;
  font-weight: 900;
}

.preview-row.invalid em {
  color: #ff806f;
}

.import-note {
  margin: 16px 0;
}

.stock-product,
.code-row,
.sale-row,
.batch-row {
  min-width: 0;
  padding: 12px;
  border-radius: 18px;
}

.stock-product.selected {
  box-shadow:
    8px 10px 22px rgba(0,0,0,.5),
    inset 0 0 0 1px rgba(255,75,18,.36);
}

.stock-product-main {
  width: 100%;
  border: 0;
  padding: 0;
  text-align: left;
  color: inherit;
  background: transparent;
}

.stock-product-main span:last-child,
.code-row div:first-child,
.sale-row div:first-child,
.batch-row div:first-child {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.stock-product-main small,
.code-row small,
.sale-row small,
.batch-row small,
.checkout-summary small,
.sold-code span,
.stock-warning,
.empty-state,
.checkout-message p {
  color: var(--gj2-muted);
}

.recharge-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  flex: 0 0 auto;
}

.stock-meter {
  height: 8px;
  margin: 12px 0;
  border-radius: 999px;
  overflow: hidden;
  background: var(--j2-sunken);
  box-shadow:
    inset 3px 3px 8px rgba(0,0,0,.34),
    inset -2px -2px 6px rgba(255,255,255,.016);
}

.stock-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--j2-accent), #73a284);
}

.product-actions,
.form-actions,
.code-row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.upload-chip {
  flex: 1;
  cursor: pointer;
  justify-content: center;
}

.upload-chip input {
  display: none;
}

.code-toolbar,
.checkout-grid,
.checkout-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.checkout-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.search-field {
  min-height: 46px;
  padding: 0 12px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--j2-muted);
  background: var(--j2-sunken);
  box-shadow:
    inset 3px 3px 8px rgba(0,0,0,.34),
    inset -2px -2px 6px rgba(255,255,255,.016);
}

.search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
}

.checkout-summary span,
.sold-code {
  min-width: 0;
  padding: 12px;
  border-radius: 16px;
  display: grid;
  gap: 4px;
}

.checkout-summary strong,
.sold-code strong {
  color: var(--gj2-text);
  font-weight: 900;
}

.checkout-message {
  padding: 14px;
  border-radius: 18px;
  margin-bottom: 14px;
}

.checkout-message pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 12px 0 0;
  color: var(--j2-text);
  font: inherit;
}

.checkout-button {
  width: 100%;
  justify-content: center;
  gap: 8px;
}

.code-row,
.sale-row,
.batch-row,
.sold-header {
  justify-content: space-between;
}

.icon-action {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
}

.icon-action.danger {
  color: #ff6a50;
}

.sale-code,
.batch-numbers {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.batch-numbers {
  grid-template-columns: repeat(3, max-content);
  align-items: center;
  color: var(--gj2-muted);
  font-size: .82rem;
}

.sale-code code {
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--gj2-text);
}

.sold-code-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gj2-muted);
  font-weight: 800;
}

.recharge-notice {
  color: #8bc7a3;
}

.recharge-error,
.stock-warning {
  color: #ff806f;
  font-weight: 800;
}

.empty-state {
  padding: 18px;
  border-radius: 18px;
  background: var(--j2-sunken);
}

@media (max-width: 980px) {
  .stock-layout,
  .checkout-layout {
    grid-template-columns: 1fr;
  }

  .section-heading {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .recharge-tabs,
  .code-toolbar,
  .checkout-grid,
  .checkout-summary,
  .sold-code-list,
  .batch-numbers,
  .import-score-grid,
  .mapping-grid,
  .preview-row {
    grid-template-columns: 1fr;
  }

  .sold-header,
  .sale-row,
  .batch-row {
    flex-direction: column;
  }

  .sale-code,
  .batch-numbers {
    justify-items: start;
  }

  .product-actions,
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
