import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  Check,
  CreditCard,
  FileText,
  Loader2,
  Phone,
  Server,
  Upload,
  X,
} from "lucide-react";
import { remoteClient } from "@/api/remoteClient";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import { getFriendlyError, isOnline, withRetry } from "@/components/utils/apiHelper";

const formatMoney = (value) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

function EmptyState({ action, icon: Icon, text, title, tone = "warn" }) {
  return (
    <div className="request-form state">
      <div className={`request-form-mark ${tone}`}>
        <Icon size={28} />
      </div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action && <div className="request-form-actions center">{action}</div>}
      <style>{requestFormStyles}</style>
    </div>
  );
}

function Field({ error, label, children }) {
  return (
    <label className="request-field">
      <span>
        {label}
        {error && <small>{error}</small>}
      </span>
      {children}
    </label>
  );
}

export default function NewRequestForm({ request, servers, user, onSuccess, onCancel }) {
  const { toast } = useToast();
  const initialServer = request
    ? servers?.find((server) => server?.id === request?.server_id || server?.name === request?.server_snapshot?.name)
    : null;

  const [formData, setFormData] = useState({
    server_id: initialServer?.id || "",
    requested_credits: request?.requested_credits?.toString() || "",
    login: request?.login || "",
    notes: request?.notes || "",
  });
  const [selectedServer, setSelectedServer] = useState(initialServer || null);
  const [proofFile, setProofFile] = useState(null);
  const [existingProofUrl, setExistingProofUrl] = useState(request?.proof_of_payment_url || null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const validationTimeoutRef = useRef(null);
  const isPostpaid = user?.payment_type === "postpaid";

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    };
  }, []);

  const validateField = useCallback((fieldName, value) => {
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);

    validationTimeoutRef.current = setTimeout(() => {
      setValidationErrors((current) => {
        const next = { ...current };
        if (fieldName === "requested_credits") {
          const credits = Number.parseInt(value, 10);
          if (!value || value.trim() === "") next.requested_credits = "Campo obrigatorio";
          else if (Number.isNaN(credits) || credits <= 0) next.requested_credits = "Use um numero positivo";
          else if (credits > 1000000) next.requested_credits = "Maximo de 1.000.000";
          else delete next.requested_credits;
        }
        if (fieldName === "login") {
          if (!value || value.trim() === "") next.login = "Campo obrigatorio";
          else delete next.login;
        }
        if (fieldName === "notes") {
          if (value && value.length > 500) next.notes = "Maximo de 500 caracteres";
          else delete next.notes;
        }
        return next;
      });
    }, 250);
  }, []);

  const handleServerChange = useCallback((server) => {
    if (!server) {
      setError("Servidor invalido.");
      return;
    }
    setSelectedServer(server);
    setFormData((current) => ({
      ...current,
      server_id: server.id,
      login: server.username || current.login || "",
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.server;
      return next;
    });
    setError("");
  }, []);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Arquivo muito grande. Maximo: 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Tipo nao permitido. Use JPG, PNG, GIF ou PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setProofFile(file);
    setError("");
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.proof;
      return next;
    });
  }, []);

  const removeFile = useCallback(() => {
    setProofFile(null);
    setExistingProofUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const calculateTotal = useCallback(() => {
    if (!selectedServer || !formData.requested_credits) return 0;
    const credits = Number.parseInt(formData.requested_credits, 10) || 0;
    return credits * Number(selectedServer.value_per_credit || 0);
  }, [formData.requested_credits, selectedServer]);

  const validateForm = useCallback(() => {
    const errors = {};
    const credits = Number.parseInt(formData.requested_credits, 10);

    if (!selectedServer) errors.server = "Selecione um servidor";
    if (!formData.requested_credits || formData.requested_credits.trim() === "") errors.requested_credits = "Campo obrigatorio";
    else if (Number.isNaN(credits) || credits <= 0) errors.requested_credits = "Use um numero positivo";
    else if (credits > 1000000) errors.requested_credits = "Maximo de 1.000.000";
    if (!formData.login || formData.login.trim() === "") errors.login = "Campo obrigatorio";
    if (!isPostpaid && !proofFile && !existingProofUrl) errors.proof = "Comprovante obrigatorio";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [existingProofUrl, formData, isPostpaid, proofFile, selectedServer]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!isOnline()) {
      setError("Sem conexao com a internet. Verifique sua rede e tente novamente.");
      toast({ title: "Sem conexao", description: "Verifique sua internet.", variant: "destructive", duration: 3000 });
      return;
    }

    setError("");
    setValidationErrors({});
    if (!validateForm()) {
      setError("Corrija os campos marcados antes de enviar.");
      return;
    }

    setLoading(true);
    try {
      let fileUrl = existingProofUrl;
      if (proofFile) {
        setUploadingFile(true);
        const uploadResult = await withRetry(() => remoteClient.uploads.upload(proofFile));
        if (!uploadResult?.fileUrl) throw new Error("Falha no upload do comprovante.");
        fileUrl = uploadResult.fileUrl;
        setUploadingFile(false);
      }

      const totalValue = calculateTotal();
      if (totalValue <= 0) throw new Error("Valor total invalido.");

      const payload = {
        server_id: selectedServer.id,
        requested_credits: Number.parseInt(formData.requested_credits, 10),
        login: formData.login.trim(),
        proof_of_payment_url: fileUrl,
        notes: formData.notes.trim() || "",
        payment_type: isPostpaid ? "postpaid" : "prepaid",
      };

      if (request) {
        const updated = await withRetry(() => remoteClient.creditRequests.update(request.id, payload));
        if (!updated?.id) throw new Error("Resposta invalida do servidor.");
        toast({ title: "Pedido atualizado", description: `${updated.requested_credits?.toLocaleString("pt-BR")} creditos`, duration: 2000 });
      } else {
        const created = await withRetry(() => remoteClient.creditRequests.create(payload));
        if (!created?.id) throw new Error("Resposta invalida do servidor.");
        toast({ title: "Pedido criado", description: `${created.requested_credits?.toLocaleString("pt-BR")} creditos`, duration: 2000 });
      }

      onSuccess();
    } catch (err) {
      const friendlyMsg = getFriendlyError(err);
      setError(friendlyMsg);
      toast({ title: request ? "Erro ao atualizar pedido" : "Erro ao criar pedido", description: friendlyMsg, variant: "destructive", duration: 4000 });
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  if (!user?.phone) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="WhatsApp nao cadastrado"
        text="Cadastre seu WhatsApp no perfil para criar pedidos e receber avisos automaticos."
        tone="danger"
        action={(
          <>
            <Link className="request-btn primary" to={createPageUrl("Profile")}><Phone size={15} />Cadastrar</Link>
            <button className="request-btn" onClick={onCancel} type="button">Voltar</button>
          </>
        )}
      />
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Nenhum servidor disponivel"
        text="Entre em Servidores e cadastre-se em pelo menos um servidor antes de criar pedidos."
        action={(
          <>
            <Link className="request-btn primary" to={createPageUrl("Servers")}><Server size={15} />Ir para servidores</Link>
            <button className="request-btn" onClick={onCancel} type="button">Fechar</button>
          </>
        )}
      />
    );
  }

  const total = calculateTotal();
  const credits = Number.parseInt(formData.requested_credits, 10) || 0;

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <header className="request-form-head">
        <div className="request-form-title">
          <div className="request-form-icon">
            <CreditCard size={20} />
          </div>
          <div>
            <span>{request ? "Editar pedido" : "Novo pedido"}</span>
            <strong>{isPostpaid ? "Pedido pos-pago" : "Pedido pre-pago"}</strong>
          </div>
        </div>
        <button className="request-icon-btn" disabled={loading} onClick={onCancel} type="button" aria-label="Fechar">
          <X size={17} />
        </button>
      </header>

      {error && (
        <div className="request-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <section className="request-section">
        <div className="request-section-title">
          <Server size={16} />
          <span>Servidor</span>
          {validationErrors.server && <small>{validationErrors.server}</small>}
        </div>
        <div className="request-server-grid">
          {servers.map((server) => {
            const active = selectedServer?.id === server?.id;
            return (
              <button className={`request-server ${active ? "active" : ""}`} disabled={loading} key={server.id} onClick={() => handleServerChange(server)} type="button">
                <div>
                  <strong>{server.name || "Servidor"}</strong>
                  <span>R$ {formatMoney(server.value_per_credit)}/credito</span>
                </div>
                {active && <i><Check size={12} /></i>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="request-grid">
        <Field error={validationErrors.requested_credits} label="Creditos">
          <input
            disabled={loading}
            max="1000000"
            min="1"
            onBlur={(event) => validateField("requested_credits", event.target.value)}
            onChange={(event) => setFormData((current) => ({ ...current, requested_credits: event.target.value }))}
            placeholder="Ex: 1000"
            type="number"
            value={formData.requested_credits}
          />
        </Field>
        <Field error={validationErrors.login} label="Login de recebimento">
          <input
            disabled={loading}
            onBlur={(event) => validateField("login", event.target.value)}
            onChange={(event) => setFormData((current) => ({ ...current, login: event.target.value }))}
            placeholder="Login no painel"
            value={formData.login}
          />
        </Field>
      </section>

      <Field error={validationErrors.notes} label={`Observacoes (${formData.notes.length}/500)`}>
        <textarea
          disabled={loading}
          maxLength={500}
          onBlur={(event) => validateField("notes", event.target.value)}
          onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Opcional"
          rows={3}
          value={formData.notes}
        />
      </Field>

      <section className="request-section">
        <div className="request-section-title">
          <FileText size={16} />
          <span>Comprovante {isPostpaid ? "(opcional)" : ""}</span>
          {validationErrors.proof && <small>{validationErrors.proof}</small>}
        </div>
        <input
          accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf"
          className="request-file-input"
          disabled={loading || uploadingFile}
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
          id="request-proof-upload"
        />
        {proofFile || existingProofUrl ? (
          <div className="request-proof">
            <FileText size={20} />
            <div>
              <strong>{proofFile ? proofFile.name : "Comprovante existente"}</strong>
              <span>{proofFile ? `${(proofFile.size / 1024).toFixed(1)} KB` : "Arquivo mantido"}</span>
            </div>
            <button onClick={removeFile} type="button" aria-label="Remover comprovante">
              <X size={15} />
            </button>
          </div>
        ) : (
          <label className="request-upload" htmlFor="request-proof-upload">
            {uploadingFile ? <Loader2 className="request-spin" size={24} /> : <Upload size={24} />}
            <strong>Clique para selecionar</strong>
            <span>JPG, PNG, GIF ou PDF ate 10MB</span>
          </label>
        )}
      </section>

      {selectedServer && credits > 0 && total > 0 && (
        <section className="request-summary">
          <div className="request-section-title">
            <Calculator size={16} />
            <span>Resumo</span>
          </div>
          <dl>
            <div><dt>Servidor</dt><dd>{selectedServer.name}</dd></div>
            <div><dt>Creditos</dt><dd>{credits.toLocaleString("pt-BR")}</dd></div>
            <div><dt>Total</dt><dd>R$ {formatMoney(total)}</dd></div>
          </dl>
        </section>
      )}

      <footer className="request-form-actions">
        <button className="request-btn" disabled={loading} onClick={onCancel} type="button">Cancelar</button>
        <button className="request-btn primary" disabled={loading || uploadingFile} type="submit">
          {loading || uploadingFile ? <Loader2 className="request-spin" size={16} /> : <Check size={16} />}
          {loading ? "Salvando..." : uploadingFile ? "Enviando..." : request ? "Salvar alteracoes" : "Criar pedido"}
        </button>
      </footer>

      <style>{requestFormStyles}</style>
    </form>
  );
}

const requestFormStyles = `
.request-form {
  border: 0;
  border-radius: 28px;
  padding: clamp(16px, 2vw, 24px);
  color: var(--j2-text);
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
  display: grid;
  gap: 16px;
}

.request-form.state {
  place-items: center;
  min-height: 260px;
  text-align: center;
}

.request-form.state > strong {
  color: var(--j2-text);
  font-size: 18px;
  font-weight: 950;
}

.request-form.state > p {
  max-width: 430px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.55;
}

.request-form-mark,
.request-form-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.request-form-mark.danger {
  color: #ffb4a5;
}

.request-form-head,
.request-form-title,
.request-section-title,
.request-proof,
.request-form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.request-form-head {
  justify-content: space-between;
}

.request-form-title span,
.request-section-title span,
.request-field > span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.request-form-title strong {
  display: block;
  margin-top: 3px;
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.request-icon-btn,
.request-btn {
  border: 0;
  min-height: 44px;
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 950;
  text-decoration: none;
}

.request-icon-btn {
  width: 44px;
  flex: 0 0 auto;
  color: var(--j2-muted);
}

.request-btn {
  padding: 0 16px;
}

.request-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.request-btn:disabled,
.request-icon-btn:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.request-error {
  border: 0;
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: #ffb4a5;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
}

.request-section {
  display: grid;
  gap: 10px;
}

.request-section-title {
  color: var(--j2-accent);
}

.request-section-title small,
.request-field small {
  margin-left: 7px;
  color: #ffb4a5;
  font-size: 10px;
  text-transform: none;
}

.request-server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}

.request-server {
  border: 0;
  min-width: 0;
  border-radius: 18px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--j2-text);
  background: rgba(9, 10, 10, .96);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  text-align: left;
}

.request-server.active {
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.request-server strong,
.request-proof strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.request-server span,
.request-proof span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 11px;
}

.request-server i {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #fff;
  background: var(--j2-accent);
  font-style: normal;
}

.request-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.request-field {
  display: grid;
  gap: 8px;
}

.request-field input,
.request-field textarea {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  border-radius: 16px;
  padding: 0 14px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 14px;
}

.request-field input {
  min-height: 48px;
}

.request-field textarea {
  min-height: 94px;
  padding-top: 12px;
  resize: vertical;
}

.request-field input::placeholder,
.request-field textarea::placeholder {
  color: var(--j2-faint);
}

.request-file-input {
  display: none;
}

.request-upload,
.request-proof,
.request-summary {
  border: 0;
  border-radius: 20px;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.request-upload {
  min-height: 150px;
  display: grid;
  place-items: center;
  gap: 6px;
  color: var(--j2-accent);
  cursor: pointer;
  text-align: center;
}

.request-upload strong {
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.request-upload span {
  color: var(--j2-muted);
  font-size: 11px;
}

.request-proof {
  padding: 13px;
  color: var(--j2-accent);
}

.request-proof > div {
  min-width: 0;
  flex: 1;
}

.request-proof button {
  border: 0;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #ffb4a5;
  background: rgba(255, 91, 91, .08);
  cursor: pointer;
}

.request-summary {
  padding: 14px;
  display: grid;
  gap: 11px;
}

.request-summary dl {
  margin: 0;
  display: grid;
  gap: 8px;
}

.request-summary dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.request-summary dt {
  color: var(--j2-muted);
  font-size: 12px;
}

.request-summary dd {
  margin: 0;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
  text-align: right;
}

.request-summary dl div:last-child dd {
  color: var(--j2-accent);
  font-size: 22px;
}

.request-form-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.request-form-actions.center {
  justify-content: center;
}

.request-spin {
  animation: requestSpin .8s linear infinite;
}

@keyframes requestSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .request-form {
    border-radius: 24px;
    padding: 14px;
  }

  .request-form-head {
    align-items: flex-start;
  }

  .request-grid,
  .request-server-grid {
    grid-template-columns: 1fr;
  }

  .request-form-actions,
  .request-form-actions.center {
    display: grid;
    grid-template-columns: 1fr;
  }

  .request-btn {
    width: 100%;
  }
}
`;
