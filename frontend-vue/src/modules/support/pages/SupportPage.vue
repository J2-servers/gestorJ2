<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  BellRing,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileText,
  Headphones,
  LinkIcon,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ServerCog,
  ShieldCheck,
  X,
} from '@lucide/vue'

import { supportService } from '@/services/api/support.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  SupportLink,
  SupportOverview,
  SupportServerGroup,
  SupportServerStatus,
  SupportServerUpdate,
  SupportTopic,
  SupportTopicStatus,
} from '@/types/domain'

type PublishKind = 'topic' | 'link' | 'update'

const auth = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const search = ref('')
const selectedServerId = ref('general')
const modalOpen = ref(false)
const modalStep = ref(1)
const overview = ref<SupportOverview>({ topics: [], links: [], updates: [], servers: [], serverGroups: [], categories: [], canManage: false })

const publishForm = reactive({
  kind: 'update' as PublishKind,
  serverId: '',
  title: '',
  category: 'Servidores',
  summary: '',
  content: '',
  steps: '',
  href: '',
  detail: '',
  message: '',
  status: 'attention' as SupportServerStatus,
  topicStatus: 'published' as SupportTopicStatus,
  impact: '',
  actionText: '',
  pinned: true,
  published: true,
})

const isAdmin = computed(() => auth.isAdmin && overview.value.canManage)
const groups = computed<SupportServerGroup[]>(() => {
  if (overview.value.serverGroups?.length) return overview.value.serverGroups
  return buildGroups()
})
const selectedGroup = computed(() => groups.value.find((item) => item.id === selectedServerId.value) ?? groups.value[0])
const visibleGroups = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return groups.value
  return groups.value.filter((group) => groupMatches(group, term))
})
const visibleTopics = computed(() => filterBySearch(selectedGroup.value?.topics ?? []))
const visibleLinks = computed(() => filterBySearch(selectedGroup.value?.links ?? []))
const visibleUpdates = computed(() => filterBySearch(selectedGroup.value?.updates ?? []))
const totalItems = computed(() => overview.value.topics.length + overview.value.links.length + overview.value.updates.length)
const alertCount = computed(() => overview.value.updates.filter((item) => ['attention', 'maintenance', 'degraded', 'offline'].includes(item.status)).length)
const modalTitle = computed(() => ({
  topic: 'Publicar tutorial',
  link: 'Publicar link',
  update: 'Publicar atualizacao',
})[publishForm.kind])
const canGoNext = computed(() => {
  if (modalStep.value === 1) return publishForm.title.trim().length >= 4
  if (modalStep.value === 2 && publishForm.kind === 'link') return publishForm.href.trim().length >= 4
  if (modalStep.value === 2 && publishForm.kind === 'update') return publishForm.message.trim().length >= 8
  if (modalStep.value === 2) return publishForm.summary.trim().length >= 4 || publishForm.content.trim().length >= 8 || publishForm.steps.trim().length >= 4
  return true
})

function buildGroups(): SupportServerGroup[] {
  const general = {
    id: 'general',
    name: 'Geral',
    active: true,
    topics: overview.value.topics.filter((item) => !serverIdOf(item)),
    links: overview.value.links.filter((item) => !serverIdOf(item)),
    updates: overview.value.updates.filter((item) => !serverIdOf(item)),
  }
  const serverGroups = overview.value.servers.map((server) => ({
    id: server.id,
    name: server.name,
    active: server.active,
    topics: overview.value.topics.filter((item) => serverIdOf(item) === server.id),
    links: overview.value.links.filter((item) => serverIdOf(item) === server.id),
    updates: overview.value.updates.filter((item) => serverIdOf(item) === server.id),
  }))
  return [general, ...serverGroups].map((group) => ({
    ...group,
    counts: { topics: group.topics.length, links: group.links.length, updates: group.updates.length },
    latestAt: latestDate([...group.topics, ...group.links, ...group.updates]),
  }))
}

function serverIdOf(item: SupportTopic | SupportLink | SupportServerUpdate) {
  return item.serverId ?? item.server_id ?? null
}

function groupMatches(group: SupportServerGroup, term: string) {
  const haystack = [
    group.name,
    ...group.topics.flatMap((item) => [item.title, item.category, item.summary, item.content, stepsOf(item).join(' ')]),
    ...group.links.flatMap((item) => [item.label, item.category, item.detail, item.href]),
    ...group.updates.flatMap((item) => [item.title, item.message, item.impact, item.actionText]),
  ].join(' ').toLowerCase()
  return haystack.includes(term)
}

