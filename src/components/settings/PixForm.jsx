import React, { useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { CheckCircle, Key, Plus, Save, Trash2 } from "lucide-react";

const keyTypes = {
  cnpj: "CNPJ",
  cpf: "CPF",
  email: "Email",
  phone: "Telefone",
  random: "Chave Aleatoria",
};

export default function PixForm({ settings, onUpdate }) {
  const [pixKeys, setPixKeys] = useState(settings?.pix_keys || []);
  const [newKey, setNewKey] = useState({ bank: "", is_active: true, key_value: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateNewKey = (key, value) => setNewKey((current) => ({ ...current, [key]: value }));

  const handleAddKey = () => {
    if (!newKey.type || !newKey.key_value || !newKey.bank) {
      alert("Preencha todos os campos: Tipo, Valor e Banco.");
      return;
    }
    setPixKeys([...pixKeys, { ...newKey, id: Date.now() }]);
    setNewKey({ bank: "", is_active: true, key_value: "", type: "" });
  };

  const handleRemoveKey = (index) => setPixKeys(pixKeys.filter((_, keyIndex) => keyIndex !== index));

  const handleToggleActive = (index) => {
    setPixKeys(pixKeys.map((key, keyIndex) => (keyIndex === index ? { ...key, is_active: !key.is_active } : key)));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await remoteClient.settings.update({ pix_keys: pixKeys });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[PixForm] save error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-form">
      <div className="settings-form-header">
        <div className="settings-form-icon">
          <Key size={18} />
        </div>
        <div>
          <h2>Chaves PIX</h2>
          <p>Gerencie as chaves disponiveis para recebimento.</p>
        </div>
      </div>

      {success && (
        <div className="settings-success">
          <CheckCircle size={15} /> Chaves PIX salvas com sucesso.
        </div>
      )}

      <section className="settings-form-section">
        <h3>Chaves cadastradas</h3>
        <p>{pixKeys.length} chave(s) configuradas.</p>

        <div className="settings-pix-list" style={{ marginTop: 12 }}>
          {pixKeys.length === 0 ? (
            <div className="settings-empty">Nenhuma chave PIX cadastrada.</div>
          ) : (
            pixKeys.map((key, index) => (
              <article className="settings-pix-row" key={`${key.key_value}-${index}`}>
                <div>
                  <strong>{keyTypes[key.type] || key.type} - {key.bank}</strong>
                  <span>{key.key_value}</span>
                </div>
                <div className="settings-pix-actions">
                  <button onClick={() => handleToggleActive(index)} type="button">
                    {key.is_active ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => handleRemoveKey(index)} type="button">
                    <Trash2 size={14} />
                    Remover
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="settings-form-section">
        <h3>Adicionar nova chave</h3>
        <p>Preencha os dados e clique em adicionar antes de salvar.</p>

        <div className="settings-grid" style={{ marginTop: 12 }}>
          <label className="settings-field">
            <span>Tipo de chave</span>
            <select onChange={(event) => updateNewKey("type", event.target.value)} value={newKey.type}>
              <option value="">Selecione</option>
              {Object.entries(keyTypes).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Valor da chave PIX</span>
            <input
              onChange={(event) => updateNewKey("key_value", event.target.value)}
              placeholder="ex: 00000000000"
              value={newKey.key_value}
            />
          </label>

          <label className="settings-field full">
            <span>Nome do banco</span>
            <input
              onChange={(event) => updateNewKey("bank", event.target.value)}
              placeholder="ex: Nubank"
              value={newKey.bank}
            />
          </label>
        </div>

        <div className="settings-form-actions" style={{ marginTop: 12 }}>
          <button onClick={handleAddKey} type="button">
            <Plus size={15} />
            Adicionar chave
          </button>
          <button className="settings-save" disabled={loading} onClick={handleSave} type="button">
            <Save size={15} />
            {loading ? "Salvando..." : "Salvar configuracoes"}
          </button>
        </div>
      </section>
    </div>
  );
}
