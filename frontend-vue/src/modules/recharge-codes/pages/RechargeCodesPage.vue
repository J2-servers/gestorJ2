<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertCircle, AlertTriangle, Archive, CheckCircle2, ChevronRight, ClipboardList,
  FileSpreadsheet, Filter, Inbox, Package, PackageCheck, Plus, RefreshCw,
  ShoppingCart, Table2, Upload, WalletCards, X, XCircle,
} from '@lucide/vue'
import { rechargeCodesService } from '@/services/api/rechargeCodes.service'
import { serversService } from '@/services/api/servers.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  PlanModality,
  RechargeCode,
  RechargeCodeBatch,
  RechargeCodeImportMapping,
  RechargeCodeImportPreview,
  RechargeCodeOrder,
  RechargeCodeProduct,
  Server,
} from '@/types/domain'
import { formatCurrency } from '@/utils/format'

// ── auth ────────────────────────────────────────────────────────────────────
const auth = useAuthStore()
const isStaff = computed(() => auth.isAdmin)

// ── tab navigation ────────────────────────────────────────────────────────
type Tab = 'stock' | 'import' | 'orders' | 'config'
const tab = ref<Tab>(isStaff.value ? 'stock' : 'orders')

// ── global loading/error ──────────────────────────────────────────────────
const loading = ref(true)
const saving = ref(false)
const toast = ref<{ kind: 'ok' | 'error'; msg: string } | null>(null)

function showToast(kind: 'ok' | 'error', msg: string) {
  toast.value = { kind, msg }
  setTimeout(() => { toast.value = null }, 6000)
}

// ── data ──────────────────────────────────────────────────────────────────
const products = ref<RechargeCodeProduct[]>([])
const modalities = ref<PlanModality[]>([])
const servers = ref<Server[]>([])
const orders = ref<RechargeCodeOrder[]>([])
const codes = ref<RechargeCode[]>([])
const batches = ref<RechargeCodeBatch[]>([])

// stock view filters
const stockProductId = ref('')
const stockStatus = ref('')

// ── computed helpers ──────────────────────────────────────────────────────
const totalAvailable = computed(() => products.value.reduce((sum, p) => sum + (p.stock?.available ?? 0), 0))
const totalReserved = computed(() => products.value.reduce((sum, p) => sum + (p.stock?.reserved ?? 0), 0))
const totalSold = computed(() => products.value.reduce((sum, p) => sum + (p.stock?.sold ?? 0), 0))

function productTitle(p: RechargeCodeProduct) {
  return [p.server?.name, p.modality?.name, p.name].filter(Boolean).join(' › ')
}
function priceOf(p: RechargeCodeProduct) {
  return Number(p.sale_value ?? p.saleValue ?? 0)
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    available: 'Disponível', reserved: 'Reservado', sold: 'Vendido',
    voided: 'Inutilizado', cancelled: 'Cancelado',
  }
  return map[s] ?? s
}
function statusClass(s: string) {
  return { available: 'ok', reserved: 'warn', sold: 'muted', voided: 'err', cancelled: 'err' }[s] ?? ''
}
function orderStatusLabel(s: string) {
  const map: Record<string, string> = {
    pending_payment: 'Aguardando pagamento', paid: 'Pago', delivered: 'Entregue',
    canceled: 'Cancelado', expired: 'Expirado', failed: 'Falhou',
  }
  return map[s] ?? s
}
function fmt(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── load ──────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const [productList, modalityList, orderList, serverList] = await Promise.all([
      rechargeCodesService.listProducts(),
      rechargeCodesService.listModalities(),
      isStaff.value ? rechargeCodesService.listOrders() : rechargeCodesService.listMyPurchases(),
      isStaff.value ? serversService.list() : Promise.resolve([]),
    ])
    products.value = productList
    modalities.value = modalityList
    orders.value = orderList
    servers.value = serverList
    if (!stockProductId.value && productList[0]) stockProductId.value = productList[0].id
    if (!importWizard.productId && productList[0]) importWizard.productId = productList[0].id
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao carregar dados.')
  } finally {
    loading.value = false
  }
}

async function loadCodes() {
  if (!stockProductId.value) return
  try {
    const [codeList, batchList] = await Promise.all([
      rechargeCodesService.listCodes(stockProductId.value, stockStatus.value || undefined),
      rechargeCodesService.listBatches(stockProductId.value),
    ])
    codes.value = codeList
    batches.value = batchList
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao carregar códigos.')
  }
}

// ── orders management ─────────────────────────────────────────────────────
async function approveOrder(order: RechargeCodeOrder) {
  saving.value = true
  try {
    await rechargeCodesService.approvePayment(order.id)
    showToast('ok', 'Pagamento aprovado e códigos entregues.')
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao aprovar.')
  } finally {
    saving.value = false
  }
}
async function rejectOrder(order: RechargeCodeOrder) {
  saving.value = true
  try {
    await rechargeCodesService.rejectPayment(order.id)
    showToast('ok', 'Pagamento rejeitado e reserva liberada.')
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao rejeitar.')
  } finally {
    saving.value = false
  }
}

// ── void code ─────────────────────────────────────────────────────────────
async function voidCode(code: RechargeCode) {
  if (!confirm(`Inutilizar código ${code.code}?`)) return
  saving.value = true
  try {
    await rechargeCodesService.voidCode(code.id)
    showToast('ok', 'Código inutilizado.')
    await loadCodes()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao inutilizar.')
  } finally {
    saving.value = false
  }
}

// ── config forms ──────────────────────────────────────────────────────────
const modalityForm = reactive({ serverId: '', name: '', durationDays: 30, active: true })
const productForm = reactive({
  name: '', serverId: '', modalityId: '', denomination: 30,
  saleValue: 0, costValue: 0, description: '', instructions: '', active: true,
})

async function createModality() {
  saving.value = true
  try {
    await rechargeCodesService.createModality({ ...modalityForm, serverId: modalityForm.serverId || undefined })
    Object.assign(modalityForm, { serverId: '', name: '', durationDays: 30, active: true })
    showToast('ok', 'Modalidade criada.')
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha.')
  } finally {
    saving.value = false
  }
}

