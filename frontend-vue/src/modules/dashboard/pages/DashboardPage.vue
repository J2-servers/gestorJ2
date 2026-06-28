<script setup lang="ts">
import { computed, onMounted, ref, type CSSProperties } from 'vue'
import { RouterLink } from 'vue-router'
import { RefreshCw } from '@lucide/vue'

import UiBadge from '@/components/ui/UiBadge.vue'
import { creditRequestsService } from '@/services/api/creditRequests.service'
import { financeService } from '@/services/api/finance.service'
import { resellerServersService } from '@/services/api/resellerServers.service'
import { serversService } from '@/services/api/servers.service'
import { settingsService } from '@/services/api/settings.service'
import { usersService } from '@/services/api/users.service'
import { useAuthStore } from '@/stores/auth.store'
import type { CreditRequest, Invoice, ResellerServer, Server, Settings, User } from '@/types/domain'

type PeriodKey = '12h' | '24h' | '48h' | 'today' | 'week' | 'month'

interface PixKey {
  type?: string
  key_value?: string
  value?: string
  bank?: string
  is_active?: boolean
}

const auth = useAuthStore()
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const activePeriod = ref<PeriodKey>('today')
const copiedPix = ref('')

const settings = ref<Settings | null>(null)
const requests = ref<CreditRequest[]>([])
const users = ref<User[]>([])
const servers = ref<Server[]>([])
const resellerServers = ref<ResellerServer[]>([])
const invoices = ref<Invoice[]>([])

const periods: Array<{ key: PeriodKey; label: string }> = [
  { key: '12h', label: '12h' },
  { key: '24h', label: '24h' },
  { key: '48h', label: '48h' },
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
]

const firstName = computed(() => (auth.user?.full_name || auth.user?.name || auth.user?.email || 'J2').split(' ')[0])
const panelName = computed(() => settings.value?.company_name || 'Gestor J2')
const panelLogo = computed(() => settings.value?.sidebar_logo_url || settings.value?.login_logo_url || '')
const panelLogoFit = computed<'contain' | 'cover' | 'scale-down'>(() => {
  const fit = settings.value?.sidebar_logo_fit || settings.value?.login_logo_fit
  return fit === 'cover' || fit === 'scale-down' ? fit : 'contain'
})
const panelLogoStyle = computed<CSSProperties>(() => ({ objectFit: panelLogoFit.value }))
const isAdmin = computed(() => auth.isAdmin)
const needsWhatsapp = computed(() => !isAdmin.value && !auth.user?.phone)

const activePixKeys = computed(() =>
  ((settings.value?.pix_keys || []) as Array<PixKey | string>)
    .filter((key) => typeof key === 'string' || (key && key.is_active !== false))
    .map((key) => (typeof key === 'string' ? { key_value: key, bank: 'Pix', type: 'chave' } : key)),
)

const recentOrders = computed(() =>
  [...requests.value]
    .sort((a, b) => parseDate(b.created_date || b.updated_date).getTime() - parseDate(a.created_date || a.updated_date).getTime())
    .slice(0, 6),
)

const approvedRequests = computed(() => requests.value.filter(isApproved))
const pendingRequests = computed(() => requests.value.filter((request) => statusOf(request) === 'pending'))
const analyzingRequests = computed(() => requests.value.filter((request) => statusOf(request) === 'analyzing'))
const rejectedRequests = computed(() => requests.value.filter((request) => ['rejected', 'canceled', 'cancelled'].includes(statusOf(request))))
const periodRequests = computed(() => requests.value.filter((request) => isInsidePeriod(request, activePeriod.value)))
const periodApproved = computed(() => periodRequests.value.filter(isApproved))

const monthRequests = computed(() => requests.value.filter((request) => parseDate(request.created_date || request.updated_date) >= startOfMonth()))
const monthApproved = computed(() => monthRequests.value.filter(isApproved))
const todayApproved = computed(() => requests.value.filter((request) => isInsidePeriod(request, 'today') && isApproved(request)))
const openPostpaid = computed(() =>
  approvedRequests.value.filter((request) => request.payment_type === 'postpaid' && !request.invoice_id),
)

