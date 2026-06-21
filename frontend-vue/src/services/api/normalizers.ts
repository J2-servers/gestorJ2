import type {
  AuditLog,
  ChatMessage,
  CreditRequest,
  Fornecedor,
  Invoice,
  MessageTemplate,
  NotificationItem,
  ResellerServer,
  Server,
  ServerFornecedor,
  Settings,
  Supplier,
  User,
} from '@/types/domain'

type Dict = Record<string, unknown>

function isDict(value: unknown): value is Dict {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function compactUndefined<T extends Dict>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : value
}

function numberOrZero(value: unknown) {
  if (value === undefined || value === null || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeUser(raw: unknown): User {
  const user = (isDict(raw) ? raw : {}) as Dict
  const role = user.role === 'reseller' ? 'user' : user.role
  const phone = String(
    user.phone ??
      user.whatsapp ??
      user.whatsappNumber ??
      user.whatsapp_number ??
      user.phoneNumber ??
      user.phone_number ??
      '',
  ).trim()

  return {
    ...(user as unknown as User),
    role: (role || 'user') as User['role'],
    phone,
    profile_image_url: (user.profile_image_url ?? user.profileImageUrl) as string | undefined,
    profileImageUrl: (user.profileImageUrl ?? user.profile_image_url) as string | undefined,
    full_name: (user.full_name ?? user.name) as string | undefined,
    parent_user_id: (user.parent_user_id ?? user.parentId) as string | undefined,
    payment_type: (user.payment_type ?? user.paymentType) as User['payment_type'],
    created_date: (user.created_date ?? user.createdAt) as string | undefined,
    updated_date: (user.updated_date ?? user.updatedAt) as string | undefined,
  } as User
}

export function toUserPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const role = data.role === 'user' ? 'reseller' : data.role
  return compactUndefined({
    name: text(data.name),
    email: text(data.email),
    phone: text(data.phone),
    profileImageUrl: text(data.profileImageUrl ?? data.profile_image_url),
    password: data.password,
    status: data.status,
    paymentType: data.paymentType ?? data.payment_type,
    parentId: data.parentId ?? data.parent_id ?? data.parent_user_id,
    role,
  })
}

export function toCreateUserPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  return compactUndefined({
    name: text(data.name),
    email: text(data.email),
    phone: text(data.phone),
    password: data.password,
    paymentType: data.paymentType ?? data.payment_type,
  })
}

export function toUpdateUserPayload(raw: unknown) {
  return toUserPayload(raw)
}

export function toUpdateMePayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  return compactUndefined({
    name: text(data.name),
    phone: text(data.phone),
    profileImageUrl: text(data.profileImageUrl ?? data.profile_image_url),
  })
}

export function normalizeSettings(raw: unknown): Settings {
  const settings = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(settings as unknown as Settings),
    admin_id: settings.admin_id ?? settings.adminId,
    company_name: settings.company_name ?? settings.companyName,
    favicon_url: settings.favicon_url ?? settings.faviconUrl,
    sidebar_logo_url: settings.sidebar_logo_url ?? settings.sidebarLogoUrl,
    sidebar_logo_fit: settings.sidebar_logo_fit ?? settings.sidebarLogoFit,
    profile_icon_url: settings.profile_icon_url ?? settings.profileIconUrl,
    login_logo_url: settings.login_logo_url ?? settings.loginLogoUrl,
    login_logo_fit: settings.login_logo_fit ?? settings.loginLogoFit,
    login_background_url: settings.login_background_url ?? settings.loginBackgroundUrl,
    login_background_position: settings.login_background_position ?? settings.loginBackgroundPosition,
    login_brand_subtitle: settings.login_brand_subtitle ?? settings.loginBrandSubtitle,
    login_hero_eyebrow: settings.login_hero_eyebrow ?? settings.loginHeroEyebrow,
    login_hero_title: settings.login_hero_title ?? settings.loginHeroTitle,
    login_hero_text: settings.login_hero_text ?? settings.loginHeroText,
    login_panel_eyebrow: settings.login_panel_eyebrow ?? settings.loginPanelEyebrow,
    login_panel_title: settings.login_panel_title ?? settings.loginPanelTitle,
    login_login_tab_text: settings.login_login_tab_text ?? settings.loginLoginTabText,
    login_register_tab_text: settings.login_register_tab_text ?? settings.loginRegisterTabText,
    login_submit_text: settings.login_submit_text ?? settings.loginSubmitText,
    login_register_submit_text: settings.login_register_submit_text ?? settings.loginRegisterSubmitText,
    login_status_text: settings.login_status_text ?? settings.loginStatusText,
    admin_whatsapp: settings.admin_whatsapp ?? settings.adminWhatsapp,
    whatsapp_provider: settings.whatsapp_provider ?? settings.whatsappProvider,
    whatsapp_enabled: settings.whatsapp_enabled ?? settings.whatsappEnabled ?? true,
    evolution_api_url: settings.evolution_api_url ?? settings.evolutionApiUrl,
    evolution_instance: settings.evolution_instance ?? settings.evolutionInstance,
    evolution_instance_id: settings.evolution_instance_id ?? settings.evolutionInstance,
    evolution_api_key: settings.evolution_api_key ?? settings.evolutionApiKeyRef,
    evolution_api_key_ref: settings.evolution_api_key_ref ?? settings.evolutionApiKeyRef,
    n8n_webhook_url: settings.n8n_webhook_url ?? settings.n8nWebhookUrl,
    fcm_server_key: settings.fcm_server_key ?? settings.fcmServerKey,
    pix_keys: settings.pix_keys ?? settings.pixKeys ?? [],
  } as Settings
}

