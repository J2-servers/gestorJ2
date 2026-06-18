import React, { useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Image } from "lucide-react";
import ImageUpload from "../ui/ImageUpload";

export default function IdentityForm({ settings, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleImageUpload = async (field, imageUrl) => {
    setLoading(true);
    try {
      const updatedSettings = await remoteClient.settings.update({ [field]: imageUrl });
      onUpdate(updatedSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[IdentityForm] upload error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-form">
      <div className="settings-form-header">
        <div className="settings-form-icon">
          <Image size={18} />
        </div>
        <div>
          <h2>Identidade visual</h2>
          <p>Controle logos, icones e imagem usada nas telas publicas.</p>
        </div>
      </div>

      {success && <div className="settings-success">Imagem atualizada com sucesso.</div>}
      {loading && <div className="settings-diagnostic"><div><span>Status</span><strong>Enviando imagem...</strong></div></div>}

      <div className="settings-grid">
        <ImageUpload
          accept="image/*"
          currentImage={settings?.favicon_url}
          description="Icone exibido na aba do navegador"
          label="Favicon"
          maxSize={1}
          onUpload={(url) => handleImageUpload("favicon_url", url)}
        />

        <ImageUpload
          accept="image/*"
          currentImage={settings?.sidebar_logo_url}
          description="Logo exibida no menu lateral"
          label="Logo da sidebar"
          maxSize={2}
          onUpload={(url) => handleImageUpload("sidebar_logo_url", url)}
        />

        <ImageUpload
          accept="image/*"
          currentImage={settings?.profile_icon_url}
          description="Icone padrao para usuarios sem foto"
          label="Icone do perfil"
          maxSize={1}
          onUpload={(url) => handleImageUpload("profile_icon_url", url)}
        />

        <ImageUpload
          accept="image/*"
          currentImage={settings?.login_logo_url}
          description="Logo exibida na pagina de login"
          label="Logo do login"
          maxSize={3}
          onUpload={(url) => handleImageUpload("login_logo_url", url)}
        />

        <ImageUpload
          accept="image/*"
          className="settings-field full"
          currentImage={settings?.login_background_url}
          description="Imagem de fundo da pagina de login"
          label="Background do login"
          maxSize={5}
          onUpload={(url) => handleImageUpload("login_background_url", url)}
        />
      </div>
    </div>
  );
}
