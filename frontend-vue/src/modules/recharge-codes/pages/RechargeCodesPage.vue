<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileSpreadsheet,
  Layers3,
  Package,
  RefreshCw,
  ShoppingCart,
  Upload,
  WalletCards,
  X,
  XCircle,
} from '@lucide/vue'
import { rechargeCodesService } from '@/services/api/rechargeCodes.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  RechargeCode,
  RechargeCodeImportMapping,
  RechargeCodeImportPreview,
  RechargeCodeOrder,
  RechargeCodeProduct,
} from '@/types/domain'
import { formatCurrency } from '@/utils/format'

const auth = useAuthStore()
const isStaff = computed(() => auth.isAdmin)

type Tab = 'stock' | 'import' | 'orders'
type WizardStep = 1 | 2 | 3

const tab = ref<Tab>(isStaff.value ? 'stock' : 'orders')
const loading = ref(true)
const saving = ref(false)
const toast = ref<{ kind: 'ok' | 'error'; msg: string } | null>(null)

const products = ref<RechargeCodeProduct[]>([])
const orders = ref<RechargeCodeOrder[]>([])

// Estoque: produto expandido
const expandedProductId = ref<string | null>(null)
const productCodes = ref<RechargeCode[]>([])
const loadingCodes = ref(false)
const stockStatusFilter = ref('')

// Import wizard
const wizard = reactive({
  step: 1 as WizardStep,
  productId: '',
  notes: '',
  file: null as File | null,
  dragover: false,
  mapping: {} as Partial<RechargeCodeImportMapping>,
  preview: null as RechargeCodeImportPreview | null,
  loading: false,
  result: null as { importedCount: number; duplicateCount: number; invalidCount: number; totalRows: number } | null,
})

// Computed
const totalAvailable = computed(() => products.value.reduce((s, p) => s + (p.stock?.available ?? 0), 0))
const totalReserved = computed(() => products.value.reduce((s, p) => s + (p.stock?.reserved ?? 0), 0))
const totalSold = computed(() => products.value.reduce((s, p) => s + (p.stock?.sold ?? 0), 0))

const filteredCodes = computed(() =>
  stockStatusFilter.value ? productCodes.value.filter(c => c.status === stockStatusFilter.value) : productCodes.value,
)

const wizardProduct = computed(() => products.value.find(p => p.id === wizard.productId))

function showToast(kind: 'ok' | 'error', msg: string) {
  toast.value = { kind, msg }
  setTimeout(() => { toast.value = null }, 6000)
}

function fmt(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function orderStatusLabel(s: string) {
  return ({ pending_payment: 'Aguardando pagamento', paid: 'Pago', delivered: 'Entregue', canceled: 'Cancelado', expired: 'Expirado', failed: 'Falhou' })[s] ?? s
}

function statusLabel(s: string) {
  return ({ available: 'Disponível', reserved: 'Reservado', sold: 'Vendido', voided: 'Inutilizado', cancelled: 'Cancelado' })[s] ?? s
}

// Carregamento
async function load() {
  loading.value = true
  try {
    const [productList, orderList] = await Promise.all([
      rechargeCodesService.listProducts(),
      isStaff.value ? rechargeCodesService.listOrders() : rechargeCodesService.listMyPurchases(),
    ])
    products.value = productList
    orders.value = orderList
    if (!wizard.productId && productList[0]) wizard.productId = productList[0].id
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao carregar.')
  } finally {
    loading.value = false
  }
}

async function toggleProduct(productId: string) {
  if (expandedProductId.value === productId) {
    expandedProductId.value = null
    productCodes.value = []
    return
  }
  expandedProductId.value = productId
  stockStatusFilter.value = ''
  loadingCodes.value = true
  try {
    productCodes.value = await rechargeCodesService.listCodes(productId)
  } catch {
    showToast('error', 'Falha ao carregar códigos.')
  } finally {
    loadingCodes.value = false
  }
}

watch(stockStatusFilter, async () => {
  if (!expandedProductId.value) return
  loadingCodes.value = true
  try {
    productCodes.value = await rechargeCodesService.listCodes(expandedProductId.value, stockStatusFilter.value || undefined)
  } catch {
    showToast('error', 'Falha ao filtrar.')
  } finally {
    loadingCodes.value = false
  }
})

async function voidCode(code: RechargeCode) {
  if (!confirm(`Inutilizar o código ${code.code}?`)) return
  saving.value = true
  try {
    await rechargeCodesService.voidCode(code.id)
    showToast('ok', 'Código inutilizado.')
    if (expandedProductId.value) productCodes.value = await rechargeCodesService.listCodes(expandedProductId.value, stockStatusFilter.value || undefined)
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao inutilizar.')
  } finally {
    saving.value = false
  }
}

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
    showToast('ok', 'Pedido rejeitado e reserva liberada.')
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao rejeitar.')
  } finally {
    saving.value = false
  }
}

