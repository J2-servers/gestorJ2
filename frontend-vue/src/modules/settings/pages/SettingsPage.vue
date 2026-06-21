<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useAuthStore } from '@/stores/auth.store'

import BroadcastMessagePage from '@/modules/broadcast/pages/BroadcastMessagePage.vue'
import DevDiagnosticsPage from '@/modules/dev-diagnostics/pages/DevDiagnosticsPage.vue'
import GodDashboardPage from '@/modules/god-dashboard/pages/GodDashboardPage.vue'
import ImportDataPage from '@/modules/import-data/pages/ImportDataPage.vue'
import MaintenancePage from '@/modules/maintenance/pages/MaintenancePage.vue'
import ProfilePage from '@/modules/profile/pages/ProfilePage.vue'
import WhatsAppDiagnosticPage from '@/modules/whatsapp-diagnostic/pages/WhatsAppDiagnosticPage.vue'

import CompanyForm from '../components/CompanyForm.vue'
import IdentityForm from '../components/IdentityForm.vue'
import IntegrationsForm from '../components/IntegrationsForm.vue'
import NotificationTest from '../components/NotificationTest.vue'
import PixForm from '../components/PixForm.vue'
import { useSettings } from '../composables/useSettings'
import { SETTINGS_TABS, type SettingsTabValue } from '../types'
import '../settings.css'

const auth = useAuthStore()
const isAdmin = computed(() => auth.isAdmin)

const { settings, loading, error, load, save, uploadImage } = useSettings()
const activeTab = ref<SettingsTabValue>('company')
const settingsNotice = computed(() => {
  if (!error.value) return ''
  if (/unauthorized|401/i.test(error.value)) {
    return 'Sessao expirada ou sem permissao. Entre novamente para carregar as configuracoes reais.'
  }
  return error.value
})

onMounted(load)
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <div>
        <h1>Configurações</h1>
        <p>Controle identidade, PIX, WhatsApp, notificações e parâmetros globais.</p>
      </div>
    </header>

    <div v-if="!isAdmin" class="settings-denied">Esta área é exclusiva para administradores.</div>

    <div v-else class="settings-layout">
      <aside class="settings-tabs">
        <button
          v-for="tab in SETTINGS_TABS"
          :key="tab.value"
          type="button"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </aside>

      <section class="settings-content">
        <div v-if="loading" class="settings-loading">Carregando configurações…</div>
        <template v-else>
          <div v-if="settingsNotice" class="settings-notice">{{ settingsNotice }}</div>
          <CompanyForm v-if="activeTab === 'company'" :settings="settings" :save="save" />
          <IdentityForm v-else-if="activeTab === 'identity'" :settings="settings" :save="save" :upload-image="uploadImage" />
          <PixForm v-else-if="activeTab === 'pix'" :settings="settings" :save="save" />
          <IntegrationsForm v-else-if="activeTab === 'integrations'" :settings="settings" :save="save" />
          <NotificationTest v-else-if="activeTab === 'notifications'" :settings="settings" />
          <ProfilePage v-else-if="activeTab === 'profile'" />
          <BroadcastMessagePage v-else-if="activeTab === 'broadcast'" />
          <ImportDataPage v-else-if="activeTab === 'import'" />
          <WhatsAppDiagnosticPage v-else-if="activeTab === 'waDiagnostic'" />
          <MaintenancePage v-else-if="activeTab === 'maintenance'" />
          <DevDiagnosticsPage v-else-if="activeTab === 'dev'" />
          <GodDashboardPage v-else-if="activeTab === 'god'" />
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 16px;
}

.settings-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.settings-header h1 {
  margin: 0;
  font-size: clamp(30px, 3.2vw, 40px);
  font-weight: 880;
  letter-spacing: .01em;
}

.settings-header p {
  margin: 6px 0 0;
  color: #33363a;
  font-size: 16px;
  max-width: 620px;
}

.settings-layout {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.settings-tabs {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: var(--gj2-radius-lg);
  background: #fff;
  box-shadow: var(--gj2-shadow-card);
  position: sticky;
  top: 16px;
}

.settings-tabs button {
  min-height: 42px;
  padding: 0 13px;
  border: 0;
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  color: var(--gj2-muted);
  background: transparent;
  font-weight: 800;
  font-size: 14px;
}

.settings-tabs button.active {
  color: #fff;
  background: var(--gj2-sidebar);
}

.settings-content {
  min-width: 0;
  padding: clamp(14px, 1.8vw, 22px);
  border-radius: var(--gj2-radius-lg);
  background: #fff;
  box-shadow: var(--gj2-shadow-card);
}

.settings-content :deep(.module-page),
.settings-content :deep(.dashboard-page),
.settings-content :deep(.settings-page) {
  gap: 14px;
}

.settings-content :deep(.module-hero h1),
.settings-content :deep(.settings-header h1) {
  font-size: clamp(26px, 2.4vw, 34px);
}

.settings-content :deep(.module-card.pad),
.settings-content :deep(.module-stat) {
  padding: 16px;
}

.settings-loading {
  min-height: 200px;
  display: grid;
  place-items: center;
  color: var(--gj2-muted);
}

.settings-notice {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  color: #f6d6bf;
  background: linear-gradient(135deg, rgba(250, 84, 28, .16), rgba(9, 10, 10, .92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 18px 36px rgba(0, 0, 0, .24);
  font-weight: 800;
}

.settings-denied {
  padding: 40px;
  border-radius: var(--gj2-radius-lg);
  background: #fff;
  box-shadow: var(--gj2-shadow-card);
  text-align: center;
  color: var(--gj2-muted);
}

@media (max-width: 960px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-tabs {
    position: static;
    grid-auto-flow: column;
    grid-auto-columns: minmax(130px, 1fr);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .settings-tabs::-webkit-scrollbar {
    display: none;
  }
}

@media (max-width: 720px) {
  .settings-header h1 {
    font-size: 32px;
  }
}
</style>