export function toSettingsPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  return compactUndefined({
    companyName: data.companyName ?? data.company_name,
    cnpj: data.cnpj,
    address: data.address,
    phone: data.phone,
    email: data.email,
    faviconUrl: data.faviconUrl ?? data.favicon_url,
    sidebarLogoUrl: data.sidebarLogoUrl ?? data.sidebar_logo_url,
    sidebarLogoFit: data.sidebarLogoFit ?? data.sidebar_logo_fit,
    profileIconUrl: data.profileIconUrl ?? data.profile_icon_url,
    loginLogoUrl: data.loginLogoUrl ?? data.login_logo_url,
    loginLogoFit: data.loginLogoFit ?? data.login_logo_fit,
    loginBackgroundUrl: data.loginBackgroundUrl ?? data.login_background_url,
    loginBackgroundPosition: data.loginBackgroundPosition ?? data.login_background_position,
    loginBrandSubtitle: data.loginBrandSubtitle ?? data.login_brand_subtitle,
    loginHeroEyebrow: data.loginHeroEyebrow ?? data.login_hero_eyebrow,
    loginHeroTitle: data.loginHeroTitle ?? data.login_hero_title,
    loginHeroText: data.loginHeroText ?? data.login_hero_text,
    loginPanelEyebrow: data.loginPanelEyebrow ?? data.login_panel_eyebrow,
    loginPanelTitle: data.loginPanelTitle ?? data.login_panel_title,
    loginLoginTabText: data.loginLoginTabText ?? data.login_login_tab_text,
    loginRegisterTabText: data.loginRegisterTabText ?? data.login_register_tab_text,
    loginSubmitText: data.loginSubmitText ?? data.login_submit_text,
    loginRegisterSubmitText: data.loginRegisterSubmitText ?? data.login_register_submit_text,
    loginStatusText: data.loginStatusText ?? data.login_status_text,
    adminWhatsapp: data.adminWhatsapp ?? data.admin_whatsapp,
    whatsappProvider: data.whatsappProvider ?? data.whatsapp_provider,
    whatsappEnabled: data.whatsappEnabled ?? data.whatsapp_enabled,
    evolutionApiUrl: data.evolutionApiUrl ?? data.evolution_api_url,
    evolutionInstance: data.evolutionInstance ?? data.evolution_instance ?? data.evolution_instance_id,
    evolutionApiKeyRef: data.evolutionApiKeyRef ?? data.evolution_api_key_ref ?? data.evolution_api_key,
    n8nWebhookUrl: data.n8nWebhookUrl ?? data.n8n_webhook_url,
    fcmServerKey: data.fcmServerKey ?? data.fcm_server_key,
    pixKeys: data.pixKeys ?? data.pix_keys,
  })
}

export function normalizeServer(raw: unknown): Server {
  const server = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(server as unknown as Server),
    owner_id: server.owner_id ?? server.ownerId,
    panel_link: server.panel_link ?? server.panelLink,
    cost_per_credit: server.cost_per_credit ?? numberOrZero(server.costPerCredit),
    value_per_credit: server.value_per_credit ?? numberOrZero(server.valuePerCredit),
    notes: server.notes as string | undefined,
    deleted_at: server.deleted_at ?? server.deletedAt ?? null,
    server_fornecedores: Array.isArray(server.serverFornecedores)
      ? server.serverFornecedores.map(normalizeServerFornecedor)
      : Array.isArray(server.server_fornecedores)
        ? server.server_fornecedores
        : undefined,
    created_date: server.created_date ?? server.createdAt,
    updated_date: server.updated_date ?? server.updatedAt,
  } as Server
}

