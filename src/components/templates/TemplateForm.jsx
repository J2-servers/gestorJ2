import React, { useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const MESSAGE_TEMPLATE_PRESETS = [
  {
    key: "approval-success-celebration",
    name: "Recarga efetuada com sucesso",
    type: "approval",
    content: `🎉🎉RECARGA EFETUADA COM SUCESSO🎉🎉
*{{resellerName}}* sua recarga ja esta disponível.
> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*
____________
Obs, _{{adminNotes}}_`,
  },
  {
    key: "approval-success-direct",
    name: "Recarga liberada - direto",
    type: "approval",
    content: `✅ *RECARGA LIBERADA*

*{{resellerName}}*, sua recarga foi concluida e os creditos ja estao disponiveis.

> Servidor: {{serverName}}
> Login: {{login}}
> Creditos: {{credits}}
> Valor: *{{value}}*

_{{adminNotes}}_`,
  },
  {
    key: "approval-success-premium",
    name: "Recarga concluida - premium",
    type: "approval",
    content: `🚀 *RECARGA CONCLUIDA COM SUCESSO*

Ola, *{{resellerName}}*.
Seu pedido #{{requestId}} foi processado.

📌 *Detalhes da recarga*
• Servidor: {{serverName}}
• Login: {{login}}
• Creditos: {{credits}}
• Total: *{{value}}*

Observacao: _{{adminNotes}}_`,
  },
  {
    key: "queue-received",
    name: "Pedido recebido na fila",
    type: "queue",
    content: `⏳ *PEDIDO RECEBIDO*

*{{resellerName}}*, seu pedido #{{requestId}} entrou na fila de recarga.

> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*

Aguarde. Assim que a recarga for concluida voce recebera outro aviso.`,
  },
  {
    key: "rejection-proof",
    name: "Pedido rejeitado com motivo",
    type: "rejection",
    content: `⚠️ *PEDIDO NAO APROVADO*

*{{resellerName}}*, seu pedido #{{requestId}} foi rejeitado.

> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*
____________
Motivo: _{{rejectionReason}}_

Corrija a informacao e envie novamente pelo painel.`,
  },
  {
    key: "payment-reminder-pix",
    name: "Lembrete de pagamento Pix",
    type: "payment_reminder",
    content: `💳 *PAGAMENTO PENDENTE*

*{{resellerName}}*, seu pedido #{{requestId}} ainda aguarda comprovante.

> {{serverName}}
> {{login}}
> {{credits}}
> *{{value}}*

Copie a chave Pix no painel, realize o pagamento e anexe o comprovante para liberar a analise.`,
  },
];

const presetsByType = MESSAGE_TEMPLATE_PRESETS.reduce((acc, preset) => {
  acc[preset.type] = acc[preset.type] || [];
  acc[preset.type].push(preset);
  return acc;
}, {});

const getDefaultPreset = (type) => presetsByType[type]?.[0] || null;
const findPresetByContent = (content) => MESSAGE_TEMPLATE_PRESETS.find((preset) => preset.content === content);

const createDefaultForm = () => ({
  name: getDefaultPreset("approval")?.name || "",
  preset_key: getDefaultPreset("approval")?.key || "custom",
  type: "approval",
  message_content: getDefaultPreset("approval")?.content || "",
  is_active: true,
});

export default function TemplateForm({ template, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(createDefaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      const content = template.message_content || template.content || "";
      const matchedPreset = findPresetByContent(content);
      setFormData({
        name: template.name || "",
        preset_key: matchedPreset?.key || "custom",
        type: template.type || "approval",
        message_content: content,
        is_active: template.is_active ?? template.active ?? true,
      });
    } else {
      setFormData(createDefaultForm());
    }
  }, [template]);

  const applyPreset = (presetKey) => {
    const preset = MESSAGE_TEMPLATE_PRESETS.find((item) => item.key === presetKey);
    if (!preset) {
      setFormData({ ...formData, preset_key: "custom" });
      return;
    }
    setFormData({
      ...formData,
      name: preset.name,
      preset_key: preset.key,
      type: preset.type,
      message_content: preset.content,
    });
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        message_content: formData.message_content.trim(),
        is_active: Boolean(formData.is_active),
      };
      if (!payload.name) throw new Error("Informe o nome do template.");
      if (!payload.message_content) throw new Error("Informe a mensagem do template.");
      if (payload.message_content.length > 4000) throw new Error("A mensagem deve ter no maximo 4000 caracteres.");
      if (template) {
        await remoteClient.templates.update(template.id, payload);
      } else {
        await remoteClient.templates.create(payload);
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
                const preset = getDefaultPreset(value);
                setFormData({
                  ...formData,
                  type: value,
                  name: preset?.name || formData.name,
                  preset_key: preset?.key || "custom",
                  message_content: preset?.content || formData.message_content,
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
            <span>Modelo de mensagem</span>
            <select
              onChange={(event) => applyPreset(event.target.value)}
              value={formData.preset_key}
            >
              <option value="custom">Personalizado / manual</option>
              {(presetsByType[formData.type] || []).map((preset) => (
                <option key={preset.key} value={preset.key}>{preset.name}</option>
              ))}
            </select>
            <small>Escolha um modelo pronto e edite o texto antes de salvar, se precisar.</small>
          </label>

          <label>
            <span>Mensagem *</span>
            <textarea
              maxLength={4000}
              onChange={(event) => setFormData({ ...formData, message_content: event.target.value, preset_key: "custom" })}
              placeholder="Digite a mensagem aqui..."
              required
              rows={12}
              value={formData.message_content}
            />
            <small>Use variaveis como {"{{resellerName}}"} e {"{{credits}}"} para personalizar a mensagem. {formData.message_content.length}/4000</small>
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
