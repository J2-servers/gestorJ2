import React, { useCallback, useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Server,
  WalletCards,
} from "lucide-react";

const EMPTY_FORM = { login: "", value_per_credit: "" };

const fmtMoney = (value = 0, digits = 2) =>
  `R$ ${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

const recordServerId = (record) => record?.server_id ?? record?.serverId;
const recordValue = (record) => record?.value_per_credit ?? record?.valuePerCredit ?? 0;

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

function PageState({ error, loading, onRetry }) {
  return (
    <div className="servers-page">
      <section className="servers-state">
        {loading ? <Loader2 className="servers-spin" size={30} /> : <AlertTriangle size={30} />}
        <strong>{loading ? "Carregando servidores" : "Nao foi possivel carregar"}</strong>
        <p>{loading ? "Buscando catalogo e seus vinculos." : error}</p>
        {!loading && (
          <button className="servers-action primary" onClick={onRetry} type="button">
            <RefreshCw size={15} />
            Tentar novamente
          </button>
        )}
      </section>
      <style>{serversStyles}</style>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <article className="servers-metric">
      <div className="servers-icon">
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
    <button className={`servers-action ${className}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function ServerCard({ registration, server, onOpen }) {
  const registered = Boolean(registration);

  return (
    <article className={`servers-card ${registered ? "registered" : ""}`}>
      <div className="servers-card-head">
        <div className="servers-icon">
          <Server size={19} />
        </div>
        <div>
          <h3>{server.name}</h3>
          <span>{registered ? `Login: ${registration.login || "sem login"}` : "Disponivel para cadastro"}</span>
        </div>
      </div>

      <div className="servers-card-body">
        <div>
          <span>Status</span>
          <strong>{registered ? "Cadastrado" : "Aberto"}</strong>
        </div>
        <div>
          <span>Seu preco</span>
          <strong>{registered ? `${fmtMoney(recordValue(registration), 3)}/cred` : "A definir"}</strong>
        </div>
      </div>

      <div className="servers-card-note">
        {registered ? (
          <>
            <CheckCircle size={15} />
            <span>Servidor pronto para pedidos e controle de recargas.</span>
          </>
        ) : (
          <>
            <Plus size={15} />
            <span>Cadastre seu login e o valor que voce cobra por credito.</span>
          </>
        )}
      </div>

      <div className="servers-card-actions">
        <ActionButton className={registered ? "" : "primary"} onClick={() => onOpen(server)}>
          {registered ? <Edit size={14} /> : <Plus size={14} />}
          {registered ? "Editar cadastro" : "Cadastrar"}
        </ActionButton>
        {server.panel_link && (
          <a className="servers-icon-link" href={server.panel_link} onClick={(event) => event.stopPropagation()} rel="noopener noreferrer" target="_blank">
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

function RegistrationModal({
  error,
  form,
  onChange,
  onClose,
  onSave,
  registration,
  saving,
  selected,
  success,
}) {
  const editing = Boolean(registration);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="servers-modal">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cadastro" : "Cadastrar servidor"}</DialogTitle>
        </DialogHeader>

        <form className="servers-form" onSubmit={onSave}>
          <div className="servers-modal-server">
            <div className="servers-icon">
              <Server size={18} />
            </div>
            <div>
              <strong>{selected.name}</strong>
              <span>{editing ? "Atualize seu login neste painel." : "Informe seu login e preco de venda."}</span>
            </div>
          </div>

          {error && <div className="servers-error">{error}</div>}
          {success && (
            <div className="servers-success">
              <CheckCircle size={15} />
              Salvo com sucesso.
            </div>
          )}

          <label>
            <span>Login neste servidor *</span>
            <input
              onChange={(event) => onChange({ ...form, login: event.target.value })}
              placeholder="seu_login_no_painel"
              required
              value={form.login}
            />
          </label>

          {!editing ? (
            <label>
              <span>Valor que voce cobra por credito *</span>
              <input
                min="0.001"
                onChange={(event) => onChange({ ...form, value_per_credit: event.target.value })}
                placeholder="Ex: 0.050"
                required
                step="0.001"
                type="number"
                value={form.value_per_credit}
              />
              <small>Esse valor sera usado no seu fluxo de pedidos e cobranca.</small>
            </label>
          ) : (
            <div className="servers-locked-price">
              <span>Preco por credito</span>
              <strong>{fmtMoney(recordValue(registration), 3)}</strong>
              <small>Por seguranca operacional, somente o administrador altera esse valor.</small>
            </div>
          )}

          <div className="servers-form-actions">
            <ActionButton onClick={onClose}>Cancelar</ActionButton>
            <ActionButton className="primary" disabled={saving || success} type="submit">
              {saving ? "Salvando..." : success ? "Salvo" : editing ? "Atualizar" : "Cadastrar"}
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Servers() {
  const [user, setUser] = useState(null);
  const [servers, setServers] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [editReg, setEditReg] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const [me, serverResult, regResult] = await Promise.all([
        remoteClient.auth.me(),
        remoteClient.servers.list(),
        remoteClient.resellerServers.list().catch(() => []),
      ]);
      setUser(me);
      setServers(serverResult || []);
      setMyRegistrations(Array.isArray(regResult) ? regResult : []);
    } catch (error) {
      setLoadErr(error?.message || "Erro ao carregar servidores. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const registrationByServerId = useMemo(() => {
    const map = new Map();
    myRegistrations.forEach((record) => {
      map.set(recordServerId(record), record);
    });
    return map;
  }, [myRegistrations]);

  const visibleServers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterGlobalServers(servers)
      .filter((server) => {
        const registered = registrationByServerId.has(server.id);
        if (filter === "registered" && !registered) return false;
        if (filter === "open" && registered) return false;
        return true;
      })
      .filter((server) => !term || server.name?.toLowerCase().includes(term));
  }, [filter, registrationByServerId, search, servers]);

  const openRegister = (server) => {
    const existing = registrationByServerId.get(server.id) || null;
    setSelected(server);
    setEditReg(existing);
    setForm({
      login: existing?.login || "",
      value_per_credit: existing ? String(recordValue(existing)) : "",
    });
    setSaveErr("");
    setSaveOk(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaveErr("");
    setSaveOk(false);

    if (!form.login.trim()) {
      setSaveErr("Login obrigatorio.");
      return;
    }

    const price = Number.parseFloat(form.value_per_credit);
    if (!editReg && (Number.isNaN(price) || price <= 0)) {
      setSaveErr("Informe um valor por credito valido.");
      return;
    }

    if (!user?.id || !selected?.id) {
      setSaveErr("Sessao ou servidor invalido. Recarregue a pagina.");
      return;
    }

    setSaving(true);
    try {
      if (editReg) {
        await remoteClient.resellerServers.update(editReg.id, {
          login: form.login.trim(),
          valuePerCredit: recordValue(editReg),
        });
      } else {
        await remoteClient.resellerServers.create({
          login: form.login.trim(),
          resellerId: user.id,
          serverId: selected.id,
          valuePerCredit: price,
        });
      }

      setSaveOk(true);
      await loadAll();
      window.setTimeout(() => {
        setSelected(null);
        setSaveOk(false);
      }, 650);
    } catch (error) {
      setSaveErr(error?.message || "Erro ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadErr) {
    return <PageState error={loadErr} loading={loading} onRetry={loadAll} />;
  }

  const registeredCount = myRegistrations.length;
  const openCount = Math.max(0, filterGlobalServers(servers).length - registeredCount);

  return (
    <div className="servers-page">
      <main className="servers-shell">
        <section className="servers-hero">
          <div>
            <span>Catalogo</span>
            <h1>Servidores</h1>
            <p>Escolha os servidores que voce usa, cadastre seu login do painel e mantenha seus precos organizados para pedidos.</p>
          </div>
          <ActionButton disabled={loading} onClick={loadAll}>
            <RefreshCw className={loading ? "servers-spin" : ""} size={15} />
            Atualizar
          </ActionButton>
        </section>

        <section className="servers-metrics">
          <Metric icon={Server} label="Disponiveis" value={filterGlobalServers(servers).length} hint="catalogo global" />
          <Metric icon={CheckCircle} label="Meus cadastros" value={registeredCount} hint="prontos para uso" />
          <Metric icon={Plus} label="Em aberto" value={openCount} hint="a configurar" />
          <Metric icon={WalletCards} label="Conta" value={user?.name || user?.full_name || "Revendedor"} hint={user?.email} />
        </section>

        <section className="servers-toolbar">
          <div className="servers-search">
            <Search size={17} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar servidor" value={search} />
          </div>
          <div className="servers-tabs">
            {[
              ["all", "Todos"],
              ["registered", "Cadastrados"],
              ["open", "Abertos"],
            ].map(([key, label]) => (
              <button className={filter === key ? "active" : ""} key={key} onClick={() => setFilter(key)} type="button">
                {label}
              </button>
            ))}
          </div>
        </section>

        {visibleServers.length === 0 ? (
          <section className="servers-empty">
            <div className="servers-icon">
              <Server size={24} />
            </div>
            <strong>Nenhum servidor encontrado</strong>
            <p>Ajuste a busca ou aguarde o administrador liberar novos servidores globais.</p>
          </section>
        ) : (
          <section className="servers-grid">
            {visibleServers.map((server) => (
              <ServerCard
                key={server.id}
                onOpen={openRegister}
                registration={registrationByServerId.get(server.id)}
                server={server}
              />
            ))}
          </section>
        )}
      </main>

      {selected && (
        <RegistrationModal
          error={saveErr}
          form={form}
          onChange={setForm}
          onClose={() => {
            setSelected(null);
            setSaveErr("");
            setSaveOk(false);
          }}
          onSave={handleSave}
          registration={editReg}
          saving={saving}
          selected={selected}
          success={saveOk}
        />
      )}

      <style>{serversStyles}</style>
    </div>
  );
}

const serversStyles = `
.servers-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.servers-shell {
  min-height: 100dvh;
  width: 100%;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.6vw, 22px);
}

.servers-hero,
.servers-metric,
.servers-toolbar,
.servers-card,
.servers-empty,
.servers-state,
.servers-modal {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.servers-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.servers-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.servers-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(38px, 6vw, 68px);
  line-height: .9;
  font-weight: 950;
}

.servers-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.servers-action,
.servers-icon-link {
  border: 0;
  min-height: 42px;
  padding: 0 15px;
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

.servers-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.servers-action:disabled {
  cursor: not-allowed;
  opacity: .56;
}

.servers-icon-link {
  width: 42px;
  padding: 0;
  flex: 0 0 auto;
}

.servers-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.servers-metric {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.servers-icon {
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

.servers-metric span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.servers-metric strong {
  display: block;
  max-width: 100%;
  margin-top: 5px;
  overflow: hidden;
  color: var(--j2-text);
  font-size: clamp(20px, 2.2vw, 29px);
  line-height: 1.05;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.servers-metric small {
  display: block;
  max-width: 100%;
  margin-top: 5px;
  overflow: hidden;
  color: var(--j2-faint);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.servers-toolbar {
  min-height: 66px;
  border-radius: 22px;
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.servers-search {
  min-width: 0;
  min-height: 46px;
  border-radius: 16px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--j2-faint);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.servers-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
  font-size: 14px;
}

.servers-tabs {
  display: flex;
  gap: 6px;
}

.servers-tabs button {
  border: 0;
  min-height: 42px;
  border-radius: 14px;
  padding: 0 13px;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.servers-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
}

.servers-card {
  min-width: 0;
  border-radius: 24px;
  padding: 16px;
}

.servers-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  margin-bottom: 14px;
}

.servers-card-head div:last-child {
  min-width: 0;
}

.servers-card-head h3 {
  margin: 0;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 17px;
  line-height: 1.15;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.servers-card-head span {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.servers-card-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 12px;
}

.servers-card-body div,
.servers-card-note,
.servers-form input,
.servers-locked-price {
  border: 0;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.servers-card-body div {
  min-width: 0;
  border-radius: 16px;
  padding: 12px;
}

.servers-card-body span,
.servers-locked-price span,
.servers-form label span {
  display: block;
  color: var(--j2-muted);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.servers-card-body strong {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: var(--j2-accent);
  font-size: 15px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.servers-card-note {
  min-height: 52px;
  border-radius: 16px;
  padding: 11px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--j2-muted);
  font-size: 12px;
  line-height: 1.35;
}

.servers-card-note svg {
  color: var(--j2-accent);
  flex: 0 0 auto;
}

.servers-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.servers-card-actions .servers-action {
  flex: 1;
}

.servers-empty,
.servers-state {
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

.servers-empty strong,
.servers-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.servers-empty p,
.servers-state p {
  max-width: 430px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.servers-state {
  width: min(430px, calc(100vw - 28px));
  margin: 18dvh auto 0;
}

.servers-modal {
  width: min(560px, calc(100vw - 24px)) !important;
  max-width: min(560px, calc(100vw - 24px)) !important;
  max-height: min(820px, 92dvh) !important;
  overflow-y: auto !important;
  border-radius: 26px !important;
  color: var(--j2-text) !important;
  padding: 20px !important;
}

.servers-modal [data-radix-dialog-title] {
  color: var(--j2-text);
  font-size: 22px;
  font-weight: 950;
}

.servers-form {
  display: grid;
  gap: 14px;
  padding-top: 8px;
}

.servers-modal-server {
  border-radius: 20px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.servers-modal-server strong {
  display: block;
  color: var(--j2-text);
  font-size: 15px;
  font-weight: 950;
}

.servers-modal-server span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.servers-form label {
  display: grid;
  gap: 7px;
}

.servers-form input {
  width: 100%;
  min-width: 0;
  min-height: 46px;
  border-radius: 16px;
  padding: 0 12px;
  color: var(--j2-text);
  outline: 0;
  font: inherit;
  font-size: 13px;
}

.servers-form small,
.servers-locked-price small {
  color: var(--j2-faint);
  font-size: 11px;
}

.servers-locked-price {
  border-radius: 18px;
  padding: 13px;
}

.servers-locked-price strong {
  display: block;
  margin-top: 6px;
  color: var(--j2-accent);
  font-size: 22px;
  font-weight: 950;
}

.servers-error,
.servers-success {
  border-radius: 15px;
  padding: 11px 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  font-weight: 850;
}

.servers-error {
  color: #ffb4b4;
}

.servers-success {
  color: var(--j2-accent);
}

.servers-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.servers-spin {
  animation: serversSpin .8s linear infinite;
}

@keyframes serversSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1080px) {
  .servers-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .servers-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .servers-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .servers-hero h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .servers-hero .servers-action,
  .servers-form-actions .servers-action {
    width: 100%;
  }

  .servers-metrics,
  .servers-toolbar,
  .servers-grid,
  .servers-form-actions {
    grid-template-columns: 1fr;
    display: grid;
  }

  .servers-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .servers-tabs button {
    padding: 0 6px;
  }

  .servers-modal {
    width: calc(100vw - 16px) !important;
    max-height: calc(100dvh - 28px) !important;
    padding: 16px !important;
    border-radius: 22px !important;
  }
}

@media (max-width: 430px) {
  .servers-card-body,
  .servers-card-actions {
    grid-template-columns: 1fr;
    display: grid;
  }

  .servers-icon-link {
    width: 100%;
  }
}
`;
