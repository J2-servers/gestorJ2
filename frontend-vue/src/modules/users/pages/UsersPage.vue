<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { financeService } from '@/services/api/finance.service'
import { resellerServersService } from '@/services/api/resellerServers.service'
import { serversService } from '@/services/api/servers.service'
import { usersService } from '@/services/api/users.service'
import type { ResellerServer, Server, User } from '@/types/domain'
import { asArray } from '@/utils/format'

const users = ref<User[]>([])
const servers = ref<Server[]>([])
const resellerLinks = ref<ResellerServer[]>([])
const selected = ref<string[]>([])
const search = ref('')
const activeUserId = ref('')
const notice = ref('')
const saving = ref(false)
const creating = ref(false)
const invoicingId = ref('')
const savingLink = ref(false)
const editingLinkId = ref('')

const editor = reactive({
  name: '',
  email: '',
  phone: '',
  role: 'user',
  status: 'active',
  payment_type: 'prepaid',
  password: '',
})

const linkEditor = reactive({
  server_id: '',
  login: '',
  value_per_credit: '',
  server_fornecedor_id: '',
  active: true,
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return users.value.filter((user) => {
    if (!term) return true
    return [user.name, user.email, user.phone].filter(Boolean).join(' ').toLowerCase().includes(term)
  })
})

const activeUser = computed(() => users.value.find((user) => user.id === activeUserId.value) || filtered.value[0])
const resellersCount = computed(() => users.value.filter((user) => user.role === 'user').length)
const adminsCount = computed(() => users.value.filter((user) => user.role === 'admin' || user.role === 'dev').length)
const isActiveUserReseller = computed(() => activeUser.value?.role === 'user' || activeUser.value?.role === 'reseller')
const activeUserLinks = computed(() =>
  resellerLinks.value.filter((link) => link.reseller_id === activeUser.value?.id && link.active !== false),
)
const activeServers = computed(() => servers.value.filter((server) => server.active !== false))
const selectedServer = computed(() => activeServers.value.find((server) => server.id === linkEditor.server_id))
const selectedServerProviders = computed(() =>
  (selectedServer.value?.server_fornecedores || []).filter((provider) => provider.active !== false),
)

function syncEditor(user?: User) {
  if (!user) return
  creating.value = false
  activeUserId.value = user.id
  Object.assign(editor, {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'user',
    status: user.status || 'active',
    payment_type: user.payment_type || 'prepaid',
    password: '',
  })
  resetLinkEditor()
}

function startCreate() {
  creating.value = true
  activeUserId.value = ''
  Object.assign(editor, {
    name: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'active',
    payment_type: 'prepaid',
    password: '102030Ab',
  })
}

async function load() {
  notice.value = ''
  try {
    const [userRecords, serverRecords, linkRecords] = await Promise.all([
      usersService.list(),
      serversService.list().catch(() => []),
      resellerServersService.list().catch(() => []),
    ])
    users.value = asArray<User>(userRecords)
    servers.value = asArray<Server>(serverRecords)
    resellerLinks.value = asArray<ResellerServer>(linkRecords)
  } catch (error) {
    users.value = []
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel carregar revendedores reais.'
  }
  syncEditor(users.value[0])
}

function resetLinkEditor() {
  editingLinkId.value = ''
  Object.assign(linkEditor, {
    server_id: activeServers.value[0]?.id || '',
    login: '',
    value_per_credit: '',
    server_fornecedor_id: '',
    active: true,
  })
}

function editServerLink(link: ResellerServer) {
  editingLinkId.value = link.id
  Object.assign(linkEditor, {
    server_id: link.server_id,
    login: link.login || '',
    value_per_credit: String(link.value_per_credit ?? ''),
    server_fornecedor_id: link.server_fornecedor_id || '',
    active: link.active !== false,
  })
}

async function saveServerLink() {
  if (!activeUser.value || !isActiveUserReseller.value || !linkEditor.server_id || !linkEditor.login.trim()) {
    notice.value = 'Selecione uma revenda, um servidor e informe o login do painel.'
    return
  }
  savingLink.value = true
  try {
    const payload = {
      reseller_id: activeUser.value.id,
      server_id: linkEditor.server_id,
      login: linkEditor.login.trim(),
      value_per_credit: Number(linkEditor.value_per_credit || 0),
      server_fornecedor_id: linkEditor.server_fornecedor_id || undefined,
      active: linkEditor.active,
    }
    const saved = editingLinkId.value
      ? await resellerServersService.update(editingLinkId.value, payload)
      : await resellerServersService.create(payload)
    resellerLinks.value = editingLinkId.value
      ? resellerLinks.value.map((link) => (link.id === saved.id ? saved : link))
      : [saved, ...resellerLinks.value]
    notice.value = 'Servidor vinculado a revenda.'
    resetLinkEditor()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel vincular o servidor a revenda.'
  } finally {
    savingLink.value = false
  }
}