function filterBySearch<T extends SupportTopic | SupportLink | SupportServerUpdate>(items: T[]) {
  const term = search.value.trim().toLowerCase()
  if (!term) return items
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(term))
}

function stepsOf(topic: SupportTopic) {
  if (Array.isArray(topic.steps)) return topic.steps.map(String).filter(Boolean)
  if (typeof topic.steps === 'string') return topic.steps.split(/\r?\n/).filter(Boolean)
  return []
}

function latestDate(items: Array<SupportTopic | SupportLink | SupportServerUpdate>) {
  return items
    .map((item) => item.updatedAt ?? item.updated_date ?? item.createdAt ?? item.created_date ?? item.publishedAt ?? item.published_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null
}

function dateText(value?: string | null) {
  if (!value) return 'Sem registro'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(status: SupportServerStatus) {
  return {
    operational: 'Operacional',
    attention: 'Atencao',
    maintenance: 'Manutencao',
    degraded: 'Instavel',
    offline: 'Offline',
  }[status]
}

function kindLabel(kind: PublishKind) {
  return { topic: 'Tutorial', link: 'Link', update: 'Comunicado' }[kind]
}

function isDefaultItem(id: string) {
  return id.startsWith('default-')
}

function openPublish(kind: PublishKind = 'update', serverId = selectedGroup.value?.id ?? 'general') {
  resetPublish()
  publishForm.kind = kind
  publishForm.serverId = serverId === 'general' ? '' : serverId
  publishForm.category = kind === 'update' ? 'Servidores' : kind === 'link' ? 'Atendimento' : 'Procedimento'
  modalStep.value = 1
  modalOpen.value = true
}

function closePublish() {
  modalOpen.value = false
}

function resetPublish() {
  Object.assign(publishForm, {
    kind: 'update',
    serverId: '',
    title: '',
    category: 'Servidores',
    summary: '',
    content: '',
    steps: '',
    href: '',
    detail: '',
    message: '',
    status: 'attention',
    topicStatus: 'published',
    impact: '',
    actionText: '',
    pinned: true,
    published: true,
  })
}

function nextStep() {
  if (modalStep.value < 3 && canGoNext.value) modalStep.value += 1
}

function previousStep() {
  if (modalStep.value > 1) modalStep.value -= 1
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    overview.value = await supportService.overview()
    if (!groups.value.some((group) => group.id === selectedServerId.value)) {
      selectedServerId.value = groups.value[0]?.id ?? 'general'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar a central de suporte.'
  } finally {
    loading.value = false
  }
}

async function publish() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    if (publishForm.kind === 'topic') {
      await supportService.createTopic({
        serverId: publishForm.serverId || undefined,
        title: publishForm.title,
        category: publishForm.category,
        summary: publishForm.summary,
        content: publishForm.content,
        steps: publishForm.steps,
        status: publishForm.topicStatus,
        pinned: publishForm.pinned,
      })
    } else if (publishForm.kind === 'link') {
      await supportService.createLink({
        serverId: publishForm.serverId || undefined,
        label: publishForm.title,
        href: publishForm.href,
        category: publishForm.category,
        detail: publishForm.detail,
        status: publishForm.topicStatus,
        pinned: publishForm.pinned,
      })
    } else {
      await supportService.createServerUpdate({
        serverId: publishForm.serverId || undefined,
        title: publishForm.title,
        message: publishForm.message,
        status: publishForm.status,
        impact: publishForm.impact,
        actionText: publishForm.actionText,
        pinned: publishForm.pinned,
        published: publishForm.published,
      })
    }
    notice.value = `${kindLabel(publishForm.kind)} publicado. Revendedores elegiveis recebem notificacao automaticamente.`
    closePublish()
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel publicar a informacao.'
  } finally {
    saving.value = false
  }
}

async function setTopicStatus(topic: SupportTopic, status: SupportTopicStatus) {
  await supportService.updateTopic(topic.id, { ...topic, serverId: serverIdOf(topic) || undefined, steps: stepsOf(topic).join('\n'), status })
  await load()
}

