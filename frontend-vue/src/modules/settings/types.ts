// Tipos locais do modulo de configuracoes. O dominio compartilhado (Settings)
// e enxuto; aqui descrevemos todos os campos admin usados pelas abas.

export interface PixKey {
  id?: number | string
  type: string
  key_value: string
  bank: string
  is_active: boolean
}

export interface AdminSettings {
  company_name?: string
  cnpj?: string
  phone?: string
  email?: string
  address?: string

  favicon_url?: string
  sidebar_logo_url?: string
  sidebar_logo_fit?: 'contain' | 'cover' | 'scale-down'
  profile_icon_url?: string
  login_logo_url?: string
  login_logo_fit?: 'contain' | 'cover' | 'scale-down'
  login_background_url?: string
  login_background_position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  login_brand_subtitle?: string
  login_hero_eyebrow?: string
  login_hero_title?: string
  login_hero_text?: string
  login_panel_eyebrow?: string
  login_panel_title?: string
  login_login_tab_text?: string
  login_register_tab_text?: string
  login_submit_text?: string
  login_register_submit_text?: string
  login_status_text?: string

  pix_keys?: PixKey[]

  admin_whatsapp?: string
  evolution_api_url?: string
  evolution_instance?: string
  evolution_instance_id?: string
  evolution_api_key?: string
  n8n_webhook_url?: string
  fcm_server_key?: string
  whatsapp_provider?: string
}

export interface PaymentSettings {
  id?: string
  provider: string
  name?: string
  environment: 'sandbox' | 'production'
  active: boolean
  priority?: number
  pixKey?: string
  clientId?: string
  clientSecret?: string
  token?: string
  webhookUrl?: string
  webhookSecret?: string
  certificate?: string
  agency?: string
  accountNumber?: string
  depixAddress?: string
  depixSplitAddress?: string
  splitFee?: number | null
  delayDepixInHours?: number | null
  bankName?: string
  accountLabel?: string
  instructions?: string
  autoApprove?: boolean
  hasClientSecret?: boolean
  hasToken?: boolean
  hasWebhookSecret?: boolean
  hasCertificate?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PaymentProviderDefinition {
  id: string
  name: string
  kind: 'manual' | 'gateway' | 'bank'
  stability: string
  officialDocsUrl: string
  webhookDocsUrl?: string
  requiredFields: string[]
  secretFields: string[]
  webhookEvents: string[]
  feeSummary?: string
  contractNotes?: string
  notes: string
}

export interface PaymentSettingsResponse {
  providers: PaymentProviderDefinition[]
  settings: PaymentSettings[]
}

export type SettingsTabValue =
  | 'company'
  | 'identity'
  | 'pix'
  | 'payments'
  | 'integrations'
  | 'notifications'
  | 'profile'
  | 'broadcast'
  | 'import'
  | 'waDiagnostic'
  | 'maintenance'
  | 'dev'
  | 'god'

export interface SettingsTab {
  value: SettingsTabValue
  label: string
}

export const SETTINGS_TABS: SettingsTab[] = [
  { value: 'company', label: 'Empresa' },
  { value: 'identity', label: 'Visual' },
  { value: 'pix', label: 'PIX' },
  { value: 'payments', label: 'Pagamentos' },
  { value: 'integrations', label: 'WhatsApp' },
  { value: 'notifications', label: 'Testes' },
  { value: 'profile', label: 'Perfil' },
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'import', label: 'Importar CSV' },
  { value: 'waDiagnostic', label: 'WA Diagnostic' },
  { value: 'maintenance', label: 'Manutencao' },
  { value: 'dev', label: 'Dev' },
  { value: 'god', label: 'Painel' },
]

export const PIX_KEY_TYPES: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'Email',
  phone: 'Telefone',
  random: 'Chave Aleatoria',
}
