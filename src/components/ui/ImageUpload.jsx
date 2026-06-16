// @ts-nocheck
import React, { useState } from 'react';
import { UploadFile } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Upload, X, Eye } from 'lucide-react';

export default function ImageUpload({ 
  label, 
  description, 
  currentImage, 
  onUpload, 
  accept = "image/*", 
  maxSize = 5,
  className = "" 
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      alert(`Arquivo deve ter no mÃ¡ximo ${maxSize}MB`);
      return;
    }

    setUploading(true);
    try {
      // Upload do arquivo
      const { file_url } = await UploadFile({ file });
      onUpload(file_url);
      setPreview(file_url);
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const currentImageUrl = preview || currentImage;

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {currentImageUrl ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={currentImageUrl}
                alt={label}
                className="w-12 h-12 object-cover rounded-lg"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Imagem carregada</p>
                <p className="text-xs text-gray-500">Clique em trocar para atualizar</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(currentImageUrl, '_blank')}
                className="neumorphic-button"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreview(null)}
                className="neumorphic-button text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Clique para selecionar imagem</p>
            <p className="text-xs text-gray-500">AtÃ© {maxSize}MB</p>
          </div>
        )}

        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id={`upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
          disabled={uploading}
        />

        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`upload-${label.replace(/\s+/g, '-').toLowerCase()}`).click()}
            disabled={uploading}
            className="neumorphic-button"
          >
            {uploading ? 'Enviando...' : currentImageUrl ? 'Trocar Imagem' : 'Selecionar Imagem'}
          </Button>
        </div>
      </div>
    </div>
  );
}