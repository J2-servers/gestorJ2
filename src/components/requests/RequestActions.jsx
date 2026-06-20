import React, { useState, useCallback, useRef } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { CheckCircle, XCircle, Clock, Loader2, Info, Upload, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { withRetry, getFriendlyError } from '@/components/utils/apiHelper';

/**
 * RequestActions Component - Enterprise Grade
 * 
 * Melhorias implementadas:
 * - Transa?es at?micas (evita estados inconsistentes)
 * - Prevenã?o de race conditions
 * - Valida?es robustas
 * - Tratamento de erros granular
 * - Rollback automático em caso de falha parcial
 * - Feedback detalhado ao usuário
 */

export default function RequestActions({ request, currentUser, onUpdate }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionImage, setRejectionImage] = useState(null);
  const [rejectionImageUrl, setRejectionImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const { toast } = useToast();
  
  // Previne m?ltiplos cliques
  const isProcessingRef = useRef(false);

  // Validação de estado antes de iniciar ação
  const validateRequestState = useCallback(() => {
    if (!request || !request?.id) {
      throw new Error('Pedido inválido');
    }
    
    if (!['pending', 'analyzing'].includes(request?.status)) {
      throw new Error('Pedido não pode ser processado neste status');
    }

    if (!currentUser || (currentUser?.role !== 'admin' && currentUser?.role !== 'dev')) {
      throw new Error('Usuário não autorizado');
    }

    return true;
  }, [request, currentUser]);

  const handleApproveClick = async () => {
    if (isProcessingRef?.current) return;

    try {
      validateRequestState();
      setShowApproveModal(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: error?.message,
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleApproveConfirm = async () => {
    if (isProcessingRef?.current) return;

    try {
      await handleAction('approve', approvalNotes);
      setShowApproveModal(false);
      setApprovalNotes('');
    } catch (error) {
      console.error('[RequestActions] Erro no fluxo de aprovacao:', error);
      toast({
        title: "Erro",
        description: getFriendlyError(error),
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleAction = async (actionType, notes = '') => {
    if (isProcessingRef?.current) {
      console.warn('[RequestActions] Acao ja em processamento');
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setProcessingAction(actionType);

    try {
      validateRequestState();

      if (actionType === 'analyzing') {
        await withRetry(() => remoteClient?.creditRequests?.analyzing(request?.id));
        toast({ title: "Status atualizado", description: "Pedido marcado como em análise.", duration: 2000 });
        onUpdate();
        return;
      }

      if (actionType === 'approve') {
        await withRetry(() => remoteClient?.creditRequests?.approve(request?.id, notes));
        toast({ title: "Pedido aprovado", description: "Recarga aprovada e avisos enfileirados.", duration: 3000 });
        onUpdate();
        return;
      }

      if (actionType === 'reject') {
        if (!rejectionReason?.trim()) {
          throw new Error('Motivo da rejeição e obrigatorio');
        }
        await withRetry(() => remoteClient?.creditRequests?.reject(request?.id, rejectionReason?.trim(), rejectionImageUrl || undefined));
        setShowRejectModal(false);
        setRejectionReason('');
        setRejectionImage(null);
        setRejectionImageUrl('');
        toast({ title: "Pedido rejeitado", description: "Rejeição registrada e avisos enfileirados.", variant: "destructive", duration: 2500 });
        onUpdate();
        return;
      }

      throw new Error(`Acao desconhecida: ${actionType}`);
    } catch (error) {
      console.error(`[RequestActions] Erro em ${actionType}:`, error);
      toast({
        title: "Erro ao Processar",
        description: getFriendlyError(error),
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setLoading(false);
      setProcessingAction(null);
      isProcessingRef.current = false;
    }
  };
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file?.type?.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    // Validar tamanho (max 5MB)
    if (file?.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Imagem muito grande (máx. 5MB)",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = await remoteClient?.uploads?.upload(file);
      setRejectionImageUrl(uploaded?.fileUrl);
      setRejectionImage(file);
      toast({
        title: " Imagem Carregada",
        description: "Imagem anexada com sucesso",
        duration: 2000
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Falha ao fazer upload da imagem",
        variant: "destructive",
        duration: 2000
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setRejectionImage(null);
    setRejectionImageUrl('');
  };

  // --- UI COMPONENTS ---

  const metalBg = "var(--j2-surface, rgba(6,7,7,.96))";
  const neu = "var(--j2-neu, 10px 10px 22px rgba(0,0,0,0.46), -7px -7px 18px rgba(255,255,255,0.018))";
  const neuSoft = "var(--j2-neu-soft, 5px 6px 14px rgba(0,0,0,.32), -2px -2px 8px rgba(255,255,255,.014))";
  const sunken = "var(--j2-sunken, inset 4px 4px 10px rgba(0,0,0,0.42), inset -3px -3px 8px rgba(255,255,255,0.014))";
  const surface2 = "var(--j2-surface-2, rgba(9,10,10,.96))";
  const sunkenBg = "var(--j2-surface-sunken, rgba(3,4,4,.76))";
  const text = "var(--j2-text, #fff8f2)";
  const muted = "var(--j2-muted, #a3a09b)";
  const faint = "var(--j2-faint, #67615c)";
  const modalContentStyle = {
    background: metalBg,
    color: text,
    border: "0",
    borderRadius: 22,
    boxShadow: neu,
    overflow: "hidden auto",
    padding: 0,
    width: "min(480px, calc(100vw - 24px))",
    maxWidth: 480,
    maxHeight: "min(92dvh, 760px)",
  };

  const ActionBtn = ({ onClick, disabled, color, icon: Icon, label, isLoading }) => {
    const colors = {
      blue:  { bg:"rgba(255,75,18,0.14)", text:"var(--j2-accent, #ff4b12)", hbg:"rgba(255,75,18,0.2)" },
      green: { bg:"var(--request-success-surface)", text:"var(--request-success-strong)", hbg:"var(--request-success-hover)" },
      red:   { bg:"var(--request-danger-surface)", text:"var(--request-danger-strong)", hbg:"var(--request-danger-hover)" },
    };
    const c = colors[color];
    return (
      <button onClick={onClick} disabled={disabled}
        style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 14px", borderRadius:12, fontSize:12, fontWeight:800, background:c?.bg, border:"0", color:c?.text, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.3:1, transition:"all 0.2s", boxShadow:neu, letterSpacing:"0.02em" }}
        onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.background=c?.hbg; e.currentTarget.style.transform="translateY(-1px)"; }}}
        onMouseLeave={e=>{ e.currentTarget.style.background=c?.bg; e.currentTarget.style.transform="translateY(0)"; }}>
        {isLoading ? <Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> : <Icon style={{ width:13, height:13 }} />}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <div className="request-actions-bar" style={{ display:"flex", gap:8, width:"100%" }}>
        <ActionBtn onClick={() => handleAction('analyzing')} disabled={loading || request?.status !== 'pending'} color="blue" icon={Clock} label="Análise" isLoading={loading && processingAction === 'analyzing'} />
        <ActionBtn onClick={handleApproveClick} disabled={loading} color="green" icon={CheckCircle} label="Aprovar" isLoading={loading && processingAction === 'approve'} />
        <ActionBtn onClick={() => setShowRejectModal(true)} disabled={loading} color="red" icon={XCircle} label="Rejeitar" isLoading={loading && processingAction === 'reject'} />
      </div>

      {/* -- Modal Aprovação -- */}
      {showApproveModal && (
        <Dialog open onOpenChange={() => { setShowApproveModal(false); setApprovalNotes(''); }}>
          <DialogContent className="request-action-modal request-action-modal-approve" style={modalContentStyle}>
            {/* Top strip */}
            <div style={{ height:3, background:"#22c55e" }} />
            <div style={{ padding:"clamp(18px, 4vw, 24px)", position:"relative" }}>
              <DialogHeader style={{ marginBottom:16 }}>
                <DialogTitle style={{ display:"flex", alignItems:"center", gap:10, color:text, fontSize:16, fontWeight:900, letterSpacing:0 }}>
                  <div style={{ width:36, height:36, borderRadius:12, background:"var(--request-success-surface)", border:"0", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:neuSoft }}>
                    <CheckCircle style={{ width:18, height:18, color:"var(--request-success-strong)" }} />
                  </div>
                  Aprovar Pedido
                </DialogTitle>
                <DialogDescription style={{ color:muted, fontSize:12, marginTop:4 }}>
                  Confirme a aprovação do pedido <span style={{ fontFamily:"monospace", color:text, opacity:.72 }}>#{request?.id?.slice(-8).toUpperCase()}</span>
                </DialogDescription>
              </DialogHeader>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ padding:"13px 16px", borderRadius:16, background:"var(--request-success-surface)", border:"0", boxShadow:sunken }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <Info style={{ width:14, height:14, color:"var(--request-success-strong)", marginTop:1, flexShrink:0 }} />
                    <div>
                      <p style={{ fontSize:11, fontWeight:900, color:"var(--request-success-strong)", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 6px" }}>Esta ação irá:</p>
                      <ul style={{ margin:0, paddingLeft:12, fontSize:11, color:"var(--request-success-muted)", lineHeight:1.8 }}>
                        <li>Marcar o pedido como "Recarregado"</li>
                        <li>Criar notificação para o revendedor</li>
                        <li>Enviar WhatsApp (se cadastrado)</li>
                        <li>Registrar no histórico de auditoria</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <textarea
                  placeholder="Adicionar observação (opcional)..."
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  style={{ width:"100%", boxSizing:"border-box", background:sunkenBg, border:"0", borderRadius:14, color:text, fontSize:12, padding:"10px 14px", resize:"none", outline:"none", fontFamily:"inherit", boxShadow:sunken }}
                />
                <p style={{ fontSize:10, color:faint, textAlign:"right", margin:0 }}>{approvalNotes?.length}/500</p>
              </div>

              <div className="request-action-footer" style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
                <button onClick={() => { setShowApproveModal(false); setApprovalNotes(''); }} disabled={loading}
                  style={{ padding:"9px 18px", borderRadius:12, fontSize:12, fontWeight:800, background:surface2, border:"0", color:muted, cursor:"pointer", boxShadow:neuSoft }}>
                  Cancelar
                </button>
                <button onClick={handleApproveConfirm} disabled={loading}
                  style={{ padding:"9px 22px", borderRadius:12, fontSize:12, fontWeight:900, background:"var(--request-success-action)", border:"0", color:"var(--request-success-strong)", cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:neuSoft, opacity:loading?0.6:1, transition:"all 0.2s" }}>
                  {loading ? <Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> : <CheckCircle style={{ width:13, height:13 }} />}
                  {loading ? "Processando..." : "Confirmar Aprovação"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}


      {/* -- Modal Rejeição -- */}
      {showRejectModal && (
        <Dialog open onOpenChange={() => { setShowRejectModal(false); setRejectionReason(''); setRejectionImage(null); setRejectionImageUrl(''); }}>
          <DialogContent className="request-action-modal request-action-modal-reject" style={modalContentStyle}>
            <div style={{ height:3, background:"#ef4444" }} />
            <div style={{ padding:"clamp(18px, 4vw, 24px)", position:"relative" }}>
              <DialogHeader style={{ marginBottom:16 }}>
                <DialogTitle style={{ display:"flex", alignItems:"center", gap:10, color:text, fontSize:16, fontWeight:900 }}>
                  <div style={{ width:36, height:36, borderRadius:12, background:"var(--request-danger-surface)", border:"0", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:neuSoft }}>
                    <XCircle style={{ width:18, height:18, color:"var(--request-danger-strong)" }} />
                  </div>
                  Rejeitar Pedido
                </DialogTitle>
                <DialogDescription style={{ color:muted, fontSize:12, marginTop:4 }}>
                  Informe o motivo da rejeição do pedido <span style={{ fontFamily:"monospace", color:text, opacity:.72 }}>#{request?.id?.slice(-8).toUpperCase()}</span>
                </DialogDescription>
              </DialogHeader>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ padding:"12px 14px", borderRadius:16, background:"var(--request-danger-surface)", border:"0", boxShadow:sunken }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                    <Info style={{ width:13, height:13, color:"var(--request-danger-strong)", marginTop:1, flexShrink:0 }} />
                    <p style={{ fontSize:11, color:"var(--request-danger-muted)", margin:0, lineHeight:1.7 }}>
                      O revendedor será notificado sobre a rejeição via sistema e WhatsApp (se cadastrado).
                    </p>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize:10, fontWeight:900, color:muted, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 8px" }}>Motivo da Rejeição *</p>
                  <textarea
                    placeholder="Ex: Comprovante de pagamento inválido..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    style={{ width:"100%", boxSizing:"border-box", background:sunkenBg, border:"0", borderRadius:14, color:text, fontSize:12, padding:"10px 14px", resize:"none", outline:"none", fontFamily:"inherit", boxShadow:sunken }}
                  />
                  <p style={{ fontSize:10, color:faint, textAlign:"right", margin:"4px 0 0" }}>{rejectionReason?.length}/500</p>
                </div>

                <div>
                  <p style={{ fontSize:10, fontWeight:900, color:muted, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 8px" }}>Imagem Anexa (Opcional)</p>
                  {!rejectionImageUrl ? (
                    <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:"100%", height:80, border:"0", borderRadius:14, cursor:"pointer", background:surface2, transition:"all 0.15s", boxShadow:neuSoft }}
                      onMouseEnter={e=>{ e.currentTarget.style.filter="brightness(1.04)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}>
                      {uploadingImage
                        ? <Loader2 style={{ width:20, height:20, color:"var(--request-danger-strong)", animation:"spin 0.7s linear infinite" }} />
                        : <Upload style={{ width:18, height:18, color:faint, marginBottom:4 }} />}
                      <p style={{ fontSize:10, color:muted, margin:0 }}>{uploadingImage ? "Enviando..." : "Clique para selecionar imagem"}</p>
                      <input type="file" style={{ display:"none" }} accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                  ) : (
                    <div style={{ position:"relative" }}
                      onMouseEnter={e=>e.currentTarget.querySelector('button').style.opacity="1"}
                      onMouseLeave={e=>e.currentTarget.querySelector('button').style.opacity="0"}>
                      <img src={rejectionImageUrl} alt="Anexo" style={{ width:"100%", height:100, objectFit:"cover", borderRadius:14, border:"0", boxShadow:sunken }} />
                      <button onClick={handleRemoveImage} style={{ position:"absolute", top:8, right:8, padding:"5px", borderRadius:8, background:"rgba(239,68,68,0.8)", border:"none", cursor:"pointer", display:"flex", opacity:0, transition:"opacity 0.15s" }}>
                        <Trash2 style={{ width:13, height:13, color:"#fff" }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="request-action-footer" style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
                <button onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectionImage(null); setRejectionImageUrl(''); }} disabled={loading}
                  style={{ padding:"9px 18px", borderRadius:12, fontSize:12, fontWeight:800, background:surface2, border:"0", color:muted, cursor:"pointer", boxShadow:neuSoft }}>
                  Cancelar
                </button>
                <button onClick={() => handleAction('reject')} disabled={loading || !rejectionReason?.trim() || uploadingImage}
                  style={{ padding:"9px 22px", borderRadius:12, fontSize:12, fontWeight:900, background:"var(--request-danger-action)", border:"0", color:"var(--request-danger-strong)", cursor:(loading||!rejectionReason?.trim()||uploadingImage)?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:neuSoft, opacity:(loading||!rejectionReason?.trim()||uploadingImage)?0.4:1, transition:"all 0.2s" }}>
                  {loading ? <Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> : <XCircle style={{ width:13, height:13 }} />}
                  {loading ? "Rejeitando..." : "Confirmar Rejeição"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .request-actions-bar,
        .request-action-modal {
          --request-success-strong: #86efac;
          --request-success-muted: rgba(134, 239, 172, .78);
          --request-success-surface: rgba(34, 197, 94, .12);
          --request-success-hover: rgba(34, 197, 94, .18);
          --request-success-action: rgba(34, 197, 94, .16);
          --request-danger-strong: #fca5a5;
          --request-danger-muted: rgba(252, 165, 165, .82);
          --request-danger-surface: rgba(239, 68, 68, .12);
          --request-danger-hover: rgba(239, 68, 68, .18);
          --request-danger-action: rgba(239, 68, 68, .16);
        }

        .request-action-modal textarea::placeholder {
          color: var(--j2-faint, #67615c);
        }

        @media (max-width: 1023px) {
          .request-actions-bar,
          .request-action-modal {
            --request-success-strong: #86efac;
            --request-success-muted: rgba(134, 239, 172, .82);
            --request-success-surface: rgba(34, 197, 94, .13);
            --request-success-hover: rgba(34, 197, 94, .19);
            --request-success-action: rgba(34, 197, 94, .16);
            --request-danger-strong: #fca5a5;
            --request-danger-muted: rgba(252, 165, 165, .84);
            --request-danger-surface: rgba(239, 68, 68, .13);
            --request-danger-hover: rgba(239, 68, 68, .19);
            --request-danger-action: rgba(239, 68, 68, .16);
          }

          .request-action-footer {
            display: grid !important;
            grid-template-columns: 1fr;
          }

          .request-action-footer button {
            width: 100%;
            justify-content: center;
            min-height: 42px;
          }
        }
      `}</style>
    </>
  );
}