async function removeServerLink(link: ResellerServer) {
  savingLink.value = true
  try {
    const removed = await resellerServersService.remove(link.id)
    resellerLinks.value = resellerLinks.value.map((item) => (item.id === link.id ? removed : item))
    notice.value = 'Vinculo desativado.'
    resetLinkEditor()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Nao foi possivel desativar o vinculo.'
  } finally {
    savingLink.value = false
  }
}

function toggle(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter((item) => item !== id) : [...selected.value, id]
}

function toggleAll() {
  const ids = filtered.value.map((user) => user.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.value.includes(id))
  selected.value = allSelected ? selected.value.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected.value, ...ids]))
}

async function removeSelected() {
  const ids = [...selected.value]
  if (!ids.length) return
  const results = await Promise.allSettled(ids.map((id) => usersService.remove(id)))
  const removed = ids.filter((_, index) => results[index].status === 'fulfilled')
  users.value = users.value.filter((user) => !removed.includes(user.id))
  selected.value = selected.value.filter((id) => !removed.includes(id))
  notice.value =
    removed.length === ids.length
      ? `${removed.length} revenda(s) removida(s).`
      : `${removed.length}/${ids.length} revenda(s) removida(s). Algumas exclusoes nao foram confirmadas pela API.`
  syncEditor(users.value[0])
}

async function saveUser() {
  saving.value = true
  const payload = {
    name: editor.name,
    email: editor.email,
    phone: editor.phone,
    role: editor.role,
    status: editor.status,
    payment_type: editor.payment_type,
    ...(editor.password ? { password: editor.password } : {}),
  }
  try {
    if (creating.value) {
      const created = await usersService.create({ ...payload, password: editor.password || '102030Ab' })
      users.value = [created, ...users.value]
      notice.value = 'Revenda criada com senha inicial definida.'
      syncEditor(created)
    } else if (activeUser.value) {
      const updated = await usersService.update(activeUser.value.id, payload)
      users.value = users.value.map((user) => (user.id === updated.id ? updated : user))
      notice.value = 'Revenda atualizada.'
      syncEditor(updated)
    }
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'A API nao confirmou a gravacao da revenda.'
  } finally {
    saving.value = false
    editor.password = ''
  }
}