async function setLinkStatus(link: SupportLink, status: SupportTopicStatus) {
  await supportService.updateLink(link.id, { ...link, serverId: serverIdOf(link) || undefined, status })
  await load()
}

async function toggleUpdate(update: SupportServerUpdate) {
  await supportService.updateServerUpdate(update.id, { ...update, serverId: serverIdOf(update) || undefined, published: !update.published })
  await load()
}

onMounted(load)
</script>

<template>
  <div class="module-page support-page">
    <header class="support-topbar">
      <div>
        <span class="support-eyebrow">Central operacional</span>
        <h1>Suporte aos revendedores</h1>
        <p>Informacoes oficiais organizadas por servidor, com tutoriais, links, status e comunicados publicados pelo admin.</p>
      </div>
      <div class="support-actions">
        <button class="support-button ghost" type="button" :disabled="loading" @click="load">
          <RefreshCw :size="17" />
          Atualizar
        </button>
        <button v-if="isAdmin" class="support-button primary" type="button" @click="openPublish('update')">
          <Plus :size="18" />
          Publicar
        </button>
      </div>
    </header>

    <div v-if="notice" class="support-toast success">
      <CheckCircle2 :size="18" />
      {{ notice }}
    </div>
    <div v-if="error" class="support-toast error">
      <CircleAlert :size="18" />
      {{ error }}
    </div>

    <section class="support-summary">
      <article class="summary-card primary-summary">
        <Headphones :size="30" />
        <div>
          <strong>{{ isAdmin ? 'Painel do admin' : 'Painel do revendedor' }}</strong>
          <span>{{ isAdmin ? 'Publique comunicados segmentados por servidor e acompanhe o que esta visivel.' : 'Veja somente informacoes oficiais dos seus servidores e avisos gerais.' }}</span>
        </div>
      </article>
      <article class="summary-card">
        <strong>{{ groups.length }}</strong>
        <span>servidores</span>
      </article>
      <article class="summary-card">
        <strong>{{ totalItems }}</strong>
        <span>itens publicados</span>
      </article>
      <article class="summary-card">
        <strong>{{ alertCount }}</strong>
        <span>alertas ativos</span>
      </article>
    </section>

    <section class="support-workspace">
      <aside class="server-rail">
        <label class="support-search">
          <Search :size="17" />
          <input v-model="search" placeholder="Buscar por servidor, topico, erro ou link" />
        </label>

        <div class="rail-list">
          <button
            v-for="group in visibleGroups"
            :key="group.id"
            class="server-tab"
            :class="{ active: selectedServerId === group.id }"
            type="button"
            @click="selectedServerId = group.id"
          >
            <span class="server-dot" :class="{ off: group.active === false }"></span>
            <span>
              <strong>{{ group.name }}</strong>
              <small>{{ group.counts.updates }} avisos · {{ group.counts.topics }} topicos · {{ group.counts.links }} links</small>
            </span>
            <ChevronRight :size="16" />
          </button>
        </div>
      </aside>

      <main class="support-board">
        <section class="server-header-panel">
          <div>
            <span class="support-eyebrow">{{ selectedGroup?.id === 'general' ? 'Avisos gerais' : 'Servidor selecionado' }}</span>
            <h2>{{ selectedGroup?.name }}</h2>
            <p>{{ dateText(selectedGroup?.latestAt) }} · {{ selectedGroup?.counts.updates ?? 0 }} comunicados · {{ selectedGroup?.counts.topics ?? 0 }} tutoriais</p>
          </div>
          <div class="server-header-actions">
            <span class="notify-pill">
              <BellRing :size="16" />
              {{ isAdmin ? 'Notifica revendedores ao publicar' : 'Novos avisos chegam no sino' }}
            </span>
            <button v-if="isAdmin" class="support-button primary compact" type="button" @click="openPublish('update', selectedServerId)">
              <Megaphone :size="17" />
              Comunicado
            </button>
          </div>
        </section>

        <section class="content-columns">
          <div class="support-column updates-column">
            <div class="column-head">
              <ServerCog :size="21" />
              <div>
                <h3>Comunicados</h3>
                <p>Status, impacto e acao recomendada.</p>
              </div>
            </div>
            <article v-for="item in visibleUpdates" :key="item.id" class="support-item update-item" :class="item.status">
              <div class="item-head">
                <strong>{{ item.title }}</strong>
                <span>{{ statusLabel(item.status) }}</span>
              </div>
              <p>{{ item.message }}</p>
              <small v-if="item.impact">Impacto: {{ item.impact }}</small>
              <small v-if="item.actionText">Acao: {{ item.actionText }}</small>
              <div v-if="isAdmin" class="item-actions">
                <button class="mini-button" type="button" @click="toggleUpdate(item)">{{ item.published === false ? 'Publicar' : 'Ocultar' }}</button>
              </div>
            </article>
            <button v-if="isAdmin" class="add-line" type="button" @click="openPublish('update', selectedServerId)">
              <Plus :size="16" />
              Novo comunicado
            </button>
            <div v-if="!visibleUpdates.length" class="empty-state">Nenhum comunicado para este servidor.</div>
          </div>

          <div class="support-column">
            <div class="column-head">
              <BookOpenCheck :size="21" />
              <div>
                <h3>Tutoriais</h3>
                <p>Procedimentos oficiais e passo a passo.</p>
              </div>
            </div>
            <article v-for="topic in visibleTopics" :key="topic.id" class="support-item topic-item">
              <div class="item-head">
                <strong>{{ topic.title }}</strong>
                <span>{{ topic.category }}</span>
              </div>
              <p v-if="topic.summary">{{ topic.summary }}</p>
              <p v-if="topic.content" class="long-text">{{ topic.content }}</p>
              <ol v-if="stepsOf(topic).length">
                <li v-for="step in stepsOf(topic)" :key="step">{{ step }}</li>
              </ol>
              <div v-if="isAdmin && !isDefaultItem(topic.id)" class="item-actions">
                <button class="mini-button" type="button" @click="setTopicStatus(topic, 'published')">Publicar</button>
                <button class="mini-button" type="button" @click="setTopicStatus(topic, 'draft')">Rascunho</button>
                <button class="mini-button" type="button" @click="setTopicStatus(topic, 'archived')">Arquivar</button>
              </div>
            </article>
            <button v-if="isAdmin" class="add-line" type="button" @click="openPublish('topic', selectedServerId)">
              <Plus :size="16" />
              Novo tutorial
            </button>
            <div v-if="!visibleTopics.length" class="empty-state">Nenhum tutorial classificado aqui.</div>
          </div>

          <div class="support-column">
            <div class="column-head">
              <LinkIcon :size="21" />
              <div>
                <h3>Links</h3>
                <p>Acessos rapidos e materiais de apoio.</p>
              </div>
            </div>
            <a v-for="link in visibleLinks" :key="link.id" class="support-item link-item" :href="link.href">
              <div class="item-head">
                <strong>{{ link.label }}</strong>
                <ExternalLink :size="16" />
              </div>
              <p>{{ link.detail || link.href }}</p>
              <small>{{ link.category }}</small>
            </a>
            <div v-if="isAdmin" class="link-admin-actions">
              <button
                v-for="link in visibleLinks.filter((item) => !isDefaultItem(item.id))"
                :key="link.id"
                class="mini-button"
                type="button"
                @click="setLinkStatus(link, link.status === 'published' ? 'draft' : 'published')"
              >
                {{ link.status === 'published' ? 'Ocultar' : 'Publicar' }} {{ link.label }}
              </button>
            </div>
            <button v-if="isAdmin" class="add-line" type="button" @click="openPublish('link', selectedServerId)">
              <Plus :size="16" />
              Novo link
            </button>
            <div v-if="!visibleLinks.length" class="empty-state">Nenhum link publicado para este grupo.</div>
          </div>
        </section>
      </main>
    </section>

    <section class="support-footer-note">
      <ShieldCheck :size="22" />
      <p>Organizacao por servidor reduz chamados repetidos: o revendedor encontra o procedimento certo, o status atual e os links sem depender de mensagem manual.</p>
    </section>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closePublish">
      <section class="publish-modal" role="dialog" aria-modal="true" :aria-label="modalTitle">
        <header class="modal-head">
          <div>
            <span class="support-eyebrow">Etapa {{ modalStep }} de 3</span>
            <h2>{{ modalTitle }}</h2>
          </div>
          <button class="icon-button" type="button" @click="closePublish" aria-label="Fechar modal">
            <X :size="19" />
          </button>
        </header>

        <div class="modal-progress">
          <span v-for="step in 3" :key="step" :class="{ active: modalStep >= step }"></span>
        </div>

        <div v-if="modalStep === 1" class="modal-step">
          <label>
            Servidor
            <select v-model="publishForm.serverId" class="support-input">
              <option value="">Geral - todos os revendedores</option>
              <option v-for="server in overview.servers" :key="server.id" :value="server.id">{{ server.name }}</option>
            </select>
          </label>
          <label>
            Tipo de publicacao
            <select v-model="publishForm.kind" class="support-input">
              <option value="update">Comunicado de servidor</option>
              <option value="topic">Tutorial / procedimento</option>
              <option value="link">Link de suporte</option>
            </select>
          </label>
          <label class="full">
            Titulo
            <input v-model="publishForm.title" class="support-input" placeholder="Ex: Manutencao programada no servidor X" />
          </label>
        </div>

        <div v-else-if="modalStep === 2" class="modal-step">
          <template v-if="publishForm.kind === 'update'">
            <label>
              Status
              <select v-model="publishForm.status" class="support-input">
                <option value="operational">Operacional</option>
                <option value="attention">Atencao</option>
                <option value="maintenance">Manutencao</option>
                <option value="degraded">Instavel</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label class="full">
              Mensagem
              <textarea v-model="publishForm.message" class="support-textarea" placeholder="Explique exatamente o que o revendedor precisa saber." />
            </label>
            <label>
              Impacto
              <input v-model="publishForm.impact" class="support-input" placeholder="Ex: novos logins podem oscilar" />
            </label>
            <label>
              Acao recomendada
              <input v-model="publishForm.actionText" class="support-input" placeholder="Ex: orientar cliente a aguardar 10 minutos" />
            </label>
          </template>
          <template v-else-if="publishForm.kind === 'topic'">
            <label>
              Categoria
              <input v-model="publishForm.category" class="support-input" placeholder="Atendimento, Vendas, Tecnico..." />
            </label>
            <label>
              Status
              <select v-model="publishForm.topicStatus" class="support-input">
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>
            <label class="full">
              Resumo
              <input v-model="publishForm.summary" class="support-input" placeholder="Uma frase clara para o card." />
            </label>
            <label class="full">
              Conteudo
              <textarea v-model="publishForm.content" class="support-textarea" placeholder="Detalhe o contexto, quando usar e cuidados." />
            </label>
            <label class="full">
              Passos
              <textarea v-model="publishForm.steps" class="support-textarea compact-textarea" placeholder="Um passo por linha" />
            </label>
          </template>
          <template v-else>
            <label>
              Categoria
              <input v-model="publishForm.category" class="support-input" placeholder="Atendimento, Diagnostico, Vendas..." />
            </label>
            <label>
              Status
              <select v-model="publishForm.topicStatus" class="support-input">
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>
            <label class="full">
              URL
              <input v-model="publishForm.href" class="support-input" placeholder="https:// ou /rota-interna" />
            </label>
            <label class="full">
              Descricao
              <input v-model="publishForm.detail" class="support-input" placeholder="Quando este link deve ser usado." />
            </label>
          </template>
        </div>

        <div v-else class="modal-step review-step">
          <article class="review-card">
            <span>{{ kindLabel(publishForm.kind) }}</span>
            <h3>{{ publishForm.title }}</h3>
            <p>{{ publishForm.serverId ? overview.servers.find((item) => item.id === publishForm.serverId)?.name : 'Geral - todos os revendedores' }}</p>
            <small>{{ publishForm.kind === 'update' ? statusLabel(publishForm.status) : publishForm.topicStatus }}</small>
          </article>
          <label class="toggle-line">
            <input v-model="publishForm.pinned" type="checkbox" />
            Fixar no topo da classificacao
          </label>
          <label v-if="publishForm.kind === 'update'" class="toggle-line">
            <input v-model="publishForm.published" type="checkbox" />
            Publicar agora
          </label>
          <p class="review-note">
            Ao publicar, o sistema cria notificacao in-app, SSE e Web Push para revendedores elegiveis. Se escolher um servidor, apenas revendedores vinculados a ele recebem.
          </p>
        </div>

        <footer class="modal-actions">
          <button class="support-button ghost" type="button" :disabled="modalStep === 1 || saving" @click="previousStep">
            <ChevronLeft :size="17" />
            Voltar
          </button>
          <button v-if="modalStep < 3" class="support-button primary" type="button" :disabled="!canGoNext" @click="nextStep">
            Proximo
            <ChevronRight :size="17" />
          </button>
          <button v-else class="support-button primary" type="button" :disabled="saving" @click="publish">
            <Send :size="17" />
            Publicar e notificar
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.support-page {
  display: grid;
  gap: 18px;
}

