import React, { useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Image, LayoutTemplate, MonitorSmartphone, Save, Type } from "lucide-react";
import ImageUpload from "../ui/ImageUpload";

const visualDefaults = {
  company_name: "Gestor J2",
  sidebar_logo_fit: "contain",
  login_logo_fit: "contain",
  login_background_position: "center",
  login_brand_subtitle: "Central de creditos",
  login_hero_eyebrow: "Operacao profissional",
  login_hero_title: "Controle de recargas com presenca de central.",
  login_hero_text: "Pedidos, creditos, revendedores, servidores, notificacoes e fila de atendimento em uma experiencia unica.",
  login_panel_eyebrow: "Acesso seguro",
  login_panel_title: "Entrar no sistema",
  login_login_tab_text: "Entrar",
  login_register_tab_text: "Novo revendedor",
  login_submit_text: "Entrar agora",
  login_register_submit_text: "Criar acesso",
  login_status_text: "Online",
};

const imageFields = [
  {
    field: "favicon_url",
    label: "Favicon",
    description: "Icone exibido na aba do navegador",
    maxSize: 1,
  },
  {
    field: "sidebar_logo_url",
    label: "Logo da sidebar",
    description: "Marca exibida no menu lateral do admin e revendedor",
    maxSize: 2,
  },
  {
    field: "profile_icon_url",
    label: "Icone do perfil",
    description: "Imagem padrao para usuarios sem foto",
    maxSize: 1,
  },
  {
    field: "login_logo_url",
    label: "Logo do login",
    description: "Marca principal exibida na tela publica de entrada",
    maxSize: 3,
  },
  {
    field: "login_background_url",
    label: "Background do login",
    description: "Imagem de fundo da area visual do login",
    maxSize: 5,
    className: "settings-field full",
  },
];

const textFields = [
  { key: "company_name", label: "Nome da marca", placeholder: "Gestor J2" },
  { key: "login_brand_subtitle", label: "Subtitulo da marca", placeholder: "Central de creditos" },
  { key: "login_status_text", label: "Status no topo", placeholder: "Online" },
  { key: "login_hero_eyebrow", label: "Etiqueta principal", placeholder: "Operacao profissional" },
  { key: "login_hero_title", label: "Titulo principal", placeholder: "Controle de recargas..." },
  { key: "login_hero_text", label: "Texto principal", placeholder: "Pedidos, creditos...", multiline: true },
  { key: "login_panel_eyebrow", label: "Etiqueta do painel", placeholder: "Acesso seguro" },
  { key: "login_panel_title", label: "Titulo do painel", placeholder: "Entrar no sistema" },
  { key: "login_login_tab_text", label: "Aba de entrada", placeholder: "Entrar" },
  { key: "login_register_tab_text", label: "Aba de cadastro", placeholder: "Novo revendedor" },
  { key: "login_submit_text", label: "Botao de entrada", placeholder: "Entrar agora" },
  { key: "login_register_submit_text", label: "Botao de cadastro", placeholder: "Criar acesso" },
];

const fitOptions = [
  { value: "contain", label: "Conter sem cortar" },
  { value: "cover", label: "Preencher recortando" },
  { value: "scale-down", label: "Reduzir quando precisar" },
];

const positionOptions = [
  { value: "center", label: "Centro" },
  { value: "top", label: "Topo" },
  { value: "bottom", label: "Base" },
  { value: "left", label: "Esquerda" },
  { value: "right", label: "Direita" },
];

function pickSettings(settings) {
  return Object.fromEntries(
    Object.keys(visualDefaults).map((key) => [key, settings?.[key] ?? visualDefaults[key]])
  );
}

