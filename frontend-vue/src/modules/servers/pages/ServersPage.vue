<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RefreshCw } from '@lucide/vue'

import UiButton from '@/components/ui/UiButton.vue'
import { fornecedoresService } from '@/services/api/fornecedores.service'
import { resellerServersService } from '@/services/api/resellerServers.service'
import { serverFornecedoresService } from '@/services/api/server-fornecedores.service'
import { serversService } from '@/services/api/servers.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Fornecedor, ResellerServer, Server, ServerFornecedor } from '@/types/domain'
import { asArray, formatCurrency } from '@/utils/format'

type ServerTab = 'fornecedores' | 'servidores'

const auth = useAuthStore()
const isStaff = computed(() => auth.isAdmin)

const activeTab = ref<ServerTab>('fornecedores')
const loading = ref(false)
const saving = ref('')
const notice = ref('')
const addProviderOpen = ref(false)

const servers = ref<Server[]>([])
const fornecedores = ref<Fornecedor[]>([])
const serverFornecedores = ref<ServerFornecedor[]>([])
const resellerLinks = ref<ResellerServer[]>([])

const selectedServerId = ref('')
const editingFornecedorId = ref('')
const editingServerId = ref('')
const editingServerFornecedorId = ref('')
const searchFornecedores = ref('')
const searchServers = ref('')

const fornecedorForm = reactive({
  name: '',
  contact: '',
  notes: '',
  active: true,
})

const serverForm = reactive({
  name: '',
  panel_link: '',
  notes: '',
  active: true,
})

const serverFornecedorForm = reactive({
  fornecedor_id: '',
  cost_per_credit: '',
  panel_login: '',
  panel_password: '',
  panel_link: '',
  notes: '',
  active: true,
})

const selfLinkForm = reactive({
  server_id: '',
  login: '',
  value_per_credit: '',
})

const linkDrafts = reactive<Record<string, { value_per_credit: string; server_fornecedor_id: string }>>({})

const activeFornecedores = computed(() => fornecedores.value.filter((item) => item.active !== false))
const activeServers = computed(() => servers.value.filter((server) => server.active !== false))
const selectedFornecedor = computed(() => fornecedores.value.find((item) => item.id === editingFornecedorId.value))
const selectedServer = computed(() => servers.value.find((server) => server.id === selectedServerId.value))
const selectedServerFornecedores = computed(() =>
  serverFornecedores.value.filter((item) => item.server_id === selectedServerId.value),
)
const selectedServerActiveFornecedores = computed(() =>
  selectedServerFornecedores.value.filter((item) => item.active !== false),
)
const selectedLinks = computed(() => resellerLinks.value.filter((link) => link.server_id === selectedServerId.value))
const linkedResellerLinks = computed(() => resellerLinks.value.filter((link) => link.active !== false))
const linkedServerIds = computed(() => new Set(linkedResellerLinks.value.map((link) => link.server_id || link.server?.id)))
const availableResellerServers = computed(() =>
  activeServers.value.filter((server) => !linkedServerIds.value.has(server.id)),
)

const availableFornecedores = computed(() => {
  const currentId = editingServerFornecedorId.value
    ? serverFornecedores.value.find((item) => item.id === editingServerFornecedorId.value)?.fornecedor_id
    : null
  const used = new Set(
    selectedServerFornecedores.value
      .filter((item) => item.active !== false && item.fornecedor_id !== currentId)
      .map((item) => item.fornecedor_id),
  )
  return activeFornecedores.value.filter((fornecedor) => !used.has(fornecedor.id))
})

const filteredFornecedores = computed(() => {
  const term = searchFornecedores.value.trim().toLowerCase()
  if (!term) return fornecedores.value
  return fornecedores.value.filter((item) =>
    [item.name, item.contact, item.notes].filter(Boolean).join(' ').toLowerCase().includes(term),
  )
})

const filteredServers = computed(() => {
  const term = searchServers.value.trim().toLowerCase()
  if (!term) return servers.value
  return servers.value.filter((item) =>
    [item.name, item.panel_link, item.notes].filter(Boolean).join(' ').toLowerCase().includes(term),
  )
})

const staffStats = computed(() => ({
  fornecedores: fornecedores.value.length,
  fornecedoresAtivos: fornecedores.value.filter((item) => item.active !== false).length,
  servers: servers.value.length,
  serversAtivos: servers.value.filter((item) => item.active !== false).length,
  providerLinks: serverFornecedores.value.length,
  resellerLinks: resellerLinks.value.length,
}))

watch(selectedServerId, () => {
  resetServerFornecedorForm()
})

function setNotice(message: string) {
  notice.value = message
}

function resetFornecedorForm() {
  editingFornecedorId.value = ''
  Object.assign(fornecedorForm, {
    name: '',
    contact: '',
    notes: '',
    active: true,
  })
}

function resetServerForm() {
  editingServerId.value = ''
  Object.assign(serverForm, {
    name: '',
    panel_link: '',
    notes: '',
    active: true,
  })
}

function resetServerFornecedorForm() {
  editingServerFornecedorId.value = ''
  addProviderOpen.value = false
  Object.assign(serverFornecedorForm, {
    fornecedor_id: '',
    cost_per_credit: '',
    panel_login: '',
    panel_password: '',
    panel_link: '',
    notes: '',
    active: true,
  })
}

function resetSelfLinkForm() {
  Object.assign(selfLinkForm, {
    server_id: availableResellerServers.value[0]?.id || '',
    login: '',
    value_per_credit: '',
  })
}

function newServerFornecedor() {
  resetServerFornecedorForm()
  addProviderOpen.value = true
}