// Import wizard
function onFileDrop(e: DragEvent) {
  wizard.dragover = false
  const file = e.dataTransfer?.files?.[0]
  if (!file?.name.toLowerCase().endsWith('.xlsx')) { showToast('error', 'Apenas arquivos .xlsx são aceitos.'); return }
  wizard.file = file
  wizard.preview = null
  wizard.mapping = {}
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  if (file && !file.name.toLowerCase().endsWith('.xlsx')) { showToast('error', 'Apenas arquivos .xlsx são aceitos.'); return }
  wizard.file = file
  wizard.preview = null
  wizard.mapping = {}
}

async function analyzeFile() {
  if (!wizard.file || !wizard.productId) return
  wizard.loading = true
  try {
    const preview = await rechargeCodesService.previewImport(wizard.productId, wizard.file, wizard.mapping)
    wizard.preview = preview
    wizard.mapping = { ...preview.mapping, sheetName: wizard.mapping.sheetName || preview.selectedSheetName }
    wizard.step = 2
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao analisar arquivo.')
  } finally {
    wizard.loading = false
  }
}

async function reanalyze() {
  if (!wizard.file || !wizard.productId) return
  wizard.loading = true
  try {
    wizard.preview = await rechargeCodesService.previewImport(wizard.productId, wizard.file, wizard.mapping)
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao reanalisar.')
  } finally {
    wizard.loading = false
  }
}

async function confirmImport() {
  if (!wizard.file || !wizard.productId || !wizard.mapping.codeColumn) {
    showToast('error', 'Coluna de código obrigatória não mapeada.')
    return
  }
  wizard.loading = true
  try {
    const result = await rechargeCodesService.importXlsx(wizard.productId, wizard.file, wizard.notes || undefined, wizard.mapping)
    wizard.result = result
    wizard.step = 3
    showToast('ok', `${result.importedCount} códigos importados com sucesso.`)
    await load()
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Falha ao importar.')
  } finally {
    wizard.loading = false
  }
}

function resetWizard() {
  wizard.step = 1
  wizard.file = null
  wizard.notes = ''
  wizard.preview = null
  wizard.mapping = {}
  wizard.result = null
}

onMounted(load)
</script>

