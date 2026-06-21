export type UserRole = 'admin' | 'dev' | 'user' | 'reseller' | 'recovery'

export interface User {
  id: string
  name?: string
  full_name?: string
  email: string
  phone?: string
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