function selectServer(server: Server) {
  selectedServerId.value = server.id
  editServer(server)
  activeTab.value = 'servidores'
}

function editFornecedor(fornecedor: Fornecedor) {
  editingFornecedorId.value = fornecedor.id
  Object.assign(fornecedorForm, {
    name: fornecedor.name || '',
    contact: fornecedor.contact || '',
    notes: fornecedor.notes || '',
    active: fornecedor.active !== false,
  })
}

function editServer(server: Server) {
  editingServerId.value = server.id
  selectedServerId.value = server.id
  Object.assign(serverForm, {
    name: server.name || '',
    panel_link: server.panel_link || '',
    notes: server.notes || '',
    active: server.active !== false,
  })
}

function editServerFornecedor(link: ServerFornecedor) {
  editingServerFornecedorId.value = link.id
  addProviderOpen.value = true
  Object.assign(serverFornecedorForm, {
    fornecedor_id: link.fornecedor_id || '',
    cost_per_credit: String(link.cost_per_credit ?? ''),
    panel_login: link.panel_login || '',
    panel_password: link.panel_password || '',
    panel_link: link.panel_link || '',
    notes: link.notes || '',
    active: link.active !== false,
  })
}

function draftFor(link: ResellerServer) {
  if (!linkDrafts[link.id]) {
    linkDrafts[link.id] = {
      value_per_credit: String(link.value_per_credit ?? ''),
      server_fornecedor_id: link.server_fornecedor_id || '',
    }
  }
  return linkDrafts[link.id]
}

async function load() {
  loading.value = true
  notice.value = ''
  try {
    const [serverRecords, fornecedorRecords, providerLinks, resellerServerLinks] = await Promise.all([
      serversService.list().catch(() => []),
      isStaff.value ? fornecedoresService.list().catch(() => []) : Promise.resolve([]),
      isStaff.value ? serverFornecedoresService.list().catch(() => []) : Promise.resolve([]),
      resellerServersService.list().catch(() => []),
    ])

    servers.value = asArray<Server>(serverRecords)
    fornecedores.value = asArray<Fornecedor>(fornecedorRecords)
    serverFornecedores.value = asArray<ServerFornecedor>(providerLinks)
    resellerLinks.value = asArray<ResellerServer>(resellerServerLinks)

    if (!selectedServerId.value && servers.value.length) {
      selectedServerId.value = servers.value[0].id
    }
    if (selectedServerId.value) {
      const current = servers.value.find((server) => server.id === selectedServerId.value)
      if (current) editServer(current)
    }
    if (!isStaff.value) resetSelfLinkForm()
  } finally {
    loading.value = false
  }
}

async function saveFornecedor() {
  if (!fornecedorForm.name.trim()) return
  saving.value = 'fornecedor'
  try {
    const payload = {
      name: fornecedorForm.name.trim(),
      contact: fornecedorForm.contact.trim() || undefined,
      notes: fornecedorForm.notes.trim() || undefined,
      active: fornecedorForm.active,
    }
    const saved = editingFornecedorId.value
      ? await fornecedoresService.update(editingFornecedorId.value, payload)
      : await fornecedoresService.create(payload)

    fornecedores.value = editingFornecedorId.value
      ? fornecedores.value.map((item) => (item.id === saved.id ? saved : item))
      : [saved, ...fornecedores.value]
    setNotice(editingFornecedorId.value ? 'Fornecedor atualizado.' : 'Fornecedor criado.')
    resetFornecedorForm()
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao salvar fornecedor.')
  } finally {
    saving.value = ''
  }
}

async function setFornecedorStatus(fornecedor: Fornecedor, active: boolean) {
  saving.value = fornecedor.id
  try {
    const saved = active
      ? await fornecedoresService.reactivate(fornecedor.id)
      : await fornecedoresService.remove(fornecedor.id)
    fornecedores.value = fornecedores.value.map((item) => (item.id === fornecedor.id ? { ...item, active } : item))
    if (editingFornecedorId.value === fornecedor.id) {
      fornecedorForm.active = active
    }
    setNotice(active ? 'Fornecedor ativado.' : 'Fornecedor desativado.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao alterar fornecedor.')
  } finally {
    saving.value = ''
  }
}

async function saveServer() {
  if (!serverForm.name.trim()) return
  saving.value = 'server'
  try {
    const payload = {
      name: serverForm.name.trim(),
      panel_link: serverForm.panel_link.trim() || undefined,
      notes: serverForm.notes.trim() || undefined,
      active: serverForm.active,
    }
    const saved = editingServerId.value
      ? await serversService.update(editingServerId.value, payload)
      : await serversService.create(payload)

    servers.value = editingServerId.value
      ? servers.value.map((item) => (item.id === saved.id ? saved : item))
      : [saved, ...servers.value]
    selectedServerId.value = saved.id
    editServer(saved)
    setNotice(editingServerId.value ? 'Servidor atualizado.' : 'Servidor criado.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao salvar servidor.')
  } finally {
    saving.value = ''
  }
}

async function deactivateServer(server: Server) {
  saving.value = server.id
  try {
    const saved = await serversService.update(server.id, {
      name: server.name,
      panel_link: server.panel_link || undefined,
      notes: server.notes || undefined,
      active: false,
    })
    servers.value = servers.value.map((item) => (item.id === server.id ? { ...item, ...saved, active: false } : item))
    if (selectedServerId.value === server.id) editServer({ ...server, active: false })
    setNotice('Servidor desativado.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao desativar servidor.')
  } finally {
    saving.value = ''
  }
}

async function deactivateSelectedServer() {
  if (!selectedServer.value) return
  await deactivateServer(selectedServer.value)
}