<template>
  <div class="rc-page">
    <!-- Toast -->
    <Transition name="toast-slide">
      <div v-if="toast" class="rc-toast" :class="toast.kind">
        <CheckCircle2 v-if="toast.kind === 'ok'" :size="16" />
        <AlertCircle v-else :size="16" />
        <span>{{ toast.msg }}</span>
        <button type="button" @click="toast = null"><X :size="14" /></button>
      </div>
    </Transition>

    <!-- Header -->
    <header class="rc-header">
      <div class="rc-header-info">
        <h1>Códigos de Recarga</h1>
        <p>Gerencie o estoque de códigos de ativação, importe planilhas e acompanhe pedidos.</p>
      </div>
      <div class="rc-header-actions">
        <button class="rc-btn" type="button" :disabled="loading" @click="load">
          <RefreshCw :size="15" :class="{ spin: loading }" /> Atualizar
        </button>
        <RouterLink class="rc-btn primary" to="/recharge-codes/checkout">
          <WalletCards :size="15" /> Checkout
        </RouterLink>
      </div>
    </header>

    <!-- Métricas (apenas staff) -->
    <section v-if="isStaff" class="rc-metrics">
      <div class="metric">
        <Package :size="20" />
        <div><strong>{{ products.length }}</strong><span>produtos</span></div>
      </div>
      <div class="metric ok">
        <Database :size="20" />
        <div><strong>{{ totalAvailable }}</strong><span>disponíveis</span></div>
      </div>
      <div class="metric warn">
        <Layers3 :size="20" />
        <div><strong>{{ totalReserved }}</strong><span>reservados</span></div>
      </div>
      <div class="metric muted">
        <ShoppingCart :size="20" />
        <div><strong>{{ totalSold }}</strong><span>vendidos</span></div>
      </div>
    </section>

    <!-- Tabs -->
    <nav class="rc-tabs">
      <button v-if="isStaff" type="button" :class="{ active: tab === 'stock' }" @click="tab = 'stock'">
        <Database :size="15" /> Estoque
      </button>
      <button v-if="isStaff" type="button" :class="{ active: tab === 'import' }" @click="tab = 'import'">
        <Upload :size="15" /> Importar XLSX
      </button>
      <button type="button" :class="{ active: tab === 'orders' }" @click="tab = 'orders'">
        <ShoppingCart :size="15" /> {{ isStaff ? 'Pedidos' : 'Meus pedidos' }}
      </button>
    </nav>

    <!-- ==================== ESTOQUE ==================== -->
    <section v-if="isStaff && tab === 'stock'" class="rc-section">
      <div v-if="loading" class="rc-loading">Carregando produtos…</div>
      <div v-else-if="!products.length" class="rc-empty">
        <Package :size="36" />
        <p>Nenhum produto cadastrado. Importe um XLSX para começar.</p>
      </div>

      <template v-else>
        <div class="rc-product-table-wrap">
          <table class="rc-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th class="num">Disponíveis</th>
                <th class="num">Reservados</th>
                <th class="num">Vendidos</th>
                <th class="num">Inutilizados</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="product in products" :key="product.id">
                <tr class="rc-product-row" :class="{ expanded: expandedProductId === product.id }">
                  <td>
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-meta">
                      <span v-if="product.server?.name">{{ product.server.name }}</span>
                      <span v-if="product.modality?.name">{{ product.modality.name }}</span>
                      <span>R$ {{ formatCurrency(Number(product.sale_value ?? product.saleValue ?? 0)) }}</span>
                    </div>
                  </td>
                  <td class="num ok"><strong>{{ product.stock?.available ?? 0 }}</strong></td>
                  <td class="num warn">{{ product.stock?.reserved ?? 0 }}</td>
                  <td class="num muted">{{ product.stock?.sold ?? 0 }}</td>
                  <td class="num err">{{ product.stock?.voided ?? 0 }}</td>
                  <td>
                    <button class="rc-btn sm" type="button" @click="toggleProduct(product.id)">
                      <component :is="expandedProductId === product.id ? ChevronUp : ChevronDown" :size="14" />
                      {{ expandedProductId === product.id ? 'Fechar' : 'Ver códigos' }}
                    </button>
                  </td>
                </tr>

                <!-- Detalhe inline dos códigos -->
                <tr v-if="expandedProductId === product.id" class="rc-codes-row">
                  <td colspan="6">
                    <div class="rc-codes-panel">
                      <div class="codes-panel-head">
                        <span><strong>{{ product.name }}</strong> — códigos individuais</span>
                        <div class="codes-panel-actions">
                          <select v-model="stockStatusFilter" class="rc-select sm">
                            <option value="">Todos os status</option>
                            <option value="available">Disponíveis</option>
                            <option value="reserved">Reservados</option>
                            <option value="sold">Vendidos</option>
                            <option value="voided">Inutilizados</option>
                          </select>
                          <button class="rc-btn sm primary" type="button"
                            @click="tab = 'import'; wizard.productId = product.id">
                            <Upload :size="13" /> Importar mais
                          </button>
                        </div>
                      </div>

                      <div v-if="loadingCodes" class="rc-loading sm">Carregando códigos…</div>
                      <div v-else-if="!filteredCodes.length" class="rc-empty sm">Nenhum código com este filtro.</div>
                      <table v-else class="rc-table sm">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>PIN</th>
                            <th>Status</th>
                            <th>Validade</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="code in filteredCodes" :key="code.id">
                            <td class="mono">{{ code.code }}</td>
                            <td class="mono muted">{{ code.pin ?? '—' }}</td>
                            <td>
                              <span class="badge" :class="code.status">{{ statusLabel(code.status) }}</span>
                            </td>
                            <td>{{ fmt(code.expiresAt ?? code.expires_at) }}</td>
                            <td>
                              <button v-if="code.status === 'available'" class="rc-btn sm danger" type="button"
                                :disabled="saving" @click="voidCode(code)">
                                <XCircle :size="13" /> Inutilizar
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <!-- ==================== IMPORTAR ==================== -->
    <section v-if="isStaff && tab === 'import'" class="rc-section">
      <!-- Indicador de etapas -->
      <div class="rc-steps">
        <div class="step" :class="{ active: wizard.step === 1, done: wizard.step > 1 }">
          <span class="step-num">1</span> Arquivo
        </div>
        <div class="step-line" />
        <div class="step" :class="{ active: wizard.step === 2, done: wizard.step > 2 }">
          <span class="step-num">2</span> Prévia
        </div>
        <div class="step-line" />
        <div class="step" :class="{ active: wizard.step === 3 }">
          <span class="step-num">3</span> Resultado
        </div>
      </div>

      <!-- ETAPA 1: produto + arquivo -->
      <div v-if="wizard.step === 1" class="rc-card">
        <h2>Selecione o produto e a planilha</h2>
        <p class="sub">Escolha para qual produto os códigos serão importados, depois carregue o arquivo .xlsx do fornecedor.</p>

        <div class="rc-form-row">
          <label>Produto de destino <span class="req">*</span></label>
          <select v-model="wizard.productId" class="rc-select">
            <option value="" disabled>Selecione um produto…</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.name }} — {{ p.stock?.available ?? 0 }} disponíveis
            </option>
          </select>
        </div>

        <div class="rc-form-row">
          <label>Observações (opcional)</label>
          <input v-model="wizard.notes" class="rc-input" type="text" placeholder="Ex: Lote de abril, fornecedor XYZ" />
        </div>

        <div
          class="rc-dropzone"
          :class="{ dragover: wizard.dragover, 'has-file': !!wizard.file }"
          @dragover.prevent="wizard.dragover = true"
          @dragleave="wizard.dragover = false"
          @drop.prevent="onFileDrop"
          @click="($refs.fileInput as HTMLInputElement)?.click()"
        >
          <input ref="fileInput" type="file" accept=".xlsx" style="display:none" @change="onFileInput" />
          <FileSpreadsheet :size="32" />
          <template v-if="wizard.file">
            <strong>{{ wizard.file.name }}</strong>
            <span>{{ fmtSize(wizard.file.size) }} · Clique para trocar</span>
          </template>
          <template v-else>
            <strong>Arraste o .xlsx aqui ou clique para selecionar</strong>
            <span>Tamanho máximo: 20 MB</span>
          </template>
        </div>

        <div class="rc-form-actions">
          <button class="rc-btn primary lg" type="button"
            :disabled="!wizard.file || !wizard.productId || wizard.loading"
            @click="analyzeFile">
            <RefreshCw v-if="wizard.loading" :size="15" class="spin" />
            <span v-else>Analisar arquivo →</span>
          </button>
        </div>
      </div>

      <!-- ETAPA 2: prévia e mapeamento -->
      <div v-if="wizard.step === 2 && wizard.preview" class="rc-card">
        <h2>Prévia da importação</h2>

        <div class="preview-meta">
          <div class="meta-item">
            <span>Arquivo</span>
            <strong>{{ wizard.preview.fileName }}</strong>
          </div>
          <div class="meta-item">
            <span>Tamanho</span>
            <strong>{{ fmtSize(wizard.preview.fileSize) }}</strong>
          </div>
          <div class="meta-item">
            <span>Total de linhas</span>
            <strong>{{ wizard.preview.totalRows }}</strong>
          </div>
          <div class="meta-item ok">
            <span>Importáveis</span>
            <strong>{{ wizard.preview.importableCount }}</strong>
          </div>
          <div class="meta-item warn" v-if="wizard.preview.duplicateInSystemCount">
            <span>Duplicados</span>
            <strong>{{ wizard.preview.duplicateInSystemCount }}</strong>
          </div>
          <div class="meta-item err" v-if="wizard.preview.invalidCount">
            <span>Inválidos</span>
            <strong>{{ wizard.preview.invalidCount }}</strong>
          </div>
        </div>

        <div class="rc-form-row">
          <label>Coluna do código <span class="req">*</span></label>
          <select v-model="wizard.mapping.codeColumn" class="rc-select" @change="reanalyze">
            <option value="">Selecione a coluna…</option>
            <option v-for="col in wizard.preview.headers" :key="col" :value="col">{{ col }}</option>
          </select>
          <small v-if="wizard.mapping.codeColumn" class="hint ok">
            ✓ Coluna detectada: <strong>{{ wizard.mapping.codeColumn }}</strong>
          </small>
        </div>

        <!-- Amostra de códigos -->
        <div v-if="wizard.preview.sampleRows.length" class="preview-samples">
          <span class="preview-label">Amostra dos primeiros códigos:</span>
          <div class="sample-codes">
            <code v-for="row in wizard.preview.sampleRows.slice(0, 6)" :key="row.rowNumber">
              {{ row.code }}
            </code>
          </div>
        </div>

        <!-- Erros de amostra -->
        <div v-if="wizard.preview.invalidSamples.length" class="preview-errors">
          <span class="preview-label err">Linhas com problema:</span>
          <div v-for="e in wizard.preview.invalidSamples.slice(0, 3)" :key="e.rowNumber" class="sample-error">
            Linha {{ e.rowNumber }}: {{ e.reason }}
          </div>
        </div>

        <div class="rc-form-actions">
          <button class="rc-btn" type="button" @click="wizard.step = 1">← Voltar</button>
          <button class="rc-btn primary lg" type="button"
            :disabled="!wizard.mapping.codeColumn || wizard.loading || wizard.preview.importableCount === 0"
            @click="confirmImport">
            <RefreshCw v-if="wizard.loading" :size="15" class="spin" />
            <span v-else>Importar {{ wizard.preview.importableCount }} códigos →</span>
          </button>
        </div>
      </div>

      <!-- ETAPA 3: resultado -->
      <div v-if="wizard.step === 3 && wizard.result" class="rc-card result-card">
        <CheckCircle2 :size="48" class="result-icon ok" />
        <h2>Importação concluída!</h2>
        <p class="sub">Os códigos foram adicionados ao estoque de <strong>{{ wizardProduct?.name }}</strong>.</p>

        <div class="result-stats">
          <div class="stat ok">
            <strong>{{ wizard.result.importedCount }}</strong>
            <span>importados</span>
          </div>
          <div class="stat warn">
            <strong>{{ wizard.result.duplicateCount }}</strong>
            <span>duplicados (ignorados)</span>
          </div>
          <div class="stat err">
            <strong>{{ wizard.result.invalidCount }}</strong>
            <span>inválidos (ignorados)</span>
          </div>
        </div>

        <div class="rc-form-actions">
          <button class="rc-btn" type="button" @click="tab = 'stock'">Ver estoque</button>
          <button class="rc-btn primary" type="button" @click="resetWizard">Nova importação</button>
        </div>
      </div>
    </section>

    <!-- ==================== PEDIDOS ==================== -->
    <section v-if="tab === 'orders'" class="rc-section">
      <div v-if="loading" class="rc-loading">Carregando pedidos…</div>
      <div v-else-if="!orders.length" class="rc-empty">
        <ShoppingCart :size="36" />
        <p>Nenhum pedido encontrado.</p>
        <RouterLink v-if="!isStaff" class="rc-btn primary" to="/recharge-codes/checkout">
          <WalletCards :size="15" /> Fazer um pedido
        </RouterLink>
      </div>

      <div v-else class="rc-product-table-wrap">
        <table class="rc-table">
          <thead>
            <tr>
              <th>Data</th>
              <th v-if="isStaff">Revendedor</th>
              <th>Itens</th>
              <th class="num">Valor</th>
              <th>Status</th>
              <th v-if="isStaff"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td>{{ fmt(order.createdAt ?? order.created_date) }}</td>
              <td v-if="isStaff" class="muted">{{ order.reseller?.name ?? order.reseller?.email ?? '—' }}</td>
              <td>
                <span v-for="item in order.items" :key="item.id" class="order-item-tag">
                  {{ item.product.name }} × {{ item.quantity }}
                </span>
              </td>
              <td class="num">R$ {{ formatCurrency(order.totalValue ?? order.total_value ?? 0) }}</td>
              <td>
                <span class="badge" :class="order.status">{{ orderStatusLabel(order.status) }}</span>
              </td>
              <td v-if="isStaff">
                <div v-if="order.status === 'pending_payment'" class="order-actions">
                  <button class="rc-btn sm primary" type="button" :disabled="saving" @click="approveOrder(order)">Aprovar</button>
                  <button class="rc-btn sm danger" type="button" :disabled="saving" @click="rejectOrder(order)">Rejeitar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rc-page {
  --rc-surface: rgba(255, 255, 255, 0.95);
  --rc-raised: #fff;
  --rc-border: rgba(17, 24, 39, 0.1);
  --rc-text: #15191b;
  --rc-muted: #68737b;
  --rc-accent: #ff4b12;
  --rc-ok: #168653;
  --rc-warn: #a56a00;
  --rc-err: #ad2b25;
  --rc-ok-bg: rgba(22, 134, 83, 0.08);
  --rc-warn-bg: rgba(165, 106, 0, 0.08);
  --rc-err-bg: rgba(173, 43, 37, 0.08);
  --rc-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 64px;
  color: var(--rc-text);
  font-size: 14px;
}

