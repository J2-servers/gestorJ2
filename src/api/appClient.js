import { remoteClient } from './remoteClient';

const unsupported = (name) => async () => {
  throw new Error(`${name} ainda nao possui endpoint no backend proprio.`);
};

const sortAndLimit = (records = [], sort, limit) => {
  const output = [...records];
  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    output.sort((a, b) => {
      const av = Date.parse(a?.[field]) || a?.[field] || '';
      const bv = Date.parse(b?.[field]) || b?.[field] || '';
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (desc ? -1 : 1);
    });
  }
  return typeof limit === 'number' ? output.slice(0, limit) : output;
};

const matches = (record, criteria = {}) =>
  Object.entries(criteria).every(([key, expected]) => {
    if (expected === undefined || expected === null || expected === '') return true;
    const actual = record?.[key];
    return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
  });

const listFrom = (loader) => async (sort, limit) => sortAndLimit(await loader(), sort, limit);
const filterFrom = (loader) => async (criteria = {}, sort, limit) =>
  sortAndLimit((await loader()).filter((record) => matches(record, criteria)), sort, limit);
const getFrom = (loader, label) => async (id) => {
  const record = (await loader()).find((item) => item.id === id);
  if (!record) throw new Error(`${label} nao encontrado`);
  return record;
};

const normalizeUserPayload = (data = {}) => ({
  email: data.email,
  name: data.name ?? data.full_name ?? data.email,
  phone: data.phone,
  password: data.password,
  status: data.status,
  paymentType: data.paymentType ?? data.payment_type,
  parentId: data.parentId ?? data.parent_user_id,
});

const normalizeResellerServerPayload = (data = {}) => ({
  resellerId: data.resellerId ?? data.reseller_id,
  serverId: data.serverId ?? data.server_id,
  login: data.login,
  valuePerCredit: Number(data.valuePerCredit ?? data.value_per_credit ?? 0),
  active: data.active,
});

