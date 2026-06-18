import React, { useCallback, useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
  XCircle,
} from "lucide-react";

const isStaff = (user) => user?.role === "admin" || user?.role === "dev";
const resellerName = (reseller) => reseller?.full_name || reseller?.name || reseller?.email || "Revendedor";

function PageState({ denied, loading, onRetry }) {
  return (
    <div className="broadcast-page">
      <section className="broadcast-state">
        {loading ? <Loader2 className="broadcast-spin" size={30} /> : <AlertTriangle size={30} />}
        <strong>{loading ? "Carregando envios" : denied ? "Acesso negado" : "Nao foi possivel carregar"}</strong>
        <p>{loading ? "Buscando revendedores com WhatsApp." : denied ? "Esta area e exclusiva para administradores." : "Tente atualizar a pagina."}</p>
        {!loading && !denied && (
          <button className="broadcast-action primary" onClick={onRetry} type="button">
            <RefreshCw size={15} />
            Tentar novamente
          </button>
        )}
      </section>
      <style>{broadcastStyles}</style>
    </div>
  );
}

function ActionButton({ children, className = "", disabled, onClick, type = "button" }) {
  return (
    <button className={`broadcast-action ${className}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <article className="broadcast-metric">
      <div className="broadcast-icon">
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

function ResellerRow({ reseller, selected, onToggle }) {
  return (
    <button className={`broadcast-reseller ${selected ? "selected" : ""}`} onClick={onToggle} type="button">
      <span className="broadcast-check">{selected && <CheckCircle size={13} />}</span>
      <span className="broadcast-avatar">{resellerName(reseller).slice(0, 1).toUpperCase()}</span>
      <span className="broadcast-reseller-main">
        <strong>{resellerName(reseller)}</strong>
        <small>{reseller.phone}</small>
      </span>
    </button>
  );
}

export default function BroadcastMessage() {
  const [user, setUser] = useState(null);
  const [resellers, setResellers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState("all");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const me = await remoteClient.auth.me();
      setUser(me);
      if (!isStaff(me)) return;
      const allUsers = await remoteClient.users.list();
      setResellers((allUsers || []).filter((item) => item.role === "user"));
    } catch (error) {
      console.error("[BroadcastMessage] load error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const withPhone = useMemo(() => resellers.filter((reseller) => reseller.phone), [resellers]);
  const withoutPhone = useMemo(() => resellers.filter((reseller) => !reseller.phone), [resellers]);

  const filteredResellers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return withPhone.filter((reseller) => {
      if (!term) return true;
      return `${resellerName(reseller)} ${reseller.email || ""} ${reseller.phone || ""}`.toLowerCase().includes(term);
    });
  }, [search, withPhone]);

  const effectiveTarget = useMemo(() => {
    if (selectMode === "all") return withPhone;
    return withPhone.filter((reseller) => selectedIds.includes(reseller.id));
  }, [selectMode, selectedIds, withPhone]);

  const toggleSelect = (id) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleVisible = () => {
    const visibleIds = filteredResellers.map((item) => item.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const handleSend = async () => {
    if (!message.trim() || effectiveTarget.length === 0) return;
    const ok = window.confirm(`Enviar mensagem para ${effectiveTarget.length} revendedor(es)?`);
    if (!ok) return;

    setSending(true);
    setResult(null);
    setShowDetails(false);
    try {
      const payload = {
        message: message.trim(),
        reseller_ids: selectMode === "custom" ? selectedIds : [],
      };
      const response = await remoteClient.whatsapp.broadcast(payload);
      setResult(response || {});
    } catch (error) {
      setResult({ error: error?.message || "Erro ao enviar.", failed: 0, sent: 0, total: 0 });
    } finally {
      setSending(false);
    }
  };

  if (loading || loadError) {
    return <PageState loading={loading} onRetry={loadData} />;
  }

  if (!isStaff(user)) {
    return <PageState denied />;
  }

  const charCount = message.length;
  const cannotSend = sending || !message.trim() || effectiveTarget.length === 0;
  const selectedVisibleCount = filteredResellers.filter((reseller) => selectedIds.includes(reseller.id)).length;

  return (
    <div className="broadcast-page">
      <main className="broadcast-shell">
        <section className="broadcast-hero">
          <div>
            <span>WhatsApp</span>
            <h1>Envios</h1>
            <p>Comunique revendedores pela fila segura do sistema, mantendo selecao clara e acompanhamento do resultado.</p>
          </div>
          <ActionButton disabled={loading} onClick={loadData}>
            <RefreshCw className={loading ? "broadcast-spin" : ""} size={15} />
            Atualizar
          </ActionButton>
        </section>

        <section className="broadcast-metrics">
          <Metric icon={Users} label="Revendedores" value={resellers.length} hint="cadastrados" />
          <Metric icon={CheckCircle} label="Com WhatsApp" value={withPhone.length} hint="aptos para envio" />
          <Metric icon={AlertTriangle} label="Sem WhatsApp" value={withoutPhone.length} hint="fora do disparo" />
          <Metric icon={Send} label="Alvo atual" value={effectiveTarget.length} hint={selectMode === "all" ? "todos aptos" : "selecao manual"} />
        </section>

        <section className="broadcast-workbench">
          <aside className="broadcast-panel recipients">
            <div className="broadcast-panel-head">
              <div className="broadcast-icon">
                <Users size={18} />
              </div>
              <div>
                <strong>Destinatarios</strong>
                <span>Escolha todos ou monte uma lista manual.</span>
              </div>
            </div>

            <div className="broadcast-tabs">
              <button className={selectMode === "all" ? "active" : ""} onClick={() => setSelectMode("all")} type="button">
                Todos
              </button>
              <button className={selectMode === "custom" ? "active" : ""} onClick={() => setSelectMode("custom")} type="button">
                Manual
              </button>
            </div>

            {selectMode === "custom" ? (
              <>
                <div className="broadcast-search">
                  <Search size={16} />
                  <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar revendedor" value={search} />
                  {search && (
                    <button onClick={() => setSearch("")} type="button">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="broadcast-list-toolbar">
                  <span>{selectedVisibleCount} de {filteredResellers.length} visiveis</span>
                  <button onClick={toggleVisible} type="button">
                    {selectedVisibleCount === filteredResellers.length && filteredResellers.length > 0 ? "Limpar visiveis" : "Selecionar visiveis"}
                  </button>
                </div>

                <div className="broadcast-reseller-list">
                  {filteredResellers.length === 0 ? (
                    <div className="broadcast-empty-mini">Nenhum revendedor com WhatsApp encontrado.</div>
                  ) : (
                    filteredResellers.map((reseller) => (
                      <ResellerRow
                        key={reseller.id}
                        onToggle={() => toggleSelect(reseller.id)}
                        reseller={reseller}
                        selected={selectedIds.includes(reseller.id)}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="broadcast-all-target">
                <strong>{withPhone.length}</strong>
                <span>revendedores com telefone receberao este comunicado.</span>
              </div>
            )}

            {withoutPhone.length > 0 && (
              <div className="broadcast-warning">
                <AlertTriangle size={15} />
                <span>{withoutPhone.length} revendedor(es) estao sem WhatsApp cadastrado.</span>
              </div>
            )}
          </aside>

          <section className="broadcast-panel composer">
            <div className="broadcast-panel-head">
              <div className="broadcast-icon">
                <MessageSquare size={18} />
              </div>
              <div>
                <strong>Mensagem</strong>
                <span>{charCount}/2000 caracteres</span>
              </div>
            </div>

            <textarea
              maxLength={2000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={"Ola! Temos um comunicado importante para voce.\\n\\nUse *negrito*, _italico_ e linhas curtas para facilitar a leitura."}
              value={message}
            />

            <div className="broadcast-preview">
              <span>Previa</span>
              <p>{message.trim() || "A mensagem aparece aqui antes do envio."}</p>
            </div>

            {result && (
              <div className={`broadcast-result ${result.error ? "error" : "success"}`}>
                {result.error ? <XCircle size={20} /> : <CheckCircle size={20} />}
                <div>
                  <strong>{result.error ? "Erro no envio" : "Envio processado"}</strong>
                  <span>
                    {result.error
                      ? result.error
                      : `${result.sent || 0} enviados, ${result.failed || 0} falhas, ${result.total || effectiveTarget.length} total`}
                  </span>
                </div>
                {Array.isArray(result.details) && result.details.length > 0 && (
                  <button onClick={() => setShowDetails((current) => !current)} type="button">
                    {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                )}
              </div>
            )}

            {showDetails && Array.isArray(result?.details) && (
              <div className="broadcast-details">
                {result.details.map((detail, index) => (
                  <div className={detail.success ? "ok" : "fail"} key={`${detail.phone || detail.name}-${index}`}>
                    <span>{detail.success ? <CheckCircle size={14} /> : <XCircle size={14} />}</span>
                    <strong>{detail.name || "Revendedor"}</strong>
                    <small>{detail.phone}{detail.error ? ` - ${detail.error}` : ""}</small>
                  </div>
                ))}
              </div>
            )}

            <div className="broadcast-footer-actions">
              <ActionButton className="primary" disabled={cannotSend} onClick={handleSend}>
                {sending ? <Loader2 className="broadcast-spin" size={16} /> : <Send size={16} />}
                {sending ? `Enviando para ${effectiveTarget.length}` : `Enviar para ${effectiveTarget.length}`}
              </ActionButton>
              {result && !sending && (
                <ActionButton onClick={() => {
                  setMessage("");
                  setResult(null);
                  setSelectedIds([]);
                  setSelectMode("all");
                }}>
                  Novo envio
                </ActionButton>
              )}
            </div>
          </section>
        </section>
      </main>

      <style>{broadcastStyles}</style>
    </div>
  );
}

const broadcastStyles = `
.broadcast-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.broadcast-shell {
  min-height: 100dvh;
  width: 100%;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.6vw, 22px);
}

.broadcast-hero,
.broadcast-metric,
.broadcast-panel,
.broadcast-state {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.broadcast-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.broadcast-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.broadcast-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(38px, 6vw, 68px);
  line-height: .9;
  font-weight: 950;
}

.broadcast-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.broadcast-action {
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
}

.broadcast-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.broadcast-action:disabled {
  cursor: not-allowed;
  opacity: .52;
}

.broadcast-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.broadcast-metric {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.broadcast-icon {
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

.broadcast-metric span,
.broadcast-panel-head span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.broadcast-metric strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(20px, 2.2vw, 29px);
  line-height: 1.05;
  font-weight: 950;
}

.broadcast-metric small {
  display: block;
  max-width: 100%;
  margin-top: 5px;
  overflow: hidden;
  color: var(--j2-faint);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-workbench {
  display: grid;
  grid-template-columns: minmax(300px, 390px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.broadcast-panel {
  min-width: 0;
  border-radius: 26px;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.broadcast-panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.broadcast-panel-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.broadcast-tabs {
  min-height: 46px;
  border-radius: 16px;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.broadcast-tabs button,
.broadcast-list-toolbar button,
.broadcast-result button {
  border: 0;
  border-radius: 12px;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.broadcast-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.broadcast-search {
  min-height: 46px;
  border-radius: 16px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--j2-faint);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.broadcast-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
  font-size: 13px;
}

.broadcast-search button {
  border: 0;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
}

.broadcast-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--j2-muted);
  font-size: 12px;
}

.broadcast-list-toolbar button,
.broadcast-result button {
  color: var(--j2-accent);
}

.broadcast-reseller-list {
  max-height: 430px;
  overflow-y: auto;
  display: grid;
  gap: 8px;
  padding-right: 2px;
}

.broadcast-reseller,
.broadcast-empty-mini,
.broadcast-all-target,
.broadcast-warning,
.broadcast-preview,
.broadcast-result,
.broadcast-details div {
  border: 0;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.broadcast-reseller {
  width: 100%;
  min-width: 0;
  min-height: 58px;
  border-radius: 17px;
  padding: 9px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.broadcast-reseller.selected .broadcast-check {
  color: var(--j2-accent);
}

.broadcast-check {
  width: 20px;
  color: var(--j2-faint);
  flex: 0 0 auto;
}

.broadcast-avatar {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  font-size: 13px;
  font-weight: 950;
}

.broadcast-reseller-main {
  min-width: 0;
}

.broadcast-reseller-main strong {
  display: block;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-reseller-main small {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 11px;
}

.broadcast-empty-mini {
  border-radius: 17px;
  padding: 18px;
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.broadcast-all-target {
  min-height: 170px;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

.broadcast-all-target strong {
  display: block;
  color: var(--j2-accent);
  font-size: 58px;
  line-height: .9;
  font-weight: 950;
}

.broadcast-all-target span {
  display: block;
  max-width: 260px;
  margin-top: 12px;
  color: var(--j2-muted);
  font-size: 13px;
}

.broadcast-warning {
  border-radius: 17px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: #ffb4b4;
  font-size: 12px;
  font-weight: 800;
}

.broadcast-panel.composer textarea {
  width: 100%;
  min-height: 210px;
  resize: vertical;
  border: 0;
  outline: 0;
  border-radius: 22px;
  padding: 16px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
  font: inherit;
  font-size: 14px;
  line-height: 1.55;
}

.broadcast-preview {
  min-height: 128px;
  border-radius: 22px;
  padding: 15px;
}

.broadcast-preview span {
  display: block;
  margin-bottom: 10px;
  color: var(--j2-accent);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.broadcast-preview p {
  margin: 0;
  white-space: pre-wrap;
  color: var(--j2-text);
  font-size: 13px;
  line-height: 1.55;
}

.broadcast-result {
  border-radius: 18px;
  padding: 13px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.broadcast-result svg {
  color: var(--j2-accent);
}

.broadcast-result.error svg {
  color: #ff5b5b;
}

.broadcast-result strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.broadcast-result span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.broadcast-details {
  display: grid;
  gap: 8px;
}

.broadcast-details div {
  min-width: 0;
  border-radius: 16px;
  padding: 10px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 9px;
}

.broadcast-details div > span {
  grid-row: span 2;
  color: var(--j2-accent);
}

.broadcast-details .fail > span {
  color: #ff5b5b;
}

.broadcast-details strong {
  overflow: hidden;
  color: var(--j2-text);
  font-size: 12px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-details small {
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.broadcast-state {
  width: min(430px, calc(100vw - 28px));
  min-height: 320px;
  margin: 18dvh auto 0;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.broadcast-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.broadcast-state p {
  max-width: 430px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.broadcast-spin {
  animation: broadcastSpin .8s linear infinite;
}

@keyframes broadcastSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  .broadcast-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .broadcast-workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .broadcast-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .broadcast-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .broadcast-hero h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .broadcast-hero .broadcast-action {
    width: 100%;
  }

  .broadcast-metrics {
    grid-template-columns: 1fr;
  }

  .broadcast-panel {
    border-radius: 22px;
  }

  .broadcast-footer-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .broadcast-footer-actions .broadcast-action {
    width: 100%;
  }

  .broadcast-panel.composer textarea {
    min-height: 180px;
  }
}
`;