:global(html[data-theme="dark"]) .rc-page {
  --rc-surface: rgba(18, 20, 20, 0.95);
  --rc-raised: rgba(26, 28, 28, 0.98);
  --rc-border: rgba(255, 255, 255, 0.1);
  --rc-text: #e8eaeb;
  --rc-muted: #8b969d;
  --rc-ok: #91d2a4;
  --rc-warn: #f5c842;
  --rc-err: #ff8b7c;
  --rc-ok-bg: rgba(145, 210, 164, 0.1);
  --rc-warn-bg: rgba(245, 200, 66, 0.1);
  --rc-err-bg: rgba(255, 139, 124, 0.1);
}

/* ── Header ── */
.rc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.rc-header h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.rc-header p { margin: 0; color: var(--rc-muted); font-size: 13px; }
.rc-header-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ── Metrics ── */
.rc-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.metric {
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--rc-shadow);
}

.metric svg { color: var(--rc-muted); flex-shrink: 0; }
.metric div { display: flex; flex-direction: column; gap: 1px; }
.metric strong { font-size: 20px; font-weight: 700; line-height: 1; }
.metric span { font-size: 11px; color: var(--rc-muted); text-transform: uppercase; letter-spacing: .04em; }
.metric.ok svg, .metric.ok strong { color: var(--rc-ok); }
.metric.warn svg, .metric.warn strong { color: var(--rc-warn); }
.metric.muted svg, .metric.muted strong { color: var(--rc-muted); }

