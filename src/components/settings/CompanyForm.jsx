import React, { useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Building, Save } from "lucide-react";

export default function CompanyForm({ settings, onUpdate }) {
  const [formData, setFormData] = useState({
    address: settings?.address || "",
    cnpj: settings?.cnpj || "",
    company_name: settings?.company_name || "",
    email: settings?.email || "",
    phone: settings?.phone || "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const updatedSettings = await remoteClient.settings.update(formData);
      onUpdate(updatedSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[CompanyForm] save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const update = (key, value) => setFormData((current) => ({ ...current, [key]: value }));

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-form-header">
        <div className="settings-form-icon">
          <Building size={18} />
        </div>
        <div>
          <h2>Dados da empresa</h2>
          <p>Informacoes usadas em comprovantes, faturas e comunicacoes.</p>
        </div>
      </div>

      {success && <div className="settings-success">Configuracoes salvas com sucesso.</div>}

      <div className="settings-grid">
        <label className="settings-field full">
          <span>Nome da empresa</span>
          <input
            onChange={(event) => update("company_name", event.target.value)}
            placeholder="Digite o nome da empresa"
            value={formData.company_name}
          />
        </label>

        <label className="settings-field">
          <span>CNPJ</span>
          <input
            onChange={(event) => update("cnpj", event.target.value)}
            placeholder="00.000.000/0000-00"
            value={formData.cnpj}
          />
        </label>

        <label className="settings-field">
          <span>Telefone</span>
          <input
            onChange={(event) => update("phone", event.target.value)}
            placeholder="(11) 99999-9999"
            value={formData.phone}
          />
        </label>

        <label className="settings-field full">
          <span>Email</span>
          <input
            onChange={(event) => update("email", event.target.value)}
            placeholder="contato@empresa.com"
            type="email"
            value={formData.email}
          />
        </label>

        <label className="settings-field full">
          <span>Endereco</span>
          <textarea
            onChange={(event) => update("address", event.target.value)}
            placeholder="Rua, numero, cidade, estado"
            rows={4}
            value={formData.address}
          />
        </label>
      </div>

      <div className="settings-form-actions">
        <button className="settings-save" disabled={loading} type="submit">
          <Save size={15} />
          {loading ? "Salvando..." : "Salvar configuracoes"}
        </button>
      </div>
    </form>
  );
}
