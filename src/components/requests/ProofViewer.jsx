import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProofViewer({ fileUrl, isOpen, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!fileUrl) return null;

  const fileExtension = fileUrl.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
  const isPDF = fileExtension === 'pdf';

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  const handleFullscreen = () => {
    const element = document.getElementById('proof-content');
    if (element) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] backdrop-blur-xl bg-black/95 border border-orange-500/30 p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-orange-500/20 p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full" />
              Comprovante de Pagamento
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRotate}
                    className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                  >
                    <RotateCw className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFullscreen}
                    className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
              >
                <Download className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {isImage && (
            <div className="mt-3 flex items-center gap-3">
              <div className="text-xs text-gray-500">
                Zoom: {Math.round(zoom * 100)}%
              </div>
              <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${((zoom - 0.5) / 2.5) * 100}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div 
          id="proof-content"
          className="flex-1 overflow-auto p-6 flex items-center justify-center"
          style={{ 
            background: 'radial-gradient(circle at center, rgba(251,146,60,0.05) 0%, transparent 70%)'
          }}
        >
          <AnimatePresence mode="wait">
            {isImage ? (
              <motion.div
                key="image"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <motion.img
                  src={fileUrl}
                  alt="Comprovante"
                  className="max-w-full max-h-[calc(90vh-180px)] object-contain rounded-xl shadow-2xl"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease-out',
                  }}
                />
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 via-transparent to-orange-600/20 rounded-xl blur-3xl -z-10" />
              </motion.div>
            ) : isPDF ? (
              <motion.div
                key="pdf"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-orange-500/20"
              >
                <iframe
                  src={fileUrl}
                  className="w-full h-full bg-white"
                  title="Comprovante PDF"
                  style={{ minHeight: 'calc(90vh - 180px)' }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="unsupported"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                  <Download className="w-10 h-10 text-orange-400" />
                </div>
                <p className="text-lg text-white mb-2">Tipo de arquivo não suportado para visualização</p>
                <p className="text-sm text-gray-400 mb-6">Clique no botão abaixo para fazer download</p>
                <Button
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Arquivo
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="sticky bottom-0 backdrop-blur-xl bg-black/80 border-t border-orange-500/20 p-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>Formato: {fileExtension.toUpperCase()}</span>
              {isImage && <span>Rotação: {rotation}°</span>}
            </div>
            <span>Use os controles acima para navegar</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}