/* ── Tabs ── */
.rc-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid var(--rc-border);
  margin-bottom: 20px;
}

.rc-tabs button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  background: none;
  color: var(--rc-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color .15s;
}

.rc-tabs button:hover { color: var(--rc-text); }
.rc-tabs button.active { color: var(--rc-accent); border-bottom-color: var(--rc-accent); }

/* ── Section ── */
.rc-section { min-height: 200px; }

/* ── Buttons ── */
.rc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid var(--rc-border);
  background: var(--rc-surface);
  color: var(--rc-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity .15s;
}

.rc-btn:hover:not(:disabled) { opacity: .85; }
.rc-btn:disabled { opacity: .45; cursor: not-allowed; }
.rc-btn.primary { background: var(--rc-accent); border-color: var(--rc-accent); color: #fff; }
.rc-btn.danger { background: var(--rc-err-bg); border-color: var(--rc-err); color: var(--rc-err); }
.rc-btn.sm { padding: 5px 10px; font-size: 12px; }
.rc-btn.lg { padding: 10px 22px; font-size: 14px; }

/* ── Table ── */
.rc-product-table-wrap { overflow-x: auto; }

.rc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.rc-table th {
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--rc-muted);
  border-bottom: 2px solid var(--rc-border);
}

.rc-table td {
  padding: 12px 12px;
  border-bottom: 1px solid var(--rc-border);
  vertical-align: middle;
}

