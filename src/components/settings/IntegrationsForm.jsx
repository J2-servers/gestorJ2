import React, { useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { AlertTriangle, CheckCircle, ExternalLink, Link2, MessageSquare, Save, Smartphone, Webhook, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function Field({ children, hint, label }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function IntegrationsForm({ settings, onUpdate }) {
  const [formData, setFormData] = useState({
    admin_whatsapp: settings?.admin_whatsapp || "",
    evolution_api_key: settings?.evolution_api_key || "",
    evolution_api_url: settings?.evolution_api_url || "",
    evolution_instance: settings?.evolution_instance || settings?.evolution_instance_id || "",
    fcm_server_key: settings?.fcm_server_key || "",
    n8n_webhook_url: settings?.n8n_webhook_url || "",
    whatsapp_provider: "evolution",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!settings) return;
    setFormData({
      admin_whatsapp: settings.admin_whatsapp || "",
      evolution_api_key: settings.evolution_api_key || "",
      evolution_api_url: settings.evolution_api_url || "",
      evolution_instance: settings.evolution_instance || settings.evolution_instance_id || "",
      fcm_server_key: settings.fcm_server_key || "",
      n8n_webhook_url: settings.n8n_webhook_url || "",
      whatsapp_provider: "evolution",
    });
  }, [settings]);

  const update = (key, value) => setFormData((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await remoteClient.settings.update({
        ...formData,
        whatsapp_provider: "evolution",
      });
      onUpdate(updated);
      setSuccess(true);
      toast({ title: "Configuracoes salvas", description: "Evolution API atualizada com sucesso." });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message || "Erro ao salvar");
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasEvolutionConfig = formData.evolution_api_url && formData.evolution_api_key && formData.evolution_instance;

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-form-header">
        <div className="settings-form-icon">
          <MessageSquare size={18} />
        </div>
        <div>
          <h2>Integracoes</h2>
          <p>Configure WhatsApp, automacoes e notificacoes externas.</p>
        </div>
      </div>

      {success && (
        <div className="settings-success">
          <CheckCircle size={15} /> Configuracoes salvas.
        </div>
      )}
      {error && (
        <div className="settings-error">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <section className="settings-form-section">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <Smartphone size={18} />
          </div>
          <div>
            <h2>Evolution API</h2>
            <p>Envio de notificacoes via WhatsApp com fila segura.</p>
          </div>
        </div>

        <div className={hasEvolutionConfig ? "settings-success" : "settings-error"} style={{ marginTop: 12 }}>
          {hasEvolutionConfig ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {hasEvolutionConfig ? "Evolution API configurada." : "Preencha URL, instancia e API key para ativar o WhatsApp."}
        </div>

        <div className="settings-grid" style={{ marginTop: 12 }}>
          <Field label="URL Base da Evolution API" hint="Ex: https://evolution.suaempresa.com">
            <input
              onChange={(event) => update("evolution_api_url", event.target.value)}
              placeholder="https://evolution.suaempresa.com"
              value={formData.evolution_api_url}
            />
          </Field>

          <Field label="Instancia" hint="Nome/id da instancia criada na Evolution API">
            <input
              onChange={(event) => update("evolution_instance", event.target.value)}
              placeholder="gestor-j2"
              value={formData.evolution_instance}
            />
          </Field>

          <Field label="API Key Global" hint="Chave enviada no header apikey">
            <input
              onChange={(event) => update("evolution_api_key", event.target.value)}
              placeholder="sua-api-key-aqui"
              type="password"
              value={formData.evolution_api_key}
            />
          </Field>

          <Field label="WhatsApp do admin" hint="Numero que recebe alertas de novos pedidos, apenas digitos com DDD">
            <input
              onChange={(event) => update("admin_whatsapp", event.target.value)}
              placeholder="49998298148"
              value={formData.admin_whatsapp}
            />
          </Field>
        </div>

        <a className="settings-action" href="/whatsappdiagnostic" style={{ marginTop: 12, textDecoration: "none" }}>
          Abrir WA Diagnostico <ExternalLink size={14} />
        </a>
      </section>

      <section className="settings-form-section">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <Webhook size={18} />
          </div>
          <div>
            <h2>n8n Webhook</h2>
            <p>Automacoes opcionais quando pedidos mudam de estado.</p>
          </div>
        </div>
        <div className="settings-grid" style={{ marginTop: 12 }}>
          <Field label="URL do webhook" hint="Opcional">
            <input
              onChange={(event) => update("n8n_webhook_url", event.target.value)}
              placeholder="https://n8n.exemplo.com/webhook/..."
              value={formData.n8n_webhook_url}
            />
          </Field>
        </div>
      </section>

      <section className="settings-form-section">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <Link2 size={18} />
          </div>
          <div>
            <h2>Firebase Cloud Messaging</h2>
            <p>Chave opcional para notificacoes push no navegador.</p>
          </div>
        </div>
        <div className="settings-grid" style={{ marginTop: 12 }}>
          <Field label="FCM Server Key" hint="Opcional">
            <textarea
              onChange={(event) => update("fcm_server_key", event.target.value)}
              placeholder="AAAA..."
              rows={3}
              value={formData.fcm_server_key}
            />
          </Field>
        </div>
      </section>

      <section className="settings-diagnostic">
        {[
          ["URL Base", formData.evolution_api_url],
          ["Instancia", formData.evolution_instance],
          ["API Key", formData.evolution_api_key ? `${formData.evolution_api_key.slice(0, 8)}...` : ""],
          ["Admin WhatsApp", formData.admin_whatsapp],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{value ? <CheckCircle size={13} /> : <XCircle size={13} />} {label}</span>
            <strong>{value || "nao configurado"}</strong>
          </div>
        ))}
      </section>

      <div className="settings-form-actions">
        <button className="settings-save" disabled={loading} type="submit">
          <Save size={15} />
          {loading ? "Salvando..." : "Salvar integracoes"}
        </button>
      </div>
    </form>
  );
}
