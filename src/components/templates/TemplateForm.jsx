import React, { useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DEFAULT_FORM = {
  name: "",
  type: "approval",
  message_content: "",
  is_active: true,
};

const PRESETS = {
  queue: `*Pedido entrou na fila de recarga!*

Ola *{{resellerName}}*!

Seu pedido #{{requestId}} ja foi recebido e entrou na fila.

*Detalhes:*
- Servidor: {{serverName}}
- Login: {{login}}
- Creditos: {{credits}}
- Valor: {{value}}

Aguarde, sua recarga sera efetuada em breve.`,

  approval: `*Pedido aprovado!*

Ola *{{resellerName}}*!

Seu pedido #{{requestId}} foi aprovado e processado com sucesso.

*Detalhes:*
- Servidor: {{serverName}}
- Login: {{login}}
- Creditos: {{credits}}
- Valor: {{value}}

{{adminNotes}}

Os creditos ja foram recarregados e estao disponiveis para uso!`,

  rejection: `*Pedido rejeitado*

Ola *{{resellerName}}*.

Infelizmente seu pedido #{{requestId}} foi rejeitado.

*Detalhes:*
- Servidor: {{serverName}}
- Login: {{login}}
- Creditos: {{credits}}
- Valor: {{value}}

*Motivo:* {{rejectionReason}}

Entre em contato conosco para mais informacoes.`,

  payment_reminder: `*Lembrete de pagamento*

Ola *{{resellerName}}*!

Seu pedido #{{requestId}} esta aguardando confirmacao de pagamento.

*Detalhes:*
- Servidor: {{serverName}}
- Creditos: {{credits}}
- Valor: {{value}}

Por favor, envie o comprovante de pagamento para agilizar a aprovacao.`,
};

export default function TemplateForm({ template, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        type: template.type || "approval",
        message_content: template.message_content || template.content || "",
        is_active: template.is_active ?? template.active ?? true,
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [template]);

  const handleSubmit = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (template) {
        await remoteClient.templates.update(template.id, formData);
      } else {
        await remoteClient.templates.create(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err?.message || "Ocorreu um erro ao salvar o template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="template-form-dialog">
        <DialogHeader>
          <DialogTitle>{template ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <form className="template-form" onSubmit={handleSubmit}>
          {error && <div className="template-form-error">{error}</div>}

          <label>
            <span>Nome do template *</span>
            <input
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="Ex: Aprovacao padrao"
              required
              value={formData.name}
            />
          </label>

          <label>
            <span>Tipo de template *</span>
            <select
              onChange={(event) => {
                const value = event.target.value;
                setFormData({
                  ...formData,
                  type: value,
                  message_content: PRESETS[value] || formData.message_content,
                });
              }}
              value={formData.type}
            >
              <option value="queue">Entrada na fila</option>
              <option value="approval">Aprovacao de pedido</option>
              <option value="rejection">Rejeicao de pedido</option>
              <option value="payment_reminder">Lembrete de pagamento</option>
              <option value="custom">Personalizado</option>
            </select>
            <small>Selecionar um tipo pre-definido carrega uma mensagem base editavel.</small>
          </label>

          <label>
            <span>Mensagem *</span>
            <textarea
              onChange={(event) => setFormData({ ...formData, message_content: event.target.value })}
              placeholder="Digite a mensagem aqui..."
              required
              rows={12}
              value={formData.message_content}
            />
            <small>Use variaveis como {"{{resellerName}}"} e {"{{credits}}"} para personalizar a mensagem.</small>
          </label>

          <label className="template-form-switch">
            <input
              checked={formData.is_active}
              onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
              type="checkbox"
            />
            <span>Template ativo</span>
          </label>

          <div className="template-form-actions">
            <button onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="primary" disabled={loading} type="submit">
              {loading ? "Salvando..." : "Salvar template"}
            </button>
          </div>
        </form>

        <style>{templateFormStyles}</style>
      </DialogContent>
    </Dialog>
  );
}

const templateFormStyles = `
.template-form-dialog {
  width: min(680px, calc(100vw - 24px)) !important;
  max-height: min(880px, 92dvh) !important;
  overflow-y: auto !important;
  border-radius: 26px !important;
  border: 0 !important;
  background: rgba(6, 7, 7, .98) !important;
  box-shadow: var(--j2-neu) !important;
  color: var(--j2-text) !important;
  padding: 20px !important;
}

.template-form-dialog [data-radix-dialog-title] {
  color: var(--j2-text);
  font-size: 22px;
  font-weight: 950;
}

.template-form {
  display: grid;
  gap: 14px;
  padding-top: 10px;
}

.template-form label {
  display: grid;
  gap: 7px;
}

.template-form label > span {
  color: var(--j2-text);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.template-form input:not([type="checkbox"]),
.template-form select,
.template-form textarea {
  width: 100%;
  border: 0;
  outline: 0;
  border-radius: 16px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font: inherit;
  font-size: 14px;
}

.template-form input:not([type="checkbox"]),
.template-form select {
  min-height: 46px;
  padding: 0 13px;
}

.template-form textarea {
  min-height: 260px;
  resize: vertical;
  padding: 13px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  line-height: 1.55;
}

.template-form small {
  color: var(--j2-muted);
  font-size: 11px;
}

.template-form-switch {
  min-height: 46px;
  display: flex !important;
  align-items: center;
  grid-template-columns: none !important;
  gap: 10px !important;
  border-radius: 16px;
  padding: 0 12px;
  background: rgba(3, 4, 4, .62);
  box-shadow: var(--j2-sunken);
}

.template-form-switch input {
  width: 18px;
  height: 18px;
  accent-color: var(--j2-accent);
}

.template-form-switch span {
  color: var(--j2-muted) !important;
}

.template-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.template-form-actions button {
  border: 0;
  min-height: 44px;
  border-radius: 15px;
  padding: 0 16px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
}

.template-form-actions button.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.template-form-actions button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.template-form-error {
  border-radius: 15px;
  padding: 11px 13px;
  color: #ffb4b4;
  background: rgba(255, 91, 91, .10);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 640px) {
  .template-form-dialog {
    width: calc(100vw - 16px) !important;
    max-height: calc(100dvh - 28px) !important;
    padding: 16px !important;
    border-radius: 22px !important;
  }

  .template-form textarea {
    min-height: 220px;
  }

  .template-form-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .template-form-actions button {
    width: 100%;
  }
}
`;