.rc-table.sm td, .rc-table.sm th { padding: 8px 10px; }
.rc-table th.num, .rc-table td.num { text-align: right; }

.rc-product-row td { background: var(--rc-raised); transition: background .15s; }
.rc-product-row:hover td { background: color-mix(in srgb, var(--rc-accent) 4%, var(--rc-raised)); }
.rc-product-row.expanded td { background: color-mix(in srgb, var(--rc-accent) 6%, var(--rc-raised)); }

.product-name { font-weight: 600; margin-bottom: 2px; }
.product-meta { display: flex; gap: 8px; font-size: 11px; color: var(--rc-muted); flex-wrap: wrap; }
.product-meta span::before { content: '·'; margin-right: 6px; }
.product-meta span:first-child::before { content: ''; margin: 0; }

td.ok strong { color: var(--rc-ok); font-weight: 700; }
td.warn { color: var(--rc-warn); }
td.err { color: var(--rc-err); }
td.muted { color: var(--rc-muted); }

/* ── Inline codes panel ── */
.rc-codes-row td { padding: 0; background: color-mix(in srgb, var(--rc-accent) 3%, var(--rc-surface)); }

.rc-codes-panel {
  padding: 16px 16px 20px;
  border-bottom: 2px solid var(--rc-accent);
}

