import React from "react";
import { Server, X, Zap } from "lucide-react";

export default function ServerItemForm({
  serverData,
  serverInfo,
  index,
  onUpdate,
  onRemove,
  disabled,
  validationErrors,
}) {
  const handleChange = (field, value) => {
    onUpdate(index, { ...serverData, [field]: value });
  };

  const credits = Number.parseInt(serverData.credits, 10) || 0;
  const total = credits * Number(serverInfo?.value_per_credit || 0);
  const loginError = validationErrors?.[index]?.login;

  return (
    <article className="multi-item">
      <header className="multi-item-head">
        <div className="multi-item-title">
          <div className="multi-icon">
            <Server size={18} />
          </div>
          <div>
            <strong>{serverInfo?.name || "Servidor"}</strong>
            <span>R$ {Number(serverInfo?.value_per_credit || 0).toFixed(2)}/credito</span>
          </div>
        </div>
        <button className="multi-icon-button danger" disabled={disabled} onClick={() => onRemove(index)} type="button" aria-label="Remover servidor">
          <X size={16} />
        </button>
      </header>

      <div className="multi-item-grid">
        <label className="multi-field">
          <span>Creditos {validationErrors?.[index]?.credits && <small>{validationErrors[index].credits}</small>}</span>
          <input
            disabled={disabled}
            max="1000000"
            min="1"
            onChange={(event) => handleChange("credits", event.target.value)}
            placeholder="Ex: 1000"
            type="number"
            value={serverData.credits}
          />
        </label>
        <div className={`multi-login-lock ${loginError ? "danger" : ""}`}>
          <span>Login cadastrado</span>
          <strong>{serverData.login || "Nao cadastrado"}</strong>
          {loginError && <small>{loginError}</small>}
        </div>
      </div>

      <label className="multi-field">
        <span>Observacoes <em>{(serverData.notes || "").length}/200</em></span>
        <textarea
          disabled={disabled}
          maxLength={200}
          onChange={(event) => handleChange("notes", event.target.value)}
          placeholder="Opcional"
          rows={2}
          value={serverData.notes}
        />
      </label>

      {total > 0 && (
        <footer className="multi-item-total">
          <span><Zap size={15} />Total deste servidor</span>
          <strong>R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
        </footer>
      )}
    </article>
  );
}
