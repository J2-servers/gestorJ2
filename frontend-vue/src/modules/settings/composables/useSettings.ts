import { ref } from 'vue'

import { ApiError } from '@/services/api/httpClient'
import { settingsService } from '@/services/api/settings.service'
import { uploadsService } from '@/services/api/uploads.service'

import type { AdminSettings } from '../types'

const DEFAULT_SETTINGS: AdminSettings = {
  company_name: 'Gestor J2',
  email: '',
  phone: '',
  address: '',
  pix_keys: [],
  sidebar_logo_fit: 'contain',
  login_logo_fit: 'contain',
  login_background_position: 'center',
  login_brand_subtitle: 'Central de creditos',
  login_hero_eyebrow: 'Operacao profissional',
  login_hero_title: 'Controle de recargas com presenca de central.',
  login_hero_text: 'Pedidos, creditos, revendedores, servidores, notificacoes e fila de atendimento em uma experiencia unica.',
  login_panel_eyebrow: 'Acesso seguro',
  login_panel_title: 'Entrar no sistema',
  login_login_tab_text: 'Entrar',
  login_register_tab_text: 'Novo revendedor',
  login_submit_text: 'Entrar agora',
  login_register_submit_text: 'Criar acesso',
  login_status_text: 'Online',
  admin_whatsapp: '',
  whatsapp_provider: 'evolution',
  evolution_api_url: '',
  evolution_instance: '',
  evolution_instance_id: '',
  evolution_api_key: '',
  n8n_webhook_url: '',
  fcm_server_key: '',
}

// Carrega e salva as configuracoes globais. Os componentes de aba consomem
// `settings`, chamam `save(patch)` e exibem seu proprio feedback local.
export function useSettings() {
  const settings = ref<AdminSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)
  const error = ref('')

  function normalizeError(err: unknown, fallback: string) {
    if (err instanceof ApiError) return err.message
    if (err instanceof Error) return err.message
    return fallback
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      settings.value = { ...DEFAULT_SETTINGS, ...((await settingsService.get()) as AdminSettings) }
    } catch (err) {
      error.value = normalizeError(err, 'Não foi possível carregar as configurações.')
    } finally {
      loading.value = false
    }
  }

  // Salva um patch parcial e atualiza o estado local com o retorno do backend.
  async function save(patch: Partial<AdminSettings>) {
    const updated = (await settingsService.update(patch)) as AdminSettings
    settings.value = { ...DEFAULT_SETTINGS, ...(settings.value ?? {}), ...updated }
    return settings.value
  }

  // Faz upload de imagem e devolve a URL (aceita variacoes de campo do backend).
  async function uploadImage(file: File): Promise<string> {
    const uploaded = (await uploadsService.upload(file)) as {
      file_url?: string
      fileUrl?: string
      url?: string
    }
    const url = uploaded?.file_url ?? uploaded?.fileUrl ?? uploaded?.url
    if (!url) throw new Error('Upload não retornou a URL do arquivo.')
    return url
  }

  return { settings, loading, error, load, save, uploadImage }
}