.codes-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.codes-panel-actions { display: flex; gap: 8px; align-items: center; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
}

.badge.available { background: var(--rc-ok-bg); color: var(--rc-ok); }
.badge.reserved { background: var(--rc-warn-bg); color: var(--rc-warn); }
.badge.sold, .badge.delivered, .badge.paid { background: color-mix(in srgb, var(--rc-muted) 12%, transparent); color: var(--rc-muted); }
.badge.voided, .badge.cancelled, .badge.failed, .badge.expired { background: var(--rc-err-bg); color: var(--rc-err); }
.badge.pending_payment { background: var(--rc-warn-bg); color: var(--rc-warn); }

.mono { font-family: monospace; font-size: 12px; letter-spacing: .03em; }

/* ── Import wizard ── */
.rc-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 28px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rc-muted);
  transition: color .2s;
}

.step.active { color: var(--rc-accent); }
.step.done { color: var(--rc-ok); }

.step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.step.done .step-num { background: var(--rc-ok); border-color: var(--rc-ok); color: #fff; }
.step.active .step-num { background: var(--rc-accent); border-color: var(--rc-accent); color: #fff; }

.step-line {
  flex: 1;
  min-width: 40px;
  height: 2px;
  background: var(--rc-border);
  margin: 0 12px;
}

.rc-card {
  background: var(--rc-surface);
  border: 1px solid var(--rc-border);
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 680px;
  margin: 0 auto;
  box-shadow: var(--rc-shadow);
}

.rc-card h2 { font-size: 17px; font-weight: 700; margin: 0 0 6px; }
.rc-card .sub { color: var(--rc-muted); margin: 0 0 20px; font-size: 13px; }

.rc-form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.rc-form-row label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--rc-muted); }

.rc-select, .rc-input {
  padding: 9px 12px;
  border: 1px solid var(--rc-border);
  border-radius: 7px;
  background: var(--rc-raised);
  color: var(--rc-text);
  font-size: 13px;
  width: 100%;
}

.rc-select.sm { padding: 5px 8px; font-size: 12px; width: auto; }
.rc-select:focus, .rc-input:focus { outline: none; border-color: var(--rc-accent); }

