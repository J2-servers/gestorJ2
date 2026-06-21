<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type Component, type CSSProperties } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  Activity,
  BarChart3,
  BellRing,
  ClipboardList,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radio,
  ReceiptText,
  Search,
  Server,
  Settings as SettingsIcon,
  Tv,
  UserCircle2,
  Users,
  WalletCards,
} from '@lucide/vue'

import NotificationPopover from '@/components/layout/NotificationPopover.vue'
import PushNotificationToggle from '@/components/layout/PushNotificationToggle.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { creditRequestsService } from '@/services/api/creditRequests.service'
import { notificationsService } from '@/services/api/notifications.service'
import { normalizeNotification } from '@/services/api/normalizers'
import { resellerServersService } from '@/services/api/resellerServers.service'
import { serversService } from '@/services/api/servers.service'
import { settingsService } from '@/services/api/settings.service'
import { usersService } from '@/services/api/users.service'
import { useAuthStore } from '@/stores/auth.store'
import type { CreditRequest, NotificationItem, ResellerServer, Server as ServerRecord, Settings, User } from '@/types/domain'
import { formatCurrency } from '@/utils/format'

interface NavItem {
  label: string
  route: string
  icon: Component
  roles?: string[]
}

interface SearchResult {
  id: string
  type: 'Pedido' | 'Servidor' | 'Revendedor' | 'Vinculo'
  title: string
  subtitle: string
  route: string
  meta?: string
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const mobileMenuOpen = ref(false)
const notifications = ref<NotificationItem[]>([])
const notificationsOpen = ref(false)
const notificationsLoading = ref(false)
const notificationsError = ref('')
const liveAlerts = ref<NotificationItem[]>([])
const shellSettings = ref<Settings | null>(null)
const searchQuery = ref('')
const searchOpen = ref(false)
const searchLoading = ref(false)
const searchError = ref('')
const searchResults = ref<SearchResult[]>([])
let notificationStream: EventSource | null = null
let searchTimer: ReturnType<typeof window.setTimeout> | null = null

const notificationStreamUrl = `${import.meta.env.VITE_API_URL || '/api'}/notifications/stream`

const navItems = computed<NavItem[]>(() => [
  { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
  { label: 'Pedidos', route: '/creditrequests', icon: ClipboardList },
  { label: 'Chat', route: '/chat', icon: MessageSquare },
  { label: 'Financeiro', route: '/finance', icon: WalletCards },
  { label: 'Gestao', route: '/management', icon: Activity },
  { label: 'Servidores', route: '/servers', icon: Server },
  { label: 'Players', route: '/playlists', icon: Tv },
  { label: 'Perfil', route: '/profile', icon: UserCircle2, roles: ['user'] },
  { label: 'Revendedores', route: '/users', icon: Users, roles: ['admin', 'dev'] },
  { label: 'Templates', route: '/templates', icon: FileText, roles: ['admin', 'dev'] },
  { label: 'Comprovantes', route: '/proof-gallery', icon: ImageIcon, roles: ['admin', 'dev'] },
  { label: 'Faturas', route: '/invoice-management', icon: ReceiptText, roles: ['admin', 'dev'] },
  { label: 'Analytics', route: '/analytics', icon: BarChart3, roles: ['admin', 'dev'] },
  { label: 'WhatsApp', route: '/whatsapp', icon: Radio, roles: ['admin', 'dev'] },
  { label: 'Configurações', route: '/settings', icon: SettingsIcon, roles: ['admin', 'dev'] },
])

const visibleItems = computed(() =>
  navItems.value.filter((item) => !item.roles || item.roles.includes(auth.user?.role || 'user')),
)

const mobileItems = computed(() => {
  const preferredRoutes = auth.isAdmin
    ? ['/dashboard', '/creditrequests', '/chat', '/servers', '/settings']
    : ['/dashboard', '/creditrequests', '/chat', '/management', '/profile']
  return preferredRoutes
    .map((path) => visibleItems.value.find((item) => item.route === path))
    .filter((item): item is NavItem => Boolean(item))
})

const isChatRoute = computed(() => route.path === '/chat')
const unreadNotifications = computed(
  () => notifications.value.filter((item) => !(item.isRead ?? item.read)).length,
)
const shellName = computed(() => shellSettings.value?.company_name || 'Gestor J2')
const shellLogo = computed(() => shellSettings.value?.sidebar_logo_url || shellSettings.value?.login_logo_url || '')
const shellLogoFit = computed<'contain' | 'cover' | 'scale-down'>(() => {
  const fit = shellSettings.value?.sidebar_logo_fit || shellSettings.value?.login_logo_fit
  return fit === 'cover' || fit === 'scale-down' ? fit : 'contain'
})
const shellLogoStyle = computed<CSSProperties>(() => ({ objectFit: shellLogoFit.value }))
const profileIcon = computed(() =>
  auth.user?.profile_image_url ||
  auth.user?.profileImageUrl ||
  shellSettings.value?.profile_icon_url ||
  shellLogo.value,
)
const profileIconStyle = computed<CSSProperties>(() => ({ objectFit: 'cover' }))

watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false
    searchOpen.value = false
  },
)

