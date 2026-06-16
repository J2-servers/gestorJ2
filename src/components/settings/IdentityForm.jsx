import React, { useState } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import ImageUpload from '../ui/ImageUpload';

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
      console.error('Erro ao atualizar imagem:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="neumorphic-card p-6 rounded-2xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Identidade Visual</h3>
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">Imagem atualizada com sucesso!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImageUpload
          label="Favicon"
          description="Ícone que aparece na aba do navegador"
          currentImage={settings?.favicon_url}
          onUpload={(url) => handleImageUpload('favicon_url', url)}
          accept="image/*"
          maxSize={1}
        />

        <ImageUpload
          label="Logo da Sidebar"
          description="Logo que aparece no menu lateral"
          currentImage={settings?.sidebar_logo_url}
          onUpload={(url) => handleImageUpload('sidebar_logo_url', url)}
          accept="image/*"
          maxSize={2}
        />

        <ImageUpload
          label="Ícone do Perfil"
          description="Ícone padrão para usuários sem foto"
          currentImage={settings?.profile_icon_url}
          onUpload={(url) => handleImageUpload('profile_icon_url', url)}
          accept="image/*"
          maxSize={1}
        />

        <ImageUpload
          label="Logo da Tela de Login"
          description="Logo exibida na página de login"
          currentImage={settings?.login_logo_url}
          onUpload={(url) => handleImageUpload('login_logo_url', url)}
          accept="image/*"
          maxSize={3}
        />
      </div>

      <div className="mt-6">
        <ImageUpload
          label="Background da Tela de Login"
          description="Imagem de fundo da página de login"
          currentImage={settings?.login_background_url}
          onUpload={(url) => handleImageUpload('login_background_url', url)}
          accept="image/*"
          maxSize={5}
          className="w-full"
        />
      </div>
    </div>
  );
}