export function toServerPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const costPerCredit = data.costPerCredit ?? data.cost_per_credit
  const valuePerCredit = data.valuePerCredit ?? data.value_per_credit
  return compactUndefined({
    name: text(data.name),
    panelLink: text(data.panelLink ?? data.panel_link),
    costPerCredit: costPerCredit === '' ? undefined : Number(costPerCredit ?? 0),
    valuePerCredit: Number(valuePerCredit || 0),
    notes: text(data.notes),
    active: data.active,
  })
}

export function normalizeSupplier(raw: unknown): Supplier {
  const supplier = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(supplier as unknown as Supplier),
    server_id: supplier.server_id ?? supplier.serverId,
    panel_login: supplier.panel_login ?? supplier.panelLogin,
    panel_link: supplier.panel_link ?? supplier.panelLink,
    cost_per_credit: supplier.cost_per_credit ?? numberOrZero(supplier.costPerCredit),
    created_date: supplier.created_date ?? supplier.createdAt,
    updated_date: supplier.updated_date ?? supplier.updatedAt,
  } as Supplier
}

export function toSupplierPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const costPerCredit = data.costPerCredit ?? data.cost_per_credit
  return compactUndefined({
    serverId: data.serverId ?? data.server_id,
    name: text(data.name),
    panelLogin: text(data.panelLogin ?? data.panel_login),
    panelLink: text(data.panelLink ?? data.panel_link),
    costPerCredit: Number(costPerCredit || 0),
    active: data.active,
  })
}

export function toCreateSupplierPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const costPerCredit = data.costPerCredit ?? data.cost_per_credit
  return compactUndefined({
    serverId: data.serverId ?? data.server_id,
    name: text(data.name),
    panelLogin: text(data.panelLogin ?? data.panel_login),
    panelLink: text(data.panelLink ?? data.panel_link),
    costPerCredit: costPerCredit === '' ? undefined : Number(costPerCredit ?? 0),
  })
}

export function toUpdateSupplierPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const costPerCredit = data.costPerCredit ?? data.cost_per_credit
  return compactUndefined({
    name: text(data.name),
    panelLogin: text(data.panelLogin ?? data.panel_login),
    panelLink: text(data.panelLink ?? data.panel_link),
    costPerCredit: costPerCredit === '' ? undefined : Number(costPerCredit ?? 0),
    active: data.active,
  })
}

export function normalizeResellerServer(raw: unknown): ResellerServer {
  const record = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(record as unknown as ResellerServer),
    reseller_id: record.reseller_id ?? record.resellerId,
    server_id: record.server_id ?? record.serverId,
    supplier_id: record.supplier_id ?? record.supplierId ?? null,
    server_fornecedor_id: record.server_fornecedor_id ?? record.serverFornecedorId ?? null,
    value_per_credit: record.value_per_credit ?? numberOrZero(record.valuePerCredit),
    reseller: record.reseller ? normalizeUser(record.reseller) : undefined,
    server: record.server ? normalizeServer(record.server) : undefined,
    supplier: record.supplier ? normalizeSupplier(record.supplier) : undefined,
    server_fornecedor: record.serverFornecedor
      ? normalizeServerFornecedor(record.serverFornecedor)
      : record.server_fornecedor
        ? normalizeServerFornecedor(record.server_fornecedor)
        : undefined,
    created_date: record.created_date ?? record.createdAt,
    updated_date: record.updated_date ?? record.updatedAt,
  } as ResellerServer
}

export function toResellerServerPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const valuePerCredit = data.valuePerCredit ?? data.value_per_credit
  return compactUndefined({
    resellerId: data.resellerId ?? data.reseller_id,
    serverId: data.serverId ?? data.server_id,
    login: text(data.login),
    valuePerCredit: valuePerCredit === '' ? undefined : Number(valuePerCredit ?? 0),
    active: data.active,
    supplierId: data.supplierId ?? data.supplier_id,
    serverFornecedorId: data.serverFornecedorId ?? data.server_fornecedor_id,
  })
}

