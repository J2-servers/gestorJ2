import React, { useRef, useState } from "react";
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
  Plus,
  Server,
  Upload,
  X,
} from "lucide-react";
import { remoteClient } from "@/api/remoteClient";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import { getFriendlyError, isOnline, withRetry } from "@/components/utils/apiHelper";
import ServerItemForm from "./ServerItemForm";

const MAX_SERVERS = 10;
const formatMoney = (value) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

function MultiState({ action, icon: Icon, text, title, tone = "warn" }) {
  return (
    <div className="multi-form state">
      <div className={`multi-state-icon ${tone}`}>
        <Icon size={28} />
      </div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action && <div className="multi-actions center">{action}</div>}
      <style>{multiStyles}</style>
    </div>
  );
}

export default function MultiRequestForm({ servers, user, onSuccess, onCancel }) {
  const { toast } = useToast();
  const [selectedServers, setSelectedServers] = useState([]);
  const [serverDataList, setServerDataList] = useState([]);
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const isPostpaid = user?.payment_type === "postpaid";

  const availableServers = servers?.filter((server) => !selectedServers.some((selected) => selected.id === server.id)) || [];
  const grandTotal = serverDataList.reduce((sum, data) => {
    const credits = Number.parseInt(data.credits, 10) || 0;
    return sum + credits * Number(data.valuePerCredit || 0);
  }, 0);

  const handleAddServer = (server) => {
    if (selectedServers.length >= MAX_SERVERS) {
      toast({ title: "Limite atingido", description: `Maximo de ${MAX_SERVERS} servidores por pedido.`, variant: "destructive", duration: 2200 });
      return;
    }
    setSelectedServers((current) => [...current, server]);
    setServerDataList((current) => [
      ...current,
      {
        serverId: server.id,
        serverName: server.name,
        login: server.username || "",
        credits: "",
        notes: "",
        valuePerCredit: server.value_per_credit,
      },
    ]);
    setError("");
  };

  const handleRemoveServer = (index) => {
    setSelectedServers((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setServerDataList((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const handleUpdateServerData = (index, newData) => {
    setServerDataList((current) => {
      const next = [...current];
      next[index] = newData;
      return next;
    });
  };

  const handleFileChange = (event) => {
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
  };

  const removeFile = () => {
    setProofFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const errors = {};

    if (selectedServers.length === 0) {
      setError("Adicione pelo menos um servidor.");
      return false;
    }

    serverDataList.forEach((data, index) => {
      const itemErrors = {};
      const credits = Number.parseInt(data.credits, 10);
      if (!data.credits || data.credits.trim() === "") itemErrors.credits = "Obrigatorio";
      else if (Number.isNaN(credits) || credits <= 0) itemErrors.credits = "Numero positivo";
      else if (credits > 1000000) itemErrors.credits = "Max. 1.000.000";
      if (!data.login || data.login.trim() === "") itemErrors.login = "Obrigatorio";
      if (Object.keys(itemErrors).length > 0) errors[index] = itemErrors;
    });

    if (!isPostpaid && !proofFile) {
      setError("Comprovante obrigatorio para pre-pago.");
      errors.proof = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
    if (!validateForm()) return;

    setLoading(true);
    try {
      let fileUrl = null;
      if (proofFile) {
        setUploadingFile(true);
        const uploadResult = await withRetry(() => remoteClient.uploads.upload(proofFile));
        if (!uploadResult?.fileUrl) throw new Error("Falha no upload do comprovante.");
        fileUrl = uploadResult.fileUrl;
        setUploadingFile(false);
      }

      const createdRequests = [];
      const failedRequests = [];
      for (const data of serverDataList) {
        try {
          const created = await withRetry(() => remoteClient.creditRequests.create({
            server_id: data.serverId,
            requested_credits: Number.parseInt(data.credits, 10),
            login: data.login.trim(),
            proof_of_payment_url: fileUrl,
            notes: data.notes.trim() || "",
            payment_type: isPostpaid ? "postpaid" : "prepaid",
          }));
          if (!created?.id) throw new Error("Resposta invalida do servidor.");
          createdRequests.push(created);
        } catch (err) {
          failedRequests.push({ server: data.serverName, error: getFriendlyError(err) });
        }
      }

      if (createdRequests.length === 0 && failedRequests.length > 0) {
        throw new Error(`Todos os ${failedRequests.length} pedidos falharam. Verifique a conexao e tente novamente.`);
      }

      if (failedRequests.length === 0) {
        toast({ title: "Pedidos criados", description: `${createdRequests.length} pedidos criados com sucesso.`, duration: 3000 });
      } else {
        toast({
          title: "Parcialmente concluido",
          description: `${createdRequests.length} criados, ${failedRequests.length} falharam: ${failedRequests.map((item) => item.server).join(", ")}`,
          variant: "destructive",
          duration: 5000,
        });
      }

      onSuccess();
    } catch (err) {
      const friendlyMsg = getFriendlyError(err);
      setError(friendlyMsg);
      toast({ title: "Erro ao criar pedidos", description: friendlyMsg, variant: "destructive", duration: 4000 });
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  if (!user?.phone) {
    return (
      <MultiState
        icon={AlertTriangle}
        title="WhatsApp nao cadastrado"
        text="Cadastre seu WhatsApp no perfil para criar pedidos e receber avisos automaticos."
        tone="danger"
        action={(
          <>
            <Link className="multi-btn primary" to={createPageUrl("Profile")}><Phone size={15} />Cadastrar</Link>
            <button className="multi-btn" onClick={onCancel} type="button">Voltar</button>
          </>
        )}
      />
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <MultiState
        icon={AlertCircle}
        title="Nenhum servidor disponivel"
        text="Entre em Servidores e cadastre-se em pelo menos um servidor antes de criar pedidos."
        action={<button className="multi-btn" onClick={onCancel} type="button">Fechar</button>}
      />
    );
  }

  return (
    <form className="multi-form" onSubmit={handleSubmit}>
      <header className="multi-head">
        <div className="multi-title">
          <div className="multi-icon">
            <Plus size={20} />
          </div>
          <div>
            <span>Pedido multiplo</span>
            <strong>{isPostpaid ? "Pos-pago" : "Pre-pago"}</strong>
          </div>
        </div>
        <button className="multi-icon-button" disabled={loading} onClick={onCancel} type="button" aria-label="Fechar">
          <X size={17} />
        </button>
      </header>

      {error && (
        <div className="multi-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {availableServers.length > 0 && selectedServers.length < MAX_SERVERS && (
        <section className="multi-section">
          <div className="multi-section-title">
            <Server size={16} />
            <span>Adicionar servidor ({selectedServers.length}/{MAX_SERVERS})</span>
          </div>
          <div className="multi-server-grid">
            {availableServers.map((server) => (
              <button className="multi-server-option" disabled={loading} key={server.id} onClick={() => handleAddServer(server)} type="button">
                <strong>{server.name}</strong>
                <span>R$ {formatMoney(server.value_per_credit)}/credito</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedServers.length > 0 && (
        <section className="multi-section">
          <div className="multi-section-title">
            <CreditCard size={16} />
            <span>Servidores selecionados ({selectedServers.length})</span>
          </div>
          <div className="multi-item-list">
            {selectedServers.map((server, index) => (
              <ServerItemForm
                disabled={loading}
                index={index}
                key={server.id}
                onRemove={handleRemoveServer}
                onUpdate={handleUpdateServerData}
                serverData={serverDataList[index]}
                serverInfo={server}
                validationErrors={validationErrors}
              />
            ))}
          </div>
        </section>
      )}

      <section className="multi-section">
        <div className="multi-section-title">
          <FileText size={16} />
          <span>Comprovante {isPostpaid ? "(opcional)" : ""}</span>
        </div>
        <input
          accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf"
          className="multi-file-input"
          disabled={loading || uploadingFile}
          id="multi-proof-upload"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        {proofFile ? (
          <div className="multi-proof">
            <FileText size={20} />
            <div>
              <strong>{proofFile.name}</strong>
              <span>{(proofFile.size / 1024).toFixed(1)} KB</span>
            </div>
            <button onClick={removeFile} type="button" aria-label="Remover comprovante">
              <X size={15} />
            </button>
          </div>
        ) : (
          <label className={`multi-upload ${validationErrors.proof ? "danger" : ""}`} htmlFor="multi-proof-upload">
            {uploadingFile ? <Loader2 className="multi-spin" size={24} /> : <Upload size={24} />}
            <strong>Clique para selecionar</strong>
            <span>Um comprovante para todos os servidores</span>
          </label>
        )}
      </section>

      {selectedServers.length > 0 && grandTotal > 0 && (
        <section className="multi-summary">
          <div className="multi-section-title">
            <Calculator size={16} />
            <span>Resumo total</span>
          </div>
          <div className="multi-summary-list">
            {serverDataList.map((data, index) => {
              const credits = Number.parseInt(data.credits, 10) || 0;
              const value = credits * Number(data.valuePerCredit || 0);
              if (credits === 0) return null;
              return (
                <div key={`${data.serverId}-${index}`}>
                  <span>{data.serverName}</span>
                  <strong>R$ {formatMoney(value)}</strong>
                </div>
              );
            })}
          </div>
          <div className="multi-grand-total">
            <span>Total geral</span>
            <strong>R$ {formatMoney(grandTotal)}</strong>
          </div>
        </section>
      )}

      <footer className="multi-actions">
        <button className="multi-btn" disabled={loading} onClick={onCancel} type="button">Cancelar</button>
        <button className="multi-btn primary" disabled={loading || uploadingFile || selectedServers.length === 0} type="submit">
          {loading || uploadingFile ? <Loader2 className="multi-spin" size={16} /> : <Check size={16} />}
          {loading ? `Criando ${selectedServers.length} pedidos...` : uploadingFile ? "Enviando..." : "Criar pedido multiplo"}
        </button>
      </footer>

      <style>{multiStyles}</style>
    </form>
  );
}

const multiStyles = `
.multi-form,
.multi-form.state {
  border: 0;
  border-radius: 28px;
  padding: clamp(16px, 2vw, 24px);
  color: var(--j2-text);
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
  display: grid;
  gap: 16px;
}

.multi-form.state {
  min-height: 260px;
  place-items: center;
  text-align: center;
}

.multi-form.state > strong {
  color: var(--j2-text);
  font-size: 18px;
  font-weight: 950;
}

.multi-form.state > p {
  max-width: 430px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.55;
}

.multi-head,
.multi-title,
.multi-section-title,
.multi-item-head,
.multi-item-title,
.multi-proof,
.multi-actions,
.multi-item-total {
  display: flex;
  align-items: center;
  gap: 12px;
}

.multi-head,
.multi-item-head,
.multi-item-total {
  justify-content: space-between;
}

.multi-icon,
.multi-state-icon {
  width: 50px;
  height: 50px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 17px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.multi-state-icon.danger {
  color: #ffb4a5;
}

.multi-title span,
.multi-section-title span,
.multi-field > span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.multi-title strong {
  display: block;
  margin-top: 3px;
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.multi-icon-button,
.multi-btn {
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

.multi-icon-button {
  width: 44px;
  flex: 0 0 auto;
}

.multi-icon-button.danger {
  color: #ffb4a5;
}

.multi-btn {
  padding: 0 16px;
}

.multi-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.multi-btn:disabled,
.multi-icon-button:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.multi-error {
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

.multi-section,
.multi-item-list {
  display: grid;
  gap: 10px;
}

.multi-section-title {
  color: var(--j2-accent);
}

.multi-server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.multi-server-option,
.multi-item {
  border: 0;
  border-radius: 20px;
  color: var(--j2-text);
  background: rgba(9, 10, 10, .96);
  box-shadow: var(--j2-neu-soft);
}

.multi-server-option {
  min-width: 0;
  padding: 13px;
  cursor: pointer;
  text-align: left;
}

.multi-server-option strong,
.multi-item-title strong,
.multi-proof strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.multi-server-option span,
.multi-item-title span,
.multi-proof span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 11px;
}

.multi-item {
  padding: 14px;
  display: grid;
  gap: 13px;
}

.multi-item-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.multi-field {
  display: grid;
  gap: 8px;
}

.multi-field small {
  margin-left: 7px;
  color: #ffb4a5;
  font-size: 10px;
  text-transform: none;
}

.multi-field em {
  float: right;
  color: var(--j2-faint);
  font-style: normal;
  font-weight: 800;
}

.multi-field input,
.multi-field textarea {
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

.multi-field input {
  min-height: 46px;
}

.multi-field textarea {
  min-height: 82px;
  padding-top: 12px;
  resize: vertical;
}

.multi-field input::placeholder,
.multi-field textarea::placeholder {
  color: var(--j2-faint);
}

.multi-item-total {
  border-radius: 16px;
  padding: 11px;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.multi-item-total span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--j2-muted);
  font-size: 12px;
}

.multi-item-total strong {
  color: var(--j2-accent);
  font-size: 16px;
  font-weight: 950;
}

.multi-file-input {
  display: none;
}

.multi-upload,
.multi-proof,
.multi-summary {
  border: 0;
  border-radius: 20px;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.multi-upload {
  min-height: 145px;
  display: grid;
  place-items: center;
  gap: 6px;
  color: var(--j2-accent);
  cursor: pointer;
  text-align: center;
}

.multi-upload.danger {
  color: #ffb4a5;
}

.multi-upload strong {
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.multi-upload span {
  color: var(--j2-muted);
  font-size: 11px;
}

.multi-proof {
  padding: 13px;
  color: var(--j2-accent);
}

.multi-proof > div {
  min-width: 0;
  flex: 1;
}

.multi-proof button {
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

.multi-summary {
  padding: 14px;
  display: grid;
  gap: 10px;
}

.multi-summary-list {
  display: grid;
  gap: 7px;
}

.multi-summary-list div,
.multi-grand-total {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.multi-summary-list span,
.multi-grand-total span {
  color: var(--j2-muted);
  font-size: 12px;
}

.multi-summary-list strong {
  color: var(--j2-text);
  font-size: 13px;
}

.multi-grand-total {
  padding-top: 9px;
}

.multi-grand-total strong {
  color: var(--j2-accent);
  font-size: 22px;
  font-weight: 950;
}

.multi-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.multi-actions.center {
  justify-content: center;
}

.multi-spin {
  animation: multiSpin .8s linear infinite;
}

@keyframes multiSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .multi-form {
    border-radius: 24px;
    padding: 14px;
  }

  .multi-head {
    align-items: flex-start;
  }

  .multi-server-grid,
  .multi-item-grid {
    grid-template-columns: 1fr;
  }

  .multi-actions,
  .multi-actions.center {
    display: grid;
    grid-template-columns: 1fr;
  }

  .multi-btn {
    width: 100%;
  }
}
`;