const entityApis = {
  User: {
    list: listFrom(remoteClient.users.list),
    filter: filterFrom(remoteClient.users.list),
    get: getFrom(remoteClient.users.list, 'Usuario'),
    create: (data) => remoteClient.users.create(normalizeUserPayload(data)),
    update: (id, data) => remoteClient.users.update(id, normalizeUserPayload(data)),
    delete: remoteClient.users.remove,
  },
  CreditRequest: {
    async list(sort = '-created_date', limit = 50) {
      const result = await remoteClient.creditRequests.list(null, limit);
      return sortAndLimit(result.data || [], sort, limit);
    },
    async filter(criteria = {}, sort = '-created_date', limit = 50) {
      const result = await remoteClient.creditRequests.list(null, limit);
      return sortAndLimit((result.data || []).filter((record) => matches(record, criteria)), sort, limit);
    },
    get: remoteClient.creditRequests.getOne,
    create: remoteClient.creditRequests.create,
    async update(id, data = {}) {
      if (data.status === 'analyzing') return remoteClient.creditRequests.analyzing(id);
      if (data.status === 'recharged') return remoteClient.creditRequests.approve(id, data.notes);
      if (data.status === 'rejected') return remoteClient.creditRequests.reject(id, data.rejection_reason || data.reason || 'Rejeitado');
      if (data.status === 'canceled') return remoteClient.creditRequests.cancel(id);
      if (data.invoice_id || data.invoiceId) return remoteClient.creditRequests.getOne(id);
      throw new Error('Atualizacao parcial de pedido nao suportada. Use acoes de status do backend.');
    },
    delete: unsupported('CreditRequest.delete'),
  },
  Server: {
    list: listFrom(remoteClient.servers.list),
    filter: filterFrom(remoteClient.servers.list),
    get: getFrom(remoteClient.servers.list, 'Servidor'),
    create: remoteClient.servers.create,
    update: remoteClient.servers.update,
    delete: remoteClient.servers.remove,
    bulkCreate: async (items = []) => Promise.all(items.map((item) => remoteClient.servers.create(item))),
  },
  ServerPriceHistory: {
    async list(sort, limit) {
      const servers = await remoteClient.servers.list();
      const records = (await Promise.all(servers.map((server) => remoteClient.servers.priceHistory(server.id).catch(() => [])))).flat();
      return sortAndLimit(records, sort, limit);
    },
    async filter(criteria = {}, sort, limit) {
      const serverId = criteria.server_id ?? criteria.serverId;
      const records = serverId ? await remoteClient.servers.priceHistory(serverId).catch(() => []) : await this.list();
      return sortAndLimit(records.filter((record) => matches(record, criteria)), sort, limit);
    },
    get: unsupported('ServerPriceHistory.get'),
    create: unsupported('ServerPriceHistory.create'),
    update: unsupported('ServerPriceHistory.update'),
    delete: unsupported('ServerPriceHistory.delete'),
  },
  ServerGroup: {
    async list(sort, limit) {
      const servers = await remoteClient.servers.list();
      const groups = Object.values(servers.reduce((acc, server) => {
        const key = String(server.name || 'Outros').split(/[\s-]+/)[0] || 'Outros';
        if (!acc[key]) {
          acc[key] = {
            id: `group-${key.toLowerCase()}`,
            name: key,
            color: '#8b5cf6',
            owner_id: server.owner_id,
            server_ids: [],
            created_date: server.created_date,
          };
        }
        acc[key].server_ids.push(server.id);
        return acc;
      }, {}));
      return sortAndLimit(groups, sort, limit);
    },
    async filter(criteria = {}, sort, limit) {
      const groups = await this.list(sort, limit);
      return groups.filter((group) => matches(group, criteria));
    },
    get: unsupported('ServerGroup.get'),
    create: unsupported('ServerGroup.create'),
    update: unsupported('ServerGroup.update'),
    delete: unsupported('ServerGroup.delete'),
  },
  ResellerServer: {
    list: listFrom(remoteClient.resellerServers.list),
    filter: filterFrom(remoteClient.resellerServers.list),
    get: getFrom(remoteClient.resellerServers.list, 'Vinculo de servidor'),
    create: (data) => remoteClient.resellerServers.create(normalizeResellerServerPayload(data)),
    update: (id, data) => remoteClient.resellerServers.update(id, normalizeResellerServerPayload(data)),
    delete: remoteClient.resellerServers.remove,
  },
  Settings: {
    async load() {
      try {
        return await remoteClient.settings.get();
      } catch {
        return remoteClient.settings.getPublic();
      }
    },
    async list() {
      return [await this.load()];
    },
    async filter() {
      return [await this.load()];
    },
    async get() {
      return this.load();
    },
    async create(data) {
      return remoteClient.settings.update(data);
    },
    async update(_id, data) {
      return remoteClient.settings.update(data);
    },
    delete: unsupported('Settings.delete'),
  },
  MessageTemplate: {
    list: listFrom(remoteClient.templates.list),
    filter: filterFrom(remoteClient.templates.list),
    get: getFrom(remoteClient.templates.list, 'Template'),
    create: remoteClient.templates.create,
    update: remoteClient.templates.update,
    delete: remoteClient.templates.remove,
  },
  Notification: {
    list: listFrom(remoteClient.notifications.list),
    filter: filterFrom(remoteClient.notifications.list),
    get: getFrom(remoteClient.notifications.list, 'Notificacao'),
    create: unsupported('Notification.create'),
    update: unsupported('Notification.update'),
    delete: unsupported('Notification.delete'),
  },
  Invoice: {
    list: listFrom(remoteClient.invoices.list),
    filter: filterFrom(remoteClient.invoices.list),
    get: remoteClient.invoices.getOne,
    create: (data) => remoteClient.invoices.generate(data.reseller_id ?? data.resellerId),
    async update(id, data = {}) {
      if (data.status === 'paid') return remoteClient.invoices.markPaid(id, data.proof_url ?? data.proofUrl);
      throw new Error('Atualizacao de fatura nao suportada para este status.');
    },
    resend: remoteClient.invoices.resend,
    delete: unsupported('Invoice.delete'),
  },
  AuditLog: {
    list: listFrom(remoteClient.audit.list),
    filter: filterFrom(remoteClient.audit.list),
    get: getFrom(remoteClient.audit.list, 'Auditoria'),
    create: unsupported('AuditLog.create'),
    update: unsupported('AuditLog.update'),
    delete: unsupported('AuditLog.delete'),
  },
  WhatsAppLog: {
    list: (sort, limit) => remoteClient.whatsapp.logs(limit).then((logs) => sortAndLimit(logs, sort, limit)),
    filter: async (criteria = {}, sort, limit) => {
      const logs = await remoteClient.whatsapp.logs(limit);
      return sortAndLimit(logs.filter((record) => matches(record, criteria)), sort, limit);
    },
    get: async (id) => getFrom(() => remoteClient.whatsapp.logs(500), 'Log de WhatsApp')(id),
    create: unsupported('WhatsAppLog.create'),
    update: unsupported('WhatsAppLog.update'),
    delete: unsupported('WhatsAppLog.delete'),
  },
};

