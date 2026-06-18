import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProofViewer({ fileUrl, isOpen, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!fileUrl) return null;

  const fileExtension = fileUrl.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
  const isPDF = fileExtension === 'pdf';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleDownload = () => window.open(fileUrl, '_blank');

  const handleFullscreen = () => {
    const element = document.getElementById('proof-content');
    if (!element) return;
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
  };

  const iconButtonClass = 'text-gray-400 hover:text-orange-400 hover:bg-[#15191a] rounded-xl';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-[90vh] max-w-6xl overflow-hidden rounded-[24px] border-0 bg-[#0b0e0f] p-0 shadow-[18px_18px_48px_rgba(0,0,0,0.72),-8px_-8px_20px_rgba(255,255,255,0.018)]">
        <div className="sticky top-0 z-50 bg-[#101314] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base font-black text-white sm:text-xl">
              <span className="h-6 w-1 rounded-full bg-[#ff4b12]" />
              Comprovante de Pagamento
            </DialogTitle>

            <div className="flex items-center gap-1 sm:gap-2">
              {isImage && (
                <>
                  <Button variant="ghost" size="icon" onClick={handleZoomOut} className={iconButtonClass} aria-label="Diminuir zoom">
                    <ZoomOut className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn} className={iconButtonClass} aria-label="Aumentar zoom">
                    <ZoomIn className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleRotate} className={iconButtonClass} aria-label="Girar">
                    <RotateCw className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleFullscreen} className={iconButtonClass} aria-label="Tela cheia">
                    <Maximize2 className="h-5 w-5" />
                  </Button>
                </>
              )}

              <Button variant="ghost" size="icon" onClick={handleDownload} className={iconButtonClass} aria-label="Abrir arquivo">
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl text-gray-400 hover:bg-[#15191a] hover:text-red-400" aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {isImage && (
            <div className="mt-3 flex items-center gap-3">
              <div className="text-xs text-gray-500">Zoom: {Math.round(zoom * 100)}%</div>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#080b0c] shadow-[inset_3px_3px_7px_rgba(0,0,0,0.52),inset_-2px_-2px_5px_rgba(255,255,255,0.012)]">
                <motion.div
                  className="h-full bg-[#ff4b12]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((zoom - 0.5) / 2.5) * 100}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}
        </div>

        <div id="proof-content" className="flex flex-1 items-center justify-center overflow-auto bg-[#080b0c] p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {isImage ? (
              <motion.div
                key="image"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="relative"
              >
                <motion.img
                  src={fileUrl}
                  alt="Comprovante"
                  className="max-h-[calc(90vh-190px)] max-w-full rounded-xl object-contain shadow-[12px_12px_32px_rgba(0,0,0,0.55),-6px_-6px_16px_rgba(255,255,255,0.012)]"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease-out',
                  }}
                />
              </motion.div>
            ) : isPDF ? (
              <motion.div
                key="pdf"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="h-full w-full overflow-hidden rounded-xl shadow-[12px_12px_32px_rgba(0,0,0,0.55),-6px_-6px_16px_rgba(255,255,255,0.012)]"
              >
                <iframe src={fileUrl} className="h-full w-full bg-white" title="Comprovante PDF" style={{ minHeight: 'calc(90vh - 190px)' }} />
              </motion.div>
            ) : (
              <motion.div key="unsupported" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#15191a] shadow-[inset_5px_5px_13px_rgba(0,0,0,0.42),inset_-4px_-4px_10px_rgba(255,255,255,0.018)]">
                  <Download className="h-10 w-10 text-orange-400" />
                </div>
                <p className="mb-2 text-lg text-white">Tipo de arquivo não suportado para visualização</p>
                <p className="mb-6 text-sm text-gray-400">Clique no botão abaixo para fazer download</p>
                <Button onClick={handleDownload} className="rounded-2xl bg-[#ff4b12] font-bold hover:bg-[#d93810]">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Arquivo
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 bg-[#101314] p-4 shadow-[0_-10px_24px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>Formato: {fileExtension.toUpperCase()}</span>
              {isImage && <span>Rotação: {rotation}°</span>}
            </div>
            <span className="hidden sm:inline">Use os controles acima para navegar</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