export function toCreateResellerServerPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const valuePerCredit = data.valuePerCredit ?? data.value_per_credit
  return compactUndefined({
    resellerId: data.resellerId ?? data.reseller_id,
    serverId: data.serverId ?? data.server_id,
    login: text(data.login),
    valuePerCredit: Number(valuePerCredit || 0),
    supplierId: data.supplierId ?? data.supplier_id,
    serverFornecedorId: data.serverFornecedorId ?? data.server_fornecedor_id,
  })
}

export function normalizeCreditRequest(raw: unknown): CreditRequest {
  const request = (isDict(raw) ? raw : {}) as Dict
  const snapshot = (isDict(request.server_snapshot) ? request.server_snapshot : request.serverSnapshot) as Dict | undefined
  const serverSnapshot = isDict(snapshot) ? snapshot : {}
  return {
    ...(request as unknown as CreditRequest),
    reseller_id: request.reseller_id ?? request.resellerId,
    reseller: request.reseller ? normalizeUser(request.reseller) : undefined,
    server_id: request.server_id ?? request.serverId,
    server_snapshot: {
      ...serverSnapshot,
      panel_link: serverSnapshot.panel_link ?? serverSnapshot.panelLink,
      value_per_credit: numberOrZero(serverSnapshot.value_per_credit ?? serverSnapshot.valuePerCredit),
    },
    requested_credits: numberOrZero(request.requested_credits ?? request.requestedCredits),
    total_value: numberOrZero(request.total_value ?? request.totalValue),
    proof_url: request.proof_url ?? request.proofUrl,
    payment_proof_url: request.payment_proof_url ?? request.proofUrl,
    proof_of_payment_url: request.proof_of_payment_url ?? request.proofUrl,
    payment_type: (request.payment_type ?? request.paymentType) as CreditRequest['payment_type'],
    rejection_reason: request.rejection_reason ?? request.rejectionReason,
    rejection_image_url: request.rejection_image_url ?? request.rejectionImageUrl,
    invoice_id: request.invoice_id ?? request.invoiceId,
    created_date: request.created_date ?? request.createdAt,
    updated_date: request.updated_date ?? request.updatedAt,
  } as CreditRequest
}

export function toCreditRequestPayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  const requestedCredits = data.requestedCredits ?? data.requested_credits
  return compactUndefined({
    serverId: data.serverId ?? data.server_id,
    requestedCredits: requestedCredits === '' || requestedCredits === undefined ? undefined : Number(requestedCredits),
    login: text(data.login),
    proofUrl: data.proofUrl ?? data.proof_url ?? data.proof_of_payment_url ?? data.payment_proof_url,
    notes: text(data.notes),
    paymentType: data.paymentType ?? data.payment_type,
  })
}

export function normalizeTemplate(raw: unknown): MessageTemplate {
  const template = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(template as unknown as MessageTemplate),
    admin_id: template.admin_id ?? template.adminId,
    message_content: template.message_content ?? template.content,
    is_active: template.is_active ?? template.active,
    created_date: template.created_date ?? template.createdAt,
    updated_date: template.updated_date ?? template.updatedAt,
  } as MessageTemplate
}

export function toTemplatePayload(raw: unknown) {
  const data = (isDict(raw) ? raw : {}) as Dict
  return compactUndefined({
    name: text(data.name),
    type: data.type,
    content: data.content ?? data.message_content,
    active: data.active ?? data.is_active,
  })
}

export function normalizeInvoice(raw: unknown): Invoice {
  const invoice = (isDict(raw) ? raw : {}) as Dict
  const requests = Array.isArray(invoice.requests) ? invoice.requests.map(normalizeCreditRequest) : []
  const createdAt = invoice.created_date ?? invoice.createdAt
  const dueDate = invoice.due_date ?? invoice.dueDate
  const paidAt = invoice.paid_date ?? invoice.paidAt
  const totalCredits =
    invoice.total_credits ?? requests.reduce((sum, request) => sum + Number(request.requested_credits ?? 0), 0)
  const reseller = isDict(invoice.reseller) ? invoice.reseller : {}

  return {
    ...(invoice as unknown as Invoice),
    requests,
    invoice_number: invoice.invoice_number ?? `FAT-${String(invoice.id || '').slice(-8).toUpperCase()}`,
    reseller_id: invoice.reseller_id ?? invoice.resellerId,
    reseller_name: invoice.reseller_name ?? reseller.name ?? reseller.email,
    total_value: invoice.total_value ?? numberOrZero(invoice.totalValue),
    total_credits: totalCredits,
    request_count: invoice.request_count ?? requests.length,
    due_date: dueDate,
    paid_date: paidAt,
    proof_url: invoice.proof_url ?? invoice.proofUrl,
    created_date: createdAt,
    updated_date: invoice.updated_date ?? invoice.updatedAt,
  } as Invoice
}

