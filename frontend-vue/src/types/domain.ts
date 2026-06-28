export type UserRole = 'admin' | 'dev' | 'user' | 'reseller' | 'recovery'

export interface User {
  id: string
  name?: string
  full_name?: string
  email: string
  phone?: string
  profile_image_url?: string
  profileImageUrl?: string
  role: UserRole
  status?: string
  payment_type?: 'prepaid' | 'postpaid'
  parent_user_id?: string
  created_date?: string
  updated_date?: string
  last_login?: string
}

export interface Settings {
  admin_id?: string
  company_name?: string
  cnpj?: string
  address?: string
  phone?: string
  email?: string
  sidebar_logo_url?: string
  sidebar_logo_fit?: string
  profile_icon_url?: string
  login_logo_url?: string
  login_logo_fit?: string
  login_background_url?: string
  login_background_position?: string
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
  favicon_url?: string
  pix_keys?: unknown[]
  admin_whatsapp?: string
  whatsapp_provider?: string
  whatsapp_enabled?: boolean
  evolution_api_url?: string
  evolution_instance?: string
  evolution_instance_id?: string
  evolution_api_key?: string
  evolution_api_key_ref?: string
  n8n_webhook_url?: string
  fcm_server_key?: string
}

export interface CreditRequest {
  id: string
  reseller_id?: string
  reseller?: User
  server_id?: string
  server_snapshot?: {
    name?: string
    value_per_credit?: number
  }
  login?: string
  status: 'pending' | 'analyzing' | 'recharged' | 'rejected' | 'canceled'
  requested_credits: number
  total_value: number
  payment_type?: 'prepaid' | 'postpaid'
  invoice_id?: string | null
  proof_url?: string
  payment_proof_url?: string
  proof_of_payment_url?: string
  admin_notes?: string
  notes?: string
  rejection_reason?: string
  rejection_image_url?: string
  rejectionImageUrl?: string
  created_date?: string
  updated_date?: string
}

export interface Server {
  id: string
  name: string
  owner_id?: string
  panel_link?: string
  description?: string
  username?: string
  value_per_credit?: number
  cost_per_credit?: number
  notes?: string
  active?: boolean
  deleted_at?: string | null
  server_fornecedores?: ServerFornecedor[]
  created_date?: string
  updated_date?: string
}

export interface ResellerServer {
  id: string
  reseller_id: string
  server_id: string
  login: string
  value_per_credit: number
  active?: boolean
  supplier_id?: string | null
  server_fornecedor_id?: string | null
  reseller?: User
  server?: Server
  supplier?: Supplier
  server_fornecedor?: ServerFornecedor
  created_date?: string
  updated_date?: string
}

export interface Supplier {
  id: string
  server_id: string
  name: string
  contact?: string
  panel_login?: string
  panel_link?: string
  cost_per_credit?: number
  active?: boolean
  created_date?: string
  updated_date?: string
}

export interface Fornecedor {
  id: string
  name: string
  contact?: string
  notes?: string
  active?: boolean
  _count?: { server_fornecedores?: number }
  server_fornecedores?: ServerFornecedor[]
  created_date?: string
  updated_date?: string
}

export interface ServerFornecedor {
  id: string
  server_id: string
  fornecedor_id: string
  cost_per_credit: number
  panel_login: string
  panel_link?: string
  panel_password?: string
  notes?: string
  active?: boolean
  server?: Server
  fornecedor?: Fornecedor
  created_date?: string
  updated_date?: string
}

export interface MessageTemplate {
  id: string
  name: string
  type: string
  content: string
  message_content?: string
  active?: boolean
  is_active?: boolean
  admin_id?: string
  created_date?: string
  updated_date?: string
}

export interface Invoice {
  id: string
  invoice_number?: string
  reseller_id?: string
  reseller_name?: string
  total_value: number
  total_credits?: number
  request_count?: number
  status?: string
  due_date?: string
  paid_date?: string
  proof_url?: string
  requests?: CreditRequest[]
  created_date?: string
  updated_date?: string
}

export interface ChatThread {
  resellerId?: string
  resellerName?: string
  resellerImageUrl?: string
  counterpartImageUrl?: string
  lastMessage?: string
  unreadCount?: number
  updatedAt?: string
}

export interface ChatMessage {
  id: string
  content: string
  message_content?: string
  senderId?: string
  sender_id?: string
  senderName?: string
  sender_name?: string
  senderRole?: string
  sender_role?: string
  senderImageUrl?: string
  sender_image_url?: string
  resellerId?: string
  reseller_id?: string
  createdAt?: string
  created_date?: string
}

