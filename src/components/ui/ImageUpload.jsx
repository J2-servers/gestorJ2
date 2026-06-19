// @ts-nocheck
import React, { useId, useState } from "react";
import { UploadFile } from "@/integrations/Core";
import { toast } from "@/components/ui/use-toast";
import { Eye, Upload, X } from "lucide-react";

export default function ImageUpload({
  accept = "image/*",
  className = "",
  currentImage,
  description,
  label,
  maxSize = 5,
  onUpload,
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputId = `upload-${useId().replace(/:/g, "")}`;

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file?.size > maxSize * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: `Envie um arquivo com no maximo ${maxSize}MB.`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      onUpload(file_url);
      setPreview(file_url);
    } catch (error) {
      console.error("[ImageUpload] upload error:", error);
      toast({
        title: "Upload nao concluido",
        description: error?.message || "Erro ao fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const currentImageUrl = preview || currentImage;

  return (
    <div className={`image-upload-j2 ${className}`}>
      <div className="image-upload-head">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>

      <div className="image-upload-box">
        {currentImageUrl ? (
          <div className="image-upload-loaded">
            <img alt={label} src={currentImageUrl} />
            <div>
              <strong>Imagem carregada</strong>
              <span>Clique em trocar para atualizar</span>
            </div>
            <div className="image-upload-actions">
              <button onClick={() => window?.open(currentImageUrl, "_blank")} type="button">
                <Eye size={15} />
              </button>
              <button onClick={() => setPreview(null)} type="button">
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="image-upload-empty">
            <Upload size={28} />
            <strong>Selecionar imagem</strong>
            <span>Ate {maxSize}MB</span>
          </div>
        )}

        <input
          accept={accept}
          disabled={uploading}
          id={inputId}
          onChange={handleFileSelect}
          type="file"
        />

        <button className="settings-upload-button" disabled={uploading} onClick={() => document?.getElementById(inputId).click()} type="button">
          {uploading ? "Enviando..." : currentImageUrl ? "Trocar imagem" : "Selecionar imagem"}
        </button>
      </div>

      <style>{imageUploadStyles}</style>
    </div>
  );
}

const imageUploadStyles = `
.image-upload-j2 {
  min-width: 0;
  display: grid;
  gap: 9px;
}

.image-upload-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.image-upload-head span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 11px;
}

.image-upload-box {
  min-width: 0;
  border: 0;
  border-radius: 20px;
  padding: 13px;
  display: grid;
  gap: 12px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.image-upload-box input {
  display: none;
}

.image-upload-loaded {
  min-width: 0;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.image-upload-loaded img {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  object-fit: cover;
  background: #fff;
}

.image-upload-loaded strong,
.image-upload-empty strong {
  display: block;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-upload-loaded span,
.image-upload-empty span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 11px;
}

.image-upload-actions {
  display: flex;
  gap: 7px;
}

.image-upload-actions button {
  border: 0;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: var(--j2-muted);
  background: rgba(9, 10, 10, .96);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
}

.image-upload-empty {
  min-height: 116px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  color: var(--j2-muted);
  text-align: center;
}

.image-upload-empty svg {
  color: var(--j2-accent);
}

@media (max-width: 520px) {
  .image-upload-loaded {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .image-upload-actions {
    grid-column: 1 / -1;
  }

  .image-upload-actions button {
    width: 100%;
  }
}
`;