export function normalizeChatMessage(raw: unknown): ChatMessage {
  const message = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(message as unknown as ChatMessage),
    content: (message.content ?? message.message_content ?? '') as string,
    message_content: (message.message_content ?? message.content) as string | undefined,
    senderId: (message.senderId ?? message.sender_id ?? message.authorId) as string | undefined,
    sender_id: (message.sender_id ?? message.senderId ?? message.authorId) as string | undefined,
    senderName: (message.senderName ?? message.sender_name ?? message.authorName) as string | undefined,
    sender_name: (message.sender_name ?? message.senderName ?? message.authorName) as string | undefined,
    senderRole: (message.senderRole ?? message.sender_role ?? message.authorRole) as string | undefined,
    sender_role: (message.sender_role ?? message.senderRole ?? message.authorRole) as string | undefined,
    senderImageUrl: (message.senderImageUrl ?? message.sender_image_url ?? message.authorImageUrl) as string | undefined,
    sender_image_url: (message.sender_image_url ?? message.senderImageUrl ?? message.authorImageUrl) as string | undefined,
    resellerId: (message.resellerId ?? message.reseller_id) as string | undefined,
    reseller_id: (message.reseller_id ?? message.resellerId) as string | undefined,
    createdAt: (message.createdAt ?? message.created_date) as string | undefined,
    created_date: (message.created_date ?? message.createdAt) as string | undefined,
  } as ChatMessage
}

export function normalizeAuditLog(raw: unknown): AuditLog {
  const log = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(log as unknown as AuditLog),
    user_name: (log.user_name ?? log.userName) as string | undefined,
    userName: (log.userName ?? log.user_name) as string | undefined,
    credit_request_id: (log.credit_request_id ?? log.creditRequestId) as string | undefined,
    creditRequestId: (log.creditRequestId ?? log.credit_request_id) as string | undefined,
    created_date: (log.created_date ?? log.createdAt) as string | undefined,
    createdAt: (log.createdAt ?? log.created_date) as string | undefined,
  } as AuditLog
}

export function normalizeNotification(raw: unknown): NotificationItem {
  const notification = (isDict(raw) ? raw : {}) as Dict
  const data = isDict(notification.data) ? notification.data : {}
  const createdAt = notification.createdAt ?? notification.created_date
  const isRead = Boolean(notification.isRead ?? notification.read ?? false)

  return {
    ...(notification as unknown as NotificationItem),
    type: notification.type as string | undefined,
    message: (notification.message ?? '') as string,
    related_entity_id: (notification.related_entity_id ?? notification.relatedEntityId) as string | null | undefined,
    credit_request_id: (notification.credit_request_id ?? notification.creditRequestId) as string | null | undefined,
    read: isRead,
    isRead,
    createdAt: createdAt ? String(createdAt) : undefined,
    created_date: createdAt ? String(createdAt) : undefined,
    url: (notification.url ?? data.url) as string | undefined,
  } as NotificationItem
}

export function normalizeFornecedor(raw: unknown): Fornecedor {
  const f = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(f as unknown as Fornecedor),
    active: f.active !== false,
    _count: isDict(f._count) ? { server_fornecedores: Number(f._count.serverFornecedores ?? f._count.server_fornecedores ?? 0) } : undefined,
    created_date: f.created_date ?? f.createdAt,
    updated_date: f.updated_date ?? f.updatedAt,
  } as Fornecedor
}

export function normalizeServerFornecedor(raw: unknown): ServerFornecedor {
  const sf = (isDict(raw) ? raw : {}) as Dict
  return {
    ...(sf as unknown as ServerFornecedor),
    server_id: sf.server_id ?? sf.serverId,
    fornecedor_id: sf.fornecedor_id ?? sf.fornecedorId,
    cost_per_credit: sf.cost_per_credit ?? numberOrZero(sf.costPerCredit),
    panel_login: sf.panel_login ?? sf.panelLogin,
    panel_link: sf.panel_link ?? sf.panelLink,
    panel_password: sf.panel_password ?? sf.panelPassword,
    server: sf.server ? normalizeServer(sf.server) : undefined,
    fornecedor: sf.fornecedor ? normalizeFornecedor(sf.fornecedor) : undefined,
    created_date: sf.created_date ?? sf.createdAt,
    updated_date: sf.updated_date ?? sf.updatedAt,
  } as ServerFornecedor
}
