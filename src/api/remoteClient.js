import { httpClient } from './httpClient';

function normalizeUser(user) {
  if (!user) return user;
  const role = user.role === 'reseller' ? 'user' : user.role;
  return {
    ...user,
    role,
    full_name: user.full_name ?? user.name,
    parent_user_id: user.parent_user_id ?? user.parentId,
    payment_type: user.payment_type ?? user.paymentType,
    created_date: user.created_date ?? user.createdAt,
    updated_date: user.updated_date ?? user.updatedAt,
  };
}

function normalizeSettings(settings) {
  if (!settings) return settings;
  return {
    ...settings,
    admin_id: settings.admin_id ?? settings.adminId,
    company_name: settings.company_name ?? settings.companyName,
    cnpj: settings.cnpj,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    favicon_url: settings.favicon_url ?? settings.faviconUrl,
    sidebar_logo_url: settings.sidebar_logo_url ?? settings.sidebarLogoUrl,
    profile_icon_url: settings.profile_icon_url ?? settings.profileIconUrl,
    login_logo_url: settings.login_logo_url ?? settings.loginLogoUrl,
    login_background_url: settings.login_background_url ?? settings.loginBackgroundUrl,
    admin_whatsapp: settings.admin_whatsapp ?? settings.adminWhatsapp,
    whatsapp_provider: settings.whatsapp_provider ?? settings.whatsappProvider,
    evolution_api_url: settings.evolution_api_url ?? settings.evolutionApiUrl,
    evolution_instance: settings.evolution_instance ?? settings.evolutionInstance,
    evolution_instance_id: settings.evolution_instance_id ?? settings.evolutionInstance,
    evolution_api_key: settings.evolution_api_key ?? settings.evolutionApiKeyRef,
    evolution_api_key_ref: settings.evolution_api_key_ref ?? settings.evolutionApiKeyRef,
    n8n_webhook_url: settings.n8n_webhook_url ?? settings.n8nWebhookUrl,
    fcm_server_key: settings.fcm_server_key ?? settings.fcmServerKey,
    pix_keys: settings.pix_keys ?? settings.pixKeys ?? [],
  };
}

function toSettingsPayload(data = {}) {
  return {
    companyName: data.companyName ?? data.company_name,
    cnpj: data.cnpj,
    address: data.address,
    phone: data.phone,
    email: data.email,
    faviconUrl: data.faviconUrl ?? data.favicon_url,
    sidebarLogoUrl: data.sidebarLogoUrl ?? data.sidebar_logo_url,
    profileIconUrl: data.profileIconUrl ?? data.profile_icon_url,
    loginLogoUrl: data.loginLogoUrl ?? data.login_logo_url,
    loginBackgroundUrl: data.loginBackgroundUrl ?? data.login_background_url,
    adminWhatsapp: data.adminWhatsapp ?? data.admin_whatsapp,
    whatsappProvider: data.whatsappProvider ?? data.whatsapp_provider,
    evolutionApiUrl: data.evolutionApiUrl ?? data.evolution_api_url,
    evolutionInstance: data.evolutionInstance ?? data.evolution_instance ?? data.evolution_instance_id,
    evolutionApiKeyRef: data.evolutionApiKeyRef ?? data.evolution_api_key_ref ?? data.evolution_api_key,
    n8nWebhookUrl: data.n8nWebhookUrl ?? data.n8n_webhook_url,
    fcmServerKey: data.fcmServerKey ?? data.fcm_server_key,
    pixKeys: data.pixKeys ?? data.pix_keys,
  };
}