async function deleteServer(server: Server) {
  const confirmed = window.confirm(
    `Excluir o servidor "${server.name}"? Esta acao remove tambem os vinculos internos deste servidor com fornecedores e revendedores.`,
  )
  if (!confirmed) return

  saving.value = `delete-${server.id}`
  try {
    await serversService.remove(server.id)
    servers.value = servers.value.filter((item) => item.id !== server.id)
    serverFornecedores.value = serverFornecedores.value.filter((item) => item.server_id !== server.id)
    resellerLinks.value = resellerLinks.value.filter((item) => item.server_id !== server.id)

    if (selectedServerId.value === server.id) {
      const next = servers.value[0]
      selectedServerId.value = next?.id || ''
      if (next) editServer(next)
      else resetServerForm()
    }
    setNotice('Servidor excluido com sucesso.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao excluir servidor.')
  } finally {
    saving.value = ''
  }
}

async function deleteSelectedServer() {
  if (!selectedServer.value) return
  await deleteServer(selectedServer.value)
}

async function saveServerFornecedor() {
  if (!selectedServerId.value || !serverFornecedorForm.fornecedor_id || !serverFornecedorForm.panel_login.trim()) return
  saving.value = 'server-fornecedor'
  try {
    const payload = {
      serverId: selectedServerId.value,
      fornecedorId: serverFornecedorForm.fornecedor_id,
      costPerCredit: Number(serverFornecedorForm.cost_per_credit || 0),
      panelLogin: serverFornecedorForm.panel_login.trim(),
      panelPassword: serverFornecedorForm.panel_password.trim() || undefined,
      panelLink: serverFornecedorForm.panel_link.trim() || undefined,
      notes: serverFornecedorForm.notes.trim() || undefined,
      active: serverFornecedorForm.active,
    }

    const saved = editingServerFornecedorId.value
      ? await serverFornecedoresService.update(editingServerFornecedorId.value, {
          costPerCredit: payload.costPerCredit,
          panelLogin: payload.panelLogin,
          panelPassword: payload.panelPassword,
          panelLink: payload.panelLink,
          notes: payload.notes,
          active: payload.active,
        })
      : await serverFornecedoresService.create(payload)

    serverFornecedores.value = editingServerFornecedorId.value
      ? serverFornecedores.value.map((item) => (item.id === saved.id ? saved : item))
      : [...serverFornecedores.value.filter((item) => item.id !== saved.id), saved]
    setNotice(editingServerFornecedorId.value ? 'Fornecedor do servidor atualizado.' : 'Fornecedor adicionado ao servidor.')
    resetServerFornecedorForm()
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao salvar fornecedor deste servidor.')
  } finally {
    saving.value = ''
  }
}

async function setServerFornecedorStatus(link: ServerFornecedor, active: boolean) {
  saving.value = link.id
  try {
    const saved = active
      ? await serverFornecedoresService.update(link.id, { active: true })
      : await serverFornecedoresService.remove(link.id)
    serverFornecedores.value = serverFornecedores.value.map((item) => (item.id === link.id ? { ...item, active } : item))
    if (editingServerFornecedorId.value === link.id) {
      serverFornecedorForm.active = active
    }
    setNotice(active ? 'Fornecedor do servidor ativado.' : 'Fornecedor do servidor desativado.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao alterar fornecedor deste servidor.')
  } finally {
    saving.value = ''
  }
}

async function saveResellerLink(link: ResellerServer) {
  saving.value = link.id
  try {
    const draft = draftFor(link)
    const saved = await resellerServersService.update(link.id, {
      valuePerCredit: Number(draft.value_per_credit || 0),
      serverFornecedorId: draft.server_fornecedor_id || null,
    })
    resellerLinks.value = resellerLinks.value.map((item) => (item.id === saved.id ? saved : item))
    linkDrafts[link.id] = {
      value_per_credit: String(saved.value_per_credit ?? ''),
      server_fornecedor_id: saved.server_fornecedor_id || '',
    }
    setNotice('Vinculo do revendedor atualizado.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Falha ao atualizar revendedor.')
  } finally {
    saving.value = ''
  }
}