export interface NotificationItem {
  id: string
  type?: string
  related_entity_id?: string | null
  credit_request_id?: string | null
  title?: string
  message?: string
  read?: boolean
  isRead?: boolean
  createdAt?: string
  created_date?: string
  url?: string
}

export interface AuditLog {
  id: string
  action?: string
  entity?: string
  user_email?: string
  user_name?: string
  userName?: string
  details?: string
  created_date?: string
  createdAt?: string
  credit_request_id?: string
  creditRequestId?: string
}

export type RechargeCodeStatus = 'available' | 'reserved' | 'sold' | 'voided'

export interface RechargeCodeProduct {
  id: string
  name: string
  description?: string | null
  serverId?: string | null
  server_id?: string | null
  server?: Pick<Server, 'id' | 'name'> | null
  denomination: number
  costValue?: number
  cost_value?: number
  saleValue?: number
  sale_value?: number
  instructions?: string | null
  active?: boolean
  stock?: {
    total: number
    available: number
    reserved: number
    sold: number
    voided: number
  }
  createdAt?: string
  created_date?: string
  updatedAt?: string
  updated_date?: string
}

export interface RechargeCodeBatch {
  id: string
  productId?: string
  product_id?: string
  sourceFilename?: string | null
  source_filename?: string | null
  notes?: string | null
  totalRows: number
  total_rows?: number
  importedCount: number
  imported_count?: number
  duplicateCount: number
  duplicate_count?: number
  invalidCount: number
  invalid_count?: number
  createdAt?: string
  created_date?: string
}

export interface RechargeCode {
  id: string
  productId?: string
  product_id?: string
  code: string
  pin?: string | null
  serial?: string | null
  status: RechargeCodeStatus
  expiresAt?: string | null
  expires_at?: string | null
  soldAt?: string | null
  sold_at?: string | null
  product?: RechargeCodeProduct
  soldTo?: Pick<User, 'id' | 'name' | 'email'> | null
  sold_to?: Pick<User, 'id' | 'name' | 'email'> | null
  voidReason?: string | null
  void_reason?: string | null
}

export interface RechargeCodeSale {
  product: RechargeCodeProduct
  quantity: number
  totalValue: number
  total_value?: number
  soldAt: string
  sold_at?: string
  codes: RechargeCode[]
}

export interface RechargeCodeImportMapping {
  codeColumn: string
  pinColumn?: string
  serialColumn?: string
  expiresAtColumn?: string
  sheetName?: string
}

export interface RechargeCodeImportPreview {
  fileName: string
  fileSize: number
  sheetNames: string[]
  selectedSheetName: string
  headers: string[]
  mapping: RechargeCodeImportMapping
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateInFileCount: number
  duplicateInSystemCount: number
  importableCount: number
  sampleRows: Array<{
    rowNumber: number
    code: string
    pin?: string
    serial?: string
    expiresAt?: string | null
    valid: boolean
    duplicateInSystem: boolean
  }>
  invalidSamples: Array<{ rowNumber: number; reason: string }>
  limits: { maxRows: number; maxFileSizeMb: number }
}

export type SupportTopicStatus = 'draft' | 'published' | 'archived'
export type SupportServerStatus = 'operational' | 'attention' | 'maintenance' | 'degraded' | 'offline'

export interface SupportTopic {
  id: string
  title: string
  category: string
  summary?: string | null
  content?: string | null
  steps?: string[] | unknown
  status: SupportTopicStatus
  pinned?: boolean
  sortOrder?: number
  sort_order?: number
  author?: Pick<User, 'id' | 'name' | 'email'> | null
  publishedAt?: string | null
  published_at?: string | null
  createdAt?: string
  created_date?: string
  updatedAt?: string
  updated_date?: string
}

export interface SupportLink {
  id: string
  label: string
  href: string
  category: string
  detail?: string | null
  status: SupportTopicStatus
  pinned?: boolean
  sortOrder?: number
  sort_order?: number
}

export interface SupportServerUpdate {
  id: string
  serverId?: string | null
  server_id?: string | null
  server?: Pick<Server, 'id' | 'name' | 'active'> | null
  title: string
  message: string
  status: SupportServerStatus
  impact?: string | null
  actionText?: string | null
  action_text?: string | null
  pinned?: boolean
  published?: boolean
  author?: Pick<User, 'id' | 'name' | 'email'> | null
  publishedAt?: string | null
  published_at?: string | null
  createdAt?: string
  created_date?: string
  updatedAt?: string
  updated_date?: string
}

export interface SupportOverview {
  topics: SupportTopic[]
  links: SupportLink[]
  updates: SupportServerUpdate[]
  servers: Pick<Server, 'id' | 'name' | 'active'>[]
  categories: string[]
  canManage: boolean
}