watch(searchQuery, (value) => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = null
  }

  const query = value.trim()
  searchError.value = ''
  if (query.length < 2) {
    searchResults.value = []
    searchLoading.value = false
    return
  }

  searchLoading.value = true
  searchTimer = window.setTimeout(() => {
    runGlobalSearch(query)
  }, 260)
})

function isActive(path: string) {
  return route.path === path
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function normalizeSearchText(value?: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

function matchesSearch(query: string, values: unknown[]) {
  const needle = normalizeSearchText(query)
  return values.some((value) => normalizeSearchText(value).includes(needle))
}

function getUserDisplayName(user?: User | null) {
  return user?.name || user?.full_name || user?.email || 'Revendedor'
}

async function loadShellSettings() {
  try {
    shellSettings.value = await settingsService.getPublic()
    if (shellSettings.value?.favicon_url) {
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!favicon) {
        favicon = document.createElement('link')
        favicon.rel = 'icon'
        document.head.appendChild(favicon)
      }
      favicon.href = shellSettings.value.favicon_url
    }
  } catch {
    shellSettings.value = null
  }
}

function uniqueSearchResults(results: SearchResult[]) {
  const seen = new Set<string>()
  return results.filter((item) => {
    const key = `${item.type}:${item.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function runGlobalSearch(query: string) {
  let failures = 0
  const fallback = async <T,>(promise: Promise<T>, value: T) =>
    promise.catch(() => {
      failures += 1
      return value
    })

  const [requestResponse, servers, users, links] = await Promise.all([
    fallback(creditRequestsService.list(80), { data: [] as CreditRequest[] }),
    fallback(serversService.list(), [] as ServerRecord[]),
    auth.isAdmin ? fallback(usersService.list(), [] as User[]) : Promise.resolve([] as User[]),
    fallback(resellerServersService.list(), [] as ResellerServer[]),
  ])

  if (query !== searchQuery.value.trim()) return

  const requests = Array.isArray(requestResponse.data) ? requestResponse.data : []
  const results: SearchResult[] = []

  requests.forEach((request) => {
    const serverName = request.server_snapshot?.name || 'Servidor'
    const resellerName = getUserDisplayName(request.reseller)
    if (!matchesSearch(query, [request.id, request.login, request.status, serverName, resellerName, request.reseller?.email])) return

    results.push({
      id: request.id,
      type: 'Pedido',
      title: `${serverName} · ${request.requested_credits || 0} cr`,
      subtitle: `${resellerName} · ${request.login || 'sem login'} · ${request.status}`,
      meta: formatCurrency(request.total_value),
      route: '/creditrequests',
    })
  })

  servers.forEach((server) => {
    if (!matchesSearch(query, [server.id, server.name, server.description, server.panel_link, server.username])) return

    results.push({
      id: server.id,
      type: 'Servidor',
      title: server.name,
      subtitle: server.description || server.panel_link || 'Servidor cadastrado',
      meta: server.active === false ? 'inativo' : 'ativo',
      route: '/servers',
    })
  })

  users.forEach((user) => {
    if (!matchesSearch(query, [user.id, user.name, user.full_name, user.email, user.phone, user.status])) return

    results.push({
      id: user.id,
      type: 'Revendedor',
      title: getUserDisplayName(user),
      subtitle: `${user.email}${user.phone ? ` · ${user.phone}` : ''}`,
      meta: user.status || user.role,
      route: '/users',
    })
  })

  links.forEach((link) => {
    const resellerName = getUserDisplayName(link.reseller)
    const serverName = link.server?.name || 'Servidor vinculado'
    if (!matchesSearch(query, [link.id, link.login, resellerName, link.reseller?.email, serverName, link.supplier?.name])) return

    results.push({
      id: link.id,
      type: 'Vinculo',
      title: `${serverName} · ${link.login}`,
      subtitle: `${resellerName}${link.supplier?.name ? ` · ${link.supplier.name}` : ''}`,
      meta: formatCurrency(link.value_per_credit),
      route: auth.isAdmin ? '/servers' : '/profile',
    })
  })

  searchResults.value = uniqueSearchResults(results).slice(0, 10)
  searchError.value =
    failures >= 3 && searchResults.value.length === 0
      ? 'Nao foi possivel consultar a busca agora.'
      : ''
  searchLoading.value = false
}

async function openSearchResult(result: SearchResult) {
  searchQuery.value = ''
  searchResults.value = []
  searchOpen.value = false
  await router.push(result.route)
}

function openFirstSearchResult() {
  const first = searchResults.value[0]
  if (first) openSearchResult(first)
}

async function loadNotifications() {
  notificationsLoading.value = true
  notificationsError.value = ''
  try {
    notifications.value = await notificationsService.list()
  } catch (error) {
    notificationsError.value = error instanceof Error ? error.message : 'Nao foi possivel carregar notificacoes.'
  } finally {
    notificationsLoading.value = false
  }
}

async function markNotificationRead(id: string) {
  const notification = notifications.value.find((item) => item.id === id)
  notifications.value = notifications.value.map((item) =>
    item.id === id ? { ...item, read: true, isRead: true } : item,
  )

  try {
    await notificationsService.markRead(id)
  } catch {
    await loadNotifications()
    return
  }

  notificationsOpen.value = false
  if (notification?.url) {
    await router.push(notification.url)
  } else if (notification?.credit_request_id) {
    await router.push('/creditrequests')
  }
}

async function markAllNotificationsRead() {
  notifications.value = notifications.value.map((item) => ({ ...item, read: true, isRead: true }))
  try {
    await notificationsService.markAllRead()
  } catch {
    await loadNotifications()
  }
}

function pushLiveAlert(notification: NotificationItem) {
  liveAlerts.value = [notification, ...liveAlerts.value.filter((item) => item.id !== notification.id)].slice(0, 3)
  navigator.vibrate?.([220, 80, 260, 80, 220])
  window.setTimeout(() => {
    liveAlerts.value = liveAlerts.value.filter((item) => item.id !== notification.id)
  }, 6800)
}

function mergeNotification(notification: NotificationItem) {
  const isNew = !notifications.value.some((item) => item.id === notification.id)
  notifications.value = [
    notification,
    ...notifications.value.filter((item) => item.id !== notification.id),
  ].slice(0, 50)
  if (isNew) pushLiveAlert(notification)
}

function startNotificationStream() {
  stopNotificationStream()
  try {
    notificationStream = new EventSource(notificationStreamUrl, { withCredentials: true })
    notificationStream.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if (parsed?.type === 'heartbeat') return
        mergeNotification(normalizeNotification(parsed))
      } catch {
        loadNotifications()
      }
    }
    notificationStream.onerror = () => {
      notificationStream?.close()
      notificationStream = null
    }
  } catch {
    notificationStream = null
  }
}

function stopNotificationStream() {
  notificationStream?.close()
  notificationStream = null
}

function handleServiceWorkerMessage(event: MessageEvent) {
  const payload = event.data
  if (!payload || typeof payload !== 'object') return

  if (payload.type === 'PUSH_RECEIVED') {
    loadNotifications()
  }

  if (payload.type === 'NOTIFICATION_CLICK' && payload.url) {
    router.push(payload.url)
  }
}

function goNewRecharge() {
  notificationsOpen.value = false
  router.push({ path: '/creditrequests', query: { new: '1' } })
}

async function logout() {
  await auth.logout()
  stopNotificationStream()
  notificationsOpen.value = false
  await router.push('/login')
}

onMounted(() => {
  loadShellSettings()
  loadNotifications()
  startNotificationStream()
  navigator.serviceWorker?.addEventListener?.('message', handleServiceWorkerMessage)
})

onUnmounted(() => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = null
  }
  stopNotificationStream()
  navigator.serviceWorker?.removeEventListener?.('message', handleServiceWorkerMessage)
})
</script>

<template>
  <main class="app-stage" :class="{ 'mobile-menu-open': mobileMenuOpen }">
    <header class="mobile-header" aria-label="Topo mobile">
      <div class="brand mobile-brand">
        <span v-if="shellLogo" class="brand-image" aria-hidden="true">
          <img :src="shellLogo" :alt="shellName" :style="shellLogoStyle" />
        </span>
        <span v-else class="brand-mark" aria-hidden="true"><span /></span>
        <span>{{ shellName }}</span>
      </div>

      <div class="mobile-header-actions">
        <button
          class="mobile-menu-toggle"
          type="button"
          :aria-expanded="mobileMenuOpen"
          aria-label="Abrir navegacao completa"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span aria-hidden="true" />
        </button>

        <div class="mobile-profile">
          <div class="avatar compact" aria-hidden="true">
            <img v-if="profileIcon" :src="profileIcon" :alt="auth.user?.name || shellName" :style="profileIconStyle" />
            <span v-else>{{ auth.user?.name?.[0] || 'J2' }}</span>
          </div>
          <div>
            <strong>{{ auth.user?.name || 'J2 Servers' }}</strong>
            <small>{{ auth.isAdmin ? 'Admin' : 'Revendedor' }}</small>
          </div>
        </div>
      </div>
    </header>

    <section
      class="mobile-menu-surface"
      aria-label="Navegacao completa mobile"
      :aria-hidden="!mobileMenuOpen"
      :inert="!mobileMenuOpen"
    >
      <div class="mobile-menu-head">
        <div>
          <strong>Todas as paginas</strong>
          <span>{{ auth.isAdmin ? 'Painel administrador' : 'Painel revendedor' }}</span>
        </div>
        <button type="button" @click="mobileMenuOpen = false">Subir</button>
      </div>

      <nav class="mobile-menu-grid">
        <RouterLink
          v-for="item in visibleItems"
          :key="item.route"
          class="mobile-menu-link"
          :class="{ active: isActive(item.route) }"
          :to="item.route"
          @click="closeMobileMenu"
        >
          <span aria-hidden="true"><component :is="item.icon" :size="17" :stroke-width="2.35" /></span>
          <strong>{{ item.label }}</strong>
        </RouterLink>
      </nav>
    </section>

    <aside class="sidebar" aria-label="Navegacao principal">
      <div class="brand">
        <span v-if="shellLogo" class="brand-image" aria-hidden="true">
          <img :src="shellLogo" :alt="shellName" :style="shellLogoStyle" />
        </span>
        <span v-else class="brand-mark" aria-hidden="true"><span /></span>
        <span>{{ shellName }}</span>
      </div>

      <section class="profile" aria-label="Perfil atual">
        <div class="dot-grid" aria-hidden="true" />
        <div class="avatar" aria-hidden="true">
          <img v-if="profileIcon" :src="profileIcon" :alt="auth.user?.name || shellName" :style="profileIconStyle" />
          <span v-else>{{ auth.user?.name?.[0] || 'J2' }}</span>
        </div>
        <div>
          <strong>{{ auth.user?.name || 'J2 Servers' }}</strong>
          <small>{{ auth.isAdmin ? 'Painel administrador' : 'Painel revendedor' }}</small>
        </div>
      </section>

      <nav class="nav">
        <RouterLink
          v-for="item in visibleItems"
          :key="item.route"
          class="nav-item"
          :class="{ active: isActive(item.route) }"
          :to="item.route"
        >
          <span class="nav-icon" aria-hidden="true">
            <component :is="item.icon" :size="18" :stroke-width="2.35" />
          </span>
          {{ item.label }}
        </RouterLink>
      </nav>

    </aside>

    <section class="main-panel" :class="{ 'chat-panel': isChatRoute }">
      <header v-if="!isChatRoute" class="topbar">
        <div class="overview">
          <slot name="title">Overview</slot>
        </div>

        <div class="search" :class="{ active: searchOpen }">
          <span aria-hidden="true"><Search :size="22" :stroke-width="2.25" /></span>
          <input
            v-model="searchQuery"
            aria-label="Buscar"
            autocomplete="off"
            placeholder="Buscar pedido, servidor ou revendedor..."
            @focus="searchOpen = true"
            @keydown.enter.prevent="openFirstSearchResult"
            @keydown.esc="searchOpen = false"
          />

          <div
            v-if="searchOpen && (searchQuery.trim().length >= 2 || searchResults.length || searchLoading || searchError)"
            class="search-menu"
          >
            <div v-if="searchLoading" class="search-state">Buscando no sistema...</div>
            <div v-else-if="searchError" class="search-state error">{{ searchError }}</div>
            <div v-else-if="searchQuery.trim().length >= 2 && !searchResults.length" class="search-state">
              Nenhum resultado encontrado.
            </div>
            <template v-else>
              <button
                v-for="result in searchResults"
                :key="`${result.type}-${result.id}`"
                class="search-result"
                type="button"
                @mousedown.prevent="openSearchResult(result)"
              >
                <span>{{ result.type }}</span>
                <strong>{{ result.title }}</strong>
                <small>{{ result.subtitle }}</small>
                <b v-if="result.meta">{{ result.meta }}</b>
              </button>
            </template>
          </div>
        </div>

        <div class="toolbar" aria-label="Acoes rapidas">
          <div class="notification-wrap">
            <button
              class="icon-btn notification-button"
              :class="{ active: notificationsOpen }"
              :aria-expanded="notificationsOpen"
              aria-label="Notificacoes"
              type="button"
              @click="notificationsOpen = !notificationsOpen"
            >
              <BellRing aria-hidden="true" :size="20" :stroke-width="2.2" />
              <b v-if="unreadNotifications">{{ unreadNotifications }}</b>
            </button>

            <div v-if="notificationsOpen" class="notification-menu">
              <NotificationPopover
                :notifications="notifications"
                :loading="notificationsLoading"
                :error="notificationsError"
                @mark-read="markNotificationRead"
                @mark-all-read="markAllNotificationsRead"
                @refresh="loadNotifications"
              />
              <PushNotificationToggle />
            </div>
          </div>
          <button class="logout-button" type="button" @click="logout">
            <LogOut aria-hidden="true" :size="16" :stroke-width="2.3" />
            Sair
          </button>
          <UiButton v-if="!auth.isAdmin" @click="goNewRecharge">Nova recarga</UiButton>
        </div>
      </header>

      <RouterView />
    </section>

    <div v-if="liveAlerts.length" class="live-alert-stack" aria-live="polite">
      <button
        v-for="alert in liveAlerts"
        :key="alert.id"
        class="live-alert"
        type="button"
        @click="markNotificationRead(alert.id)"
      >
        <strong>{{ alert.title || 'Gestor J2' }}</strong>
        <span>{{ alert.message }}</span>
      </button>
    </div>

    <nav
      v-if="!isChatRoute && !mobileMenuOpen"
      class="mobile-nav"
      aria-label="Navegacao principal mobile"
      :style="{ '--mobile-nav-count': mobileItems.length }"
    >
      <RouterLink
        v-for="item in mobileItems"
        :key="item.route"
        class="mobile-nav-item"
        :class="{ active: isActive(item.route) }"
        :to="item.route"
        @click="closeMobileMenu"
      >
        <span aria-hidden="true"><component :is="item.icon" :size="17" :stroke-width="2.35" /></span>
        <strong>{{ item.label }}</strong>
      </RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.app-stage {
  width: 100vw;
  min-height: 100dvh;
  height: 100dvh;
  margin: 0;
  display: grid;
  grid-template-columns: 276px minmax(0, 1fr);
  overflow: hidden;
  background: #eef0ef;
}

.mobile-header,
.mobile-nav,
.mobile-menu-surface {
  display: none;
}

.sidebar {
  height: 100dvh;
  min-height: 0;
  padding: 28px 26px 24px 30px;
  color: var(--gj2-sidebar-text);
  background:
    radial-gradient(circle at 45% 19%, rgba(255, 255, 255, .08), transparent 8%),
    radial-gradient(circle at 58% 22%, rgba(255, 255, 255, .06), transparent 12%),
    linear-gradient(160deg, #667380 0%, #6c7b88 55%, #60707d 100%);
  overflow: auto;
  scrollbar-width: none;
  overscroll-behavior: contain;
}

.sidebar::-webkit-scrollbar {
  display: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 30px;
  font-size: 20px;
  font-weight: 850;
  letter-spacing: .02em;
}

.brand-mark {
  width: 31px;
  height: 24px;
  position: relative;
}

.brand-mark::before,
.brand-mark::after,
.brand-mark span {
  content: "";
  position: absolute;
  width: 15px;
  height: 22px;
  border-radius: 14px;
  background: #fff;
  opacity: .95;
}

.brand-mark::before {
  left: 0;
  transform: rotate(-16deg);
}

.brand-mark::after {
  left: 13px;
  opacity: .88;
}

.brand-mark span {
  left: 7px;
  background: rgba(255, 255, 255, .55);
}

.brand-image {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgba(255, 255, 255, .2);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.3),
    0 14px 24px rgba(38, 49, 57, .18);
}

.brand-image img {
  width: 100%;
  height: 100%;
  padding: 5px;
}

.profile {
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: 28px;
  text-align: center;
}

.dot-grid {
  position: absolute;
  top: -28px;
  width: 74px;
  height: 64px;
  background-image: radial-gradient(rgba(41, 52, 61, .18) 2px, transparent 2px);
  background-size: 13px 13px;
  opacity: .6;
}

.avatar {
  width: 74px;
  height: 74px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  color: #fff;
  font-size: 17px;
  font-weight: 900;
  background:
    radial-gradient(circle at 72% 72%, #17191b 0 17%, transparent 18%),
    linear-gradient(145deg, #bfe6c7 0%, #91c6a9 100%);
  box-shadow: 0 14px 26px rgba(49, 62, 69, .22);
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  display: block;
}

.avatar.compact {
  width: 46px;
  height: 46px;
  margin: 0;
  font-size: 13px;
}

.profile strong {
  display: block;
  font-size: 18px;
}

.profile small {
  color: var(--gj2-sidebar-muted);
  font-weight: 650;
}

.nav {
  display: grid;
  gap: 9px;
  font-size: 15px;
  font-weight: 760;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 13px;
  color: var(--gj2-sidebar-muted);
  text-decoration: none;
  min-height: 42px;
  padding: 0 10px;
  border-radius: 15px;
  transition: color .18s ease, transform .18s ease;
}

.nav-item:hover,
.nav-item.active {
  color: #fff;
  background: rgba(255,255,255,.1);
}

.nav-item.active {
  transform: translateX(2px);
}

.nav-icon {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: currentColor;
}

.nav-icon svg {
  display: block;
}

.main-panel {
  height: 100dvh;
  min-height: 0;
  margin-left: 0;
  padding: 26px 32px 34px;
  border-radius: 0;
  background:
    radial-gradient(circle at 88% 47%, rgba(231, 234, 233, .8), transparent 33%),
    linear-gradient(145deg, #fafafa 0%, var(--gj2-panel) 64%, #f1f1ef 100%);
  box-shadow: none;
  position: relative;
  z-index: 2;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.main-panel.chat-panel {
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}

.main-panel::-webkit-scrollbar {
  display: none;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.overview {
  min-width: 184px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 26px;
  font-weight: 790;
}

.search {
  position: relative;
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #697079;
  min-height: 51px;
  padding: 0 4px;
  border-radius: 17px;
  font-size: 14px;
  transition: background .18s ease, box-shadow .18s ease;
}

.search span {
  display: grid;
  place-items: center;
  color: #697079;
}

.search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--gj2-muted);
}

.search input::placeholder {
  color: #9aa0a5;
}

.search.active {
  background: rgba(255, 255, 255, .42);
  box-shadow:
    0 16px 34px rgba(88, 98, 106, .1),
    inset 0 1px rgba(255,255,255,.74);
}

.search-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  z-index: 95;
  max-height: min(430px, calc(100dvh - 170px));
  overflow: auto;
  padding: 10px;
  border: 1px solid rgba(226, 228, 225, .92);
  border-radius: 24px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 28px 70px rgba(67, 78, 87, .22);
  backdrop-filter: blur(18px);
  scrollbar-width: none;
}

.search-menu::-webkit-scrollbar {
  display: none;
}

.search-state {
  min-height: 74px;
  display: grid;
  place-items: center;
  color: #71777d;
  font-size: 13px;
  font-weight: 780;
  text-align: center;
}

.search-state.error {
  color: #be3a31;
}

.search-result {
  width: 100%;
  border: 0;
  border-radius: 17px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 12px;
  padding: 13px 14px;
  color: #15191c;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background .16s ease, transform .16s ease;
}

.search-result:hover {
  background: #f2f4f2;
  transform: translateY(-1px);
}

.search-result span,
.search-result small {
  color: #7a8288;
  font-size: 11px;
  font-weight: 780;
}

.search-result strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 900;
}

.search-result small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  grid-column: 1 / 2;
}

.search-result b {
  align-self: center;
  grid-column: 2 / 3;
  grid-row: 1 / span 3;
  color: #6b9481;
  font-size: 12px;
  font-weight: 920;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-btn,
.logout-button {
  width: 51px;
  height: 51px;
  border: 1px solid #e4e5e3;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: #68717a;
  background: rgba(255,255,255,.24);
  box-shadow: inset 0 1px rgba(255,255,255,.72);
  cursor: pointer;
}

.logout-button {
  width: auto;
  min-width: 70px;
  padding: 0 17px;
  color: #fff;
  background: #111517;
  font-size: 13px;
  font-weight: 900;
  grid-auto-flow: column;
  gap: 8px;
}

.notification-wrap {
  position: relative;
}

.notification-button {
  position: relative;
  overflow: visible;
}

.notification-button.active {
  color: #fff;
  background: var(--gj2-sidebar);
}

.notification-button b {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 21px;
  height: 21px;
  padding: 0 6px;
  border: 2px solid #fff;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--gj2-red);
  font-size: 10px;
  font-weight: 950;
  line-height: 1;
}

.notification-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 80;
  display: grid;
  gap: 10px;
}

.notification-menu :deep(.push-toggle) {
  padding: 10px;
  border-radius: 19px;
  background: rgba(255,255,255,.92);
  box-shadow: 0 20px 46px rgba(58, 69, 76, .2);
  backdrop-filter: blur(16px);
}

.live-alert-stack {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 140;
  display: grid;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.live-alert {
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 22px;
  padding: 14px 16px;
  display: grid;
  gap: 4px;
  color: #fff;
  background:
    radial-gradient(circle at 94% 18%, rgba(255, 82, 34, .34), transparent 30%),
    linear-gradient(145deg, #111719, #060809);
  box-shadow: 0 24px 52px rgba(14, 17, 18, .34);
  text-align: left;
  cursor: pointer;
  pointer-events: auto;
  animation: live-alert-in .28s ease-out both;
}

.live-alert strong {
  font-size: 13px;
  font-weight: 950;
}

.live-alert span {
  color: rgba(255, 255, 255, .74);
  font-size: 12px;
  font-weight: 760;
  line-height: 1.35;
}

@keyframes live-alert-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1180px) {
  .app-stage {
    width: 100%;
    margin: 0;
    height: 100dvh;
    min-height: 100dvh;
    display: block;
    position: relative;
    filter: none;
    overflow: hidden;
    background:
      radial-gradient(circle at 74% 8%, rgba(255, 255, 255, .14), transparent 24%),
      linear-gradient(160deg, #687784 0%, #60717e 100%);
  }

  .sidebar {
    display: none;
  }

  .app-stage.mobile-menu-open {
    height: 100dvh;
    overflow: hidden;
  }

  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 88px;
    padding: max(14px, env(safe-area-inset-top)) 16px 18px;
    color: #fff;
    position: relative;
    z-index: 6;
    background:
      radial-gradient(circle at 70% 8%, rgba(255, 255, 255, .12), transparent 24%),
      linear-gradient(160deg, #687784 0%, #60717e 100%);
  }

  .mobile-brand {
    margin: 0;
    font-size: 17px;
  }

  .mobile-header-actions {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .mobile-menu-toggle {
    width: 46px;
    height: 46px;
    border: 1px solid rgba(255, 255, 255, .22);
    border-radius: 17px;
    display: grid;
    place-items: center;
    color: #fff;
    background: rgba(255, 255, 255, .13);
    box-shadow:
      0 14px 26px rgba(40, 50, 58, .22),
      inset 0 1px 0 rgba(255, 255, 255, .24);
    backdrop-filter: blur(14px);
    cursor: pointer;
    transition: transform .22s ease, background .22s ease, box-shadow .22s ease;
  }

  .mobile-menu-toggle span {
    width: 12px;
    height: 12px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg) translate(-2px, -2px);
    transition: transform .28s cubic-bezier(.2, .8, .2, 1);
  }

  .mobile-menu-open .mobile-menu-toggle {
    background: rgba(255, 255, 255, .22);
    transform: translateY(1px);
  }

  .mobile-menu-open .mobile-menu-toggle span {
    transform: rotate(225deg) translate(-1px, -1px);
  }

  .mobile-profile {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, .12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .18);
  }

  .mobile-profile strong,
  .mobile-profile small {
    display: block;
    max-width: 116px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-profile strong {
    font-size: 13px;
    font-weight: 880;
  }

  .mobile-profile small {
    color: rgba(255, 255, 255, .72);
    font-size: 11px;
    font-weight: 760;
  }

  .live-alert-stack {
    right: 14px;
    bottom: 94px;
  }

  .main-panel {
    height: calc(100dvh - 74px);
    min-height: 0;
    margin-left: 0;
    margin-top: -14px;
    padding: 28px 20px calc(72px + env(safe-area-inset-bottom, 0px));
    border-radius: 30px 30px 0 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    transform: translateY(0);
    transform-origin: top center;
    transition:
      transform .42s cubic-bezier(.2, .84, .24, 1),
      border-radius .42s ease,
      box-shadow .42s ease;
    will-change: transform;
  }

  .main-panel.chat-panel {
    height: calc(100dvh - 88px);
    margin-top: 0;
    padding: 0 14px 14px;
    border-radius: 28px 28px 0 0;
    overflow: hidden;
  }

  .main-panel::-webkit-scrollbar {
    display: none;
  }

  .mobile-menu-open .main-panel {
    transform: translateY(calc(100dvh - 76px));
    border-radius: 32px 32px 0 0;
    box-shadow:
      0 -18px 38px rgba(31, 41, 49, .26),
      0 34px 80px rgba(31, 41, 49, .34);
  }

  .topbar {
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .overview {
    width: 100%;
    min-width: 0;
  }

  .mobile-menu-surface {
    position: absolute;
    inset: 0;
    z-index: 2;
    min-height: 100dvh;
    display: block;
    padding: 100px 16px 150px;
    color: #fff;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-12px);
    transition: opacity .28s ease, transform .34s ease;
  }

  .mobile-menu-open .mobile-menu-surface {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .mobile-menu-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
  }

  .mobile-menu-head strong,
  .mobile-menu-head span {
    display: block;
  }

  .mobile-menu-head strong {
    font-size: 22px;
    font-weight: 920;
    letter-spacing: .01em;
  }

  .mobile-menu-head span {
    margin-top: 3px;
    color: rgba(255, 255, 255, .62);
    font-size: 12px;
    font-weight: 760;
  }

  .mobile-menu-head button {
    border: 1px solid rgba(255, 255, 255, .22);
    min-height: 40px;
    padding: 0 14px;
    border-radius: 999px;
    color: #fff;
    background: rgba(255, 255, 255, .12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .2);
    font-size: 12px;
    font-weight: 880;
    cursor: pointer;
  }

  .mobile-menu-grid {
    max-height: calc(100dvh - 178px);
    overflow: auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    padding: 2px 2px 20px;
    scrollbar-width: none;
  }

  .mobile-menu-grid::-webkit-scrollbar {
    display: none;
  }

  .mobile-menu-link {
    min-width: 0;
    min-height: 58px;
    padding: 10px;
    border-radius: 19px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    color: rgba(255, 255, 255, .74);
    text-decoration: none;
    background: rgba(255, 255, 255, .085);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, .13),
      0 12px 22px rgba(31, 41, 49, .12);
    transition: transform .18s ease, background .18s ease, color .18s ease;
  }

  .mobile-menu-link span {
    width: 32px;
    height: 32px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, .8);
    background: rgba(255, 255, 255, .12);
  }

  .mobile-menu-link span svg {
    display: block;
  }

  .mobile-menu-link strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 860;
  }

  .mobile-menu-link.active {
    color: #fff;
    background: linear-gradient(145deg, rgba(157, 202, 178, .9), rgba(113, 133, 148, .9));
    transform: translateY(-1px);
  }

  .mobile-menu-link.active span {
    color: #fff;
    background: rgba(255, 255, 255, .2);
  }

  /* ── bottom bar nativo (iOS/Android style) ─────────────────────────── */
  .mobile-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: repeat(var(--mobile-nav-count, 5), minmax(0, 1fr));
    min-height: calc(56px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: rgba(255, 255, 255, .96);
    border-top: 1px solid rgba(200, 203, 202, .8);
    box-shadow:
      0 -1px 0 rgba(200, 203, 202, .5),
      0 -8px 24px rgba(80, 92, 101, .10);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
  }

  .mobile-nav-item {
    min-width: 0;
    min-height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: #9aa0a8;
    text-decoration: none;
    font-size: 10px;
    font-weight: 760;
    letter-spacing: .01em;
    position: relative;
    transition: color .2s ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* indicador ativo — pílula acima do ícone */
  .mobile-nav-item::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 32px;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: var(--gj2-green-deep, #4a8c6a);
    transform-origin: center top;
    transition: transform .25s cubic-bezier(.34, 1.56, .64, 1);
  }

  .mobile-nav-item.active::before {
    transform: translateX(-50%) scaleX(1);
  }

  .mobile-nav-item span {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: transparent;
    transition:
      background .2s ease,
      transform .2s cubic-bezier(.34, 1.56, .64, 1);
  }

  .mobile-nav-item span svg {
    display: block;
    transition: stroke .2s ease;
  }

  .mobile-nav-item strong {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-nav-item:active span {
    transform: scale(.88);
  }

  .mobile-nav-item.active {
    color: var(--gj2-green-deep, #4a8c6a);
  }

  .mobile-nav-item.active span {
    background: rgba(74, 140, 106, .10);
    transform: translateY(-1px) scale(1.06);
  }

  .mobile-nav-item.active strong {
    font-weight: 900;
  }
}

@media (max-width: 620px) {
  .main-panel {
    height: calc(100dvh - 74px);
    min-height: 0;
    padding: 24px 16px calc(76px + env(safe-area-inset-bottom, 0px));
  }

  .main-panel.chat-panel {
    height: calc(100dvh - 88px);
    margin-top: 0;
    padding: 0 10px max(10px, env(safe-area-inset-bottom, 0px));
    border-radius: 24px 24px 0 0;
    overflow: hidden;
  }

  .toolbar {
    width: 100%;
  }

  .notification-wrap {
    position: static;
  }

  .notification-menu {
    position: fixed;
    top: 92px;
    right: 16px;
    left: 16px;
  }

  .notification-menu :deep(.notification-popover) {
    width: 100%;
  }

  .search {
    order: 3;
    flex: 0 0 100%;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 15px 17px;
    border-radius: 17px;
    background: #fff;
  }

  .toolbar :deep(.ui-button) {
    display: none;
  }
}
</style>