.support-topbar,
.support-summary,
.support-workspace,
.server-header-panel,
.content-columns,
.modal-head,
.modal-actions {
  display: grid;
  gap: 14px;
}

.support-topbar {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.support-eyebrow {
  color: var(--gj2-orange);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.support-topbar h1,
.server-header-panel h2,
.column-head h3,
.modal-head h2 {
  margin: 0;
  color: var(--gj2-text);
  letter-spacing: 0;
}

.support-topbar p,
.server-header-panel p,
.column-head p,
.summary-card span,
.support-footer-note p,
.review-note {
  margin: 0;
  color: var(--gj2-muted);
  line-height: 1.5;
}

.support-actions,
.server-header-actions,
.item-actions,
.link-admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.support-button,
.mini-button,
.add-line,
.icon-button {
  border: 0;
  color: var(--gj2-text);
  font-weight: 900;
  cursor: pointer;
}

.support-button {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(6, 7, 7, .96);
  box-shadow:
    8px 10px 22px rgba(0,0,0,.44),
    -4px -4px 12px rgba(255,255,255,.016),
    inset 1px 1px 0 rgba(255,255,255,.014);
}

.support-button.primary {
  background: linear-gradient(135deg, #ff4b12, #8f1608);
}

.support-button.compact {
  min-height: 40px;
  padding: 0 13px;
}

.support-button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.support-toast,
.summary-card,
.server-rail,
.support-board,
.server-header-panel,
.support-column,
.support-footer-note,
.publish-modal {
  border: 0;
  background: rgba(6, 7, 7, .96);
  box-shadow:
    8px 10px 22px rgba(0,0,0,.44),
    -4px -4px 12px rgba(255,255,255,.016),
    inset 1px 1px 0 rgba(255,255,255,.014);
}

.support-toast {
  padding: 13px 15px;
  border-radius: 16px;
  display: flex;
  gap: 9px;
  align-items: center;
}

.support-toast.success {
  color: #96d4a9;
}

.support-toast.error {
  color: #ff8b7c;
}

.support-summary {
  grid-template-columns: minmax(260px, 1.5fr) repeat(3, minmax(120px, .55fr));
}

.summary-card {
  min-height: 104px;
  padding: 18px;
  border-radius: 24px;
  display: grid;
  align-content: center;
  gap: 7px;
}

.primary-summary {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.summary-card svg {
  color: var(--gj2-orange);
}

.summary-card strong {
  color: var(--gj2-text);
  font-size: 28px;
  font-weight: 950;
}

.primary-summary strong {
  font-size: 20px;
}

.support-workspace {
  grid-template-columns: minmax(260px, 330px) minmax(0, 1fr);
  align-items: start;
}

.server-rail,
.support-board {
  border-radius: 26px;
  padding: 14px;
}

.support-search,
.support-input,
.support-textarea {
  background: rgba(3, 4, 4, .76);
  border: 0;
  box-shadow:
    inset 3px 3px 8px rgba(0,0,0,.34),
    inset -2px -2px 6px rgba(255,255,255,.016);
}

.support-search {
  min-height: 48px;
  padding: 0 13px;
  border-radius: 17px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gj2-muted);
}

.support-search input,
.support-input,
.support-textarea {
  width: 100%;
  min-width: 0;
  color: var(--gj2-text);
  outline: 0;
}

.support-search input {
  border: 0;
  background: transparent;
}

.rail-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.server-tab {
  min-height: 72px;
  padding: 12px;
  border: 0;
  border-radius: 18px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  color: var(--gj2-text);
  background: rgba(3, 4, 4, .58);
  box-shadow: inset 2px 2px 7px rgba(0,0,0,.28);
  cursor: pointer;
}

.server-tab.active {
  background: rgba(255, 75, 18, .12);
}

.server-tab small {
  display: block;
  margin-top: 3px;
  color: var(--gj2-muted);
  font-weight: 750;
}

.server-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #77c68f;
}

.server-dot.off {
  background: #ff806f;
}

.support-board {
  display: grid;
  gap: 14px;
}

.server-header-panel {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  padding: 18px;
  border-radius: 22px;
  background: rgba(9, 10, 10, .96);
}

.notify-pill {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: var(--gj2-muted);
  background: rgba(3, 4, 4, .76);
  font-size: 12px;
  font-weight: 850;
}

.content-columns {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.support-column {
  min-width: 0;
  padding: 14px;
  border-radius: 22px;
  display: grid;
  align-content: start;
  gap: 11px;
}

.column-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.column-head svg {
  color: var(--gj2-orange);
  flex: 0 0 auto;
}

.support-item,
.empty-state,
.review-card {
  padding: 13px;
  border-radius: 17px;
  color: var(--gj2-text);
  background: rgba(3, 4, 4, .72);
  box-shadow:
    6px 7px 16px rgba(0,0,0,.28),
    inset 1px 1px 0 rgba(255,255,255,.012);
}

.support-item {
  display: grid;
  gap: 8px;
  text-decoration: none;
}

.item-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.item-head span,
.review-card span,
.support-item small {
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 850;
}

.update-item .item-head span {
  padding: 5px 8px;
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 75, 18, .72);
}

.update-item.operational .item-head span {
  background: rgba(83, 126, 101, .88);
}

.support-item p,
.support-item ol {
  margin: 0;
  color: var(--gj2-muted);
  line-height: 1.45;
}

.support-item ol {
  padding-left: 19px;
  display: grid;
  gap: 6px;
}

.long-text {
  color: var(--gj2-text) !important;
}

.mini-button,
.add-line {
  min-height: 34px;
  padding: 0 11px;
  border-radius: 12px;
  background: rgba(12, 13, 13, .96);
}

.add-line {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--gj2-orange);
}

.empty-state {
  color: var(--gj2-muted);
}

.support-footer-note {
  padding: 16px;
  border-radius: 22px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.support-footer-note svg {
  color: var(--gj2-orange);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  padding: 18px;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.72);
  backdrop-filter: blur(8px);
}

.publish-modal {
  width: min(720px, 100%);
  max-height: min(760px, calc(100vh - 32px));
  overflow: auto;
  padding: 18px;
  border-radius: 28px;
}

.modal-head {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.icon-button {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  background: rgba(3, 4, 4, .76);
}

.modal-progress {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}

.modal-progress span {
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
}

.modal-progress span.active {
  background: linear-gradient(135deg, #ff4b12, #8f1608);
}

.modal-step {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.modal-step label {
  display: grid;
  gap: 7px;
  color: var(--gj2-muted);
  font-weight: 850;
}

.modal-step .full,
.review-step {
  grid-column: 1 / -1;
}

.support-input,
.support-textarea {
  min-height: 46px;
  padding: 0 13px;
  border-radius: 15px;
}

.support-textarea {
  min-height: 130px;
  padding-top: 12px;
  resize: vertical;
}

.compact-textarea {
  min-height: 96px;
}

.review-card h3,
.review-card p {
  margin: 6px 0;
}

.toggle-line {
  display: flex !important;
  align-items: center;
  gap: 9px;
}

.modal-actions {
  grid-template-columns: 1fr auto;
  margin-top: 16px;
}

@media (max-width: 1180px) {
  .support-summary,
  .content-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .primary-summary {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .support-topbar,
  .support-workspace,
  .server-header-panel,
  .content-columns,
  .support-summary {
    grid-template-columns: 1fr;
  }

  .support-actions,
  .server-header-actions {
    width: 100%;
  }

  .support-button {
    flex: 1 1 150px;
  }

  .server-rail {
    position: sticky;
    top: 72px;
    z-index: 3;
  }

  .rail-list {
    grid-auto-flow: column;
    grid-auto-columns: minmax(220px, 1fr);
    overflow-x: auto;
    padding-bottom: 4px;
  }
}

@media (max-width: 620px) {
  .support-page {
    gap: 14px;
  }

  .summary-card,
  .server-rail,
  .support-board,
  .server-header-panel,
  .support-column,
  .publish-modal {
    border-radius: 20px;
  }

  .modal-backdrop {
    padding: 8px;
    align-items: end;
  }

  .publish-modal {
    max-height: calc(100vh - 16px);
  }

  .modal-step,
  .modal-actions {
    grid-template-columns: 1fr;
  }
}
</style>