async function createProduct() {
  saving.value = true
  try {
    await rechargeCodesService.createProduct({
      ...productForm,
      serverId: productForm.serverId || undefined,
      modalityId: productForm.modalityId || undefined,
      saleValue: Number(productForm.saleValue),
      costValue: Number(productForm.costValue),
      denomination: Number(productForm.denomination),
    })
    Object.assign(productForm, { name: '', serverId: '', modalityId: '', denomination: 30, saleValue: 0, costValue: 0, description: '', instructions: '', active: true })
    showToast('ok', 'Produto criado.')
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha.')
  } finally {
    saving.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────
// IMPORT WIZARD
// ─────────────────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4 | 5

const WIZARD_STEPS = [
  { step: 1, label: 'Upload' },
  { step: 2, label: 'Pré-visualizar' },
  { step: 3, label: 'Mapeamento' },
  { step: 4, label: 'Validação' },
  { step: 5, label: 'Confirmar' },
] as const

const MAPPING_FIELDS: Array<{ key: keyof RechargeCodeImportMapping; label: string; required?: boolean }> = [
  { key: 'codeColumn',      label: 'Código (obrigatório)', required: true },
  { key: 'pinColumn',       label: 'PIN / Senha' },
  { key: 'serialColumn',    label: 'Serial' },
  { key: 'expiresAtColumn', label: 'Validade' },
  { key: 'serverColumn',    label: 'Servidor' },
  { key: 'modalityColumn',  label: 'Modalidade / Plano' },
  { key: 'costColumn',      label: 'Custo unitário' },
  { key: 'batchColumn',     label: 'Lote / Identificador' },
  { key: 'supplierColumn',  label: 'Fornecedor' },
  { key: 'noteColumn',      label: 'Observações' },
]

const importWizard = reactive({
  step: 1 as WizardStep,
  productId: '',
  notes: '',
  file: null as File | null,
  dragover: false,
  preview: null as RechargeCodeImportPreview | null,
  mapping: {} as Partial<RechargeCodeImportMapping>,
  validating: false,
  importing: false,
  importResult: null as { importedCount: number; duplicateCount: number; invalidCount: number; totalRows: number } | null,
})

function wizardReset() {
  importWizard.step = 1
  importWizard.file = null
  importWizard.notes = ''
  importWizard.preview = null
  importWizard.mapping = {}
  importWizard.importResult = null
}

function onFileDrop(e: DragEvent) {
  importWizard.dragover = false
  const f = e.dataTransfer?.files?.[0]
  if (f && f.name.toLowerCase().endsWith('.xlsx')) {
    importWizard.file = f
    importWizard.preview = null
  } else {
    showToast('error', 'Apenas arquivos .xlsx são aceitos.')
  }
}
function onFileInput(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  importWizard.file = f
  importWizard.preview = null
}

async function wizardStep2() {
  if (!importWizard.file || !importWizard.productId) return
  importWizard.validating = true
  try {
    // Quick pre-read: just get the sheet names and headers
    const preview = await rechargeCodesService.previewImport(importWizard.productId, importWizard.file, {})
    importWizard.preview = preview
    // Pre-populate mapping from server suggestions
    Object.assign(importWizard.mapping, preview.mapping)
    importWizard.step = 2
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao ler arquivo.')
  } finally {
    importWizard.validating = false
  }
}

function wizardStep3() {
  if (!importWizard.preview) return
  importWizard.step = 3
}

async function wizardStep4() {
  if (!importWizard.file || !importWizard.productId) return
  importWizard.validating = true
  try {
    const preview = await rechargeCodesService.previewImport(importWizard.productId, importWizard.file, importWizard.mapping)
    importWizard.preview = preview
    importWizard.step = 4
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha na validação.')
  } finally {
    importWizard.validating = false
  }
}

function wizardStep5() {
  importWizard.step = 5
}

async function wizardConfirmImport() {
  if (!importWizard.file || !importWizard.productId || !importWizard.mapping.codeColumn) {
    showToast('error', 'Coluna de código obrigatória não mapeada.')
    return
  }
  importWizard.importing = true
  try {
    const result = await rechargeCodesService.importXlsx(
      importWizard.productId,
      importWizard.file,
      importWizard.notes || undefined,
      importWizard.mapping,
    )
    importWizard.importResult = result
    importWizard.step = 5
    showToast('ok', `Importação concluída: ${result.importedCount} códigos adicionados ao estoque.`)
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao importar.')
  } finally {
    importWizard.importing = false
  }
}

// bytes → "1.4 MB"
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

onMounted(load)
</script>

<template>
  <div class="rcp">

    <!-- toast -->
    <Transition name="toast-slide">
      <div v-if="toast" class="rcp-toast" :class="toast.kind">
        <CheckCircle2 v-if="toast.kind === 'ok'" :size="17" />
        <AlertCircle v-else :size="17" />
        {{ toast.msg }}
        <button class="toast-x" @click="toast = null"><X :size="15" /></button>
      </div>
    </Transition>

    <!-- header -->
    <header class="rcp-header">
      <div class="rcp-header-left">
        <span class="eyebrow">Gestão de estoque</span>
        <h1>Códigos de recarga</h1>
        <p>{{ isStaff ? 'Importação XLSX, estoque, pedidos e configurações.' : 'Produtos disponíveis e seus pedidos entregues.' }}</p>
      </div>
      <div class="rcp-header-right">
        <button class="btn" :disabled="loading" @click="load"><RefreshCw :size="16" /> Atualizar</button>
        <RouterLink class="btn primary" to="/recharge-codes/checkout"><WalletCards :size="16" /> Checkout</RouterLink>
      </div>
    </header>

    <!-- stats (admin only) -->
    <div v-if="isStaff" class="rcp-stats">
      <div class="stat"><strong>{{ products.length }}</strong><small>produtos</small></div>
      <div class="stat ok"><strong>{{ totalAvailable }}</strong><small>disponíveis</small></div>
      <div class="stat warn"><strong>{{ totalReserved }}</strong><small>reservados</small></div>
      <div class="stat muted"><strong>{{ totalSold }}</strong><small>vendidos</small></div>
    </div>

    <!-- tab bar -->
    <nav class="rcp-tabs">
      <button v-if="isStaff" :class="{ active: tab === 'stock' }" @click="tab = 'stock'; loadCodes()">
        <Table2 :size="16" /> Estoque
      </button>
      <button v-if="!isStaff" :class="{ active: tab === 'stock' }" @click="tab = 'stock'">
        <Package :size="16" /> Produtos
      </button>
      <button v-if="isStaff" :class="{ active: tab === 'import' }" @click="tab = 'import'">
        <FileSpreadsheet :size="16" /> Importar XLSX
      </button>
      <button :class="{ active: tab === 'orders' }" @click="tab = 'orders'">
        <ShoppingCart :size="16" /> {{ isStaff ? 'Pedidos' : 'Meus pedidos' }}
      </button>
      <button v-if="isStaff" :class="{ active: tab === 'config' }" @click="tab = 'config'">
        <PackageCheck :size="16" /> Configurar
      </button>
    </nav>

    <!-- ── TAB: STOCK ─────────────────────────────────────────────────── -->
    <section v-if="tab === 'stock'" class="rcp-panel">
      <!-- admin view: full codes table -->
      <template v-if="isStaff">
        <div class="stock-filters">
          <label>
            Produto
            <select v-model="stockProductId" class="rcp-select" @change="loadCodes">
              <option v-for="p in products" :key="p.id" :value="p.id">{{ productTitle(p) }}</option>
            </select>
          </label>
          <label>
            Status
            <select v-model="stockStatus" class="rcp-select" @change="loadCodes">
              <option value="">Todos</option>
              <option value="available">Disponível</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
              <option value="voided">Inutilizado</option>
            </select>
          </label>
          <button class="btn" @click="loadCodes"><Filter :size="15" /> Filtrar</button>
        </div>

        <!-- product stock summary -->
        <div v-if="products.find(p => p.id === stockProductId)" class="stock-product-bar">
          <div v-for="(val, key) in products.find(p2 => p2.id === stockProductId)?.stock ?? {}"
               :key="key" class="stock-chip" :class="key">
            <strong>{{ val }}</strong><small>{{ key }}</small>
          </div>
        </div>

        <!-- batches -->
        <details v-if="batches.length" class="batch-details">
          <summary><Archive :size="15" /> {{ batches.length }} lote(s) importados</summary>
          <div class="batch-list">
            <div v-for="b in batches" :key="b.id" class="batch-row">
              <span class="batch-file">{{ b.sourceFilename ?? b.source_filename ?? 'sem nome' }}</span>
              <span class="badge ok">{{ b.importedCount ?? b.imported_count }} importados</span>
              <span class="badge muted">{{ b.duplicateCount ?? b.duplicate_count }} dupl.</span>
              <span class="badge err">{{ b.invalidCount ?? b.invalid_count }} inválidos</span>
              <small>{{ fmt(b.createdAt ?? b.created_date) }}</small>
            </div>
          </div>
        </details>

        <!-- codes table -->
        <div v-if="codes.length" class="code-table-wrap">
          <table class="code-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>PIN</th>
                <th>Serial</th>
                <th>Validade</th>
                <th>Status</th>
                <th>Vendido para</th>
                <th>Vendido em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in codes" :key="c.id">
                <td class="code-val">{{ c.code }}</td>
                <td class="muted">{{ c.pin ?? '—' }}</td>
                <td class="muted">{{ c.serial ?? '—' }}</td>
                <td class="muted">{{ fmt(c.expiresAt ?? c.expires_at) }}</td>
                <td>
                  <span class="badge" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
                </td>
                <td class="muted">{{ (c.soldTo ?? (c as any).sold_to)?.name ?? '—' }}</td>
                <td class="muted">{{ fmt(c.soldAt ?? c.sold_at) }}</td>
                <td>
                  <button v-if="c.status === 'available'"
                    class="btn-xs err" :disabled="saving" @click="voidCode(c)">
                    <XCircle :size="13" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="!loading" class="rcp-empty">
          <Inbox :size="32" />
          <p>Nenhum código encontrado para os filtros selecionados.</p>
          <button class="btn primary" @click="tab = 'import'"><Upload :size="15" /> Importar XLSX</button>
        </div>
      </template>

      <!-- reseller view: product cards only -->
      <template v-else>
        <div class="product-grid">
          <div v-for="p in products" :key="p.id" class="product-card">
            <div class="product-card-head">
              <strong>{{ productTitle(p) }}</strong>
              <span class="avail-dot" :class="{ ok: p.availableForSale }"></span>
            </div>
            <p class="product-desc">{{ p.description ?? '' }}</p>
            <div class="product-card-foot">
              <span class="product-price">{{ formatCurrency(priceOf(p)) }}</span>
              <RouterLink class="btn primary sm" to="/recharge-codes/checkout">
                <ShoppingCart :size="14" /> Comprar
              </RouterLink>
            </div>
            <div class="product-avail">{{ p.availableForSale ? 'Em estoque' : 'Fora de estoque' }}</div>
          </div>
        </div>
        <div v-if="!products.length && !loading" class="rcp-empty">
          <Package :size="32" />
          <p>Nenhum produto disponível no momento.</p>
        </div>
      </template>
    </section>

    <!-- ── TAB: IMPORT WIZARD ─────────────────────────────────────────── -->
    <section v-if="isStaff && tab === 'import'" class="rcp-panel">

      <!-- stepper header -->
      <div class="wizard-stepper">
        <div
          v-for="s in WIZARD_STEPS" :key="s.step"
          class="wizard-step"
          :class="{ active: importWizard.step === s.step, done: importWizard.step > s.step }"
        >
          <span class="step-bubble">
            <CheckCircle2 v-if="importWizard.step > s.step" :size="15" />
            <template v-else>{{ s.step }}</template>
          </span>
          <span class="step-label">{{ s.label }}</span>
          <ChevronRight v-if="s.step < 5" :size="14" class="step-chevron" />
        </div>
      </div>

      <!-- ── STEP 1: Upload ────────────────────────── -->
      <div v-if="importWizard.step === 1" class="wizard-body">
        <h2 class="wizard-title">Selecionar arquivo e produto</h2>

        <label class="form-label">
          Produto de destino
          <select v-model="importWizard.productId" class="rcp-select">
            <option v-for="p in products" :key="p.id" :value="p.id">{{ productTitle(p) }}</option>
          </select>
        </label>

        <div
          class="drop-zone"
          :class="{ dragover: importWizard.dragover, 'has-file': !!importWizard.file }"
          @dragover.prevent="importWizard.dragover = true"
          @dragleave="importWizard.dragover = false"
          @drop.prevent="onFileDrop"
        >
          <template v-if="importWizard.file">
            <FileSpreadsheet :size="36" class="drop-icon ok" />
            <p class="drop-filename">{{ importWizard.file.name }}</p>
            <p class="drop-sub">{{ fmtSize(importWizard.file.size) }} · clique para trocar</p>
          </template>
          <template v-else>
            <Upload :size="36" class="drop-icon" />
            <p class="drop-label">Arraste um arquivo .xlsx aqui</p>
            <p class="drop-sub">ou clique para selecionar (máx. 20 MB · 50.000 linhas)</p>
          </template>
          <input type="file" accept=".xlsx" class="drop-input" @change="onFileInput" />
        </div>

        <label class="form-label">
          Notas do lote (opcional)
          <input v-model="importWizard.notes" class="rcp-input" placeholder="Fornecedor, número de nota fiscal, lote…" />
        </label>

        <div class="wizard-actions">
          <button
            class="btn primary"
            :disabled="!importWizard.file || !importWizard.productId || importWizard.validating"
            @click="wizardStep2"
          >
            <RefreshCw v-if="importWizard.validating" :size="15" class="spin" />
            <ChevronRight v-else :size="15" />
            {{ importWizard.validating ? 'Lendo arquivo…' : 'Continuar' }}
          </button>
        </div>
      </div>

      <!-- ── STEP 2: Preview / sheet selection ─────── -->
      <div v-if="importWizard.step === 2 && importWizard.preview" class="wizard-body">
        <h2 class="wizard-title">Pré-visualizar planilha</h2>

        <div class="preview-meta">
          <div class="meta-row"><FileSpreadsheet :size="15" />
            <span><strong>{{ importWizard.preview.fileName }}</strong> · {{ fmtSize(importWizard.preview.fileSize) }}</span>
          </div>
          <div class="meta-row"><Table2 :size="15" />
            <span>{{ importWizard.preview.totalRows }} linhas · {{ importWizard.preview.headers.length }} colunas</span>
          </div>
        </div>

        <label v-if="importWizard.preview.sheetNames.length > 1" class="form-label">
          Aba da planilha
          <select v-model="importWizard.mapping.sheetName" class="rcp-select">
            <option v-for="sh in importWizard.preview.sheetNames" :key="sh" :value="sh">{{ sh }}</option>
          </select>
        </label>

        <!-- header chips -->
        <div class="header-chips-label">Colunas detectadas:</div>
        <div class="header-chips">
          <span v-for="h in importWizard.preview.headers" :key="h" class="hchip">{{ h }}</span>
        </div>

        <!-- sample table -->
        <div class="sample-table-wrap">
          <table class="code-table">
            <thead>
              <tr>
                <th>#</th>
                <th v-for="h in importWizard.preview.headers.slice(0, 8)" :key="h">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in importWizard.preview.sampleRows.slice(0, 8)" :key="row.rowNumber">
                <td class="muted">{{ row.rowNumber }}</td>
                <td>{{ row.code || '—' }}</td>
                <td v-for="_ in importWizard.preview!.headers.slice(1, 8)" :key="_" class="muted">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="wizard-actions">
          <button class="btn" @click="importWizard.step = 1">Voltar</button>
          <button class="btn primary" @click="wizardStep3"><ChevronRight :size="15" /> Mapear colunas</button>
        </div>
      </div>

      <!-- ── STEP 3: Mapping ──────────────────────── -->
      <div v-if="importWizard.step === 3 && importWizard.preview" class="wizard-body">
        <h2 class="wizard-title">Mapear colunas XLSX → campos do sistema</h2>
        <p class="wizard-sub">Selecione qual coluna da planilha corresponde a cada campo. Apenas <strong>Código</strong> é obrigatório.</p>

        <div class="mapping-grid">
          <div v-for="field in MAPPING_FIELDS" :key="field.key" class="mapping-row">
            <label class="mapping-label">
              {{ field.label }}
              <span v-if="field.required" class="req-star">*</span>
            </label>
            <select v-model="(importWizard.mapping as any)[field.key]" class="rcp-select" :class="{ required: field.required && !(importWizard.mapping as any)[field.key] }">
              <option value="">— não importar —</option>
              <option v-for="h in importWizard.preview!.headers" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
        </div>

        <div class="wizard-actions">
          <button class="btn" @click="importWizard.step = 2">Voltar</button>
          <button
            class="btn primary"
            :disabled="!importWizard.mapping.codeColumn || importWizard.validating"
            @click="wizardStep4"
          >
            <RefreshCw v-if="importWizard.validating" :size="15" class="spin" />
            <ChevronRight v-else :size="15" />
            {{ importWizard.validating ? 'Validando…' : 'Validar dados' }}
          </button>
        </div>
      </div>

      <!-- ── STEP 4: Validation results ──────────── -->
      <div v-if="importWizard.step === 4 && importWizard.preview" class="wizard-body">
        <h2 class="wizard-title">Resultado da validação</h2>

        <div class="validation-stats">
          <div class="vstat ok">
            <strong>{{ importWizard.preview.importableCount }}</strong>
            <small>aptos para importar</small>
          </div>
          <div class="vstat warn">
            <strong>{{ importWizard.preview.duplicateInFileCount }}</strong>
            <small>duplicados no arquivo</small>
          </div>
          <div class="vstat muted">
            <strong>{{ importWizard.preview.duplicateInSystemCount }}</strong>
            <small>já existem no sistema</small>
          </div>
          <div class="vstat err">
            <strong>{{ importWizard.preview.invalidCount }}</strong>
            <small>inválidos</small>
          </div>
        </div>

        <!-- invalid samples -->
        <div v-if="importWizard.preview.invalidSamples.length" class="invalid-box">
          <div class="invalid-box-head">
            <AlertTriangle :size="15" /> Amostras de linhas inválidas
          </div>
          <div v-for="s in importWizard.preview.invalidSamples" :key="s.rowNumber" class="invalid-row">
            <span class="badge err">linha {{ s.rowNumber }}</span>
            <span>{{ s.reason }}</span>
          </div>
        </div>

        <!-- valid samples -->
        <div v-if="importWizard.preview.sampleRows.length" class="sample-table-wrap">
          <div class="sample-table-head">Amostra de linhas válidas</div>
          <table class="code-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>PIN</th>
                <th>Serial</th>
                <th>Validade</th>
                <th>Produto alvo</th>
                <th>Dup. sistema</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in importWizard.preview.sampleRows" :key="row.rowNumber"
                  :class="{ invalid: !row.valid, dup: row.duplicateInSystem }">
                <td class="muted">{{ row.rowNumber }}</td>
                <td :class="{ 'code-val': row.valid }">{{ row.code || '—' }}</td>
                <td class="muted">{{ row.pin ?? '—' }}</td>
                <td class="muted">{{ row.serial ?? '—' }}</td>
                <td class="muted">{{ row.expiresAt ? fmt(row.expiresAt) : '—' }}</td>
                <td class="muted">{{ row.targetProduct || '—' }}</td>
                <td>
                  <span v-if="row.duplicateInSystem" class="badge warn">Duplicado</span>
                  <span v-else-if="!row.valid" class="badge err">Inválido</span>
                  <span v-else class="badge ok">OK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="importWizard.preview.importableCount === 0" class="rcp-empty">
          <AlertCircle :size="28" />
          <p>Nenhum código apto para importar. Verifique o mapeamento de colunas.</p>
        </div>

        <div class="wizard-actions">
          <button class="btn" @click="importWizard.step = 3">Voltar</button>
          <button
            class="btn primary"
            :disabled="importWizard.preview.importableCount === 0"
            @click="wizardStep5"
          >
            <ChevronRight :size="15" /> Confirmar importação
          </button>
        </div>
      </div>

      <!-- ── STEP 5: Confirm / Result ─────────────── -->
      <div v-if="importWizard.step === 5" class="wizard-body">

        <!-- success result after import -->
        <template v-if="importWizard.importResult">
          <div class="import-success">
            <CheckCircle2 :size="48" class="success-icon" />
            <h2>Importação concluída!</h2>
            <div class="import-result-grid">
              <div class="vstat ok">
                <strong>{{ importWizard.importResult.importedCount }}</strong>
                <small>importados</small>
              </div>
              <div class="vstat warn">
                <strong>{{ importWizard.importResult.duplicateCount }}</strong>
                <small>duplicados ignorados</small>
              </div>
              <div class="vstat err">
                <strong>{{ importWizard.importResult.invalidCount }}</strong>
                <small>inválidos</small>
              </div>
            </div>
            <div class="wizard-actions center">
              <button class="btn" @click="wizardReset"><Upload :size="15" /> Nova importação</button>
              <button class="btn primary" @click="tab = 'stock'; loadCodes()"><Table2 :size="15" /> Ver estoque</button>
            </div>
          </div>
        </template>

        <!-- pre-import confirmation -->
        <template v-else-if="importWizard.preview">
          <h2 class="wizard-title">Confirmar importação</h2>
          <p class="wizard-sub">Revise o resumo antes de confirmar. Esta ação não pode ser desfeita para os registros criados.</p>

          <div class="confirm-summary">
            <div class="confirm-row"><span>Arquivo</span><strong>{{ importWizard.preview.fileName }}</strong></div>
            <div class="confirm-row"><span>Produto</span><strong>{{ productTitle(products.find(p => p.id === importWizard.productId)!) }}</strong></div>
            <div class="confirm-row"><span>Total de linhas</span><strong>{{ importWizard.preview.totalRows }}</strong></div>
            <div class="confirm-row ok"><span>A importar</span><strong>{{ importWizard.preview.importableCount }}</strong></div>
            <div class="confirm-row warn"><span>Duplicados (serão ignorados)</span><strong>{{ importWizard.preview.duplicateInFileCount + importWizard.preview.duplicateInSystemCount }}</strong></div>
            <div v-if="importWizard.preview.invalidCount" class="confirm-row err">
              <span>Inválidos (serão ignorados)</span><strong>{{ importWizard.preview.invalidCount }}</strong>
            </div>
            <div v-if="importWizard.notes" class="confirm-row"><span>Notas</span><strong>{{ importWizard.notes }}</strong></div>
          </div>

          <div class="confirm-mapping">
            <div class="confirm-mapping-head"><ClipboardList :size="14" /> Mapeamento ativo</div>
            <div v-for="field in MAPPING_FIELDS.filter(f => (importWizard.mapping as any)[f.key])" :key="field.key" class="confirm-map-row">
              <span class="badge muted">{{ field.label }}</span>
              <ChevronRight :size="12" class="muted" />
              <span>{{ (importWizard.mapping as any)[field.key] }}</span>
            </div>
          </div>

          <div class="wizard-actions">
            <button class="btn" @click="importWizard.step = 4">Voltar</button>
            <button
              class="btn primary"
              :disabled="importWizard.importing"
              @click="wizardConfirmImport"
            >
              <RefreshCw v-if="importWizard.importing" :size="15" class="spin" />
              <CheckCircle2 v-else :size="15" />
              {{ importWizard.importing ? 'Importando…' : `Importar ${importWizard.preview.importableCount} códigos` }}
            </button>
          </div>
        </template>
      </div>

    </section>

    <!-- ── TAB: ORDERS ────────────────────────────────────────────────── -->
    <section v-if="tab === 'orders'" class="rcp-panel">
      <div v-if="!orders.length && !loading" class="rcp-empty">
        <ShoppingCart :size="32" />
        <p>Nenhum pedido registrado.</p>
      </div>
      <div v-else class="orders-list">
        <article v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-card-head">
            <div>
              <strong>Pedido #{{ order.id.slice(-8).toUpperCase() }}</strong>
              <div class="order-meta">
                <span class="badge" :class="{
                  ok: order.status === 'delivered' || order.status === 'paid',
                  warn: order.status === 'pending_payment',
                  err: order.status === 'failed' || order.status === 'canceled',
                  muted: order.status === 'expired',
                }">{{ orderStatusLabel(order.status) }}</span>
                <span class="muted">{{ formatCurrency(Number(order.totalValue ?? order.total_value ?? 0)) }}</span>
                <span class="muted">{{ fmt(order.createdAt ?? order.created_date) }}</span>
              </div>
            </div>
            <div v-if="isStaff && order.reseller" class="order-reseller">
              {{ order.reseller.name ?? order.reseller.email }}
            </div>
          </div>

          <!-- items -->
          <div class="order-items">
            <div v-for="item in order.items" :key="item.id" class="order-item">
              <span>{{ item.quantity }}× {{ productTitle(item.product) }}</span>
              <span class="muted">{{ formatCurrency(Number(item.unitValue ?? item.unit_value ?? 0)) }} cada</span>
            </div>
          </div>

          <!-- delivered codes (visible to buyer after delivery) -->
          <div v-if="(order.status === 'delivered' || order.status === 'paid') && order.items.some(i => i.codes?.length)" class="order-codes">
            <div class="order-codes-head">Códigos entregues:</div>
            <div v-for="item in order.items" :key="item.id + 'c'">
              <div v-for="c in item.codes" :key="c.id" class="delivered-code">
                <span class="code-val">{{ c.code }}</span>
                <span v-if="c.pin" class="muted">PIN: {{ c.pin }}</span>
                <span v-if="c.serial" class="muted">Série: {{ c.serial }}</span>
              </div>
            </div>
          </div>

          <!-- admin actions -->
          <div v-if="isStaff && order.status === 'pending_payment'" class="order-actions">
            <button class="btn primary" :disabled="saving" @click="approveOrder(order)">
              <CheckCircle2 :size="15" /> Aprovar e entregar
            </button>
            <button class="btn err" :disabled="saving" @click="rejectOrder(order)">
              <XCircle :size="15" /> Rejeitar
            </button>
          </div>

          <!-- payment info -->
          <div v-if="order.payment?.paymentCode || order.payment?.payment_code" class="payment-box">
            <small class="muted">Código PIX / Chave</small>
            <code class="pix-code">{{ order.payment.paymentCode ?? order.payment.payment_code }}</code>
          </div>
        </article>
      </div>
    </section>

    <!-- ── TAB: CONFIG ────────────────────────────────────────────────── -->
    <section v-if="isStaff && tab === 'config'" class="rcp-panel config-grid">

      <!-- modality form -->
      <form class="config-form" @submit.prevent="createModality">
        <div class="form-head"><h3>Nova modalidade</h3></div>
        <label class="form-label">
          Servidor
          <select v-model="modalityForm.serverId" class="rcp-select">
            <option value="">Geral (sem servidor)</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="form-label">
          Nome
          <input v-model="modalityForm.name" class="rcp-input" placeholder="Mensal, Trimestral…" required />
        </label>
        <label class="form-label">
          Duração (dias)
          <input v-model.number="modalityForm.durationDays" class="rcp-input" type="number" min="1" />
        </label>
        <button class="btn primary" type="submit" :disabled="saving">
          <Plus :size="15" /> Criar modalidade
        </button>
      </form>

      <!-- product form -->
      <form class="config-form" @submit.prevent="createProduct">
        <div class="form-head"><h3>Novo produto comercial</h3></div>
        <label class="form-label">
          Nome
          <input v-model="productForm.name" class="rcp-input" placeholder="Blade 30 dias" required />
        </label>
        <label class="form-label">
          Servidor
          <select v-model="productForm.serverId" class="rcp-select">
            <option value="">Sem servidor</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <label class="form-label">
          Modalidade
          <select v-model="productForm.modalityId" class="rcp-select">
            <option value="">Sem modalidade</option>
            <option v-for="m in modalities" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
        <div class="form-row">
          <label class="form-label">
            Preço venda (R$)
            <input v-model.number="productForm.saleValue" class="rcp-input" type="number" min="0" step="0.01" />
          </label>
          <label class="form-label">
            Custo (R$)
            <input v-model.number="productForm.costValue" class="rcp-input" type="number" min="0" step="0.01" />
          </label>
        </div>
        <label class="form-label">
          Dias / créditos (denomination)
          <input v-model.number="productForm.denomination" class="rcp-input" type="number" min="1" />
        </label>
        <button class="btn primary" type="submit" :disabled="saving">
          <Plus :size="15" /> Criar produto
        </button>
      </form>

      <!-- existing modalities -->
      <div class="config-list-panel">
        <div class="form-head"><h3>Modalidades</h3></div>
        <div v-if="!modalities.length" class="muted">Nenhuma modalidade cadastrada.</div>
        <div v-for="m in modalities" :key="m.id" class="config-item">
          <span>{{ m.name }}</span>
          <span class="muted">{{ m.durationDays ?? m.duration_days ?? '—' }} dias</span>
          <span class="badge" :class="m.active ? 'ok' : 'muted'">{{ m.active ? 'ativo' : 'inativo' }}</span>
        </div>
      </div>

      <!-- existing products -->
      <div class="config-list-panel">
        <div class="form-head"><h3>Produtos</h3></div>
        <div v-if="!products.length" class="muted">Nenhum produto cadastrado.</div>
        <div v-for="p in products" :key="p.id" class="config-item">
          <span>{{ productTitle(p) }}</span>
          <span class="muted">{{ formatCurrency(priceOf(p)) }}</span>
          <div class="stock-mini">
            <span>{{ p.stock?.available ?? 0 }} disp.</span>
            <span>{{ p.stock?.sold ?? 0 }} vend.</span>
          </div>
          <span class="badge" :class="p.active ? 'ok' : 'muted'">{{ p.active ? 'ativo' : 'inativo' }}</span>
        </div>
      </div>

    </section>

  </div>
</template>

<style scoped>
/* ── tokens & layout ────────────────────────────────────────────────────── */
.rcp { display: grid; gap: 16px; }

.muted { color: var(--gj2-muted); }

/* ── toast ──────────────────────────────────────────────────────────────── */
.rcp-toast {
  display: flex; align-items: center; gap: 10px; padding: 13px 16px;
  border-radius: 16px; font-weight: 700; font-size: 14px;
  background: rgba(12,13,13,.97);
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
  position: sticky; top: 12px; z-index: 60;
}
.rcp-toast.ok  { color: #91d2a4; border: 1px solid rgba(145,210,164,.2); }
.rcp-toast.error { color: #ff8b7c; border: 1px solid rgba(255,139,124,.2); }
.toast-x { margin-left: auto; background: none; border: none; cursor: pointer; color: inherit; opacity: .6; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all .25s; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* ── header ─────────────────────────────────────────────────────────────── */
.rcp-header {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
  padding: 20px 22px; border-radius: 24px;
  background: rgba(6,7,7,.96);
  box-shadow: 8px 10px 22px rgba(0,0,0,.44), inset 1px 1px 0 rgba(255,255,255,.014);
}
.eyebrow { color: var(--gj2-orange); text-transform: uppercase; font-size: 11px; font-weight: 950; }
.rcp-header h1 { margin: 4px 0 0; font-size: 22px; }
.rcp-header p { margin: 4px 0 0; color: var(--gj2-muted); font-size: 13px; }
.rcp-header-right { display: flex; gap: 10px; flex-shrink: 0; }

/* ── stats ──────────────────────────────────────────────────────────────── */
.rcp-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.stat {
  padding: 16px; border-radius: 20px; text-align: center;
  background: rgba(6,7,7,.96);
  box-shadow: 6px 8px 18px rgba(0,0,0,.4);
}
.stat strong { display: block; font-size: 30px; }
.stat small { color: var(--gj2-muted); font-size: 12px; }
.stat.ok strong { color: #91d2a4; }
.stat.warn strong { color: #f5c842; }
.stat.muted strong { color: var(--gj2-muted); }

/* ── tabs ───────────────────────────────────────────────────────────────── */
.rcp-tabs {
  display: flex; gap: 4px; padding: 4px;
  border-radius: 20px; background: rgba(6,7,7,.96);
  box-shadow: 6px 8px 18px rgba(0,0,0,.4);
}
.rcp-tabs button {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 14px; border: none; border-radius: 16px; cursor: pointer;
  background: transparent; color: var(--gj2-muted); font-weight: 700; font-size: 13px;
  transition: all .18s;
}
.rcp-tabs button.active {
  background: rgba(255,75,18,.14); color: var(--gj2-orange);
}
.rcp-tabs button:hover:not(.active) { background: rgba(255,255,255,.05); color: var(--gj2-text); }

/* ── panel ──────────────────────────────────────────────────────────────── */
.rcp-panel {
  padding: 20px; border-radius: 24px;
  background: rgba(6,7,7,.96);
  box-shadow: 8px 10px 22px rgba(0,0,0,.44), inset 1px 1px 0 rgba(255,255,255,.012);
}

/* ── buttons ────────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  min-height: 38px; padding: 0 14px; border: none; border-radius: 13px;
  cursor: pointer; font-weight: 800; font-size: 13px;
  color: var(--gj2-text); background: rgba(16,17,17,.9); text-decoration: none;
  transition: opacity .15s;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn.primary { background: linear-gradient(135deg, #ff4b12, #8f1608); }
.btn.err { background: rgba(200,40,40,.25); color: #ff8b7c; }
.btn.sm { min-height: 32px; padding: 0 10px; font-size: 12px; }
.btn-xs { display: inline-flex; align-items: center; gap: 4px; border: none; border-radius: 8px; cursor: pointer; padding: 4px 8px; background: rgba(200,40,40,.18); color: #ff8b7c; font-size: 11px; }
.btn-xs:disabled { opacity: .4; cursor: not-allowed; }

/* ── badge ──────────────────────────────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px;
  font-size: 11px; font-weight: 800;
  background: rgba(255,255,255,.07); color: var(--gj2-muted);
}
.badge.ok { background: rgba(145,210,164,.12); color: #91d2a4; }
.badge.warn { background: rgba(245,200,66,.12); color: #f5c842; }
.badge.err { background: rgba(255,139,124,.12); color: #ff8b7c; }
.badge.muted { background: rgba(255,255,255,.06); color: var(--gj2-muted); }

/* ── selects / inputs ───────────────────────────────────────────────────── */
.rcp-select, .rcp-input {
  width: 100%; min-height: 40px; padding: 0 12px; border: none; border-radius: 13px;
  background: rgba(3,4,4,.76); color: var(--gj2-text); font-size: 13px;
  box-shadow: inset 2px 2px 6px rgba(0,0,0,.32);
}
.rcp-select.required { box-shadow: inset 2px 2px 6px rgba(0,0,0,.32), 0 0 0 1.5px rgba(255,139,124,.4); }

/* ── form labels ────────────────────────────────────────────────────────── */
.form-label { display: grid; gap: 7px; font-size: 12px; font-weight: 850; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.req-star { color: var(--gj2-orange); }

/* ── empty state ────────────────────────────────────────────────────────── */
.rcp-empty {
  display: grid; place-items: center; gap: 12px; padding: 48px 16px;
  text-align: center; color: var(--gj2-muted);
}

/* ── stock tab ──────────────────────────────────────────────────────────── */
.stock-filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
.stock-filters label { display: grid; gap: 6px; font-size: 12px; font-weight: 850; flex: 1; min-width: 160px; }
.stock-product-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.stock-chip { padding: 10px 16px; border-radius: 16px; background: rgba(3,4,4,.7); }
.stock-chip strong { display: block; font-size: 20px; }
.stock-chip small { font-size: 11px; color: var(--gj2-muted); }
.stock-chip.available strong { color: #91d2a4; }
.stock-chip.reserved strong { color: #f5c842; }
.stock-chip.sold strong { color: var(--gj2-muted); }

.batch-details { margin-bottom: 14px; }
.batch-details summary { cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: var(--gj2-muted); padding: 8px 4px; }
.batch-list { display: grid; gap: 6px; margin-top: 8px; }
.batch-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; background: rgba(3,4,4,.6); flex-wrap: wrap; }
.batch-file { font-weight: 700; font-size: 13px; flex: 1; min-width: 140px; }

.code-table-wrap { overflow-x: auto; border-radius: 16px; }
.code-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.code-table th { padding: 10px 12px; text-align: left; color: var(--gj2-muted); font-weight: 800; border-bottom: 1px solid rgba(255,255,255,.06); white-space: nowrap; }
.code-table td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,.04); vertical-align: middle; }
.code-table tr:last-child td { border-bottom: none; }
.code-table tr.invalid td { opacity: .6; }
.code-table tr.dup td { background: rgba(245,200,66,.04); }
.code-val { font-family: monospace; font-size: 12px; font-weight: 700; letter-spacing: .04em; }

/* product cards (reseller) */
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.product-card { padding: 16px; border-radius: 20px; background: rgba(3,4,4,.72); display: grid; gap: 10px; }
.product-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.product-card-head strong { font-size: 14px; line-height: 1.3; }
.avail-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.2); flex-shrink: 0; }
.avail-dot.ok { background: #91d2a4; box-shadow: 0 0 8px rgba(145,210,164,.5); }
.product-desc { font-size: 12px; color: var(--gj2-muted); margin: 0; }
.product-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.product-price { font-size: 18px; font-weight: 900; }
.product-avail { font-size: 11px; color: var(--gj2-muted); }

/* ── wizard ─────────────────────────────────────────────────────────────── */
.wizard-stepper {
  display: flex; align-items: center; gap: 0; margin-bottom: 28px;
  padding: 16px; border-radius: 18px; background: rgba(3,4,4,.6);
  overflow-x: auto; scrollbar-width: none;
}
.wizard-step {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
  color: var(--gj2-muted);
}
.wizard-step.active { color: var(--gj2-text); }
.wizard-step.done { color: #91d2a4; }
.step-bubble {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 900; flex-shrink: 0;
  background: rgba(255,255,255,.06);
  transition: all .2s;
}
.wizard-step.active .step-bubble { background: var(--gj2-orange); color: #fff; }
.wizard-step.done .step-bubble { background: rgba(145,210,164,.18); }
.step-label { font-size: 12px; font-weight: 800; white-space: nowrap; }
.step-chevron { color: rgba(255,255,255,.2); margin: 0 6px; }

.wizard-body { display: grid; gap: 18px; }
.wizard-title { margin: 0; font-size: 18px; }
.wizard-sub { margin: 0; color: var(--gj2-muted); font-size: 13px; }
.wizard-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; margin-top: 8px; }
.wizard-actions.center { justify-content: center; }

/* drop zone */
.drop-zone {
  position: relative; border-radius: 20px; border: 2px dashed rgba(255,255,255,.12);
  padding: 40px 20px; text-align: center; cursor: pointer;
  transition: all .2s; display: grid; place-items: center; gap: 8px;
}
.drop-zone:hover, .drop-zone.dragover { border-color: var(--gj2-orange); background: rgba(255,75,18,.05); }
.drop-zone.has-file { border-color: rgba(145,210,164,.4); background: rgba(145,210,164,.04); }
.drop-icon { color: var(--gj2-muted); }
.drop-icon.ok { color: #91d2a4; }
.drop-label { font-weight: 800; font-size: 15px; margin: 0; }
.drop-filename { font-weight: 900; margin: 0; font-size: 15px; }
.drop-sub { color: var(--gj2-muted); font-size: 12px; margin: 0; }
.drop-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }

/* preview meta */
.preview-meta { display: grid; gap: 8px; padding: 14px; border-radius: 14px; background: rgba(3,4,4,.6); }
.meta-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }

/* header chips */
.header-chips-label { font-size: 11px; font-weight: 800; color: var(--gj2-muted); }
.header-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.hchip { padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.07); font-size: 11px; font-weight: 700; }

.sample-table-wrap { overflow-x: auto; border-radius: 14px; }
.sample-table-head { font-size: 12px; font-weight: 800; color: var(--gj2-muted); margin-bottom: 8px; }

/* mapping grid */
.mapping-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.mapping-row { display: grid; gap: 6px; }
.mapping-label { font-size: 12px; font-weight: 850; }

/* validation stats */
.validation-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.vstat { padding: 14px; border-radius: 16px; background: rgba(3,4,4,.7); text-align: center; }
.vstat strong { display: block; font-size: 26px; font-weight: 900; }
.vstat small { font-size: 11px; color: var(--gj2-muted); }
.vstat.ok strong { color: #91d2a4; }
.vstat.warn strong { color: #f5c842; }
.vstat.err strong { color: #ff8b7c; }
.vstat.muted strong { color: var(--gj2-muted); }

/* invalid box */
.invalid-box { border-radius: 16px; padding: 14px; background: rgba(255,139,124,.06); border: 1px solid rgba(255,139,124,.15); }
.invalid-box-head { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #ff8b7c; margin-bottom: 10px; }
.invalid-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 12px; }
.invalid-row:last-child { border-bottom: none; }

/* confirm summary */
.confirm-summary { display: grid; gap: 1px; border-radius: 16px; overflow: hidden; }
.confirm-row { display: flex; justify-content: space-between; padding: 11px 16px; background: rgba(3,4,4,.7); font-size: 13px; }
.confirm-row span { color: var(--gj2-muted); }
.confirm-row.ok strong { color: #91d2a4; }
.confirm-row.warn strong { color: #f5c842; }
.confirm-row.err strong { color: #ff8b7c; }

.confirm-mapping { padding: 14px; border-radius: 16px; background: rgba(3,4,4,.6); }
.confirm-mapping-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; color: var(--gj2-muted); margin-bottom: 10px; }
.confirm-map-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 0; }

/* import success */
.import-success { display: grid; place-items: center; gap: 16px; padding: 32px 16px; text-align: center; }
.success-icon { color: #91d2a4; }
.import-result-grid { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }

/* ── orders ─────────────────────────────────────────────────────────────── */
.orders-list { display: grid; gap: 14px; }
.order-card { padding: 16px; border-radius: 20px; background: rgba(3,4,4,.72); display: grid; gap: 12px; }
.order-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.order-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
.order-reseller { font-size: 12px; color: var(--gj2-muted); }
.order-items { display: grid; gap: 6px; }
.order-item { display: flex; justify-content: space-between; font-size: 13px; padding: 8px 12px; border-radius: 12px; background: rgba(6,7,7,.5); }
.order-codes { padding: 12px; border-radius: 14px; background: rgba(145,210,164,.05); border: 1px solid rgba(145,210,164,.15); }
.order-codes-head { font-size: 11px; font-weight: 800; color: #91d2a4; margin-bottom: 8px; }
.delivered-code { display: flex; gap: 12px; align-items: center; padding: 5px 0; font-size: 13px; }
.order-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.payment-box { padding: 10px 14px; border-radius: 12px; background: rgba(3,4,4,.6); display: grid; gap: 4px; }
.pix-code { font-family: monospace; font-size: 11px; word-break: break-all; color: var(--gj2-text); }

/* ── config ─────────────────────────────────────────────────────────────── */
.config-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.config-form { display: grid; gap: 14px; padding: 16px; border-radius: 18px; background: rgba(3,4,4,.6); }
.form-head { border-bottom: 1px solid rgba(255,255,255,.06); padding-bottom: 10px; }
.form-head h3 { margin: 0; font-size: 15px; }
.config-list-panel { padding: 16px; border-radius: 18px; background: rgba(3,4,4,.6); }
.config-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.05); font-size: 13px; flex-wrap: wrap; }
.config-item:last-child { border-bottom: none; }
.config-item span:first-child { flex: 1; font-weight: 700; }
.stock-mini { display: flex; gap: 6px; font-size: 11px; color: var(--gj2-muted); }

/* ── spin animation ─────────────────────────────────────────────────────── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .7s linear infinite; }

/* ── responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 860px) {
  .rcp-header { flex-direction: column; align-items: flex-start; }
  .rcp-stats { grid-template-columns: repeat(2, 1fr); }
  .rcp-tabs { flex-wrap: wrap; }
  .rcp-tabs button { flex: none; min-width: 42%; }
  .mapping-grid, .config-grid, .validation-stats { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
@media (max-width: 540px) {
  .rcp-stats { grid-template-columns: repeat(2, 1fr); }
  .wizard-stepper { gap: 0; }
  .step-label { display: none; }
  .product-grid { grid-template-columns: 1fr; }
}
</style>
