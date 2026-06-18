import React, { useCallback, useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
  Users,
} from "lucide-react";

const EMPTY_SERVER = { name: "", panel_link: "", cost_per_credit: "" };
const EMPTY_SUPPLIER = { name: "", panelLogin: "", panelLink: "", costPerCredit: "" };

const isStaff = (user) => user?.role === "admin" || user?.role === "dev";

const fmtMoney = (value = 0, digits = 2) =>
  `R$ ${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

const filterGlobalServers = (servers) => {
  const global = servers.filter(
    (server) =>
      !server.owner_id ||
      server.owner_id === "" ||
      server.owner_id === "admin_global" ||
      server.owner_id === "admin",
  );
  return global.length > 0 ? global : servers;
};

function PageState({ type = "loading", text }) {
  return (
    <div className="adminservers-page">
      <div className="adminservers-state">
        {type === "loading" ? <Loader2 className="adminservers-spin" size={28} /> : <Server size={30} />}
        <strong>{type === "loading" ? "Carregando servidores" : "Acesso negado"}</strong>
        <p>{text}</p>
      </div>
      <style>{adminServersStyles}</style>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <article className="adminservers-metric">
      <div className="adminservers-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
}

function ActionButton({ children, className = "", disabled, onClick, type = "button" }) {
  return (
    <button className={`adminservers-action ${className}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function ServerCard({ onDelete, onDetail, onEdit, registrations, server }) {
  return (
    <article className="adminservers-card">
      <div className="adminservers-card-head">
        <div className="adminservers-icon">
          <Server size={18} />
        </div>
        <div>
          <h3>{server.name}</h3>
          <span>Servidor global</span>
        </div>
      </div>

      <div className="adminservers-card-data">
        <div>
          <span>Custo admin</span>
          <strong>{fmtMoney(server.cost_per_credit)}</strong>
        </div>
        <div>
          <span>Revendedores</span>
          <strong>{registrations.length}</strong>
        </div>
      </div>

      <div className="adminservers-card-actions">
        <ActionButton onClick={onDetail}>
          <Eye size={14} />
          Detalhes
        </ActionButton>
        {server.panel_link && (
          <a className="adminservers-icon-link" href={server.panel_link} rel="noopener noreferrer" target="_blank">
            <ExternalLink size={14} />
          </a>
        )}
        <ActionButton className="icon-only" onClick={() => onEdit(server)}>
          <Edit size={14} />
        </ActionButton>
        <ActionButton className="icon-only danger" onClick={() => onDelete(server)}>
          <Trash2 size={14} />
        </ActionButton>
      </div>
    </article>
  );
}

