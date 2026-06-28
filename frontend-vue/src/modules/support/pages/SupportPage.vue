<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Headphones,
  LinkIcon,
  Megaphone,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
} from '@lucide/vue'

import { supportService } from '@/services/api/support.service'
import { useAuthStore } from '@/stores/auth.store'
import type { SupportLink, SupportOverview, SupportServerStatus, SupportServerUpdate, SupportTopic } from '@/types/domain'

const auth = useAuthStore()
const search = ref('')
const active = ref('Todos')
const manageTab = ref<'topic' | 'link' | 'server'>('topic')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const overview = ref<SupportOverview>({ topics: [], links: [], updates: [], servers: [], categories: [], canManage: false })

const topicForm = reactive({
  title: '',
  category: 'Atendimento',
  summary: '',
  content: '',
  steps: '',
  status: 'published',
  pinned: false,
  sortOrder: 0,
})

const linkForm = reactive({
  label: '',
  href: '',
  category: 'Atendimento',
  detail: '',
  status: 'published',
  pinned: false,
  sortOrder: 0,
})

const updateForm = reactive({
  serverId: '',
  title: '',
  message: '',
  status: 'operational' as SupportServerStatus,
  impact: '',
  actionText: '',
  pinned: false,
  published: true,
})

const isAdmin = computed(() => auth.isAdmin && overview.value.canManage)
const categories = computed(() => ['Todos', ...new Set(['Atendimento', 'Vendas', 'Financeiro', 'Tecnico', 'Servidores', ...overview.value.categories])])
const publishedTopics = computed(() => overview.value.topics.filter((item) => isAdmin.value || item.status === 'published'))
const publishedLinks = computed(() => overview.value.links.filter((item) => isAdmin.value || item.status === 'published'))
const updates = computed(() => overview.value.updates.filter((item) => isAdmin.value || item.published !== false))
const criticalUpdates = computed(() => updates.value.filter((item) => ['maintenance', 'degraded', 'offline', 'attention'].includes(item.status)).length)

const filteredTopics = computed(() => {
  const term = search.value.trim().toLowerCase()
  return publishedTopics.value.filter((item) => {
    const steps = stepsOf(item).join(' ')
    const matchCategory = active.value === 'Todos' || item.category === active.value
    const matchText = !term || `${item.title} ${item.category} ${item.summary || ''} ${item.content || ''} ${steps}`.toLowerCase().includes(term)
    return matchCategory && matchText
  })
})

const filteredLinks = computed(() =>
  publishedLinks.value.filter((item) => active.value === 'Todos' || item.category === active.value),
)

function stepsOf(topic: SupportTopic) {
  if (Array.isArray(topic.steps)) return topic.steps.map(String)
  if (typeof topic.steps === 'string') return topic.steps.split(/\r?\n/).filter(Boolean)
  return []
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

function dateText(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function isDefaultItem(id: string) {
  return id.startsWith('default-')
}

function updateDate(item: SupportServerUpdate) {
  return item.publishedAt || item.createdAt || null
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    overview.value = await supportService.overview()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar a central de suporte.'
  } finally {
    loading.value = false
  }
}

function resetTopic() {
  Object.assign(topicForm, { title: '', category: 'Atendimento', summary: '', content: '', steps: '', status: 'published', pinned: false, sortOrder: 0 })
}

function resetLink() {
  Object.assign(linkForm, { label: '', href: '', category: 'Atendimento', detail: '', status: 'published', pinned: false, sortOrder: 0 })
}

function resetUpdate() {
  Object.assign(updateForm, { serverId: '', title: '', message: '', status: 'operational', impact: '', actionText: '', pinned: false, published: true })
}

async function createTopic() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    await supportService.createTopic(topicForm)
    notice.value = 'Topico publicado na central.'
    resetTopic()
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel publicar o topico.'
  } finally {
    saving.value = false
  }
}

async function createLink() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    await supportService.createLink(linkForm)
    notice.value = 'Link publicado na central.'
    resetLink()
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel publicar o link.'
  } finally {
    saving.value = false
  }
}

async function createServerUpdate() {
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    await supportService.createServerUpdate(updateForm)
    notice.value = 'Atualizacao de servidor publicada.'
    resetUpdate()
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel publicar a atualizacao.'
  } finally {
    saving.value = false
  }
}