export default function IdentityForm({ settings, onUpdate }) {
  const [formData, setFormData] = useState(() => ({
    ...pickSettings(settings),
    favicon_url: settings?.favicon_url || "",
    sidebar_logo_url: settings?.sidebar_logo_url || "",
    profile_icon_url: settings?.profile_icon_url || "",
    login_logo_url: settings?.login_logo_url || "",
    login_background_url: settings?.login_background_url || "",
  }));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData({
      ...pickSettings(settings),
      favicon_url: settings?.favicon_url || "",
      sidebar_logo_url: settings?.sidebar_logo_url || "",
      profile_icon_url: settings?.profile_icon_url || "",
      login_logo_url: settings?.login_logo_url || "",
      login_background_url: settings?.login_background_url || "",
    });
  }, [settings]);

  const preview = useMemo(() => ({
    companyName: formData.company_name || visualDefaults.company_name,
    brandSubtitle: formData.login_brand_subtitle || visualDefaults.login_brand_subtitle,
    status: formData.login_status_text || visualDefaults.login_status_text,
    logo: formData.login_logo_url || formData.sidebar_logo_url,
    logoFit: formData.login_logo_fit || "contain",
    sidebarLogo: formData.sidebar_logo_url || formData.login_logo_url,
    sidebarLogoFit: formData.sidebar_logo_fit || "contain",
    background: formData.login_background_url,
    backgroundPosition: formData.login_background_position || "center",
    eyebrow: formData.login_hero_eyebrow || visualDefaults.login_hero_eyebrow,
    title: formData.login_hero_title || visualDefaults.login_hero_title,
    text: formData.login_hero_text || visualDefaults.login_hero_text,
    panelEyebrow: formData.login_panel_eyebrow || visualDefaults.login_panel_eyebrow,
    panelTitle: formData.login_panel_title || visualDefaults.login_panel_title,
    loginTab: formData.login_login_tab_text || visualDefaults.login_login_tab_text,
    registerTab: formData.login_register_tab_text || visualDefaults.login_register_tab_text,
    submit: formData.login_submit_text || visualDefaults.login_submit_text,
  }), [formData]);

  const update = (key, value) => setFormData((current) => ({ ...current, [key]: value }));

  const saveSettings = async (payload, message = "Configuracoes visuais salvas.") => {
    setLoading(true);
    setError("");
    try {
      const updatedSettings = await remoteClient.settings.update(payload);
      onUpdate(updatedSettings);
      setSuccess(message);
      setTimeout(() => setSuccess(""), 3200);
      return updatedSettings;
    } catch (err) {
      setError(err?.message || "Nao foi possivel salvar a identidade visual.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (field, imageUrl) => {
    update(field, imageUrl);
    await saveSettings({ [field]: imageUrl }, imageUrl ? "Imagem posicionada no sistema." : "Imagem removida do sistema.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await saveSettings(formData);
    } catch {
      // saveSettings already exposes the visible error message.
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-form-header">
        <div className="settings-form-icon">
          <Image size={18} />
        </div>
        <div>
          <h2>Identidade visual</h2>
          <p>Controle logos, favicon, textos, imagem de fundo e apresentacao completa da tela de login.</p>
        </div>
      </div>

      {success && <div className="settings-success">{success}</div>}
      {error && <div className="settings-error">{error}</div>}
      {loading && <div className="settings-diagnostic"><div><span>Status</span><strong>Salvando visual...</strong></div></div>}

      <section className="settings-form-section">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <LayoutTemplate size={17} />
          </div>
          <div>
            <h3>Logos e imagens</h3>
            <p>Cada imagem abaixo ja salva no campo correto e passa a aparecer no lugar correspondente.</p>
          </div>
        </div>

        <div className="settings-grid">
          {imageFields.map((item) => (
            <ImageUpload
              accept="image/*"
              className={item.className}
              currentImage={formData[item.field]}
              description={item.description}
              key={item.field}
              label={item.label}
              maxSize={item.maxSize}
              onClear={() => handleImageUpload(item.field, "")}
              onUpload={(url) => handleImageUpload(item.field, url)}
            />
          ))}
        </div>
      </section>

      <section className="settings-form-section">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <MonitorSmartphone size={17} />
          </div>
          <div>
            <h3>Encaixe e posicao</h3>
            <p>Use conter para logos com texto. Use preencher apenas em simbolos quadrados.</p>
          </div>
        </div>

        <div className="settings-grid">
          <label className="settings-field">
            <span>Encaixe da logo na sidebar</span>
            <select onChange={(event) => update("sidebar_logo_fit", event.target.value)} value={formData.sidebar_logo_fit}>
              {fitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="settings-field">
            <span>Encaixe da logo no login</span>
            <select onChange={(event) => update("login_logo_fit", event.target.value)} value={formData.login_logo_fit}>
              {fitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="settings-field full">
            <span>Posicao do background do login</span>
            <select onChange={(event) => update("login_background_position", event.target.value)} value={formData.login_background_position}>
              {positionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="settings-form-section">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <Type size={17} />
          </div>
          <div>
            <h3>Textos do login</h3>
            <p>Edite o que o visitante ve antes de entrar no sistema.</p>
          </div>
        </div>

        <div className="settings-grid">
          {textFields.map((field) => (
            <label className={`settings-field ${field.multiline ? "full" : ""}`} key={field.key}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea
                  onChange={(event) => update(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  value={formData[field.key]}
                />
              ) : (
                <input
                  onChange={(event) => update(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  value={formData[field.key]}
                />
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="settings-visual-preview" aria-label="Previa visual do login">
        <div
          className="settings-preview-showcase"
          style={{
            "--preview-bg-image": preview.background ? `url(${preview.background})` : "linear-gradient(135deg, rgba(255,75,18,.16), transparent)",
            "--preview-bg-position": preview.backgroundPosition,
          }}
        >
          <div className="settings-preview-top">
            <div className="settings-preview-brand">
              <div className="settings-preview-logo">
                {preview.logo ? (
                  <img alt={preview.companyName} src={preview.logo} style={{ objectFit: preview.logoFit }} />
                ) : (
                  <Image size={18} />
                )}
              </div>
              <div>
                <strong>{preview.companyName}</strong>
                <span>{preview.brandSubtitle}</span>
              </div>
            </div>
            <span className="settings-preview-pill">{preview.status}</span>
          </div>

          <div className="settings-preview-copy">
            <span>{preview.eyebrow}</span>
            <h4>{preview.title}</h4>
            <p>{preview.text}</p>
          </div>
        </div>

        <div className="settings-preview-panel">
          <span>{preview.panelEyebrow}</span>
          <h4>{preview.panelTitle}</h4>
          <div className="settings-preview-tabs">
            <b>{preview.loginTab}</b>
            <em>{preview.registerTab}</em>
          </div>
          <div className="settings-preview-input" />
          <div className="settings-preview-input short" />
          <button type="button">{preview.submit}</button>
        </div>

        <div className="settings-preview-sidebar">
          <div className="settings-preview-sidebar-logo">
            {preview.sidebarLogo ? (
              <img alt={preview.companyName} src={preview.sidebarLogo} style={{ objectFit: preview.sidebarLogoFit }} />
            ) : (
              <Image size={16} />
            )}
          </div>
          <div>
            <strong>{preview.companyName}</strong>
            <span>Logo da sidebar</span>
          </div>
        </div>
      </section>

      <div className="settings-form-actions">
        <button className="settings-save" disabled={loading} type="submit">
          <Save size={15} />
          {loading ? "Salvando..." : "Salvar textos e posicoes"}
        </button>
      </div>
    </form>
  );
}