function compactUndefined(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function normalizeTemplate(template) {
  if (!template) return template;
  return {
    ...template,
    admin_id: template.admin_id ?? template.adminId,
    message_content: template.message_content ?? template.content,
    is_active: template.is_active ?? template.active,
    created_date: template.created_date ?? template.createdAt,
    updated_date: template.updated_date ?? template.updatedAt,
  };
}

function normalizeCreditRequest(request) {
  if (!request) return request;
  const serverSnapshot = request.server_snapshot ?? request.serverSnapshot ?? {};
  return {
    ...request,
    reseller_id: request.reseller_id ?? request.resellerId,
    server_id: request.server_id ?? request.serverId,
    server_snapshot: {
      ...serverSnapshot,
      panel_link: serverSnapshot.panel_link ?? serverSnapshot.panelLink,
      value_per_credit: serverSnapshot.value_per_credit ?? serverSnapshot.valuePerCredit,
    },
    requested_credits: request.requested_credits ?? request.requestedCredits,
    total_value: request.total_value ?? Number(request.totalValue ?? 0),
    proof_of_payment_url: request.proof_of_payment_url ?? request.proofUrl,
    payment_type: request.payment_type ?? request.paymentType,
    rejection_reason: request.rejection_reason ?? request.rejectionReason,
    current_stage: request.current_stage ?? request.currentStage,
    has_master: request.has_master ?? request.hasMaster,
    invoice_id: request.invoice_id ?? request.invoiceId,
    // fornecedor a atender (resolvido pelo backend; null p/ revendedor) — #3
    supplier: (request.supplier ?? request.supplierSnapshot)
      ? normalizeSupplier(request.supplier ?? request.supplierSnapshot)
      : null,
    created_date: request.created_date ?? request.createdAt,
    updated_date: request.updated_date ?? request.updatedAt,
  };
}

function normalizeServer(server) {
  if (!server) return server;
  return {
    ...server,
    owner_id: server.owner_id ?? server.ownerId,
    panel_link: server.panel_link ?? server.panelLink,
    cost_per_credit: server.cost_per_credit ?? Number(server.costPerCredit ?? 0),
    value_per_credit: server.value_per_credit ?? Number(server.valuePerCredit ?? 0),
    created_date: server.created_date ?? server.createdAt,
    updated_date: server.updated_date ?? server.updatedAt,
  };
}

function normalizeSupplier(s) {
  if (!s) return s;
  return {
    ...s,
    server_id: s.server_id ?? s.serverId,
    panel_login: s.panel_login ?? s.panelLogin,
    panel_link: s.panel_link ?? s.panelLink,
    cost_per_credit: s.cost_per_credit ?? Number(s.costPerCredit ?? 0),
    created_date: s.created_date ?? s.createdAt,
  };
}

function normalizeResellerServer(record) {
  if (!record) return record;
  return {
    ...record,
    reseller_id: record.reseller_id ?? record.resellerId,
    server_id: record.server_id ?? record.serverId,
    supplier_id: record.supplier_id ?? record.supplierId ?? null,
    supplier: record.supplier ? normalizeSupplier(record.supplier) : null,
    value_per_credit: record.value_per_credit ?? Number(record.valuePerCredit ?? 0),
    created_date: record.created_date ?? record.createdAt,
    updated_date: record.updated_date ?? record.updatedAt,
  };
}

function normalizeInvoice(invoice) {
  if (!invoice) return invoice;
  const requests = Array.isArray(invoice.requests) ? invoice.requests.map(normalizeCreditRequest) : [];
  const createdAt = invoice.created_date ?? invoice.createdAt;
  const dueDate = invoice.due_date ?? invoice.dueDate;
  const paidAt = invoice.paid_date ?? invoice.paidAt;
  const totalCredits = invoice.total_credits ?? requests.reduce((sum, request) => sum + Number(request.requested_credits ?? 0), 0);
  const periodStart = invoice.period_start ?? requests.at(-1)?.created_date ?? createdAt;
  const periodEnd = invoice.period_end ?? requests[0]?.created_date ?? createdAt;
  const reseller = invoice.reseller || {};

  return {
    ...invoice,
    requests,
    invoice_number: invoice.invoice_number ?? `FAT-${String(invoice.id || '').slice(-8).toUpperCase()}`,
    reseller_id: invoice.reseller_id ?? invoice.resellerId,
    reseller_name: invoice.reseller_name ?? reseller.name ?? reseller.email,
    total_value: invoice.total_value ?? Number(invoice.totalValue ?? 0),
    total_credits: totalCredits,
    request_count: invoice.request_count ?? requests.length,
    period_start: periodStart,
    period_end: periodEnd,
    due_date: dueDate,
    paid_date: paidAt,
    proof_url: invoice.proof_url ?? invoice.proofUrl,
    created_date: createdAt,
    updated_date: invoice.updated_date ?? invoice.updatedAt,
  };
}

function normalizeWhatsAppLog(log) {
  if (!log) return log;
  return {
    ...log,
    message_preview: log.message_preview ?? log.messagePreview,
    response_data: log.response_data ?? log.responseData,
    related_entity_id: log.related_entity_id ?? log.relatedEntityId,
    credit_request_id: log.credit_request_id ?? log.creditRequestId,
    execution_time_ms: log.execution_time_ms ?? log.executionTimeMs,
    created_date: log.created_date ?? log.createdAt,
    updated_date: log.updated_date ?? log.updatedAt,
  };
}

function normalizeServerPriceHistory(record) {
  if (!record) return record;
  return {
    ...record,
    server_id: record.server_id ?? record.serverId,
    old_price: record.old_price ?? (record.oldPrice == null ? null : Number(record.oldPrice)),
    new_price: record.new_price ?? Number(record.newPrice ?? 0),
    changed_by_id: record.changed_by_id ?? record.changedById,
    created_date: record.created_date ?? record.createdAt,
  };
}

function toCreditRequestPayload(data = {}) {
  return compactUndefined({
    serverId: data.serverId ?? data.server_id,
    requestedCredits: data.requestedCredits ?? data.requested_credits,
    login: data.login,
    proofUrl: data.proofUrl ?? data.proof_of_payment_url,
    notes: data.notes,
    paymentType: data.paymentType ?? data.payment_type,
  });
}

function toServerPayload(data = {}) {
  return compactUndefined({
    name: data.name,
    panelLink: data.panelLink ?? data.panel_link,
    costPerCredit: Number(data.costPerCredit ?? data.cost_per_credit ?? 0),
    valuePerCredit: Number(data.valuePerCredit ?? data.value_per_credit ?? 0),
  });
}

function toTemplatePayload(data = {}) {
  return compactUndefined({
    name: data.name,
    type: data.type,
    content: data.content ?? data.message_content,
    active: data.active ?? data.is_active,
  });
}

export const remoteClient = {
  auth: {
    bootstrapStatus() {
      return httpClient.get('/auth/bootstrap/status');
    },

    async bootstrap(data) {
      const result = await httpClient.post('/auth/bootstrap', data);
      httpClient.setToken(result.accessToken);
      return normalizeUser(result.user);
    },

    async login(email, password) {
      const result = await httpClient.post('/auth/login', { email, password });
      httpClient.setToken(result.accessToken);
      return normalizeUser(result.user);
    },

    async register(data) {
      const result = await httpClient.post('/auth/register', data);
      httpClient.setToken(result.accessToken);
      return normalizeUser(result.user);
    },

    async me() {
      return normalizeUser(await httpClient.get('/users/me'));
    },

    async logout() {
      try { await httpClient.post('/auth/logout', {}); } catch { /* ignore */ }
      httpClient.clearToken();
    },

    async refresh() {
      return httpClient._tryRefresh();
    },
  },

  creditRequests: {
    async list(cursor, limit) {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      const result = await httpClient.get(`/credit-requests${qs ? `?${qs}` : ''}`);
      if (Array.isArray(result?.data)) {
        return { ...result, data: result.data.map(normalizeCreditRequest) };
      }
      return result;
    },

    async getOne(id) {
      return normalizeCreditRequest(await httpClient.get(`/credit-requests/${id}`));
    },

    async create(data) {
      return normalizeCreditRequest(await httpClient.post('/credit-requests', toCreditRequestPayload(data)));
    },

    async cancel(id) {
      return normalizeCreditRequest(await httpClient.patch(`/credit-requests/${id}/cancel`));
    },

    async analyzing(id) {
      return normalizeCreditRequest(await httpClient.patch(`/credit-requests/${id}/analyzing`));
    },

    async approve(id, notes) {
      return normalizeCreditRequest(await httpClient.patch(`/credit-requests/${id}/approve`, { notes }));
    },

    async reject(id, reason, rejectionImageUrl) {
      return normalizeCreditRequest(await httpClient.patch(`/credit-requests/${id}/reject`, { reason, rejectionImageUrl }));
    },

    listMessages(requestId) {
      return httpClient.get(`/credit-requests/${requestId}/messages`);
    },

    sendMessage(requestId, content) {
      return httpClient.post(`/credit-requests/${requestId}/messages`, { content });
    },
  },

  notifications: {
    list() {
      return httpClient.get('/notifications');
    },

    markRead(id) {
      return httpClient.patch(`/notifications/${id}/read`);
    },

    markAllRead() {
      return httpClient.patch('/notifications/read-all');
    },

    subscribePush(subscription) {
      return httpClient.post('/notifications/push-subscriptions', subscription);
    },
  },

  users: {
    async list() {
      const users = await httpClient.get('/users');
      return Array.isArray(users) ? users.map(normalizeUser) : users;
    },

    async create(data) {
      return normalizeUser(await httpClient.post('/users', data));
    },

    async update(id, data) {
      return normalizeUser(await httpClient.patch(`/users/${id}`, data));
    },

    async updateMe(data) {
      return normalizeUser(await httpClient.patch('/users/me', data));
    },

    async remove(id) {
      return normalizeUser(await httpClient.delete(`/users/${id}`));
    },
  },

  servers: {
    async list() {
      const servers = await httpClient.get('/servers');
      return Array.isArray(servers) ? servers.map(normalizeServer) : servers;
    },

    async create(data) {
      return normalizeServer(await httpClient.post('/servers', toServerPayload(data)));
    },

    async update(id, data) {
      return normalizeServer(await httpClient.patch(`/servers/${id}`, toServerPayload(data)));
    },

    async remove(id) {
      return normalizeServer(await httpClient.delete(`/servers/${id}`));
    },

    async priceHistory(id) {
      const records = await httpClient.get(`/servers/${id}/price-history`);
      return Array.isArray(records) ? records.map(normalizeServerPriceHistory) : records;
    },
  },

  resellerServers: {
    async list() {
      const records = await httpClient.get('/reseller-servers');
      return Array.isArray(records) ? records.map(normalizeResellerServer) : records;
    },

    async create(data) {
      return normalizeResellerServer(await httpClient.post('/reseller-servers', data));
    },

    async update(id, data) {
      return normalizeResellerServer(await httpClient.patch(`/reseller-servers/${id}`, data));
    },

    async remove(id) {
      return normalizeResellerServer(await httpClient.delete(`/reseller-servers/${id}`));
    },
  },

  suppliers: {
    async list(serverId) {
      const qs = serverId ? `?serverId=${encodeURIComponent(serverId)}` : '';
      const records = await httpClient.get(`/suppliers${qs}`);
      return Array.isArray(records) ? records.map(normalizeSupplier) : records;
    },
    async create(data) {
      return normalizeSupplier(await httpClient.post('/suppliers', {
        serverId: data.serverId ?? data.server_id,
        name: data.name,
        panelLogin: data.panelLogin ?? data.panel_login,
        panelLink: data.panelLink ?? data.panel_link,
        costPerCredit: Number(data.costPerCredit ?? data.cost_per_credit ?? 0),
      }));
    },
    async update(id, data) {
      const payload = {};
      if (data.name !== undefined) payload.name = data.name;
      if ((data.panelLogin ?? data.panel_login) !== undefined) payload.panelLogin = data.panelLogin ?? data.panel_login;
      if ((data.panelLink ?? data.panel_link) !== undefined) payload.panelLink = data.panelLink ?? data.panel_link;
      if ((data.costPerCredit ?? data.cost_per_credit) !== undefined) payload.costPerCredit = Number(data.costPerCredit ?? data.cost_per_credit);
      if (data.active !== undefined) payload.active = data.active;
      return normalizeSupplier(await httpClient.patch(`/suppliers/${id}`, payload));
    },
    async remove(id) {
      return normalizeSupplier(await httpClient.delete(`/suppliers/${id}`));
    },
  },

  settings: {
    async get() {
      return normalizeSettings(await httpClient.get('/settings'));
    },

    async getPublic() {
      return normalizeSettings(await httpClient.get('/settings/public'));
    },

    async update(data) {
      return normalizeSettings(await httpClient.patch('/settings', compactUndefined(toSettingsPayload(data))));
    },
  },

  recovery: {
    getOperationalAdmin() {
      return httpClient.get('/recovery/operational-admin');
    },

    resetCredentials({ email, password }) {
      return httpClient.patch('/recovery/operational-admin/credentials', { email, password });
    },

    changeOwnPassword(password) {
      return httpClient.patch('/recovery/me/password', { password });
    },
  },

  invoices: {
    async list() {
      const invoices = await httpClient.get('/invoices');
      return Array.isArray(invoices) ? invoices.map(normalizeInvoice) : invoices;
    },

    async getOne(id) {
      return normalizeInvoice(await httpClient.get(`/invoices/${id}`));
    },

    async generate(resellerId) {
      return normalizeInvoice(await httpClient.post('/invoices', { resellerId }));
    },

    async markPaid(id, proofUrl) {
      return normalizeInvoice(await httpClient.patch(`/invoices/${id}/pay`, { proofUrl }));
    },

    resend(id) {
      return httpClient.post(`/invoices/${id}/resend`, {});
    },
  },

  uploads: {
    upload(file) {
      const form = new FormData();
      form.append('file', file);
      return httpClient.post('/uploads', form);
    },
  },

  templates: {
    async list() {
      const templates = await httpClient.get('/message-templates');
      return Array.isArray(templates) ? templates.map(normalizeTemplate) : templates;
    },

    async create(data) {
      return normalizeTemplate(await httpClient.post('/message-templates', toTemplatePayload(data)));
    },

    async update(id, data) {
      return normalizeTemplate(await httpClient.patch(`/message-templates/${id}`, toTemplatePayload(data)));
    },

    async remove(id) {
      return normalizeTemplate(await httpClient.delete(`/message-templates/${id}`));
    },
  },

  analytics: {
    get() {
      return httpClient.get('/analytics');
    },
  },

  dashboard: {
    admin() {
      return httpClient.get('/dashboard/admin');
    },

    reseller() {
      return httpClient.get('/dashboard/reseller');
    },
  },

  whatsapp: {
    status() {
      return httpClient.get('/whatsapp/status');
    },

    qrCode() {
      return httpClient.get('/whatsapp/qr');
    },

    test(phone, message) {
      return httpClient.post('/whatsapp/test', { phone, message });
    },

    async logs(limit) {
      const logs = await httpClient.get(`/whatsapp/logs${limit ? `?limit=${limit}` : ''}`);
      return Array.isArray(logs) ? logs.map(normalizeWhatsAppLog) : logs;
    },

    queueStatus() {
      return httpClient.get('/whatsapp/queue');
    },

    retryFailed() {
      return httpClient.post('/whatsapp/queue/retry-failed', {});
    },

    clearPending() {
      return httpClient.post('/whatsapp/queue/clear-pending', {});
    },

    broadcast(data) {
      return httpClient.post('/whatsapp/broadcast', data);
    },
  },

  audit: {
    list() {
      return httpClient.get('/audit');
    },
  },

  chat: {
    threads() {
      return httpClient.get('/chat/threads');
    },
    messages(resellerId) {
      const qs = resellerId ? `?resellerId=${encodeURIComponent(resellerId)}` : '';
      return httpClient.get(`/chat/messages${qs}`);
    },
    send(content, resellerId) {
      return httpClient.post('/chat/messages', { content, ...(resellerId ? { resellerId } : {}) });
    },
  },

  maintenance: {
    overview() {
      return httpClient.get('/maintenance/overview');
    },
    systemOverview() {
      return httpClient.get('/maintenance/system-overview');
    },
    errors(limit = 100) {
      return httpClient.get(`/maintenance/errors?limit=${limit}`);
    },
    resolveError(id) {
      return httpClient.patch(`/maintenance/errors/${id}/resolve`);
    },
    clearErrors() {
      return httpClient.delete('/maintenance/errors');
    },
    scripts() {
      return httpClient.get('/maintenance/scripts');
    },
    diagnose(id) {
      return httpClient.post(`/maintenance/scripts/${id}/diagnose`, {});
    },
    apply(id) {
      return httpClient.post(`/maintenance/scripts/${id}/apply`, {});
    },
    whatsappQueue() {
      return httpClient.get('/maintenance/whatsapp-queue');
    },
    retryWhatsapp() {
      return httpClient.post('/maintenance/whatsapp-queue/retry', {});
    },
    migrations() {
      return httpClient.get('/maintenance/migrations');
    },
    deployMigrations() {
      return httpClient.post('/maintenance/migrations/deploy', {});
    },
  },
};
