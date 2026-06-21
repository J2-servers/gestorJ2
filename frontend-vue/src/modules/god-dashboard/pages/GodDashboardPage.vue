<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { auditService } from '@/services/api/audit.service'
import { maintenanceService } from '@/services/api/maintenance.service'
import { settingsService } from '@/services/api/settings.service'
import { usersService } from '@/services/api/users.service'
import type { AuditLog, User } from '@/types/domain'
import { formatDate } from '@/utils/format'

const users = ref<User[]>([])
const overview = ref<Record<string, any> | null>(null)
const system = ref<Record<string, any> | null>(null)
const errors = ref<any[]>([])
const scripts = ref<any[]>([])
const audit = ref<AuditLog[]>([])
const settings = ref<Record<string, any> | null>(null)
const tab = ref('overview')
const busy = ref('')
const notice = ref('')

const admins = computed(() => users.value.filter((item) => item.role === 'admin' || item.role === 'dev'))
const resellers = computed(() => users.value.filter((item) => item.role === 'user'))
const blocked = computed(() => users.value.filter((item) => item.status === 'blocked'))

async function load() {
  busy.value = 'load'
  const [u, ov, sys, errs, scr, aud, cfg] = await Promise.all([
    usersService.list().catch(() => []),
    maintenanceService.overview().catch(() => null),
    maintenanceService.systemOverview().catch(() => null),
    maintenanceService.errors(50).catch(() => []),
    maintenanceService.scripts().catch(() => []),
    auditService.list().catch(() => []),
    settingsService.get().catch(() => null),
  ])
  users.value = u as User[]
  overview.value = ov as Record<string, any> | null
  system.value = sys as Record<string, any> | null
  errors.value = Array.isArray(errs) ? errs : []
  scripts.value = Array.isArray(scr) ? scr : []
  audit.value = Array.isArray(aud) ? (aud as AuditLog[]) : []
  settings.value = cfg as Record<string, any> | null
  busy.value = ''
}

async function toggleUser(user: User) {
  busy.value = user.id
  await usersService.update(user.id, { status: user.status === 'blocked' ? 'active' : 'blocked' }).catch((err) => {
    notice.value = err.message
  })
  busy.value = ''
  await load()
}

async function removeUser(user: User) {
  if (user.role === 'admin' || user.role === 'dev' || user.role === 'recovery') {
    notice.value = 'Conta protegida nao pode ser removida por aqui.'
    return
  }
  busy.value = user.id
  await usersService.remove(user.id).catch((err) => {
    notice.value = err.message
  })
  busy.value = ''
  await load()
}

async function runScript(id: string, apply = false) {
  busy.value = id
  const result = await (apply ? maintenanceService.applyScript(id) : maintenanceService.diagnoseScript(id)).catch((err) => ({ error: err.message }))
  notice.value = JSON.stringify(result)
  busy.value = ''
}

async function toggleWhatsapp() {
  const next = !(settings.value?.whatsappEnabled ?? settings.value?.whatsapp_enabled)
  settings.value = (await settingsService.update({ whatsappEnabled: next }).catch((err) => ({ error: err.message }))) as Record<string, any>
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Painel GOD</h1>
        <p>Controle técnico de usuários, catálogo, manutenção, auditoria e recursos críticos.</p>
      </div>
    </header>

    <section class="module-grid four">
      <article class="module-stat"><span>Admins</span><strong>{{ admins.length }}</strong></article>
      <article class="module-stat"><span>Revendedores</span><strong>{{ resellers.length }}</strong></article>
      <article class="module-stat"><span>Bloqueados</span><strong>{{ blocked.length }}</strong></article>
      <article class="module-stat"><span>Erros</span><strong>{{ errors.length }}</strong></article>
    </section>

    <nav class="module-chip-row">
      <button v-for="item in ['overview', 'users', 'system', 'scripts', 'audit']" :key="item" class="module-chip" :class="{ active: tab === item }" @click="tab = item">{{ item }}</button>
    </nav>

    <section v-if="tab === 'overview'" class="module-grid two">
      <article class="module-card pad">
        <h2>Saúde geral</h2>
        <pre class="god-pre">{{ overview || system || 'Sem dados' }}</pre>
      </article>
      <article class="module-card pad">
        <h2>WhatsApp</h2>
        <p class="module-muted">Ative/desative envios automáticos sem alterar templates.</p>
        <UiButton @click="toggleWhatsapp">{{ settings?.whatsappEnabled || settings?.whatsapp_enabled ? 'Desativar' : 'Ativar' }} WhatsApp</UiButton>
      </article>
    </section>

    <section v-else-if="tab === 'users'" class="module-card pad">
      <h2>Usuários</h2>
      <div class="module-list">
        <article v-for="user in users" :key="user.id" class="module-row">
          <div class="module-row-line">
            <strong>{{ user.name || user.email }}</strong>
            <span class="module-pill">{{ user.role }}</span>
          </div>
          <small>{{ user.email }} · {{ user.status || 'active' }}</small>
          <UiButton variant="secondary" :disabled="busy === user.id" @click="toggleUser(user)">{{ user.status === 'blocked' ? 'Desbloquear' : 'Bloquear' }}</UiButton>
          <UiButton v-if="user.role === 'user'" variant="secondary" :disabled="busy === user.id" @click="removeUser(user)">Remover</UiButton>
        </article>
      </div>
    </section>

    <section v-else-if="tab === 'system'" class="module-card pad">
      <h2>Erros recentes</h2>
      <div class="module-list">
        <article v-for="error in errors" :key="error.id || error.created_date" class="module-row">
          <strong>{{ error.message || error.name || 'Erro' }}</strong>
          <small>{{ error.route || error.context || formatDate(error.created_date) }}</small>
        </article>
      </div>
    </section>

    <section v-else-if="tab === 'scripts'" class="module-card pad">
      <h2>Scripts seguros</h2>
      <div class="module-list">
        <article v-for="script in scripts" :key="script.id" class="module-row">
          <div class="module-row-line"><strong>{{ script.name }}</strong><span>{{ script.status || 'ok' }}</span></div>
          <small>{{ script.description }}</small>
          <div class="module-actions">
            <UiButton variant="secondary" :disabled="busy === script.id" @click="runScript(script.id)">Diagnosticar</UiButton>
            <UiButton :disabled="busy === script.id" @click="runScript(script.id, true)">Aplicar</UiButton>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="module-card pad">
      <h2>Auditoria</h2>
      <div class="module-list">
        <article v-for="item in audit" :key="item.id" class="module-row">
          <div class="module-row-line"><strong>{{ item.action || item.entity || 'Evento' }}</strong><span>{{ formatDate(item.created_date) }}</span></div>
          <small>{{ item.user_email || item.user_name || '-' }} · {{ item.details || '-' }}</small>
        </article>
      </div>
    </section>

    <pre v-if="notice" class="god-pre">{{ notice }}</pre>
  </div>
</template>

<style scoped>
.god-pre {
  overflow: auto;
  padding: 16px;
  border-radius: 18px;
  white-space: pre-wrap;
  color: #394044;
  background: #f3f4f2;
}
</style>