const resellerCount = computed(() =>
  users.value.filter((user) => ['user', 'reseller'].includes(user.role) && user.status !== 'blocked').length,
)

const serverCount = computed(() =>
  isAdmin.value
    ? servers.value.filter((server) => server.active !== false).length
    : resellerServers.value.filter((link) => link.active !== false).length,
)

const activeServers = computed(() =>
  isAdmin.value
    ? servers.value.filter((server) => server.active !== false).slice(0, 5)
    : resellerServers.value.filter((link) => link.active !== false).slice(0, 5).map((link) => link.server).filter(Boolean) as Server[],
)

const recentResellers = computed(() =>
  users.value
    .filter((user) => ['user', 'reseller'].includes(user.role))
    .sort((a, b) => parseDate(b.created_date || b.updated_date).getTime() - parseDate(a.created_date || a.updated_date).getTime())
    .slice(0, 5),
)

const serverRanking = computed(() => {
  const map = new Map<string, { name: string; credits: number; revenue: number; count: number }>()
  approvedRequests.value.forEach((request) => {
    const name = request.server_snapshot?.name || 'Servidor'
    const current = map.get(name) || { name, credits: 0, revenue: 0, count: 0 }
    current.credits += Number(request.requested_credits || 0)
    current.revenue += Number(request.total_value || 0)
    current.count += 1
    map.set(name, current)
  })
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
})

const resellerRanking = computed(() => {
  if (!isAdmin.value) return []
  const map = new Map<string, { name: string; credits: number; revenue: number; count: number }>()
  approvedRequests.value.forEach((request) => {
    const name = request.reseller?.name || request.reseller?.email || 'Revendedor'
    const current = map.get(name) || { name, credits: 0, revenue: 0, count: 0 }
    current.credits += Number(request.requested_credits || 0)
    current.revenue += Number(request.total_value || 0)
    current.count += 1
    map.set(name, current)
  })
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
})

const periodRevenue = computed(() => sum(periodApproved.value, 'total_value'))
const periodCredits = computed(() => sum(periodApproved.value, 'requested_credits'))
const monthRevenue = computed(() => sum(monthApproved.value, 'total_value'))
const monthCredits = computed(() => sum(monthApproved.value, 'requested_credits'))
const todayRevenue = computed(() => sum(todayApproved.value, 'total_value'))
const openPostpaidValue = computed(() => sum(openPostpaid.value, 'total_value'))
const paidInvoices = computed(() => invoices.value.filter((invoice) => invoice.status === 'paid').length)
const invoiceOpenValue = computed(() =>
  invoices.value
    .filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled')
    .reduce((total, invoice) => total + Number(invoice.total_value || 0), 0),
)
const approvalRate = computed(() =>
  requests.value.length ? Math.round((approvedRequests.value.length / requests.value.length) * 100) : 0,
)
const averageTicket = computed(() =>
  approvedRequests.value.length ? sum(approvedRequests.value, 'total_value') / approvedRequests.value.length : 0,
)
const operationalAlerts = computed(() => [
  { label: 'Em analise', value: analyzingRequests.value.length, detail: 'pedidos sendo conferidos' },
  { label: 'Rejeitados', value: rejectedRequests.value.length, detail: 'exigem acompanhamento' },
  { label: 'Ticket medio', value: money(averageTicket.value), detail: 'por pedido aprovado' },
  { label: 'Aprovacao', value: `${approvalRate.value}%`, detail: 'historico carregado' },
])

const chartData = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    const inMonth = approvedRequests.value.filter((request) => {
      const created = parseDate(request.created_date || request.updated_date)
      return created >= date && created < next
    })
    return {
      label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      value: sum(inMonth, 'total_value'),
      credits: sum(inMonth, 'requested_credits'),
    }
  })
})

const chartMax = computed(() => Math.max(1, ...chartData.value.map((item) => item.value)))

function statusOf(request: CreditRequest) {
  return String(request.status || '').toLowerCase()
}

function isApproved(request: CreditRequest) {
  return ['recharged', 'approved', 'completed', 'done'].includes(statusOf(request))
}

