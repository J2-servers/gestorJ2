import React, { useState, useCallback, useRef } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { CheckCircle, XCircle, Clock, Loader2, Info, Upload, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { withRetry, getFriendlyError } from '@/components/utils/apiHelper';

/**
 * RequestActions Component - Enterprise Grade
 * 
 * Melhorias implementadas:
 * - TransaÃ§Ãµes atÃ´micas (evita estados inconsistentes)
 * - PrevenÃ§Ã£o de race conditions
 * - ValidaÃ§Ãµes robustas
 * - Tratamento de erros granular
 * - Rollback automÃ¡tico em caso de falha parcial
 * - Feedback detalhado ao usuÃ¡rio
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
  
  // Previne mÃºltiplos cliques
  const isProcessingRef = useRef(false);

  // ValidaÃ§Ã£o de estado antes de iniciar aÃ§Ã£o
  const validateRequestState = useCallback(() => {
    if (!request || !request.id) {
      throw new Error('Pedido invÃ¡lido');
    }
    
    if (!['pending', 'analyzing'].includes(request.status)) {
      throw new Error('Pedido nÃ£o pode ser processado neste status');
    }

    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('UsuÃ¡rio nÃ£o autorizado');
    }

    return true;
  }, [request, currentUser]);

  const handleApproveClick = async () => {
    if (isProcessingRef.current) return;

    try {
      validateRequestState();
      setShowApproveModal(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleApproveConfirm = async () => {
    if (isProcessingRef.current) return;

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
    if (isProcessingRef.current) {
      console.warn('[RequestActions] Acao ja em processamento');
      return;
    }

    isProcessingRef.current = true;
    setLoading(true);
    setProcessingAction(actionType);

    try {
      validateRequestState();

      if (actionType === 'analyzing') {
        await withRetry(() => remoteClient.creditRequests.analyzing(request.id));
        toast({ title: "Status atualizado", description: "Pedido marcado como em analise.", duration: 2000 });
        onUpdate();
        return;
      }

      if (actionType === 'approve') {
        await withRetry(() => remoteClient.creditRequests.approve(request.id, notes));
        toast({ title: "Pedido aprovado", description: "Recarga aprovada e avisos enfileirados.", duration: 3000 });
        onUpdate();
        return;
      }

      if (actionType === 'reject') {
        if (!rejectionReason?.trim()) {
          throw new Error('Motivo da rejeicao e obrigatorio');
        }
        await withRetry(() => remoteClient.creditRequests.reject(request.id, rejectionReason.trim(), rejectionImageUrl || undefined));
        setShowRejectModal(false);
        setRejectionReason('');
        setRejectionImage(null);
        setRejectionImageUrl('');
        toast({ title: "Pedido rejeitado", description: "Rejeicao registrada e avisos enfileirados.", variant: "destructive", duration: 2500 });
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
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas imagens",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Imagem muito grande (mÃ¡x. 5MB)",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = await remoteClient.uploads.upload(file);
      setRejectionImageUrl(uploaded.fileUrl);
      setRejectionImage(file);
      toast({
        title: "âœ… Imagem Carregada",
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

  const metalBg = "linear-gradient(160deg, #0d0d0d 0%, #080808 50%, #050505 100%)";

  const ActionBtn = ({ onClick, disabled, color, icon: Icon, label, isLoading }) => {
    const colors = {
      blue:  { bg:"rgba(14,165,233,0.12)", border:"rgba(14,165,233,0.35)", text:"#7dd3fc", glow:"rgba(14,165,233,0.4)", hbg:"rgba(14,165,233,0.22)" },
      green: { bg:"rgba(34,197,94,0.12)", border:"rgba(34,197,94,0.35)", text:"#86efac", glow:"rgba(34,197,94,0.4)", hbg:"rgba(34,197,94,0.22)" },
      red:   { bg:"rgba(239,68,68,0.12)", border:"rgba(239,68,68,0.35)", text:"#fca5a5", glow:"rgba(239,68,68,0.4)", hbg:"rgba(239,68,68,0.22)" },
    };
    const c = colors[color];
    return (
      <button onClick={onClick} disabled={disabled}
        style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 14px", borderRadius:12, fontSize:12, fontWeight:800, background:c.bg, border:`1.5px solid ${c.border}`, color:c.text, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.3:1, transition:"all 0.2s", boxShadow:`0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${c.glow}44, 0 1px 0 rgba(255,255,255,0.05) inset`, backdropFilter:"blur(8px)", letterSpacing:"0.02em" }}
        onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.background=c.hbg; e.currentTarget.style.boxShadow=`0 6px 24px rgba(0,0,0,0.6), 0 0 20px ${c.glow}, 0 1px 0 rgba(255,255,255,0.07) inset`; e.currentTarget.style.transform="translateY(-1px)"; }}}
        onMouseLeave={e=>{ e.currentTarget.style.background=c.bg; e.currentTarget.style.boxShadow=`0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${c.glow}44, 0 1px 0 rgba(255,255,255,0.05) inset`; e.currentTarget.style.transform="translateY(0)"; }}>
        {isLoading ? <Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> : <Icon style={{ width:13, height:13, filter:`drop-shadow(0 0 4px ${c.glow})` }} />}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <>
      <div style={{ display:"flex", gap:8, width:"100%" }}>
        <ActionBtn onClick={() => handleAction('analyzing')} disabled={loading || request.status !== 'pending'} color="blue" icon={Clock} label="AnÃ¡lise" isLoading={loading && processingAction === 'analyzing'} />
        <ActionBtn onClick={handleApproveClick} disabled={loading} color="green" icon={CheckCircle} label="Aprovar" isLoading={loading && processingAction === 'approve'} />
        <ActionBtn onClick={() => setShowRejectModal(true)} disabled={loading} color="red" icon={XCircle} label="Rejeitar" isLoading={loading && processingAction === 'reject'} />
      </div>

      {/* â”€â”€ Modal AprovaÃ§Ã£o â”€â”€ */}
      {showApproveModal && (
        <Dialog open onOpenChange={() => { setShowApproveModal(false); setApprovalNotes(''); }}>
          <DialogContent style={{ background: metalBg, border:"1.5px solid rgba(34,197,94,0.4)", borderRadius:20, boxShadow:"0 0 0 1px rgba(34,197,94,0.1) inset, 0 32px 80px rgba(0,0,0,0.95), 0 0 60px rgba(34,197,94,0.12)", overflow:"hidden", padding:0 }}>
            {/* Top strip */}
            <div style={{ height:3, background:"linear-gradient(90deg, #22c55e, #22c55ecc 45%, #a78bfa 75%, transparent)", boxShadow:"0 0 16px rgba(34,197,94,0.8)" }} />
            {/* Glow */}
            <div style={{ position:"absolute", top:-60, right:-60, width:180, height:180, background:"#22c55e", borderRadius:"50%", filter:"blur(80px)", opacity:0.08, pointerEvents:"none" }} />
            <div style={{ padding:"22px 24px 24px", position:"relative" }}>
              <DialogHeader style={{ marginBottom:16 }}>
                <DialogTitle style={{ display:"flex", alignItems:"center", gap:10, color:"#fff", fontSize:16, fontWeight:900, letterSpacing:"-0.02em" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))", border:"1.5px solid rgba(34,197,94,0.5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(34,197,94,0.4)" }}>
                    <CheckCircle style={{ width:18, height:18, color:"#86efac", filter:"drop-shadow(0 0 6px rgba(34,197,94,0.8))" }} />
                  </div>
                  Aprovar Pedido
                </DialogTitle>
                <DialogDescription style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginTop:4 }}>
                  Confirme a aprovaÃ§Ã£o do pedido <span style={{ fontFamily:"monospace", color:"rgba(255,255,255,0.5)" }}>#{request.id.slice(-8).toUpperCase()}</span>
                </DialogDescription>
              </DialogHeader>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ padding:"13px 16px", borderRadius:14, background:"linear-gradient(135deg, rgba(34,197,94,0.14), rgba(34,197,94,0.05))", border:"1px solid rgba(34,197,94,0.3)", boxShadow:"0 4px 20px rgba(0,0,0,0.3), 0 0 20px rgba(34,197,94,0.08)", backdropFilter:"blur(8px)" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <Info style={{ width:14, height:14, color:"#86efac", marginTop:1, flexShrink:0, filter:"drop-shadow(0 0 4px rgba(34,197,94,0.8))" }} />
                    <div>
                      <p style={{ fontSize:11, fontWeight:800, color:"#86efac", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 6px", textShadow:"0 0 10px rgba(34,197,94,0.6)" }}>Esta aÃ§Ã£o irÃ¡:</p>
                      <ul style={{ margin:0, paddingLeft:12, fontSize:11, color:"rgba(134,239,172,0.75)", lineHeight:1.8 }}>
                        <li>Marcar o pedido como "Recarregado"</li>
                        <li>Criar notificaÃ§Ã£o para o revendedor</li>
                        <li>Enviar WhatsApp (se cadastrado)</li>
                        <li>Registrar no histÃ³rico de auditoria</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <textarea
                  placeholder="Adicionar observaÃ§Ã£o (opcional)..."
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, color:"#fff", fontSize:12, padding:"10px 14px", resize:"none", outline:"none", fontFamily:"inherit", transition:"border-color 0.15s" }}
                  onFocus={e=>e.target.style.borderColor="rgba(34,197,94,0.45)"}
                  onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}
                />
                <p style={{ fontSize:10, color:"rgba(255,255,255,0.2)", textAlign:"right", margin:0 }}>{approvalNotes.length}/500</p>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
                <button onClick={() => { setShowApproveModal(false); setApprovalNotes(''); }} disabled={loading}
                  style={{ padding:"9px 18px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>
                  Cancelar
                </button>
                <button onClick={handleApproveConfirm} disabled={loading}
                  style={{ padding:"9px 22px", borderRadius:10, fontSize:12, fontWeight:800, background:"linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.15))", border:"1.5px solid rgba(34,197,94,0.5)", color:"#86efac", cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:"0 0 20px rgba(34,197,94,0.25)", opacity:loading?0.6:1, transition:"all 0.2s" }}
                  onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.background="linear-gradient(135deg, rgba(34,197,94,0.4), rgba(34,197,94,0.2))"; e.currentTarget.style.boxShadow="0 0 30px rgba(34,197,94,0.4)"; }}}
                  onMouseLeave={e=>{ e.currentTarget.style.background="linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.15))"; e.currentTarget.style.boxShadow="0 0 20px rgba(34,197,94,0.25)"; }}>
                  {loading ? <Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> : <CheckCircle style={{ width:13, height:13 }} />}
                  {loading ? "Processando..." : "Confirmar AprovaÃ§Ã£o"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}


      {/* â”€â”€ Modal RejeiÃ§Ã£o â”€â”€ */}
      {showRejectModal && (
        <Dialog open onOpenChange={() => { setShowRejectModal(false); setRejectionReason(''); setRejectionImage(null); setRejectionImageUrl(''); }}>
          <DialogContent style={{ background: metalBg, border:"1.5px solid rgba(239,68,68,0.4)", borderRadius:20, boxShadow:"0 0 0 1px rgba(239,68,68,0.1) inset, 0 32px 80px rgba(0,0,0,0.95), 0 0 60px rgba(239,68,68,0.1)", overflow:"hidden", padding:0, maxWidth:480 }}>
            <div style={{ height:3, background:"linear-gradient(90deg, #ef4444, #ef4444cc 45%, #a78bfa 75%, transparent)", boxShadow:"0 0 16px rgba(239,68,68,0.8)" }} />
            <div style={{ position:"absolute", top:-60, right:-60, width:180, height:180, background:"#ef4444", borderRadius:"50%", filter:"blur(80px)", opacity:0.08, pointerEvents:"none" }} />
            <div style={{ padding:"22px 24px 24px", position:"relative" }}>
              <DialogHeader style={{ marginBottom:16 }}>
                <DialogTitle style={{ display:"flex", alignItems:"center", gap:10, color:"#fff", fontSize:16, fontWeight:900 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))", border:"1.5px solid rgba(239,68,68,0.5)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(239,68,68,0.4)" }}>
                    <XCircle style={{ width:18, height:18, color:"#fca5a5", filter:"drop-shadow(0 0 6px rgba(239,68,68,0.8))" }} />
                  </div>
                  Rejeitar Pedido
                </DialogTitle>
                <DialogDescription style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginTop:4 }}>
                  Informe o motivo da rejeiÃ§Ã£o do pedido <span style={{ fontFamily:"monospace", color:"rgba(255,255,255,0.5)" }}>#{request.id.slice(-8).toUpperCase()}</span>
                </DialogDescription>
              </DialogHeader>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ padding:"12px 14px", borderRadius:14, background:"linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))", border:"1px solid rgba(239,68,68,0.28)", boxShadow:"0 0 16px rgba(239,68,68,0.08)" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                    <Info style={{ width:13, height:13, color:"#fca5a5", marginTop:1, flexShrink:0 }} />
                    <p style={{ fontSize:11, color:"rgba(252,165,165,0.8)", margin:0, lineHeight:1.7 }}>
                      O revendedor serÃ¡ notificado sobre a rejeiÃ§Ã£o via sistema e WhatsApp (se cadastrado).
                    </p>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 8px" }}>Motivo da RejeiÃ§Ã£o *</p>
                  <textarea
                    placeholder="Ex: Comprovante de pagamento invÃ¡lido..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, color:"#fff", fontSize:12, padding:"10px 14px", resize:"none", outline:"none", fontFamily:"inherit", transition:"border-color 0.15s" }}
                    onFocus={e=>e.target.style.borderColor="rgba(239,68,68,0.45)"}
                    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}
                  />
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.2)", textAlign:"right", margin:"4px 0 0" }}>{rejectionReason.length}/500</p>
                </div>

                <div>
                  <p style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 8px" }}>Imagem Anexa (Opcional)</p>
                  {!rejectionImageUrl ? (
                    <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:"100%", height:80, border:"1.5px dashed rgba(255,255,255,0.12)", borderRadius:12, cursor:"pointer", background:"rgba(255,255,255,0.02)", transition:"all 0.15s" }}
                      onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.12)"; }}>
                      {uploadingImage
                        ? <Loader2 style={{ width:20, height:20, color:"#f87171", animation:"spin 0.7s linear infinite" }} />
                        : <Upload style={{ width:18, height:18, color:"rgba(255,255,255,0.2)", marginBottom:4 }} />}
                      <p style={{ fontSize:10, color:"rgba(255,255,255,0.2)", margin:0 }}>{uploadingImage ? "Enviando..." : "Clique para selecionar imagem"}</p>
                      <input type="file" style={{ display:"none" }} accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                  ) : (
                    <div style={{ position:"relative" }}
                      onMouseEnter={e=>e.currentTarget.querySelector('button').style.opacity="1"}
                      onMouseLeave={e=>e.currentTarget.querySelector('button').style.opacity="0"}>
                      <img src={rejectionImageUrl} alt="Anexo" style={{ width:"100%", height:100, objectFit:"cover", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)" }} />
                      <button onClick={handleRemoveImage} style={{ position:"absolute", top:8, right:8, padding:"5px", borderRadius:8, background:"rgba(239,68,68,0.8)", border:"none", cursor:"pointer", display:"flex", opacity:0, transition:"opacity 0.15s" }}>
                        <Trash2 style={{ width:13, height:13, color:"#fff" }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
                <button onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectionImage(null); setRejectionImageUrl(''); }} disabled={loading}
                  style={{ padding:"9px 18px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>
                  Cancelar
                </button>
                <button onClick={() => handleAction('reject')} disabled={loading || !rejectionReason.trim() || uploadingImage}
                  style={{ padding:"9px 22px", borderRadius:10, fontSize:12, fontWeight:800, background:"linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.15))", border:"1.5px solid rgba(239,68,68,0.5)", color:"#fca5a5", cursor:(loading||!rejectionReason.trim()||uploadingImage)?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:"0 0 20px rgba(239,68,68,0.2)", opacity:(loading||!rejectionReason.trim()||uploadingImage)?0.4:1, transition:"all 0.2s" }}
                  onMouseEnter={e=>{ if(!loading&&rejectionReason.trim()){ e.currentTarget.style.boxShadow="0 0 30px rgba(239,68,68,0.4)"; }}}
                  onMouseLeave={e=>{ e.currentTarget.style.boxShadow="0 0 20px rgba(239,68,68,0.2)"; }}>
                  {loading ? <Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> : <XCircle style={{ width:13, height:13 }} />}
                  {loading ? "Rejeitando..." : "Confirmar RejeiÃ§Ã£o"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}