.rc-dropzone {
  border: 2px dashed var(--rc-border);
  border-radius: 10px;
  padding: 36px 24px;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  transition: border-color .15s, background .15s;
  color: var(--rc-muted);
}

.rc-dropzone:hover, .rc-dropzone.dragover { border-color: var(--rc-accent); background: color-mix(in srgb, var(--rc-accent) 4%, transparent); }
.rc-dropzone.has-file { border-color: var(--rc-ok); color: var(--rc-text); }
.rc-dropzone svg { color: var(--rc-accent); }
.rc-dropzone strong { font-size: 14px; font-weight: 600; }
.rc-dropzone span { font-size: 12px; }

.rc-form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 8px; }

/* Preview step */
.preview-meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: color-mix(in srgb, var(--rc-muted) 5%, transparent);
  border-radius: 8px;
}

.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-item span { font-size: 11px; color: var(--rc-muted); text-transform: uppercase; letter-spacing: .04em; }
.meta-item strong { font-size: 16px; font-weight: 700; }
.meta-item.ok strong { color: var(--rc-ok); }
.meta-item.warn strong { color: var(--rc-warn); }
.meta-item.err strong { color: var(--rc-err); }

.hint { font-size: 12px; }
.hint.ok { color: var(--rc-ok); }

.preview-samples, .preview-errors { margin: 16px 0; }
.preview-label { font-size: 12px; font-weight: 600; color: var(--rc-muted); display: block; margin-bottom: 8px; }
.preview-label.err { color: var(--rc-err); }

.sample-codes { display: flex; flex-wrap: wrap; gap: 6px; }
.sample-codes code {
  padding: 3px 10px;
  background: color-mix(in srgb, var(--rc-muted) 8%, transparent);
  border-radius: 5px;
  font-size: 12px;
  font-family: monospace;
}

.sample-error { font-size: 12px; color: var(--rc-err); padding: 3px 0; }

/* Result step */
.result-card { text-align: center; }
.result-icon { display: block; margin: 0 auto 16px; }
.result-icon.ok { color: var(--rc-ok); }

.result-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 20px 0 28px;
}

.stat { display: flex; flex-direction: column; gap: 2px; align-items: center; }
.stat strong { font-size: 28px; font-weight: 700; }
.stat span { font-size: 12px; color: var(--rc-muted); }
.stat.ok strong { color: var(--rc-ok); }
.stat.warn strong { color: var(--rc-warn); }
.stat.err strong { color: var(--rc-err); }

/* Orders */
.order-item-tag {
  display: inline-block;
  padding: 2px 7px;
  background: color-mix(in srgb, var(--rc-muted) 10%, transparent);
  border-radius: 5px;
  font-size: 11px;
  margin: 2px;
}

.order-actions { display: flex; gap: 6px; }

/* Utilities */
.rc-loading { padding: 32px; text-align: center; color: var(--rc-muted); }
.rc-loading.sm { padding: 16px; }

.rc-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--rc-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rc-empty.sm { padding: 24px; }
.rc-empty p { margin: 0; font-size: 13px; }

.req { color: var(--rc-accent); }

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

/* Toast */
.rc-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--rc-raised);
  border: 1px solid var(--rc-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, .15);
  font-size: 13px;
  max-width: 400px;
}

.rc-toast.ok { border-left: 4px solid var(--rc-ok); }
.rc-toast.ok svg { color: var(--rc-ok); }
.rc-toast.error { border-left: 4px solid var(--rc-err); }
.rc-toast.error svg { color: var(--rc-err); }
.rc-toast button { border: none; background: none; cursor: pointer; color: var(--rc-muted); margin-left: auto; padding: 2px; }

.toast-slide-enter-active, .toast-slide-leave-active { transition: all .25s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateY(10px); }

/* Responsive */
@media (max-width: 640px) {
  .rc-metrics { grid-template-columns: repeat(2, 1fr); }
  .rc-card { padding: 20px 16px; }
  .rc-steps { gap: 4px; }
  .step { font-size: 12px; }
  .step-line { min-width: 20px; margin: 0 6px; }
  .rc-header { flex-direction: column; }
  .result-stats { gap: 16px; }
}
</style>