async function generateInvoice(user: User) {
  invoicingId.value = user.id
  try {
    await financeService.generate(user.id)
    notice.value = `Fatura gerada para ${user.name || user.email}.`
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Falha ao gerar fatura.'
  } finally {
    invoicingId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <section class="module-hero">
      <div>
        <h1>Revendedores</h1>
        <p>Gerencie contas, senhas, permissoes e remova varias revendas em uma unica acao.</p>
      </div>
      <div class="module-actions">
        <UiButton @click="startCreate">Nova revenda</UiButton>
      </div>
    </section>

    <section class="module-grid three">
      <div class="module-stat"><span>Total</span><strong>{{ users.length }}</strong><small>contas no sistema</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-blue)"><span>Revendas</span><strong>{{ resellersCount }}</strong><small>usuarios operacionais</small></div>
      <div class="module-stat" style="--stat-color: var(--gj2-red)"><span>Admins</span><strong>{{ adminsCount }}</strong><small>acesso restrito</small></div>
    </section>

    <p v-if="notice" class="module-row">{{ notice }}</p>

    <section class="users-layout">
      <aside class="module-card pad">
        <div class="module-toolbar">
          <input v-model="search" class="module-search" placeholder="Buscar revenda" />
          <UiButton variant="secondary" @click="toggleAll">{{ selected.length ? 'Limpar' : 'Selecionar' }}</UiButton>
        </div>
        <div class="bulk-bar">
          <strong>{{ selected.length }} selecionado(s)</strong>
          <button type="button" :disabled="!selected.length" @click="removeSelected">Remover selecionados</button>
        </div>
        <div class="module-list user-list">
          <article
            v-for="user in filtered"
            :key="user.id"
            class="user-row"
            :class="{ active: activeUser?.id === user.id }"
            @click="syncEditor(user)"
          >
            <input type="checkbox" :checked="selected.includes(user.id)" @click.stop="toggle(user.id)" />
            <span class="user-avatar">{{ (user.name || user.email)[0]?.toUpperCase() }}</span>
            <span>
              <strong>{{ user.name || 'Sem nome' }}</strong>
              <small>{{ user.email }}</small>
            </span>
            <span class="module-pill" :style="{ '--pill-color': user.role === 'user' ? 'var(--gj2-green-deep)' : 'var(--gj2-blue)' }">
              {{ user.role }}
            </span>
          </article>
        </div>
      </aside>

      <main class="module-card pad">
        <h2>{{ creating ? 'Nova revenda' : 'Editor da revenda' }}</h2>
        <form class="user-form" @submit.prevent="saveUser">
          <div class="module-form-grid">
            <label class="module-label">Nome<input v-model="editor.name" class="module-input" /></label>
            <label class="module-label">Email<input v-model="editor.email" class="module-input" type="email" /></label>
            <label class="module-label">WhatsApp<input v-model="editor.phone" class="module-input" /></label>
            <label class="module-label">Nova senha<input v-model="editor.password" class="module-input" type="password" placeholder="deixe vazio para manter" /></label>
            <label class="module-label">Permissao
              <select v-model="editor.role" class="module-select">
                <option value="user">Revendedor</option>
                <option value="admin">Administrador</option>
                <option value="dev">Dev/GOD</option>
              </select>
            </label>
            <label class="module-label">Status
              <select v-model="editor.status" class="module-select">
                <option value="active">Ativo</option>
                <option value="blocked">Bloqueado</option>
                <option value="invited">Convidado</option>
              </select>
            </label>
            <label class="module-label">Pagamento
              <select v-model="editor.payment_type" class="module-select">
                <option value="prepaid">Pre-pago</option>
                <option value="postpaid">Pos-pago</option>
              </select>
            </label>
          </div>
          <UiButton type="submit" :disabled="saving">{{ saving ? 'Salvando...' : creating ? 'Criar revenda' : 'Salvar alteracoes' }}</UiButton>
          <div class="module-actions">
            <UiButton v-if="!creating && activeUser?.role === 'user'" variant="secondary" type="button" :disabled="invoicingId === activeUser.id" @click="generateInvoice(activeUser)">
              {{ invoicingId === activeUser.id ? 'Gerando fatura...' : 'Gerar fatura' }}
            </UiButton>
            <UiButton v-if="creating" variant="secondary" type="button" @click="syncEditor(users[0])">Cancelar cadastro</UiButton>
          </div>
        </form>

        <section v-if="!creating && isActiveUserReseller" class="server-links-panel">
          <header>
            <div>
              <h3>Servidores da revenda</h3>
              <p>Vincule servidor, login e preco. O pedido usa esse login automaticamente.</p>
            </div>
            <strong>{{ activeUserLinks.length }} ativo(s)</strong>
          </header>

          <div class="server-link-list">
            <article v-for="link in activeUserLinks" :key="link.id" class="server-link-row">
              <span>
                <strong>{{ link.server?.name || 'Servidor' }}</strong>
                <small>{{ link.login }} · {{ Number(link.value_per_credit || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}/cr</small>
                <em v-if="link.server_fornecedor?.fornecedor?.name">Fornecedor: {{ link.server_fornecedor.fornecedor.name }}</em>
              </span>
              <div>
                <button type="button" @click="editServerLink(link)">Editar</button>
                <button type="button" class="danger" @click="removeServerLink(link)">Desativar</button>
              </div>
            </article>
            <p v-if="!activeUserLinks.length" class="empty-links">Nenhum servidor vinculado a esta revenda.</p>
          </div>

          <form class="server-link-form" @submit.prevent="saveServerLink">
            <label class="module-label">Servidor
              <select v-model="linkEditor.server_id" class="module-select">
                <option value="">Selecione</option>
                <option v-for="server in activeServers" :key="server.id" :value="server.id">{{ server.name }}</option>
              </select>
            </label>
            <label class="module-label">Login do reseller
              <input v-model="linkEditor.login" class="module-input" placeholder="login no painel" />
            </label>
            <label class="module-label">Preco por credito
              <input v-model="linkEditor.value_per_credit" class="module-input" inputmode="decimal" placeholder="0,00" />
            </label>
            <label v-if="selectedServerProviders.length" class="module-label">Fornecedor interno
              <select v-model="linkEditor.server_fornecedor_id" class="module-select">
                <option value="">Sem fornecedor definido</option>
                <option v-for="provider in selectedServerProviders" :key="provider.id" :value="provider.id">
                  {{ provider.fornecedor?.name || 'Fornecedor' }} · R$ {{ Number(provider.cost_per_credit || 0).toFixed(2) }}
                </option>
              </select>
            </label>
            <label class="module-check">
              <input v-model="linkEditor.active" type="checkbox" />
              Vinculo ativo
            </label>
            <div class="server-link-actions">
              <UiButton type="submit" :disabled="savingLink">{{ savingLink ? 'Salvando...' : editingLinkId ? 'Salvar vinculo' : 'Vincular servidor' }}</UiButton>
              <UiButton v-if="editingLinkId" variant="secondary" type="button" @click="resetLinkEditor">Cancelar edicao</UiButton>
            </div>
          </form>
        </section>
      </main>
    </section>
  </div>
</template>

<style scoped>
.users-layout {
  display: grid;
  grid-template-columns: minmax(330px, 420px) minmax(0, 1fr);
  gap: 22px;
}

.bulk-bar {
  margin: 16px 0;
  padding: 12px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: #f4f5f3;
}

.bulk-bar button {
  border: 0;
  color: var(--gj2-red);
  background: transparent;
  font-weight: 820;
  cursor: pointer;
}

.bulk-bar button:disabled {
  opacity: .35;
}

.user-list {
  max-height: 590px;
  overflow: auto;
}

.user-row {
  padding: 12px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: auto 42px 1fr auto;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  background: #fff;
  box-shadow: 0 10px 22px rgba(95,105,112,.07);
}

.user-row.active {
  outline: 2px solid rgba(142,190,163,.45);
}

.user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--gj2-sidebar);
  font-weight: 900;
}

.user-row strong,
.user-row small {
  display: block;
}

.user-row small {
  color: var(--gj2-muted);
}

.user-form {
  margin-top: 20px;
  display: grid;
  gap: 18px;
}

.server-links-panel {
  margin-top: 26px;
  padding-top: 22px;
  border-top: 1px solid rgba(20, 26, 28, .08);
  display: grid;
  gap: 16px;
}

.server-links-panel header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}