async function saveSelfResellerLink() {
  if (!selfLinkForm.server_id || !selfLinkForm.login.trim()) {
    setNotice('Escolha um servidor e informe seu login nesse painel.')
    return
  }
  const valuePerCredit = Number(String(selfLinkForm.value_per_credit).replace(',', '.'))
  if (!Number.isFinite(valuePerCredit) || valuePerCredit <= 0) {
    setNotice('Informe o valor que voce paga por credito neste servidor.')
    return
  }

  saving.value = 'reseller-self'
  try {
    const saved = await resellerServersService.create({
      server_id: selfLinkForm.server_id,
      login: selfLinkForm.login.trim(),
      value_per_credit: valuePerCredit,
    })
    resellerLinks.value = [saved, ...resellerLinks.value.filter((link) => link.id !== saved.id)]
    setNotice('Servidor cadastrado no seu painel. Agora ele aparece nos pedidos.')
    resetSelfLinkForm()
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Nao foi possivel cadastrar este servidor no seu painel.')
  } finally {
    saving.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="servers-page-solid">
    <header class="servers-head">
      <div>
        <span class="eyebrow">Catálogo operacional</span>
        <h1>Servidores</h1>
        <p v-if="isStaff">Cadastre fornecedores primeiro, depois servidores únicos com múltiplos fornecedores internos.</p>
        <p v-else>Consulte os servidores vinculados ao seu painel e seus preços de venda.</p>
      </div>
      <button class="servers-refresh" type="button" :disabled="loading" aria-label="Atualizar servidores" @click="load">
        <RefreshCw aria-hidden="true" :size="16" :stroke-width="2.4" />
        <span>{{ loading ? 'Atualizando...' : 'Atualizar' }}</span>
      </button>
    </header>

    <section v-if="isStaff" class="servers-summary" aria-label="Resumo de servidores">
      <article>
        <span>Fornecedores</span>
        <strong>{{ staffStats.fornecedores }}</strong>
        <small>{{ staffStats.fornecedoresAtivos }} ativos</small>
      </article>
      <article>
        <span>Servidores</span>
        <strong>{{ staffStats.servers }}</strong>
        <small>{{ staffStats.serversAtivos }} ativos</small>
      </article>
      <article>
        <span>Fornecedor-servidor</span>
        <strong>{{ staffStats.providerLinks }}</strong>
        <small>vínculos internos</small>
      </article>
      <article>
        <span>Revendedores</span>
        <strong>{{ staffStats.resellerLinks }}</strong>
        <small>vínculos comerciais</small>
      </article>
    </section>

    <p v-if="notice" class="server-notice" role="status">{{ notice }}</p>

    <section v-if="!isStaff" class="reseller-area">
      <div class="reseller-section-title">
        <div>
          <h2>Meus servidores</h2>
          <p>Servidores ja cadastrados no seu painel. Eles aparecem automaticamente na tela de pedidos.</p>
        </div>
        <strong>{{ linkedResellerLinks.length }} ativo(s)</strong>
      </div>

      <div class="reseller-server-list">
        <article v-for="link in linkedResellerLinks" :key="link.id" class="solid-panel reseller-panel">
          <div>
            <strong>{{ link.server?.name || 'Servidor' }}</strong>
            <small>Login: {{ link.login || 'sem login' }}</small>
          </div>
          <span>{{ formatCurrency(link.value_per_credit) }}/cr</span>
        </article>
        <p v-if="!linkedResellerLinks.length" class="empty-line">
          Voce ainda nao cadastrou nenhum servidor no seu painel.
        </p>
      </div>

      <div class="reseller-section-title">
        <div>
          <h2>Servidores disponiveis</h2>
          <p>Estes servidores foram cadastrados pelo admin. Cadastre seu login para liberar pedidos.</p>
        </div>
        <strong>{{ availableResellerServers.length }} disponivel(is)</strong>
      </div>

      <div class="reseller-server-list">
        <article v-for="server in availableResellerServers" :key="server.id" class="solid-panel reseller-panel available">
          <div>
            <strong>{{ server.name }}</strong>
            <small>{{ server.panel_link || 'Servidor liberado para cadastro' }}</small>
          </div>
          <span>{{ Number(server.value_per_credit || 0) > 0 ? `${formatCurrency(server.value_per_credit)}/cr` : 'A definir' }}</span>
        </article>
        <p v-if="!availableResellerServers.length" class="empty-line">
          Nao ha novos servidores disponiveis para cadastro.
        </p>
      </div>

      <form v-if="availableResellerServers.length" class="solid-panel reseller-self-form" @submit.prevent="saveSelfResellerLink">
        <div>
          <h2>Cadastrar servidor no meu painel</h2>
          <p>Informe o login e o valor pago por credito. Depois de cadastrado, somente o admin altera esse valor.</p>
        </div>
        <label>
          Servidor
          <select v-model="selfLinkForm.server_id" required>
            <option value="">Selecione</option>
            <option v-for="server in availableResellerServers" :key="server.id" :value="server.id">
              {{ server.name }}
            </option>
          </select>
        </label>
        <label>
          Meu login nesse servidor
          <input v-model="selfLinkForm.login" required placeholder="Digite seu login do painel" />
        </label>
        <label>
          Valor pago por credito
          <input
            v-model="selfLinkForm.value_per_credit"
            required
            inputmode="decimal"
            placeholder="Ex: 5,25"
          />
        </label>
        <UiButton type="submit" :disabled="saving === 'reseller-self'">
          {{ saving === 'reseller-self' ? 'Cadastrando...' : 'Cadastrar servidor' }}
        </UiButton>
      </form>
    </section>

    <template v-else>
      <nav class="server-tabs" aria-label="Área de servidores">
        <button type="button" :class="{ active: activeTab === 'fornecedores' }" @click="activeTab = 'fornecedores'">
          Fornecedores
        </button>
        <button type="button" :class="{ active: activeTab === 'servidores' }" @click="activeTab = 'servidores'">
          Servidores
        </button>
      </nav>

      <section v-if="activeTab === 'fornecedores'" class="servers-layout">
        <aside class="solid-panel catalog-panel">
          <div class="panel-title">
            <div>
              <h2>Fornecedores</h2>
              <small>{{ fornecedores.length }} cadastrados</small>
            </div>
            <input v-model="searchFornecedores" type="search" placeholder="Buscar" />
          </div>

          <div class="catalog-list">
            <button
              v-for="fornecedor in filteredFornecedores"
              :key="fornecedor.id"
              type="button"
              class="catalog-row"
              :class="{ selected: editingFornecedorId === fornecedor.id, inactive: fornecedor.active === false }"
              @click="editFornecedor(fornecedor)"
            >
              <span>
                <strong>{{ fornecedor.name }}</strong>
                <small>{{ fornecedor.contact || 'Contato não informado' }}</small>
              </span>
              <b>{{ fornecedor.active === false ? 'Inativo' : 'Ativo' }}</b>
            </button>
            <p v-if="!filteredFornecedores.length" class="empty-line">Nenhum fornecedor encontrado.</p>
          </div>
        </aside>

        <main class="solid-panel form-panel">
          <div class="panel-title">
            <div>
              <h2>{{ editingFornecedorId ? 'Editar fornecedor' : 'Novo fornecedor' }}</h2>
              <small>Fornecedor é a empresa ou painel onde você compra créditos.</small>
            </div>
          </div>

          <form class="solid-form" @submit.prevent="saveFornecedor">
            <label>
              Nome
              <input v-model="fornecedorForm.name" required placeholder="Ex: Painel Prime" />
            </label>
            <label>
              Contato opcional
              <input v-model="fornecedorForm.contact" placeholder="WhatsApp, email ou anotação rápida" />
            </label>
            <label class="wide">
              Observações
              <textarea v-model="fornecedorForm.notes" placeholder="Informações internas do fornecedor" />
            </label>
            <label class="status-line">
              <input v-model="fornecedorForm.active" type="checkbox" />
              Fornecedor ativo
            </label>
            <div class="action-row">
              <UiButton type="submit" :disabled="saving === 'fornecedor'">
                {{ saving === 'fornecedor' ? 'Salvando...' : 'Salvar fornecedor' }}
              </UiButton>
              <UiButton v-if="editingFornecedorId" variant="secondary" type="button" @click="resetFornecedorForm">
                Novo
              </UiButton>
              <UiButton
                v-if="selectedFornecedor"
                variant="secondary"
                type="button"
                :disabled="saving === selectedFornecedor.id"
                @click="setFornecedorStatus(selectedFornecedor, !fornecedorForm.active)"
              >
                {{ fornecedorForm.active ? 'Desativar' : 'Ativar' }}
              </UiButton>
            </div>
          </form>
        </main>
      </section>

      <section v-else class="servers-layout">
        <aside class="solid-panel catalog-panel">
          <div class="panel-title">
            <div>
              <h2>Servidores</h2>
              <small>Um servidor pode ter vários fornecedores.</small>
            </div>
            <input v-model="searchServers" type="search" placeholder="Buscar" />
          </div>

          <UiButton variant="secondary" type="button" @click="resetServerForm">Novo servidor</UiButton>

          <div class="catalog-list">
            <button
              v-for="server in filteredServers"
              :key="server.id"
              type="button"
              class="catalog-row"
              :class="{ selected: selectedServerId === server.id, inactive: server.active === false }"
              @click="selectServer(server)"
            >
              <span>
                <strong>{{ server.name }}</strong>
                <small>{{ server.panel_link || 'Sem link principal' }}</small>
              </span>
              <b>{{ server.active === false ? 'Inativo' : 'Ativo' }}</b>
            </button>
            <p v-if="!filteredServers.length" class="empty-line">Nenhum servidor encontrado.</p>
          </div>
        </aside>

        <main class="server-workspace">
          <section class="solid-panel form-panel">
            <div class="panel-title">
              <div>
                <h2>{{ editingServerId ? 'Editar servidor' : 'Novo servidor' }}</h2>
                <small>Cadastre o nome único do servidor. Custos ficam nos fornecedores deste servidor.</small>
              </div>
            </div>

            <form class="solid-form" @submit.prevent="saveServer">
              <label>
                Nome do servidor
                <input v-model="serverForm.name" required placeholder="Ex: UniPlay" />
              </label>
              <label>
                Link principal do painel
                <input v-model="serverForm.panel_link" placeholder="https://painel-servidor.com" />
              </label>
              <label class="wide">
                Observações
                <textarea v-model="serverForm.notes" placeholder="Informações gerais deste servidor" />
              </label>
              <label class="status-line">
                <input v-model="serverForm.active" type="checkbox" />
                Servidor ativo
              </label>
              <div class="action-row">
                <UiButton type="submit" :disabled="saving === 'server'">
                  {{ saving === 'server' ? 'Salvando...' : 'Salvar servidor' }}
                </UiButton>
                <UiButton v-if="editingServerId" variant="secondary" type="button" @click="resetServerForm">
                  Novo
                </UiButton>
                <UiButton
                  v-if="editingServerId && serverForm.active"
                  variant="secondary"
                  type="button"
                  :disabled="saving === editingServerId"
                  @click="deactivateSelectedServer"
                >
                  Desativar
                </UiButton>
                <UiButton
                  v-if="editingServerId"
                  variant="danger"
                  type="button"
                  :disabled="saving === `delete-${editingServerId}`"
                  @click="deleteSelectedServer"
                >
                  {{ saving === `delete-${editingServerId}` ? 'Excluindo...' : 'Excluir servidor' }}
                </UiButton>
              </div>
            </form>
          </section>

          <section class="solid-panel relation-panel">
            <div class="panel-title relation-title">
              <div>
                <h2>Fornecedores deste servidor</h2>
                <small v-if="selectedServerId">
                  {{ selectedServer?.name }} pode ter custos, logins e painéis diferentes por fornecedor.
                </small>
                <small v-else>
                  Salve ou selecione um servidor para vincular fornecedores internos sem duplicar o servidor.
                </small>
              </div>
              <UiButton type="button" :disabled="!selectedServerId || !activeFornecedores.length" @click="newServerFornecedor">
                Adicionar outro fornecedor para este servidor
              </UiButton>
            </div>

            <div v-if="selectedServerId" class="provider-list">
              <article
                v-for="link in selectedServerFornecedores"
                :key="link.id"
                class="provider-row"
                :class="{ inactive: link.active === false }"
              >
                <div>
                  <strong>{{ link.fornecedor?.name || 'Fornecedor' }}</strong>
                  <small>{{ link.panel_login }} · {{ link.panel_link || selectedServer?.panel_link || 'sem link' }}</small>
                </div>
                <span>{{ formatCurrency(link.cost_per_credit) }}/cr</span>
                <b>{{ link.active === false ? 'Inativo' : 'Ativo' }}</b>
                <div class="row-actions">
                  <button type="button" @click="editServerFornecedor(link)">Editar</button>
                  <button type="button" @click="setServerFornecedorStatus(link, link.active === false)">
                    {{ link.active === false ? 'Ativar' : 'Desativar' }}
                  </button>
                </div>
              </article>
              <p v-if="!selectedServerFornecedores.length" class="empty-line">
                Nenhum fornecedor vinculado. Adicione o primeiro fornecedor deste servidor.
              </p>
            </div>
            <p v-else class="empty-line">
              O vínculo fornecedor-servidor será liberado assim que o servidor estiver salvo.
            </p>

            <form v-if="selectedServerId && addProviderOpen" class="solid-form provider-form" @submit.prevent="saveServerFornecedor">
              <h3>{{ editingServerFornecedorId ? 'Editar fornecedor deste servidor' : 'Adicionar fornecedor a este servidor' }}</h3>
              <label>
                Fornecedor
                <select v-model="serverFornecedorForm.fornecedor_id" required :disabled="Boolean(editingServerFornecedorId)">
                  <option value="">Selecione um fornecedor</option>
                  <option v-for="fornecedor in availableFornecedores" :key="fornecedor.id" :value="fornecedor.id">
                    {{ fornecedor.name }}
                  </option>
                </select>
              </label>
              <label>
                Preço/custo desse fornecedor
                <input v-model="serverFornecedorForm.cost_per_credit" type="number" min="0" step="0.001" required />
              </label>
              <label>
                Login do painel
                <input v-model="serverFornecedorForm.panel_login" required placeholder="Login interno do fornecedor" />
              </label>
              <label>
                Senha do painel
                <input v-model="serverFornecedorForm.panel_password" type="password" placeholder="Se aplicável" />
              </label>
              <label>
                Link específico do painel
                <input v-model="serverFornecedorForm.panel_link" placeholder="Se for diferente do link principal" />
              </label>
              <label class="status-line">
                <input v-model="serverFornecedorForm.active" type="checkbox" />
                Vínculo ativo
              </label>
              <label class="wide">
                Observações
                <textarea v-model="serverFornecedorForm.notes" placeholder="Notas internas deste fornecedor neste servidor" />
              </label>
              <div class="action-row">
                <UiButton type="submit" :disabled="saving === 'server-fornecedor'">
                  {{ saving === 'server-fornecedor' ? 'Salvando...' : 'Salvar fornecedor do servidor' }}
                </UiButton>
                <UiButton variant="secondary" type="button" @click="resetServerFornecedorForm">Cancelar</UiButton>
              </div>
            </form>
          </section>

          <section v-if="selectedServerId" class="solid-panel relation-panel">
            <div class="panel-title">
              <div>
                <h2>Revendedores neste servidor</h2>
                <small>O revendedor vê apenas servidor, login e preço de venda. O fornecedor é interno.</small>
              </div>
            </div>

            <div class="reseller-links">
              <article v-for="link in selectedLinks" :key="link.id" class="reseller-link-row">
                <div>
                  <strong>{{ link.reseller?.name || link.reseller?.email || link.reseller_id }}</strong>
                  <small>Login: {{ link.login }}</small>
                </div>
                <label>
                  Preço de venda
                  <input
                    :value="draftFor(link).value_per_credit"
                    type="number"
                    min="0"
                    step="0.001"
                    @input="draftFor(link).value_per_credit = ($event.target as HTMLInputElement).value"
                  />
                </label>
                <label>
                  Fornecedor interno
                  <select
                    :value="draftFor(link).server_fornecedor_id"
                    @change="draftFor(link).server_fornecedor_id = ($event.target as HTMLSelectElement).value"
                  >
                    <option value="">Não definido</option>
                    <option v-for="provider in selectedServerActiveFornecedores" :key="provider.id" :value="provider.id">
                      {{ provider.fornecedor?.name || 'Fornecedor' }} · {{ formatCurrency(provider.cost_per_credit) }}/cr
                    </option>
                  </select>
                </label>
                <UiButton :disabled="saving === link.id" @click="saveResellerLink(link)">
                  {{ saving === link.id ? '...' : 'Salvar' }}
                </UiButton>
              </article>
              <p v-if="!selectedLinks.length" class="empty-line">Nenhum revendedor vinculado a este servidor.</p>
            </div>
          </section>
        </main>
      </section>
    </template>
  </div>
</template>

<style scoped>
.servers-page-solid {
  display: grid;
  gap: 18px;
}

.servers-head,
.solid-panel,
.servers-summary article {
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-card-bg);
  box-shadow: 0 18px 42px rgba(76, 86, 94, .1);
}

.solid-panel,
.servers-summary article {
  position: relative;
  overflow: hidden;
}

.solid-panel::after,
.servers-summary article::after {
  content: "";
  position: absolute;
  right: -22px;
  bottom: -30px;
  width: 94px;
  height: 94px;
  border-radius: 32px;
  background: var(--server-corner, #ff5a2a);
  opacity: .13;
  transform: rotate(18deg);
  pointer-events: none;
}

.solid-panel > *,
.servers-summary article > * {
  position: relative;
  z-index: var(--gj2-z-base);
}

.servers-summary article:nth-child(2) { --server-corner: #8ab99f; }
.servers-summary article:nth-child(3) { --server-corner: #53559c; }
.servers-summary article:nth-child(4) { --server-corner: #e0bd5a; }
.catalog-panel { --server-corner: #667380; }
.form-panel { --server-corner: #ff5a2a; }
.relation-panel { --server-corner: #8ab99f; }
.reseller-panel { --server-corner: #53559c; }

.servers-head {
  border-radius: 28px;
  padding: clamp(18px, 3vw, 30px);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.servers-refresh {
  border: 0;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--gj2-ink);
  background: var(--gj2-surface-muted);
  box-shadow: inset 0 1px 0 var(--gj2-modal-border);
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.servers-refresh:disabled {
  opacity: .68;
  cursor: progress;
}

.eyebrow {
  display: block;
  margin-bottom: 8px;
  color: var(--gj2-orange);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.servers-head h1,
.panel-title h2,
.provider-form h3 {
  margin: 0;
  color: var(--gj2-ink);
}

.servers-head h1 {
  font-size: clamp(30px, 5vw, 48px);
  line-height: 1;
}

.servers-head p,
.panel-title small,
.empty-line {
  color: var(--gj2-muted);
}

.servers-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.servers-summary article {
  min-height: 118px;
  border-radius: 24px;
  padding: 18px;
  display: grid;
  align-content: space-between;
}

.servers-summary span,
.servers-summary small {
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 800;
}

.servers-summary strong {
  color: var(--gj2-ink);
  font-size: 34px;
  line-height: 1;
}

.server-notice {
  margin: 0;
  border: 1px solid rgba(126, 170, 148, .35);
  border-radius: 18px;
  padding: 12px 14px;
  color: var(--gj2-green-deep);
  background: color-mix(in srgb, var(--gj2-green) 18%, var(--gj2-row-bg));
  font-weight: 800;
}

.server-tabs {
  width: min(520px, 100%);
  border: 1px solid var(--gj2-card-border);
  border-radius: 18px;
  padding: 5px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  background: var(--gj2-row-bg);
}

.server-tabs button {
  min-height: 44px;
  border: 0;
  border-radius: 14px;
  color: #737b82;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
}

.server-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, #ff744c, #d83a16);
  box-shadow: 0 10px 22px rgba(216, 58, 22, .24);
}

.servers-layout {
  display: grid;
  grid-template-columns: minmax(min(100%, 270px), 360px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.solid-panel {
  border-radius: 24px;
  padding: 18px;
}

.catalog-panel {
  position: sticky;
  top: var(--gj2-shell-sticky-top, 86px);
  z-index: var(--gj2-z-base);
  display: grid;
  gap: 14px;
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel-title h2 {
  font-size: 21px;
}

.panel-title input {
  width: min(150px, 44vw);
}

.catalog-list,
.server-workspace,
.provider-list,
.reseller-links,
.reseller-server-list {
  display: grid;
  gap: 10px;
}

.reseller-area {
  display: grid;
  gap: 18px;
}

.reseller-section-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.reseller-section-title h2,
.reseller-self-form h2 {
  margin: 0;
  color: var(--gj2-ink);
  font-size: clamp(20px, 3vw, 28px);
  line-height: 1.05;
}

.reseller-section-title p,
.reseller-self-form p {
  margin: 5px 0 0;
  color: var(--gj2-muted);
  font-size: 13px;
  font-weight: 720;
}

.reseller-section-title > strong {
  border-radius: 999px;
  padding: 9px 12px;
  color: #fff;
  background: #111517;
  font-size: 12px;
  white-space: nowrap;
}

.catalog-list {
  max-height: 520px;
  overflow: auto;
  padding-right: 2px;
}

.catalog-row,
.provider-row,
.reseller-link-row,
.reseller-panel {
  border: 1px solid var(--gj2-card-border);
  border-radius: 18px;
  background: var(--gj2-row-bg);
}

.catalog-row {
  width: 100%;
  padding: 13px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  text-align: left;
  cursor: pointer;
}

.catalog-row.selected {
  border-color: rgba(255, 104, 70, .56);
  background: color-mix(in srgb, var(--gj2-orange) 12%, var(--gj2-row-bg));
}

.catalog-row.inactive,
.provider-row.inactive {
  opacity: .58;
}

.catalog-row span,
.provider-row div:first-child,
.reseller-link-row div:first-child,
.reseller-panel div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.catalog-row strong,
.catalog-row small,
.provider-row strong,
.provider-row small,
.reseller-link-row strong,
.reseller-link-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-row b,
.provider-row b {
  align-self: center;
  border-radius: 999px;
  padding: 6px 9px;
  color: var(--gj2-green-deep);
  background: color-mix(in srgb, var(--gj2-green) 18%, var(--gj2-row-bg));
  font-size: 11px;
  text-transform: uppercase;
}

.solid-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.solid-form label,
.reseller-link-row label {
  display: grid;
  gap: 7px;
  color: var(--gj2-label-color);
  font-size: 12px;
  font-weight: 850;
}

.solid-form .wide {
  grid-column: 1 / -1;
}

.solid-form input,
.solid-form textarea,
.solid-form select,
.panel-title input,
.reseller-link-row input,
.reseller-link-row select {
  width: 100%;
  border: 1px solid var(--gj2-line);
  border-radius: 15px;
  min-height: 46px;
  padding: 0 14px;
  color: var(--gj2-ink);
  background: var(--gj2-input-bg);
  outline: none;
}

.solid-form textarea {
  min-height: 96px;
  padding-top: 13px;
  resize: vertical;
}

.solid-form input:focus,
.solid-form textarea:focus,
.solid-form select:focus,
.panel-title input:focus,
.reseller-link-row input:focus,
.reseller-link-row select:focus {
  border-color: rgba(255, 104, 70, .72);
  box-shadow: 0 0 0 4px rgba(255, 104, 70, .12);
}

.status-line {
  grid-template-columns: auto 1fr;
  align-items: center;
  min-height: 46px;
  border: 1px solid var(--gj2-card-border);
  border-radius: 15px;
  padding: 0 12px;
  background: var(--gj2-row-bg);
}

.status-line input {
  width: 18px;
  min-height: 18px;
  accent-color: var(--gj2-orange);
}

.action-row,
.row-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, max-content));
  gap: 9px;
  align-items: center;
}

.action-row {
  grid-column: 1 / -1;
}

.action-row :deep(.ui-button),
.row-actions button {
  width: 100%;
  min-width: 0;
}

.relation-panel {
  display: grid;
  gap: 16px;
}

.relation-title {
  align-items: center;
}

.provider-row {
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(min(100%, 180px), 1fr) auto auto auto;
  gap: 12px;
  align-items: center;
}

.provider-row span,
.reseller-panel span {
  color: var(--gj2-orange);
  font-weight: 950;
}

.row-actions button {
  max-width: 100%;
  border: 1px solid var(--gj2-card-border);
  border-radius: 12px;
  min-height: 34px;
  padding: 0 11px;
  color: var(--gj2-text);
  background: var(--gj2-chip-bg);
  cursor: pointer;
  font-weight: 850;
  text-align: center;
  overflow-wrap: anywhere;
}

.provider-form {
  border-top: 1px solid var(--gj2-card-border);
  padding-top: 16px;
}

.reseller-link-row {
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(min(100%, 170px), 1fr) minmax(min(100%, 145px), 145px) minmax(min(100%, 210px), 260px) auto;
  gap: 12px;
  align-items: end;
}

.reseller-panel {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.reseller-panel.available {
  border-style: dashed;
}

.reseller-self-form {
  display: grid;
  grid-template-columns: minmax(min(100%, 220px), 1fr) repeat(3, minmax(min(100%, 150px), 220px)) auto;
  gap: 14px;
  align-items: end;
}

.reseller-self-form label {
  display: grid;
  gap: 7px;
  color: var(--gj2-label-color);
  font-size: 12px;
  font-weight: 850;
}

.reseller-self-form input,
.reseller-self-form select {
  width: 100%;
  border: 1px solid var(--gj2-line);
  border-radius: 15px;
  min-height: 46px;
  padding: 0 14px;
  color: var(--gj2-ink);
  background: var(--gj2-input-bg);
  outline: none;
}

.reseller-self-form input:focus,
.reseller-self-form select:focus {
  border-color: rgba(255, 104, 70, .72);
  box-shadow: 0 0 0 4px rgba(255, 104, 70, .12);
}

.empty-line {
  margin: 0;
  padding: 14px;
  border: 1px dashed rgba(190, 196, 200, .9);
  border-radius: 16px;
  background: var(--gj2-row-bg);
  font-size: 13px;
  font-weight: 760;
}

@media (max-width: 1180px) {
  .servers-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .servers-layout {
    grid-template-columns: 1fr;
  }

  .catalog-panel {
    position: static;
  }
}

@media (max-width: 720px) {
  .servers-head,
  .panel-title,
  .relation-title,
  .reseller-section-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .servers-summary,
  .solid-form,
  .provider-row,
  .reseller-link-row,
  .reseller-self-form {
    grid-template-columns: 1fr;
  }

  .action-row,
  .row-actions {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 138px), 1fr));
    width: 100%;
  }

  .provider-row,
  .reseller-link-row {
    align-items: stretch;
  }

  .reseller-panel {
    display: grid;
  }

  .reseller-section-title > strong,
  .reseller-self-form :deep(.ui-button) {
    width: 100%;
    text-align: center;
  }

  .server-tabs {
    width: 100%;
  }

  .server-tabs button {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .panel-title input {
    width: 100%;
  }

  .servers-head {
    gap: 10px;
    padding: 16px;
    border-radius: 24px;
  }

  .servers-refresh {
    flex: 0 0 46px;
    width: 46px;
    min-height: 46px;
    padding: 0;
  }

  .servers-refresh span {
    display: none;
  }

  .servers-head h1 {
    font-size: clamp(26px, 9vw, 34px);
  }

  .servers-head p {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.35;
  }

  .servers-summary article {
    min-height: 96px;
    padding: 14px;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .servers-head,
html[data-theme="dark"] .solid-panel,
html[data-theme="dark"] .servers-summary article {
  background: var(--gj2-surface);
  border-color: var(--gj2-card-border);
}

html[data-theme="dark"] .server-notice {
  background: rgba(93, 148, 120, .12);
  border-color: rgba(93, 148, 120, .25);
  color: #7fbfa0;
}

html[data-theme="dark"] .server-tabs {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line);
}

html[data-theme="dark"] .catalog-row.selected {
  background: rgba(255, 104, 70, .08);
}

html[data-theme="dark"] .reseller-link-row select,
html[data-theme="dark"] .reseller-self-form input,
html[data-theme="dark"] .reseller-self-form select {
  background: var(--gj2-input-bg);
  border-color: var(--gj2-line);
}

html[data-theme="dark"] .row-actions button {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .empty-line {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line-strong);
}

html[data-theme="dark"] .status-line {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .catalog-row,
html[data-theme="dark"] .provider-row,
html[data-theme="dark"] .reseller-link-row,
html[data-theme="dark"] .reseller-panel {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line);
}

html[data-theme="dark"] .catalog-row.selected {
  background: rgba(255, 104, 70, .1);
  border-color: rgba(255, 104, 70, .4);
}
</style>