function ServerFormModal({
  editing,
  error,
  form,
  onChange,
  onClose,
  onSave,
  saving,
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="adminservers-modal small">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar servidor" : "Novo servidor"}</DialogTitle>
        </DialogHeader>
        <form className="adminservers-form" onSubmit={onSave}>
          {error && <div className="adminservers-error">{error}</div>}
          <label>
            <span>Nome do servidor *</span>
            <input
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Ex: Servidor Premium BR"
              required
              value={form.name}
            />
          </label>
          <label>
            <span>Link do painel</span>
            <input
              onChange={(event) => onChange({ ...form, panel_link: event.target.value })}
              placeholder="https://painel.exemplo.com"
              value={form.panel_link}
            />
          </label>
          <label>
            <span>Preco pago pelo admin *</span>
            <input
              min="0"
              onChange={(event) => onChange({ ...form, cost_per_credit: event.target.value })}
              placeholder="Ex: 0.030"
              required
              step="0.001"
              type="number"
              value={form.cost_per_credit}
            />
          </label>
          <div className="adminservers-form-actions">
            <ActionButton onClick={onClose}>Cancelar</ActionButton>
            <ActionButton className="primary" disabled={saving} type="submit">
              {saving ? "Salvando..." : "Salvar"}
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierForm({ form, onAdd, onChange, saving }) {
  return (
    <div className="adminservers-supplier-form">
      <input
        onChange={(event) => onChange({ ...form, name: event.target.value })}
        placeholder="Nome do fornecedor"
        value={form.name}
      />
      <input
        onChange={(event) => onChange({ ...form, panelLogin: event.target.value })}
        placeholder="Login do admin no painel"
        value={form.panelLogin}
      />
      <input
        onChange={(event) => onChange({ ...form, panelLink: event.target.value })}
        placeholder="Link do painel"
        value={form.panelLink}
      />
      <input
        min="0"
        onChange={(event) => onChange({ ...form, costPerCredit: event.target.value })}
        placeholder="Custo pago"
        step="0.001"
        type="number"
        value={form.costPerCredit}
      />
      <ActionButton className="primary" disabled={saving} onClick={onAdd}>
        <Plus size={14} />
        Adicionar fornecedor
      </ActionButton>
    </div>
  );
}

function DetailModal({
  assignSupplier,
  detailServer,
  editingPrice,
  onClose,
  removeSupplier,
  resellerServers,
  savePrice,
  savingPrice,
  savingSup,
  setEditingPrice,
  setSupForm,
  suppliers,
  supForm,
  addSupplier,
}) {
  const serverSuppliers = suppliers.filter((supplier) => supplier.server_id === detailServer.id);
  const registrations = resellerServers.filter((record) => record.server_id === detailServer.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="adminservers-modal large">
        <DialogHeader>
          <DialogTitle>{detailServer.name}</DialogTitle>
        </DialogHeader>

        <div className="adminservers-detail">
          <section>
            <div className="adminservers-section-head">
              <div className="adminservers-icon warn">
                <DollarSign size={16} />
              </div>
              <div>
                <strong>Fornecedores deste servidor</strong>
                <span>Dados ocultos para o revendedor.</span>
              </div>
            </div>

            {serverSuppliers.length === 0 ? (
              <div className="adminservers-empty-mini">Nenhum fornecedor cadastrado.</div>
            ) : (
              <div className="adminservers-supplier-list">
                {serverSuppliers.map((supplier) => (
                  <article className="adminservers-supplier" key={supplier.id}>
                    <div>
                      <strong>{supplier.name}</strong>
                      <span>Login: {supplier.panel_login} | Custo: {fmtMoney(supplier.cost_per_credit, 3)}</span>
                    </div>
                    <ActionButton className="danger compact" onClick={() => removeSupplier(supplier.id)}>
                      Remover
                    </ActionButton>
                  </article>
                ))}
              </div>
            )}

            <SupplierForm
              form={supForm}
              onAdd={() => addSupplier(detailServer.id)}
              onChange={setSupForm}
              saving={savingSup}
            />
          </section>

          <section>
            <div className="adminservers-section-head">
              <div className="adminservers-icon">
                <Users size={16} />
              </div>
              <div>
                <strong>Revendedores cadastrados</strong>
                <span>{registrations.length} vinculos neste servidor.</span>
              </div>
            </div>

            {registrations.length === 0 ? (
              <div className="adminservers-empty-mini">Nenhum revendedor cadastrado ainda.</div>
            ) : (
              <div className="adminservers-registration-list">
                {registrations.map((record, index) => (
                  <article className="adminservers-registration" key={record.id}>
                    <div className="adminservers-reg-index">{index + 1}</div>
                    <div className="adminservers-reg-main">
                      <strong>{record.reseller?.name || "Revendedor"}</strong>
                      <span>{record.reseller?.email || record.reseller_id}</span>
                      <small>Login: {record.login}</small>
                    </div>

                    <div className="adminservers-reg-price">
                      {editingPrice?.reg.id === record.id ? (
                        <div className="adminservers-price-edit">
                          <input
                            autoFocus
                            min="0"
                            onChange={(event) =>
                              setEditingPrice((current) => ({ ...current, newPrice: event.target.value }))
                            }
                            step="0.01"
                            type="number"
                            value={editingPrice.newPrice}
                          />
                          <ActionButton className="primary compact" disabled={savingPrice} onClick={savePrice}>
                            OK
                          </ActionButton>
                          <ActionButton className="compact" onClick={() => setEditingPrice(null)}>
                            X
                          </ActionButton>
                        </div>
                      ) : (
                        <>
                          <strong>{fmtMoney(record.value_per_credit, 3)}</strong>
                          <button
                            onClick={() =>
                              setEditingPrice({ reg: record, newPrice: record.value_per_credit || "" })
                            }
                            type="button"
                          >
                            Editar preco
                          </button>
                        </>
                      )}
                    </div>

                    <div className="adminservers-supplier-select">
                      <span>Fornecedor oculto</span>
                      <select
                        onChange={(event) => assignSupplier(record.id, event.target.value)}
                        value={record.supplier_id || ""}
                      >
                        <option value="">Nao vinculado</option>
                        {serverSuppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} ({supplier.panel_login})
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminServers() {
  const [user, setUser] = useState(null);
  const [servers, setServers] = useState([]);
  const [resellerServers, setResellerServers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVER);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [detailServerId, setDetailServerId] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [supForm, setSupForm] = useState(EMPTY_SUPPLIER);
  const [savingSup, setSavingSup] = useState(false);

  const loadAll = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [serverResult, resellerServerResult, supplierResult] = await Promise.all([
        remoteClient.servers.list(),
        remoteClient.resellerServers.list().catch(() => []),
        remoteClient.suppliers.list().catch(() => []),
      ]);
      setServers(serverResult || []);
      setResellerServers(resellerServerResult || []);
      setSuppliers(supplierResult || []);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      setBooting(true);
      setLoading(true);
      try {
        const currentUser = await remoteClient.auth.me();
        if (!alive) return;
        setUser(currentUser);
        if (isStaff(currentUser)) await loadAll(false);
      } finally {
        if (alive) {
          setBooting(false);
          setLoading(false);
        }
      }
    };
    boot();
    return () => {
      alive = false;
    };
  }, [loadAll]);

  const visibleServers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterGlobalServers(servers).filter((server) => !term || server.name?.toLowerCase().includes(term));
  }, [search, servers]);

  const detailServer = useMemo(
    () => servers.find((server) => server.id === detailServerId) || null,
    [detailServerId, servers],
  );

  const totalResellers = useMemo(
    () => new Set(resellerServers.map((record) => record.reseller_id)).size,
    [resellerServers],
  );

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_SERVER);
    setFormErr("");
    setShowForm(true);
  };

  const openEdit = (server) => {
    setEditing(server);
    setForm({
      name: server.name || "",
      panel_link: server.panel_link || "",
      cost_per_credit: server.cost_per_credit || "",
    });
    setFormErr("");
    setShowForm(true);
  };

  const openDetail = (server) => {
    setDetailServerId(server.id);
    setEditingPrice(null);
    setSupForm(EMPTY_SUPPLIER);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormErr("");
    if (!form.name.trim()) {
      setFormErr("Nome obrigatorio.");
      return;
    }
    const cost = Number.parseFloat(form.cost_per_credit);
    if (Number.isNaN(cost) || cost < 0) {
      setFormErr("Preco invalido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cost_per_credit: cost,
        name: form.name.trim(),
        panel_link: form.panel_link.trim(),
        value_per_credit: cost,
      };
      if (editing) await remoteClient.servers.update(editing.id, payload);
      else await remoteClient.servers.create(payload);
      setShowForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (server) => {
    const ok = window.confirm(`Excluir o servidor "${server.name}"?`);
    if (!ok) return;
    await remoteClient.servers.remove(server.id);
    await loadAll();
  };

  const handleSavePrice = async () => {
    const value = Number.parseFloat(editingPrice?.newPrice);
    if (Number.isNaN(value) || value <= 0) return;
    setSavingPrice(true);
    try {
      await remoteClient.resellerServers.update(editingPrice.reg.id, { valuePerCredit: value });
      setEditingPrice(null);
      await loadAll();
    } finally {
      setSavingPrice(false);
    }
  };

  const addSupplier = async (serverId) => {
    const cost = Number.parseFloat(supForm.costPerCredit);
    if (!supForm.name.trim() || !supForm.panelLogin.trim() || Number.isNaN(cost) || cost < 0) return;
    setSavingSup(true);
    try {
      await remoteClient.suppliers.create({
        costPerCredit: cost,
        name: supForm.name.trim(),
        panelLink: supForm.panelLink.trim() || undefined,
        panelLogin: supForm.panelLogin.trim(),
        serverId,
      });
      setSupForm(EMPTY_SUPPLIER);
      await loadAll(false);
    } finally {
      setSavingSup(false);
    }
  };

  const removeSupplier = async (id) => {
    await remoteClient.suppliers.remove(id);
    await loadAll(false);
  };

  const assignSupplier = async (regId, supplierId) => {
    await remoteClient.resellerServers.update(regId, { supplierId: supplierId || null });
    await loadAll(false);
  };

  if (booting) {
    return <PageState text="Buscando catalogo, fornecedores e vinculos." />;
  }

  if (!isStaff(user)) {
    return <PageState type="denied" text="Esta area e exclusiva para administradores." />;
  }

  return (
    <div className="adminservers-page">
      <div className="adminservers-shell">
        <section className="adminservers-hero">
          <div>
            <span>Servidores</span>
            <h1>Catalogo admin</h1>
            <p>Crie servidores globais, acompanhe revendedores vinculados e configure fornecedor oculto por login.</p>
          </div>
          <div className="adminservers-hero-actions">
            <ActionButton disabled={loading} onClick={() => loadAll()}>
              <RefreshCw className={loading ? "adminservers-spin" : ""} size={15} />
              Atualizar
            </ActionButton>
            <ActionButton className="primary" onClick={openNew}>
              <Plus size={15} />
              Novo servidor
            </ActionButton>
          </div>
        </section>

        <section className="adminservers-metrics">
          <Metric icon={Server} label="Servidores" value={servers.length} hint="globais ativos" />
          <Metric icon={Users} label="Vinculos" value={resellerServers.length} hint="cadastros" />
          <Metric icon={Users} label="Revendedores" value={totalResellers} hint="unicos" />
          <Metric icon={DollarSign} label="Fornecedores" value={suppliers.length} hint="ocultos" />
        </section>

        <section className="adminservers-toolbar">
          <Search size={17} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar servidor"
            value={search}
          />
        </section>

        {loading ? (
          <div className="adminservers-loading">
            <Loader2 className="adminservers-spin" size={28} />
          </div>
        ) : visibleServers.length === 0 ? (
          <section className="adminservers-empty">
            <div className="adminservers-icon">
              <Server size={24} />
            </div>
            <strong>Nenhum servidor encontrado</strong>
            <p>Crie o primeiro servidor para liberar cadastro aos revendedores.</p>
            <ActionButton className="primary" onClick={openNew}>
              <Plus size={15} />
              Novo servidor
            </ActionButton>
          </section>
        ) : (
          <section className="adminservers-grid">
            {visibleServers.map((server) => (
              <ServerCard
                key={server.id}
                onDelete={handleDelete}
                onDetail={() => openDetail(server)}
                onEdit={openEdit}
                registrations={resellerServers.filter((record) => record.server_id === server.id)}
                server={server}
              />
            ))}
          </section>
        )}
      </div>

      {showForm && (
        <ServerFormModal
          editing={editing}
          error={formErr}
          form={form}
          onChange={setForm}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {detailServer && (
        <DetailModal
          addSupplier={addSupplier}
          assignSupplier={assignSupplier}
          detailServer={detailServer}
          editingPrice={editingPrice}
          onClose={() => {
            setDetailServerId(null);
            setEditingPrice(null);
          }}
          removeSupplier={removeSupplier}
          resellerServers={resellerServers}
          savePrice={handleSavePrice}
          savingPrice={savingPrice}
          savingSup={savingSup}
          setEditingPrice={setEditingPrice}
          setSupForm={setSupForm}
          suppliers={suppliers}
          supForm={supForm}
        />
      )}

      <style>{adminServersStyles}</style>
    </div>
  );
}

const adminServersStyles = `
.adminservers-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 52%, #010202 100%);
  overflow-x: hidden;
}

.adminservers-shell {
  width: 100%;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.6vw, 22px);
}

.adminservers-hero,
.adminservers-metric,
.adminservers-toolbar,
.adminservers-card,
.adminservers-empty,
.adminservers-state,
.adminservers-modal {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.adminservers-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.adminservers-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.adminservers-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(34px, 5.8vw, 64px);
  line-height: .9;
  font-weight: 950;
}

.adminservers-hero p {
  max-width: 780px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.adminservers-hero-actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.adminservers-action,
.adminservers-icon-link {
  border: 0;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
}

.adminservers-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.adminservers-action.danger {
  color: #ff5b5b;
  background: rgba(255, 91, 91, .08);
}

.adminservers-action.compact {
  min-height: 32px;
  border-radius: 11px;
  padding: 0 10px;
  font-size: 11px;
}

.adminservers-action.icon-only,
.adminservers-icon-link {
  width: 42px;
  padding: 0;
  flex: 0 0 auto;
}

.adminservers-action:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.adminservers-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.adminservers-metric {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.adminservers-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.adminservers-icon.warn {
  color: #f5b942;
}

.adminservers-metric span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.adminservers-metric strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(22px, 2.4vw, 31px);
  line-height: 1;
  font-weight: 950;
}

.adminservers-metric small {
  display: block;
  margin-top: 5px;
  color: var(--j2-faint);
  font-size: 11px;
}

.adminservers-toolbar {
  min-height: 54px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 15px;
  color: var(--j2-faint);
}

.adminservers-toolbar input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
  font-size: 14px;
}

.adminservers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
  gap: 16px;
}

.adminservers-card {
  min-width: 0;
  border-radius: 24px;
  padding: 16px;
}

.adminservers-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  margin-bottom: 14px;
}

.adminservers-card-head div:last-child {
  min-width: 0;
}

.adminservers-card-head h3 {
  margin: 0;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 17px;
  line-height: 1.15;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.adminservers-card-head span {
  display: block;
  margin-top: 4px;
  color: var(--j2-muted);
  font-size: 12px;
}

.adminservers-card-data {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 14px;
}

.adminservers-card-data div,
.adminservers-empty-mini,
.adminservers-supplier,
.adminservers-registration,
.adminservers-form input,
.adminservers-supplier-form input,
.adminservers-price-edit input,
.adminservers-supplier-select select {
  border: 0;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.adminservers-card-data div {
  min-width: 0;
  border-radius: 16px;
  padding: 12px;
}

.adminservers-card-data span {
  display: block;
  color: var(--j2-muted);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.adminservers-card-data strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-accent);
  font-size: 17px;
  font-weight: 950;
}

.adminservers-card-actions {
  display: flex;
  gap: 8px;
}

.adminservers-loading,
.adminservers-empty,
.adminservers-state {
  min-height: 320px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.adminservers-empty strong,
.adminservers-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.adminservers-empty p,
.adminservers-state p {
  max-width: 420px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.adminservers-state {
  width: min(430px, calc(100vw - 28px));
  margin: 18dvh auto 0;
}

.adminservers-modal {
  width: min(680px, calc(100vw - 24px)) !important;
  max-width: min(680px, calc(100vw - 24px)) !important;
  max-height: min(880px, 92dvh) !important;
  overflow-y: auto !important;
  border-radius: 26px !important;
  color: var(--j2-text) !important;
  padding: 20px !important;
}

.adminservers-modal.large {
  width: min(980px, calc(100vw - 24px)) !important;
  max-width: min(980px, calc(100vw - 24px)) !important;
}

.adminservers-modal [data-radix-dialog-title] {
  color: var(--j2-text);
  font-size: 22px;
  font-weight: 950;
}

.adminservers-form,
.adminservers-detail {
  display: grid;
  gap: 14px;
  padding-top: 8px;
}

.adminservers-form label {
  display: grid;
  gap: 7px;
}

.adminservers-form label span {
  color: var(--j2-text);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.adminservers-form input,
.adminservers-supplier-form input,
.adminservers-price-edit input,
.adminservers-supplier-select select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border-radius: 15px;
  padding: 0 12px;
  color: var(--j2-text);
  outline: 0;
  font: inherit;
  font-size: 13px;
}

.adminservers-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.adminservers-error {
  border-radius: 15px;
  padding: 11px 13px;
  color: #ffb4b4;
  background: rgba(255, 91, 91, .10);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  font-weight: 800;
}

.adminservers-detail section {
  display: grid;
  gap: 12px;
}

.adminservers-section-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.adminservers-section-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 16px;
  font-weight: 950;
}

.adminservers-section-head span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.adminservers-empty-mini {
  border-radius: 18px;
  padding: 18px;
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.adminservers-supplier-list,
.adminservers-registration-list {
  display: grid;
  gap: 9px;
}

.adminservers-supplier {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 18px;
  padding: 12px;
}

.adminservers-supplier strong,
.adminservers-registration strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.adminservers-supplier span,
.adminservers-registration span,
.adminservers-registration small {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 11px;
}

.adminservers-supplier-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.adminservers-supplier-form .adminservers-action {
  grid-column: 1 / -1;
}

.adminservers-registration {
  min-width: 0;
  border-radius: 20px;
  padding: 12px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: start;
}

.adminservers-reg-index {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  font-size: 12px;
  font-weight: 950;
}

.adminservers-reg-main {
  min-width: 0;
}

.adminservers-reg-main strong,
.adminservers-reg-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.adminservers-reg-price {
  text-align: right;
  min-width: 116px;
}

.adminservers-reg-price > strong {
  color: var(--j2-accent);
}

.adminservers-reg-price > button {
  border: 0;
  margin-top: 6px;
  min-height: 28px;
  border-radius: 10px;
  padding: 0 9px;
  color: var(--j2-accent);
  background: rgba(255, 255, 255, .035);
  box-shadow: var(--j2-sunken);
  cursor: pointer;
  font-size: 10px;
  font-weight: 900;
}

.adminservers-price-edit {
  display: flex;
  gap: 6px;
  align-items: center;
}

.adminservers-price-edit input {
  width: 92px;
  min-height: 34px;
}

.adminservers-supplier-select {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  margin-top: 2px;
}

.adminservers-supplier-select > span {
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.adminservers-spin {
  animation: adminserversSpin .8s linear infinite;
}

@keyframes adminserversSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1080px) {
  .adminservers-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .adminservers-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .adminservers-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .adminservers-hero h1 {
    font-size: clamp(34px, 11vw, 52px);
  }

  .adminservers-hero-actions,
  .adminservers-metrics,
  .adminservers-grid,
  .adminservers-supplier-form {
    grid-template-columns: 1fr;
    display: grid;
  }

  .adminservers-hero-actions .adminservers-action,
  .adminservers-form-actions .adminservers-action {
    width: 100%;
  }

  .adminservers-form-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .adminservers-card {
    border-radius: 22px;
  }

  .adminservers-modal {
    width: calc(100vw - 16px) !important;
    max-height: calc(100dvh - 28px) !important;
    padding: 16px !important;
    border-radius: 22px !important;
  }

  .adminservers-registration {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .adminservers-reg-price {
    grid-column: 1 / -1;
    text-align: left;
    min-width: 0;
  }

  .adminservers-supplier-select {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .adminservers-card-data,
  .adminservers-card-actions {
    grid-template-columns: 1fr;
    display: grid;
  }

  .adminservers-action.icon-only,
  .adminservers-icon-link {
    width: 100%;
  }
}
`;