.server-links-panel h3 {
  margin: 0 0 4px;
  color: var(--gj2-ink);
  font-size: 18px;
  font-weight: 950;
}

.server-links-panel p,
.server-link-row small,
.server-link-row em,
.empty-links {
  margin: 0;
  color: var(--gj2-muted);
  font-size: 12px;
  font-weight: 720;
  line-height: 1.35;
}

.server-links-panel header > strong {
  padding: 8px 10px;
  border-radius: 999px;
  color: #fff;
  background: #111517;
  font-size: 12px;
  white-space: nowrap;
}

.server-link-list,
.server-link-form {
  display: grid;
  gap: 10px;
}

.server-link-row {
  min-height: 68px;
  padding: 12px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  background: #f4f5f3;
}

.server-link-row strong,
.server-link-row small,
.server-link-row em {
  display: block;
}

.server-link-row strong {
  color: var(--gj2-ink);
  font-size: 14px;
  font-weight: 930;
}

.server-link-row em {
  font-style: normal;
  color: #739987;
}

.server-link-row div,
.server-link-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.server-link-row button {
  border: 0;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  color: #fff;
  background: #111517;
  font-size: 12px;
  font-weight: 880;
  cursor: pointer;
}

.server-link-row button.danger {
  background: var(--gj2-red);
}

.server-link-form {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  padding: 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, .7);
}

.module-check {
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--gj2-ink);
  font-size: 12px;
  font-weight: 850;
}

.server-link-actions {
  grid-column: 1 / -1;
  justify-content: flex-start;
}

@media (max-width: 980px) {
  .users-layout {
    grid-template-columns: 1fr;
  }

  .server-link-form {
    grid-template-columns: 1fr;
  }

  .server-link-row {
    grid-template-columns: 1fr;
  }

  .server-link-row div {
    justify-content: flex-start;
  }
}
</style>