async function setTopicStatus(topic: SupportTopic, status: 'draft' | 'published' | 'archived') {
  await supportService.updateTopic(topic.id, { ...topic, steps: stepsOf(topic).join('\n'), status })
  await load()
}

async function setLinkStatus(link: SupportLink, status: 'draft' | 'published' | 'archived') {
  await supportService.updateLink(link.id, { ...link, status })
  await load()
}

async function toggleUpdate(update: SupportServerUpdate) {
  await supportService.updateServerUpdate(update.id, { ...update, published: !update.published })
  await load()
}

onMounted(load)
</script>

<template>
  <div class="module-page support-page">
    <header class="module-hero">
      <div>
        <h1>Central de suporte</h1>
        <p>Tutoriais, comunicados, links e status dos servidores para orientar revendedores com informacao oficial.</p>
      </div>
      <div class="module-actions">
        <button class="module-chip" type="button" :disabled="loading" @click="load">
          <RefreshCw :size="16" />
          Atualizar
        </button>
        <strong class="module-pill">{{ filteredTopics.length }} topicos</strong>
      </div>
    </header>

    <div v-if="notice" class="module-card pad support-notice">{{ notice }}</div>
    <div v-if="error" class="module-card pad support-error">{{ error }}</div>

    <section class="support-hero module-card pad">
      <div>
        <span class="support-icon"><Headphones :size="28" /></span>
        <h2>Base operacional dos revendedores</h2>
        <p>Conteudos publicados pelo admin, atualizacoes por servidor, procedimentos de atendimento, links internos e status operacional em um unico lugar.</p>
      </div>
      <div class="support-kpis">
        <span><strong>{{ overview.topics.length }}</strong><small>topicos</small></span>
        <span><strong>{{ overview.links.length }}</strong><small>links</small></span>
        <span><strong>{{ criticalUpdates }}</strong><small>alertas</small></span>
      </div>
    </section>

    <section class="module-card pad server-status-panel">
      <div class="section-head">
        <div>
          <h2>Atualizacoes dos servidores</h2>
          <p>Status e informacoes recentes que impactam atendimento, vendas e suporte tecnico.</p>
        </div>
        <ServerCog :size="24" />
      </div>
      <div v-if="!updates.length" class="empty-state">Nenhuma atualizacao publicada.</div>
      <div v-else class="updates-grid">
        <article v-for="item in updates" :key="item.id" class="update-card" :class="item.status">
          <div class="update-head">
            <strong>{{ item.server?.name || 'Geral' }}</strong>
            <span>{{ statusLabel(item.status) }}</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.message }}</p>
          <small>{{ item.impact || item.actionText || dateText(updateDate(item)) }}</small>
          <button v-if="isAdmin" class="module-chip" type="button" @click="toggleUpdate(item)">
            {{ item.published === false ? 'Publicar' : 'Ocultar' }}
          </button>
        </article>
      </div>
    </section>

    <div class="module-toolbar">
      <label class="support-search">
        <Search :size="18" />
        <input v-model="search" placeholder="Buscar tutorial, erro, servidor ou procedimento" />
      </label>
      <div class="module-chip-row">
        <button v-for="item in categories" :key="item" class="module-chip" :class="{ active: active === item }" @click="active = item">
          {{ item }}
        </button>
      </div>
    </div>

    <section class="support-grid">
      <article v-for="item in filteredTopics" :key="item.id" class="module-card pad tutorial-card">
        <div class="tutorial-head">
          <span><BookOpenCheck :size="22" /></span>
          <div>
            <small>{{ item.category }} <b v-if="isAdmin">/ {{ item.status }}</b></small>
            <h2>{{ item.title }}</h2>
            <p v-if="item.summary">{{ item.summary }}</p>
          </div>
        </div>
        <p v-if="item.content" class="tutorial-content">{{ item.content }}</p>
        <ol v-if="stepsOf(item).length">
          <li v-for="step in stepsOf(item)" :key="step">{{ step }}</li>
        </ol>
        <div v-if="isAdmin && !isDefaultItem(item.id)" class="admin-row-actions">
          <button class="module-chip" type="button" @click="setTopicStatus(item, 'published')">Publicar</button>
          <button class="module-chip" type="button" @click="setTopicStatus(item, 'draft')">Rascunho</button>
          <button class="module-chip" type="button" @click="setTopicStatus(item, 'archived')">Arquivar</button>
        </div>
      </article>
    </section>

    <section class="module-card pad">
      <div class="section-head">
        <div>
          <h2>Links de suporte</h2>
          <p>Acessos rapidos para atendimento, vendas, diagnostico e operacao.</p>
        </div>
        <LinkIcon :size="22" />
      </div>
      <div class="support-links">
        <a v-for="link in filteredLinks" :key="link.id" class="module-row" :href="link.href">
          <span class="module-row-line">
            <strong>{{ link.label }}</strong>
            <small>{{ link.category }} <b v-if="isAdmin">/ {{ link.status }}</b></small>
          </span>
          <small>{{ link.detail }}</small>
        </a>
      </div>
      <div v-if="isAdmin" class="admin-row-actions">
        <button v-for="link in overview.links.filter((item) => !isDefaultItem(item.id))" :key="link.id" class="module-chip" type="button" @click="setLinkStatus(link, link.status === 'published' ? 'draft' : 'published')">
          {{ link.status === 'published' ? 'Ocultar' : 'Publicar' }} {{ link.label }}
        </button>
      </div>
    </section>

    <section v-if="isAdmin" class="module-card pad admin-support">
      <div class="section-head">
        <div>
          <h2>Gestao da central</h2>
          <p>Publique topicos, links e comunicados de servidor para todos os revendedores.</p>
        </div>
        <PenLine :size="22" />
      </div>

      <div class="module-chip-row">
        <button class="module-chip" :class="{ active: manageTab === 'topic' }" type="button" @click="manageTab = 'topic'">Topico</button>
        <button class="module-chip" :class="{ active: manageTab === 'link' }" type="button" @click="manageTab = 'link'">Link</button>
        <button class="module-chip" :class="{ active: manageTab === 'server' }" type="button" @click="manageTab = 'server'">Servidor</button>
      </div>

      <form v-if="manageTab === 'topic'" class="support-form" @submit.prevent="createTopic">
        <label>Titulo<input v-model="topicForm.title" class="module-input" required /></label>
        <label>Categoria<input v-model="topicForm.category" class="module-input" required /></label>
        <label class="full">Resumo<input v-model="topicForm.summary" class="module-input" /></label>
        <label class="full">Conteudo<textarea v-model="topicForm.content" class="module-textarea" /></label>
        <label class="full">Passos<textarea v-model="topicForm.steps" class="module-textarea" placeholder="Um passo por linha" /></label>
        <label>Status<select v-model="topicForm.status" class="module-input"><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select></label>
        <label class="toggle-line"><input v-model="topicForm.pinned" type="checkbox" /> Fixar no topo</label>
        <button class="module-chip active" type="submit" :disabled="saving"><Plus :size="16" /> Publicar topico</button>
      </form>

      <form v-else-if="manageTab === 'link'" class="support-form" @submit.prevent="createLink">
        <label>Nome<input v-model="linkForm.label" class="module-input" required /></label>
        <label>Categoria<input v-model="linkForm.category" class="module-input" required /></label>
        <label class="full">URL<input v-model="linkForm.href" class="module-input" required /></label>
        <label class="full">Descricao<input v-model="linkForm.detail" class="module-input" /></label>
        <label>Status<select v-model="linkForm.status" class="module-input"><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select></label>
        <label class="toggle-line"><input v-model="linkForm.pinned" type="checkbox" /> Fixar no topo</label>
        <button class="module-chip active" type="submit" :disabled="saving"><Plus :size="16" /> Publicar link</button>
      </form>

      <form v-else class="support-form" @submit.prevent="createServerUpdate">
        <label>Servidor<select v-model="updateForm.serverId" class="module-input"><option value="">Geral</option><option v-for="server in overview.servers" :key="server.id" :value="server.id">{{ server.name }}</option></select></label>
        <label>Status<select v-model="updateForm.status" class="module-input"><option value="operational">Operacional</option><option value="attention">Atencao</option><option value="maintenance">Manutencao</option><option value="degraded">Instavel</option><option value="offline">Offline</option></select></label>
        <label class="full">Titulo<input v-model="updateForm.title" class="module-input" required /></label>
        <label class="full">Mensagem<textarea v-model="updateForm.message" class="module-textarea" required /></label>
        <label class="full">Impacto<input v-model="updateForm.impact" class="module-input" placeholder="Ex: novos logins podem oscilar" /></label>
        <label class="full">Acao recomendada<input v-model="updateForm.actionText" class="module-input" placeholder="Ex: orientar cliente a aguardar 10 minutos" /></label>
        <label class="toggle-line"><input v-model="updateForm.pinned" type="checkbox" /> Fixar alerta</label>
        <label class="toggle-line"><input v-model="updateForm.published" type="checkbox" /> Publicado</label>
        <button class="module-chip active" type="submit" :disabled="saving"><Megaphone :size="16" /> Publicar atualizacao</button>
      </form>
    </section>

    <section class="module-card pad support-checklist">
      <ShieldCheck :size="24" />
      <div>
        <h2>Checklist de boa operacao</h2>
        <p>Conteudo sempre atualizado, status por servidor publicado, links revisados, linguagem simples e procedimentos passo a passo para reduzir chamados repetidos.</p>
      </div>
      <CheckCircle2 :size="22" />
    </section>
  </div>