function parseDate(value?: string) {
  const date = value ? new Date(value) : new Date(0)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

function startOfDay() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function startOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function isInsidePeriod(request: CreditRequest, period: PeriodKey) {
  const created = parseDate(request.created_date || request.updated_date).getTime()
  const now = Date.now()
  if (period === '12h') return created >= now - 12 * 60 * 60 * 1000
  if (period === '24h') return created >= now - 24 * 60 * 60 * 1000
  if (period === '48h') return created >= now - 48 * 60 * 60 * 1000
  if (period === 'today') return created >= startOfDay().getTime()
  if (period === 'week') return created >= now - 7 * 24 * 60 * 60 * 1000
  return created >= startOfMonth().getTime()
}

function sum(list: CreditRequest[], key: 'total_value' | 'requested_credits') {
  return list.reduce((total, request) => total + Number(request[key] || 0), 0)
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function shortNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function statusLabel(request: CreditRequest) {
  const status = statusOf(request)
  if (status === 'pending') return 'Pendente'
  if (status === 'analyzing') return 'Analise'
  if (isApproved(request)) return 'Recarregado'
  if (status === 'rejected') return 'Rejeitado'
  if (status === 'canceled' || status === 'cancelled') return 'Cancelado'
  return status || 'Pedido'
}

function barHeight(value: number) {
  return `${Math.max(7, Math.round((value / chartMax.value) * 100))}%`
}

async function copyPix(key: PixKey) {
  const value = key.key_value || key.value || ''
  if (!value) return
  await navigator.clipboard?.writeText(value).catch(() => undefined)
  copiedPix.value = value
  window.setTimeout(() => {
    if (copiedPix.value === value) copiedPix.value = ''
  }, 1400)
}

async function loadDashboard() {
  error.value = ''
  refreshing.value = true
  try {
    settings.value = isAdmin.value ? await settingsService.get() : await settingsService.getPublic()
  } catch (settingsError) {
    console.warn('Falha ao carregar configuracoes do painel', settingsError)
  }

  try {
    const result = await creditRequestsService.list(isAdmin.value ? 2000 : 500)
    requests.value = result.data || []
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar os pedidos.'
  }

  if (isAdmin.value) {
    const [usersResult, serversResult, invoicesResult] = await Promise.allSettled([
      usersService.list(),
      serversService.list(),
      financeService.invoices(),
    ])
    if (usersResult.status === 'fulfilled') users.value = usersResult.value
    if (serversResult.status === 'fulfilled') servers.value = serversResult.value
    if (invoicesResult.status === 'fulfilled') invoices.value = invoicesResult.value
  } else {
    const linksResult = await Promise.allSettled([resellerServersService.list()])
    const [links] = linksResult
    if (links.status === 'fulfilled') resellerServers.value = links.value
  }

  loading.value = false
  refreshing.value = false
}

onMounted(loadDashboard)
</script>

<template>
  <div class="dash-page">
    <section class="dash-welcome">
      <div class="panel-logo">
        <img v-if="panelLogo" :src="panelLogo" :alt="panelName" :style="panelLogoStyle" />
        <span v-else>J2</span>
      </div>
      <div class="welcome-copy">
        <span>{{ panelName }}</span>
        <h1>Bem-vindo, {{ firstName }}</h1>
        <p>{{ isAdmin ? 'Controle operacional completo: pedidos, receita, revendas, servidores e pendencias.' : 'Acompanhe seus pedidos, servidores vinculados, pagamentos e avisos importantes.' }}</p>
      </div>
      <button class="welcome-refresh" type="button" :disabled="refreshing" aria-label="Atualizar dashboard" @click="loadDashboard">
        <RefreshCw aria-hidden="true" :size="16" :stroke-width="2.4" />
        <span>{{ refreshing ? 'Atualizando...' : 'Atualizar' }}</span>
      </button>
    </section>

    <section v-if="error" class="dash-error">{{ error }}</section>

    <section v-if="needsWhatsapp || activePixKeys.length" class="assist-row">
      <article v-if="needsWhatsapp" class="assist-card whatsapp">
        <div>
          <span>Acao necessaria</span>
          <strong>Cadastre seu WhatsApp</strong>
          <p>Seu numero libera novos pedidos e recebe avisos automaticos.</p>
        </div>
        <RouterLink to="/profile">Cadastrar</RouterLink>
      </article>

      <article v-if="activePixKeys.length" class="assist-card pix">
        <div>
          <span>Pagamento rapido</span>
          <strong>Chaves PIX</strong>
          <p>Copie a chave correta antes de abrir um pedido pre-pago.</p>
        </div>
        <div class="pix-actions">
          <button
            v-for="(key, index) in activePixKeys"
            :key="`${key.key_value || key.value || index}`"
            type="button"
            :class="{ copied: copiedPix === (key.key_value || key.value) }"
            @click="copyPix(key)"
          >
            {{ copiedPix === (key.key_value || key.value) ? 'Copiado' : key.bank || key.type || 'PIX' }}
          </button>
        </div>
      </article>
    </section>

    <section class="kpi-grid">
      <article class="kpi-card red">
        <span>Fila aberta</span>
        <strong>{{ pendingRequests.length + analyzingRequests.length }}</strong>
        <small>{{ pendingRequests.length }} pendentes, {{ analyzingRequests.length }} em analise</small>
      </article>
      <article class="kpi-card green">
        <span>Receita hoje</span>
        <strong>{{ money(todayRevenue) }}</strong>
        <small>{{ todayApproved.length }} pedidos recarregados</small>
      </article>
      <article class="kpi-card blue">
        <span>Creditos no mes</span>
        <strong>{{ shortNumber(monthCredits) }}</strong>
        <small>{{ money(monthRevenue) }} faturados</small>
      </article>
      <article class="kpi-card amber">
        <span>{{ isAdmin ? 'Revendas ativas' : 'Servidores ativos' }}</span>
        <strong>{{ isAdmin ? resellerCount : serverCount }}</strong>
        <small>{{ serverCount }} servidores disponiveis</small>
      </article>
    </section>

    <section class="dash-grid">
      <article class="chart-panel">
        <header class="panel-head">
          <div>
            <UiBadge>{{ periodRequests.length }} pedidos</UiBadge>
            <h2>Performance operacional</h2>
            <p>Creditos e receita por periodo selecionado.</p>
          </div>
          <div class="periods">
            <button
              v-for="period in periods"
              :key="period.key"
              type="button"
              :class="{ active: activePeriod === period.key }"
              @click="activePeriod = period.key"
            >
              {{ period.label }}
            </button>
          </div>
        </header>

        <div class="period-summary">
          <strong>{{ shortNumber(periodCredits) }} cr</strong>
          <span>{{ money(periodRevenue) }}</span>
          <small>periodo selecionado</small>
        </div>

        <div class="chart-bars" aria-label="Receita mensal dos ultimos 12 meses">
          <div v-for="item in chartData" :key="item.label" class="chart-month">
            <span class="bar" :style="{ '--bar-height': barHeight(item.value) }" />
            <small>{{ item.label }}</small>
          </div>
        </div>
      </article>

      <aside class="ops-panel">
        <article>
          <span>Pendentes</span>
          <strong>{{ pendingRequests.length }}</strong>
          <small>aguardando acao</small>
        </article>
        <article>
          <span>Concluidos</span>
          <strong>{{ approvedRequests.length }}</strong>
          <small>{{ shortNumber(sum(approvedRequests, 'requested_credits')) }} creditos</small>
        </article>
        <article>
          <span>Pos-pago aberto</span>
          <strong>{{ money(openPostpaidValue) }}</strong>
          <small>{{ openPostpaid.length }} pedidos sem fatura</small>
        </article>
        <article v-if="isAdmin">
          <span>Faturas abertas</span>
          <strong>{{ money(invoiceOpenValue) }}</strong>
          <small>{{ paidInvoices }} faturas pagas</small>
        </article>
      </aside>
    </section>

    <section class="detail-grid">
      <article class="list-panel">
        <header>
          <div>
            <h2>Pedidos recentes</h2>
            <p>Ultimas movimentacoes do painel.</p>
          </div>
          <RouterLink to="/creditrequests">Ver todos</RouterLink>
        </header>
        <div class="compact-list">
          <div v-for="order in recentOrders" :key="order.id" class="compact-row">
            <div>
              <strong>{{ order.server_snapshot?.name || 'Servidor' }}</strong>
              <small>{{ order.reseller?.name || order.login || 'Revendedor' }}</small>
            </div>
            <div class="row-values">
              <b>{{ shortNumber(Number(order.requested_credits || 0)) }} cr</b>
              <span>{{ money(Number(order.total_value || 0)) }}</span>
            </div>
            <em :class="`status-${statusOf(order)}`">{{ statusLabel(order) }}</em>
          </div>
          <p v-if="!recentOrders.length" class="empty-state">Nenhum pedido encontrado.</p>
        </div>
      </article>

      <article class="list-panel">
        <header>
          <div>
            <h2>{{ isAdmin ? 'Servidores' : 'Meus servidores' }}</h2>
            <p>{{ serverCount }} registros disponiveis.</p>
          </div>
          <RouterLink to="/servers">Gerenciar</RouterLink>
        </header>
        <div class="compact-list">
          <div v-for="server in activeServers" :key="server.id" class="compact-row server-row">
            <div>
              <strong>{{ server.name }}</strong>
              <small>{{ server.description || server.panel_link || 'Servidor global' }}</small>
            </div>
            <div class="row-values">
              <b>{{ money(Number(server.value_per_credit || 0)) }}</b>
              <span>por credito</span>
            </div>
          </div>
          <p v-if="!activeServers.length" class="empty-state">Nenhum servidor ativo encontrado.</p>
        </div>
      </article>

      <article class="list-panel">
        <header>
          <div>
            <h2>{{ isAdmin ? 'Revendedores' : 'Resumo do mes' }}</h2>
            <p>{{ isAdmin ? 'Ultimos cadastros ativos.' : 'Seu desempenho recente.' }}</p>
          </div>
          <RouterLink :to="isAdmin ? '/users' : '/creditrequests'">{{ isAdmin ? 'Abrir' : 'Pedidos' }}</RouterLink>
        </header>
        <div v-if="isAdmin" class="compact-list">
          <div v-for="reseller in recentResellers" :key="reseller.id" class="compact-row">
            <div>
              <strong>{{ reseller.name || reseller.full_name || reseller.email }}</strong>
              <small>{{ reseller.email }}</small>
            </div>
            <em>{{ reseller.payment_type || 'prepaid' }}</em>
          </div>
          <p v-if="!recentResellers.length" class="empty-state">Nenhum revendedor encontrado.</p>
        </div>
        <div v-else class="reseller-month">
          <strong>{{ shortNumber(monthCredits) }} cr</strong>
          <span>{{ money(monthRevenue) }}</span>
          <p>{{ rejectedRequests.length }} rejeitados/cancelados no periodo total.</p>
        </div>
      </article>
    </section>

    <section class="ranking-grid">
      <article class="list-panel ranking-panel">
        <header>
          <div>
            <h2>Ranking de servidores</h2>
            <p>Receita e creditos por servidor aprovado.</p>
          </div>
        </header>
        <div class="ranking-list">
          <div v-for="(item, index) in serverRanking" :key="item.name" class="ranking-row">
            <b>{{ index + 1 }}</b>
            <span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.count }} pedidos · {{ shortNumber(item.credits) }} cr</small>
            </span>
            <em>{{ money(item.revenue) }}</em>
          </div>
          <p v-if="!serverRanking.length" class="empty-state">Ranking sera exibido apos aprovacoes.</p>
        </div>
      </article>

      <article v-if="isAdmin" class="list-panel ranking-panel">
        <header>
          <div>
            <h2>Ranking de revendas</h2>
            <p>Quem mais movimentou no painel.</p>
          </div>
        </header>
        <div class="ranking-list">
          <div v-for="(item, index) in resellerRanking" :key="item.name" class="ranking-row">
            <b>{{ index + 1 }}</b>
            <span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.count }} pedidos · {{ shortNumber(item.credits) }} cr</small>
            </span>
            <em>{{ money(item.revenue) }}</em>
          </div>
          <p v-if="!resellerRanking.length" class="empty-state">Ranking sera exibido apos aprovacoes.</p>
        </div>
      </article>

      <article class="list-panel ranking-panel">
        <header>
          <div>
            <h2>Alertas operacionais</h2>
            <p>Sinais rapidos para decisao diaria.</p>
          </div>
        </header>
        <div class="alert-metrics">
          <div v-for="item in operationalAlerts" :key="item.label">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
            <small>{{ item.detail }}</small>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.dash-page {
  display: grid;
  gap: 18px;
}

