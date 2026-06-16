import { remoteClient } from './remoteClient';

// Camada de compatibilidade: redireciona entidades legadas para o remoteClient real.
// Componentes que ainda importam de @/entities/* continuam funcionando.

export const User = {
  me: () => remoteClient.auth.me(),
  list: () => remoteClient.users.list(),
  get: (id) => remoteClient.users.list().then(users => (users || []).find(u => u.id === id) || null),
  create: (data) => remoteClient.users.create(data),
  update: (id, data) => remoteClient.users.update(id, data),
  delete: (id) => remoteClient.users.remove(id),
  updateMe: (data) => remoteClient.users.updateMe(data),
  logout: () => remoteClient.auth.logout(),
  redirectToLogin: () => { window.location.href = '/login'; },
};

export const CreditRequest = {
  list: (_sort, limit = 100) => remoteClient.creditRequests.list(null, limit).then(r => r?.data || []),
  filter: (filters = {}, _sort, limit = 500) =>
    remoteClient.creditRequests.list(null, limit).then(r => {
      let data = r?.data || [];
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null) data = data.filter(item => item[key] === val);
      });
      return data;
    }),
  get: (id) => remoteClient.creditRequests.list(null, 1000).then(r => (r?.data || []).find(x => x.id === id) || null),
  create: (data) => remoteClient.creditRequests.create(data),
  update: (id, data) => remoteClient.creditRequests.update(id, data),
};

export const Message = {
  filter: (filters = {}) => {
    const requestId = filters.credit_request_id;
    if (!requestId) return Promise.resolve([]);
    return remoteClient.creditRequests.listMessages(requestId);
  },
  create: (data) => {
    const requestId = data.credit_request_id;
    const content = data.message_content || data.content || '';
    return remoteClient.creditRequests.sendMessage(requestId, content);
  },
};

export const Notification = {
  list: () => remoteClient.notifications.list(),
  create: () => Promise.resolve(null), // handled server-side on message send
  filter: () => Promise.resolve([]),
};

export const AuditLog = {
  filter: async (filters = {}) => {
    const logs = await remoteClient.audit.list();
    let data = Array.isArray(logs) ? logs.map(l => ({
      ...l,
      user_name: l.userName ?? l.user_name,
      created_date: l.createdAt ?? l.created_date,
      credit_request_id: l.creditRequestId ?? l.credit_request_id,
    })) : [];
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null) data = data.filter(item => item[key] === val);
    });
    return data;
  },
};

export const Invoice = {
  list: () => remoteClient.invoices.list(),
  filter: async (filters = {}) => {
    const all = await remoteClient.invoices.list();
    let data = all || [];
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null) data = data.filter(item => item[key] === val);
    });
    return data;
  },
  create: (data) => remoteClient.invoices.generate(data.reseller_id),
  update: (id, data) => remoteClient.invoices.markPaid(id, null),
};

export const Server = {
  list: () => remoteClient.servers.list(),
  filter: async (filters = {}) => {
    const all = await remoteClient.servers.list();
    let data = all || [];
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null) data = data.filter(item => item[key] === val);
    });
    return data;
  },
  create: (data) => remoteClient.servers.create(data),
  update: (id, data) => remoteClient.servers.update(id, data),
  delete: (id) => remoteClient.servers.remove(id),
};

export const ResellerServer = {
  list: () => remoteClient.resellerServers.list(),
  filter: async (filters = {}) => {
    const all = await remoteClient.resellerServers.list();
    let data = all || [];
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null) data = data.filter(item => item[key] === val);
    });
    return data;
  },
  create: (data) => remoteClient.resellerServers.create(data),
  update: (id, data) => remoteClient.resellerServers.update(id, data),
  delete: (id) => remoteClient.resellerServers.remove(id),
};

// Entidades sem backend real — retornam vazio graciosamente
const emptyEntity = () => ({
  list: () => Promise.resolve([]),
  filter: () => Promise.resolve([]),
  get: () => Promise.resolve(null),
  create: () => Promise.resolve(null),
  update: () => Promise.resolve(null),
  delete: () => Promise.resolve(null),
});

export const ApprovalStage    = emptyEntity();
export const Query            = emptyEntity();
export const MessageTemplate  = { list: () => remoteClient.templates.list(), create: (d) => remoteClient.templates.create(d), update: (id, d) => remoteClient.templates.update(id, d), delete: (id) => remoteClient.templates.remove(id), filter: () => remoteClient.templates.list() };
export const ServerAlert      = emptyEntity();
export const ServerGroup      = emptyEntity();
export const ServerPriceHistory = emptyEntity();
export const Settings         = { list: () => remoteClient.settings.getPublic().then(s => s ? [s] : []), getPublic: () => remoteClient.settings.getPublic() };
export const WhatsAppChat     = emptyEntity();
export const WhatsAppLog      = emptyEntity();
export const WhatsAppMessage  = emptyEntity();