</template>

<style scoped>
.support-notice {
  color: #8bc7a3;
}

.support-error {
  color: #ff806f;
}

.support-hero,
.support-checklist {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 360px);
  gap: 18px;
  align-items: end;
}

.support-icon,
.tutorial-head span {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--gj2-orange), var(--gj2-red));
}

.support-hero h2,
.section-head h2,
.support-checklist h2 {
  margin: 0 0 6px;
}

.support-hero p,
.section-head p,
.tutorial-card p,
.support-checklist p {
  color: var(--gj2-muted);
  line-height: 1.55;
}

.support-kpis,
.updates-grid,
.support-grid {
  display: grid;
  gap: 12px;
}

.support-kpis {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.support-kpis span,
.update-card {
  min-width: 0;
  padding: 14px;
  border-radius: 18px;
  display: grid;
  gap: 6px;
  background: rgba(6, 7, 7, .92);
  box-shadow:
    8px 10px 22px rgba(0,0,0,.36),
    inset 1px 1px 0 rgba(255,255,255,.018);
}

.support-kpis strong {
  color: var(--gj2-text);
  font-size: 24px;
  font-weight: 920;
}

.support-kpis small,
.tutorial-head small,
.update-card small {
  color: var(--gj2-muted);
  font-weight: 760;
}

.section-head,
.update-head,
.tutorial-head,
.support-checklist {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.updates-grid {
  margin-top: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.update-card h3,
.update-card p,
.tutorial-head h2 {
  margin: 0;
}

.update-head span {
  padding: 5px 9px;
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 75, 18, .72);
  font-size: 12px;
  font-weight: 900;
}

.update-card.operational .update-head span {
  background: rgba(83, 126, 101, .85);
}

.support-search {
  min-height: 46px;
  padding: 0 12px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gj2-muted);
  background: rgba(3, 4, 4, .76);
  box-shadow:
    inset 3px 3px 8px rgba(0,0,0,.34),
    inset -2px -2px 6px rgba(255,255,255,.016);
}

.support-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--gj2-text);
  background: transparent;
}

.support-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tutorial-card {
  display: grid;
  gap: 14px;
}

.tutorial-head {
  justify-content: flex-start;
}

.tutorial-content {
  margin: 0;
}

.tutorial-card ol {
  margin: 0;
  padding-left: 22px;
  display: grid;
  gap: 10px;
  color: var(--gj2-muted);
  line-height: 1.45;
}

.support-links,
.admin-row-actions {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.support-links a {
  text-decoration: none;
}

.admin-support {
  display: grid;
  gap: 16px;
}

.support-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.support-form label {
  display: grid;
  gap: 6px;
  color: var(--gj2-muted);
  font-weight: 800;
}

.support-form .full {
  grid-column: 1 / -1;
}

.toggle-line {
  display: flex !important;
  align-items: center;
  gap: 8px;
}

.empty-state {
  padding: 16px;
  border-radius: 16px;
  color: var(--gj2-muted);
  background: rgba(3, 4, 4, .62);
}

@media (max-width: 980px) {
  .support-hero,
  .support-grid,
  .updates-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .support-kpis,
  .support-form {
    grid-template-columns: 1fr;
  }
}
</style>