.dash-welcome,
.chart-panel,
.ops-panel article,
.list-panel,
.assist-card,
.kpi-card {
  border-radius: 28px;
  background: rgba(255,255,255,.82);
  box-shadow: var(--gj2-shadow-card);
  backdrop-filter: blur(18px);
}

.dash-welcome {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px;
}

.panel-logo {
  width: 68px;
  height: 68px;
  border-radius: 23px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(145deg, #ff6540, #93bca8);
  font-weight: 950;
  box-shadow: 0 18px 38px rgba(80, 91, 96, .18);
}

.panel-logo img {
  width: 100%;
  height: 100%;
  padding: 9px;
}

.welcome-copy {
  min-width: 0;
}

.welcome-copy span,
.kpi-card span,
.assist-card span,
.ops-panel span {
  display: block;
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .045em;
  text-transform: uppercase;
}

.welcome-copy h1 {
  margin: 4px 0 4px;
  color: var(--gj2-ink);
  font-size: clamp(30px, 3.6vw, 48px);
  line-height: .95;
  font-weight: 950;
}

.welcome-copy p,
.panel-head p,
.list-panel p,
.assist-card p,
.empty-state,
.reseller-month p {
  margin: 0;
  color: var(--gj2-muted);
  font-size: 13px;
  line-height: 1.4;
}

.welcome-refresh,
.assist-card a,
.assist-card button,
.periods button,
.list-panel a {
  border: 0;
  min-height: 36px;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
}

.welcome-refresh {
  align-self: center;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, #ff5a2a, #c92b0f);
}

.welcome-refresh:disabled {
  opacity: .72;
  cursor: progress;
}

.dash-error {
  padding: 14px 16px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(135deg, #ff5635, #991a12);
  font-weight: 850;
}

.assist-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.assist-card {
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.assist-card strong {
  display: block;
  margin: 3px 0;
  color: var(--gj2-ink);
  font-size: 18px;
}

.assist-card a,
.assist-card button,
.list-panel a {
  padding: 0 14px;
  display: inline-grid;
  place-items: center;
  color: #fff;
  background: #111517;
  text-decoration: none;
}

.assist-card.pix {
  grid-template-columns: minmax(0, 1fr) minmax(180px, auto);
}

.pix-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.pix-actions button {
  color: var(--gj2-ink);
  background: #eef1ef;
}

.pix-actions button.copied {
  color: #fff;
  background: #80b79b;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi-card {
  min-height: 122px;
  padding: 18px;
  position: relative;
  overflow: hidden;
}

.kpi-card::after {
  content: "";
  position: absolute;
  right: -20px;
  bottom: -28px;
  width: 96px;
  height: 96px;
  border-radius: 34px;
  background: var(--tone, #91bca6);
  opacity: .22;
  transform: rotate(18deg);
  pointer-events: none;
}

.kpi-card > * {
  position: relative;
  z-index: var(--gj2-z-base);
}

.kpi-card.red { --tone: #ff5a2a; }
.kpi-card.green { --tone: #8fbea7; }
.kpi-card.blue { --tone: #5653a0; }
.kpi-card.amber { --tone: #e7c56a; }

.kpi-card strong {
  display: block;
  margin-top: 10px;
  color: var(--gj2-ink);
  font-size: 30px;
  line-height: 1;
  font-weight: 950;
}

.kpi-card small {
  display: block;
  margin-top: 8px;
  color: var(--gj2-muted);
  font-weight: 750;
}

.dash-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 14px;
}

.chart-panel {
  min-width: 0;
  padding: 18px;
}

.panel-head,
.list-panel header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-head h2,
.list-panel h2 {
  margin: 6px 0 3px;
  color: var(--gj2-ink);
  font-size: 24px;
  font-weight: 920;
}

.periods {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.periods button {
  padding: 0 12px;
  color: var(--gj2-ink);
  background: #eef0ef;
}

.periods button.active {
  color: #fff;
  background: #111517;
}

.period-summary {
  width: max-content;
  max-width: 100%;
  min-width: 160px;
  margin: 18px 0 0;
  padding: 12px 16px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(145deg, #1a2023, #101314);
  box-shadow: 0 18px 34px rgba(20, 24, 25, .16);
}

.period-summary strong,
.period-summary span,
.period-summary small {
  display: block;
}

.period-summary strong {
  font-size: 22px;
  line-height: 1;
}

.period-summary span {
  margin-top: 5px;
  color: #ff673d;
  font-weight: 900;
}

.period-summary small {
  margin-top: 5px;
  color: rgba(255,255,255,.58);
  font-weight: 750;
}

.chart-bars {
  min-height: 230px;
  margin-top: 16px;
  padding: 18px 8px 0;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: end;
  gap: 10px;
  border-radius: 20px;
  background:
    linear-gradient(to top, rgba(14, 18, 19, .08) 1px, transparent 1px) 0 0 / 100% 25%,
    rgba(255,255,255,.38);
}

.chart-month {
  min-width: 0;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(120px, 1fr) 24px;
  align-items: end;
  gap: 7px;
}

.bar {
  width: 100%;
  max-width: 22px;
  height: var(--bar-height);
  min-height: 9px;
  justify-self: center;
  border-radius: 999px 999px 7px 7px;
  background: linear-gradient(180deg, #ff6a36, #231714);
  box-shadow: 0 12px 24px rgba(204, 61, 19, .16);
}

.chart-month small {
  overflow: hidden;
  color: var(--gj2-muted);
  font-size: 10px;
  font-weight: 800;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ops-panel {
  display: grid;
  gap: 12px;
}

.ops-panel article {
  min-height: 102px;
  padding: 16px;
}

.ops-panel strong {
  display: block;
  margin: 8px 0 5px;
  color: var(--gj2-ink);
  font-size: 24px;
  font-weight: 950;
}

.ops-panel small {
  color: var(--gj2-muted);
  font-weight: 760;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr) minmax(0, .9fr);
  gap: 14px;
}

.list-panel {
  min-width: 0;
  padding: 18px;
}

.compact-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.compact-row {
  min-width: 0;
  min-height: 62px;
  padding: 10px 12px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  background: rgba(242, 244, 242, .86);
}

.compact-row strong,
.compact-row small,
.row-values b,
.row-values span {
  display: block;
}

.compact-row strong {
  overflow: hidden;
  color: var(--gj2-ink);
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-row small,
.row-values span {
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 760;
}

.row-values {
  text-align: right;
}

.row-values b {
  color: #ff5a2a;
  font-size: 13px;
  font-weight: 950;
}

.compact-row em {
  min-width: 82px;
  padding: 7px 9px;
  border-radius: 999px;
  color: #fff;
  background: #111517;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
  text-align: center;
}

.compact-row em.status-pending { background: #d4a514; }
.compact-row em.status-analyzing { background: #5653a0; }
.compact-row em.status-recharged { background: #70a888; }
.compact-row em.status-rejected,
.compact-row em.status-canceled { background: #c83a1d; }

.server-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.reseller-month {
  min-height: 170px;
  margin-top: 14px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  text-align: center;
  background: rgba(242, 244, 242, .86);
}

.reseller-month strong {
  color: var(--gj2-ink);
  font-size: 36px;
  font-weight: 950;
}

.reseller-month span {
  color: #ff5a2a;
  font-weight: 950;
}

.ranking-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, .95fr);
  gap: 14px;
}

.ranking-panel {
  position: relative;
  overflow: hidden;
}

.ranking-panel::after {
  content: "";
  position: absolute;
  right: -18px;
  bottom: -24px;
  width: 84px;
  height: 84px;
  border-radius: 30px;
  background: #ff5a2a;
  opacity: .11;
  transform: rotate(18deg);
  pointer-events: none;
}

.ranking-list {
  display: grid;
  gap: 9px;
  margin-top: 14px;
  position: relative;
  z-index: var(--gj2-z-base);
}

.ranking-row {
  min-height: 58px;
  padding: 10px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  background: rgba(242, 244, 242, .82);
}

.ranking-row b {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: #111517;
  font-size: 12px;
}

.ranking-row strong,
.ranking-row small {
  display: block;
}

.ranking-row strong {
  overflow: hidden;
  color: var(--gj2-ink);
  font-size: 13px;
  font-weight: 930;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-row small {
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 760;
}

.ranking-row em {
  color: #ff5a2a;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
  white-space: nowrap;
}

.alert-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
  position: relative;
  z-index: var(--gj2-z-base);
}

.alert-metrics div {
  min-height: 86px;
  padding: 12px;
  border-radius: 18px;
  display: grid;
  align-content: center;
  gap: 3px;
  background: rgba(242, 244, 242, .82);
}

.alert-metrics strong {
  color: var(--gj2-ink);
  font-size: 23px;
  font-weight: 950;
}

.alert-metrics span,
.alert-metrics small {
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 820;
}

@media (max-width: 1180px) {
  .kpi-grid,
  .detail-grid,
  .ranking-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dash-grid {
    grid-template-columns: 1fr;
  }

  .ops-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .dash-page {
    gap: 14px;
  }

  .dash-welcome {
    grid-template-columns: 56px minmax(0, 1fr) 46px;
    padding: 14px;
    border-radius: 24px;
  }

  .panel-logo {
    width: 56px;
    height: 56px;
    border-radius: 19px;
  }

  .welcome-refresh {
    width: 46px;
    min-height: 46px;
    padding: 0;
    border-radius: 16px;
  }

  .welcome-refresh span {
    display: none;
  }

  .assist-row,
  .assist-card,
  .assist-card.pix,
  .kpi-grid,
  .detail-grid,
  .ranking-grid,
  .ops-panel {
    grid-template-columns: 1fr;
  }

  .assist-card {
    padding: 14px;
  }

  .assist-card a,
  .pix-actions button {
    width: 100%;
  }

  .pix-actions {
    justify-content: stretch;
  }

  .kpi-card {
    min-height: 104px;
    padding: 15px;
  }

  .panel-head,
  .list-panel header {
    display: grid;
  }

  .periods {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 82px), 1fr));
    justify-content: stretch;
  }

  .periods button {
    width: 100%;
    padding: 0 8px;
  }

  .chart-bars {
    min-height: 190px;
    gap: 5px;
  }

  .compact-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .compact-row em {
    grid-column: 1 / -1;
    width: 100%;
    max-width: 100%;
  }

  .row-values {
    min-width: 0;
  }

  .ranking-row {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .ranking-row em {
    grid-column: 2;
    justify-self: start;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .dash-welcome,
html[data-theme="dark"] .chart-panel,
html[data-theme="dark"] .ops-panel article,
html[data-theme="dark"] .list-panel,
html[data-theme="dark"] .assist-card,
html[data-theme="dark"] .kpi-card {
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
}

html[data-theme="dark"] .compact-row,
html[data-theme="dark"] .reseller-month,
html[data-theme="dark"] .ranking-row,
html[data-theme="dark"] .alert-metrics div {
  background: var(--gj2-surface-muted);
}

html[data-theme="dark"] .chart-bars {
  background:
    linear-gradient(to top, rgba(255,255,255,.04) 1px, transparent 1px) 0 0 / 100% 25%,
    var(--gj2-surface-muted);
}

html[data-theme="dark"] .periods button {
  background: var(--gj2-surface-muted);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .periods button.active {
  background: var(--gj2-sidebar);
  color: #fff;
}

html[data-theme="dark"] .assist-card a,
html[data-theme="dark"] .assist-card button,
html[data-theme="dark"] .list-panel a,
html[data-theme="dark"] .compact-row em,
html[data-theme="dark"] .ranking-row b {
  background: var(--gj2-surface);
  color: var(--gj2-ink);
  border: 1px solid var(--gj2-line);
}

html[data-theme="dark"] .pix-actions button {
  background: var(--gj2-surface-muted);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .pix-actions button.copied {
  background: #4a7d64;
  color: #fff;
  border-color: transparent;
}

html[data-theme="dark"] .periods button {
  background: var(--gj2-surface-muted);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .periods button.active {
  background: var(--gj2-sidebar);
  color: #fff;
}
</style>