const emptyEntity = (name) => ({
  list: async () => [],
  filter: async () => [],
  get: unsupported(`${name}.get`),
  create: unsupported(`${name}.create`),
  update: unsupported(`${name}.update`),
  delete: unsupported(`${name}.delete`),
  bulkCreate: unsupported(`${name}.bulkCreate`),
});

const entityNames = [
  'ApprovalStage',
  'AuditLog',
  'CreditRequest',
  'Invoice',
  'Message',
  'MessageTemplate',
  'Notification',
  'ResellerServer',
  'Server',
  'ServerAlert',
  'ServerGroup',
  'ServerPriceHistory',
  'Settings',
  'User',
  'WhatsAppChat',
  'WhatsAppLog',
  'WhatsAppMessage',
];

const entities = Object.fromEntries(entityNames.map((name) => [name, entityApis[name] || emptyEntity(name)]));
entities.Query = {
  async raw() {
    const [users, servers, resellerServers, settings, creditRequests] = await Promise.all([
      remoteClient.users.list().catch(() => []),
      remoteClient.servers.list().catch(() => []),
      remoteClient.resellerServers.list().catch(() => []),
      remoteClient.settings.get().then((item) => [item]).catch(() => []),
      remoteClient.creditRequests.list(null, 200).then((result) => result.data || []).catch(() => []),
    ]);
    return { User: users, Server: servers, ResellerServer: resellerServers, Settings: settings, CreditRequest: creditRequests };
  },
};

const auth = {
  me: remoteClient.auth.me,
  updateMe: remoteClient.users.updateMe,
  logout: remoteClient.auth.logout,
  redirectToLogin() {
    window.location.assign('/Login');
  },
};

const Core = {
  async UploadFile({ file }) {
    const uploaded = await remoteClient.uploads.upload(file);
    return { ...uploaded, file_url: uploaded.url ?? uploaded.fileUrl };
  },
};

const functions = {
  async invoke(name, payload = {}) {
    if (name === 'broadcastWhatsApp') {
      const result = await remoteClient.whatsapp.broadcast({
        message: payload.message,
        userIds: payload.userIds ?? payload.user_ids ?? payload.reseller_ids,
        targetType: payload.targetType ?? payload.target_type,
      });
      return {
        ...result,
        sent: result.sent ?? result.queued ?? 0,
        failed: result.failed ?? result.skippedNoPhone ?? 0,
        total: result.total ?? 0,
        details: result.details ?? [],
      };
    }
    if (name === 'ensureResellerParent') return { success: true, handledByBackend: true };
    throw new Error(`Funcao ${name} nao existe no backend proprio.`);
  },
};

export const appClient = {
  auth,
  users: {
    inviteUser: async (email) => remoteClient.users.create({ email, name: email }),
  },
  entities,
  integrations: { Core },
  functions,
  appLogs: {
    async logUserInApp() {
      return { success: true };
    },
  },
};
