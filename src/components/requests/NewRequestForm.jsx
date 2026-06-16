import React, { useState, useRef, useCallback, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, FileText, Calculator, Server, Check, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from "@/components/ui/use-toast";
import { withRetry, getFriendlyError, isOnline } from '@/components/utils/apiHelper';

const DS_INPUT = { width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(167,139,250,0.18)", borderRadius:10, color:"#fff", fontSize:13, padding:"10px 14px", outline:"none", fontFamily:"inherit", transition:"border-color 0.15s, box-shadow 0.15s" };
const INPUT_FOCUS = { borderColor:"rgba(167,139,250,0.5)", boxShadow:"0 0 0 3px rgba(167,139,250,0.1)" };

const FieldInput = ({ onBlur, ...props }) => (
  <input
    {...props}
    style={DS_INPUT}
    onFocus={e=>{ Object.assign(e.target.style, INPUT_FOCUS); }}
    onBlur={e=>{ e.target.style.borderColor="rgba(167,139,250,0.18)"; e.target.style.boxShadow="none"; if(onBlur) onBlur(e); }}
  />
);

export default function NewRequestForm({ request, servers, user, onSuccess, onCancel }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    server_id: request?.server_snapshot?.id || "", // Note: snapshot might not have ID if it's old, but we use server list mainly
    requested_credits: request?.requested_credits?.toString() || "",
    login: request?.login || "",
    notes: request?.notes || ""
  });
  
  // Tentar encontrar o servidor original na lista de servidores disponíveis
  // Se for edição, usamos o do request, mas precisamos mapear para um objeto da lista 'servers' se possível
  // ou usar o snapshot se o servidor original foi deletado (edge case)
  const initialServer = request 
    ? servers.find(s => s.name === request.server_snapshot?.name) 
    : null;

  const [selectedServer, setSelectedServer] = useState(initialServer || null);
  const [proofFile, setProofFile] = useState(null);
  const [existingProofUrl, setExistingProofUrl] = useState(request?.proof_of_payment_url || null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const validationTimeoutRef = useRef(null);

  const isPostpaid = user?.payment_type === 'postpaid';

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const validateField = useCallback((fieldName, value) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      const errors = { ...validationErrors };

      switch (fieldName) {
        case 'requested_credits': {
          const credits = parseInt(value);
          if (!value || value.trim() === '') {
            errors.requested_credits = 'Campo obrigatório';
          } else if (isNaN(credits) || credits <= 0) {
            errors.requested_credits = 'Deve ser um número positivo';
          } else if (credits > 1000000) {
            errors.requested_credits = 'Máximo de 1.000.000 créditos';
          } else {
            delete errors.requested_credits;
          }
          break;
        }

        case 'login':
          if (!value || value.trim() === '') {
            errors.login = 'Campo obrigatório';
          } else {
            delete errors.login;
          }
          break;

        case 'notes':
          if (value && value.length > 500) {
            errors.notes = 'Máximo de 500 caracteres';
          } else {
            delete errors.notes;
          }
          break;

        default:
          break;
      }

      setValidationErrors(errors);
    }, 300);
  }, [validationErrors]);

  const handleServerChange = useCallback((server) => {
    if (!server) {
      setError("Servidor inválido.");
      return;
    }
    setSelectedServer(server);
    setFormData(prev => ({
      ...prev,
      server_id: server.id,
      login: server.username || prev.login || ""
    }));
    setError("");
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo: 10MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo não permitido. Use: JPG, PNG, GIF ou PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setProofFile(file);
    setError("");
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.proof;
      return newErrors;
    });
  }, []);

  const removeFile = useCallback(() => {
    setProofFile(null);
    setExistingProofUrl(null); // Também remove URL existente se houver
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const calculateTotal = useCallback(() => {
    if (!selectedServer || !formData.requested_credits) return 0;
    const credits = parseInt(formData.requested_credits) || 0;
    const valuePerCredit = selectedServer.value_per_credit || 0;
    return credits * valuePerCredit;
  }, [selectedServer, formData.requested_credits]);

  const validateForm = useCallback(() => {
    const errors = {};

    if (!selectedServer) errors.server = 'Selecione um servidor';
    
    if (!formData.requested_credits || formData.requested_credits.trim() === '') {
      errors.requested_credits = 'Campo obrigatório';
    } else {
      const credits = parseInt(formData.requested_credits);
      if (isNaN(credits) || credits <= 0) {
        errors.requested_credits = 'Deve ser um número positivo';
      } else if (credits > 1000000) {
        errors.requested_credits = 'Máximo de 1.000.000 créditos';
      }
    }

    if (!formData.login || formData.login.trim() === '') {
      errors.login = 'Campo obrigatório';
    }

    if (!isPostpaid && !proofFile && !existingProofUrl) {
      errors.proof = 'Comprovante obrigatório';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedServer, proofFile, isPostpaid]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // Verificar conexão antes de tentar
    if (!isOnline()) {
      setError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      toast({ title: "Sem conexão", description: "Verifique sua internet.", variant: "destructive", duration: 3000 });
      return;
    }

    setError("");
    setValidationErrors({});

    if (!validateForm()) {
      setError("Corrija os erros no formulário.");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload comprovante com retry automático
      let fileUrl = existingProofUrl;
      if (proofFile) {
        setUploadingFile(true);
        const uploadResult = await withRetry(() =>
          remoteClient.uploads.upload(proofFile)
        );
        
        if (!uploadResult?.fileUrl) {
          throw new Error('Falha no upload do comprovante');
        }
        fileUrl = uploadResult.fileUrl;
        setUploadingFile(false);
      }

      const totalValue = calculateTotal();
      if (totalValue <= 0) {
        throw new Error('Valor total inválido');
      }

      const newRequestData = {
        server_id: selectedServer.id,
        requested_credits: parseInt(formData.requested_credits),
        login: formData.login.trim(),
        proof_of_payment_url: fileUrl,
        notes: formData.notes?.trim() || "",
        payment_type: isPostpaid ? "postpaid" : "prepaid",
      };

      if (request) {
        throw new Error('Edicao de pedidos ainda nao esta disponivel na API operacional.');
      }

      const createdOperationalRequest = await withRetry(() =>
        remoteClient.creditRequests.create(newRequestData)
      );
      if (!createdOperationalRequest?.id) {
        throw new Error('Erro ao criar pedido: resposta invalida do servidor');
      }

      toast({
        title: "✅ Pedido Criado",
        description: `${createdOperationalRequest.requested_credits.toLocaleString('pt-BR')} créditos`,
        duration: 2000
      });
      onSuccess();
      return;

    } catch (err) {
      console.error("Erro ao submeter pedido:", err);
      const friendlyMsg = getFriendlyError(err);
      setError(friendlyMsg);
      toast({
        title: "Erro ao criar pedido",
        description: friendlyMsg,
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const DS = {
    card: { background:"linear-gradient(160deg,#111114 0%,#0d0d10 50%,#0a0a0d 100%)", border:"1px solid rgba(167,139,250,0.18)", borderRadius:18, boxShadow:"0 0 0 1px rgba(167,139,250,0.06) inset, 0 8px 32px rgba(0,0,0,0.7), 0 0 40px rgba(167,139,250,0.06)", padding:"24px" },
    label: { fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8, display:"block" },
    input: DS_INPUT,
    inputFocus: INPUT_FOCUS,
  };

  // FieldInput moved outside component to avoid re-mount on re-render

  // Bloqueio - Usuário sem telefone
  if (!user.phone) {
    return (
      <div style={DS.card}>
        <div style={{ height:3, background:"linear-gradient(90deg,#ef4444,#ef4444cc 45%,#a78bfa 75%,transparent)", borderRadius:"18px 18px 0 0", margin:"-24px -24px 20px", boxShadow:"0 0 16px rgba(239,68,68,0.6)" }} />
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", borderRadius:14, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)" }}>
          <AlertTriangle style={{ width:18, height:18, color:"#fca5a5", flexShrink:0, marginTop:1 }} />
          <div>
            <p style={{ fontSize:13, fontWeight:800, color:"#fca5a5", margin:"0 0 6px" }}>WhatsApp não cadastrado!</p>
            <p style={{ fontSize:12, color:"rgba(252,165,165,0.7)", margin:"0 0 14px" }}>Cadastre seu WhatsApp para criar pedidos.</p>
            <div style={{ display:"flex", gap:8 }}>
              <Link to={createPageUrl("Profile")}>
                <button style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)", color:"#fca5a5", cursor:"pointer" }}>
                  <Phone style={{ width:12, height:12 }} /> Cadastrar
                </button>
              </Link>
              <button onClick={onCancel} style={{ padding:"8px 16px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>Voltar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sem servidores
  if (!servers || servers.length === 0) {
    return (
      <div style={DS.card}>
        <div style={{ height:3, background:"linear-gradient(90deg,#f59e0b,#f59e0bcc 45%,#a78bfa 75%,transparent)", borderRadius:"18px 18px 0 0", margin:"-24px -24px 20px", boxShadow:"0 0 16px rgba(245,158,11,0.6)" }} />
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <AlertCircle style={{ width:40, height:40, color:"#fcd34d", margin:"0 auto 12px" }} />
          <p style={{ fontSize:14, fontWeight:800, color:"#fcd34d", margin:"0 0 6px" }}>Você ainda não está cadastrado em nenhum servidor</p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", margin:"0 0 4px" }}>Para fazer pedidos, primeiro acesse a página <strong style={{ color:"#a78bfa" }}>Servidores</strong></p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)", margin:"0 0 16px" }}>e clique em "Cadastrar-se" em pelo menos um servidor.</p>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            <Link to={createPageUrl("Servers")}>
              <button style={{ padding:"8px 20px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.35)", color:"#a78bfa", cursor:"pointer" }}>
                Ir para Servidores
              </button>
            </Link>
            <button onClick={onCancel} style={{ padding:"8px 20px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>Fechar</button>
          </div>
        </div>
      </div>
    );
  }

  const total = calculateTotal();
  const accentColor = "#a78bfa";
  const accentGlow = "rgba(167,139,250,0.4)";

  return (
    <div style={DS.card}>
      {/* Top strip */}
      <div style={{ height:3, background:"linear-gradient(90deg,#a78bfa,#a78bfacc 45%,#22d3ee 75%,transparent)", borderRadius:"18px 18px 0 0", margin:"-24px -24px 20px", boxShadow:"0 0 16px rgba(167,139,250,0.7)" }} />
      {/* Glow */}
      <div style={{ position:"absolute", top:-50, right:-50, width:160, height:160, background:"#a78bfa", borderRadius:"50%", filter:"blur(80px)", opacity:0.07, pointerEvents:"none" }} />

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, position:"relative" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,rgba(167,139,250,0.25),rgba(167,139,250,0.08))", border:"1.5px solid rgba(167,139,250,0.4)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 16px rgba(167,139,250,0.3)" }}>
              <CreditCard style={{ width:16, height:16, color:accentColor, filter:"drop-shadow(0 0 4px rgba(167,139,250,0.8))" }} />
            </div>
            <p style={{ fontSize:16, fontWeight:900, color:"#fff", margin:0, letterSpacing:"-0.02em" }}>{request ? "Editar Pedido" : "Novo Pedido"}</p>
          </div>
          {isPostpaid && <p style={{ fontSize:11, color:"#fdba74", margin:"6px 0 0 44px", display:"flex", alignItems:"center", gap:4 }}><CreditCard style={{ width:11, height:11 }} /> Pós-Pago: Comprovante opcional</p>}
        </div>
        <button onClick={onCancel} disabled={loading} style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.3)", transition:"all 0.15s" }}
          onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="rgba(255,255,255,0.3)"; }}>
          <X style={{ width:14, height:14 }} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Error */}
        {error && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 14px", borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.28)", marginBottom:18 }}>
            <AlertCircle style={{ width:13, height:13, color:"#fca5a5", flexShrink:0 }} />
            <p style={{ fontSize:12, color:"rgba(252,165,165,0.9)", margin:0 }}>{error}</p>
          </div>
        )}

        {/* Servidores */}
        <div style={{ marginBottom:18 }}>
          <span style={DS.label}>
            Servidor * {validationErrors.server && <span style={{ color:"#fca5a5", textTransform:"none", fontSize:10 }}>— {validationErrors.server}</span>}
          </span>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:8 }}>
            {servers.map(server => {
              const active = selectedServer?.id === server.id;
              return (
                <button key={server.id} type="button" onClick={() => handleServerChange(server)} disabled={loading}
                  style={{ padding:"12px 14px", borderRadius:14, background: active ? "linear-gradient(135deg,rgba(167,139,250,0.18),rgba(167,139,250,0.06))" : "rgba(255,255,255,0.03)", border: active ? "1.5px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.08)", cursor:"pointer", textAlign:"left", transition:"all 0.2s", boxShadow: active ? `0 0 20px rgba(167,139,250,0.2), 0 4px 16px rgba(0,0,0,0.4)` : "none", transform: active ? "translateY(-1px)" : "translateY(0)" }}
                  onMouseEnter={e=>{ if(!active){ e.currentTarget.style.border="1px solid rgba(167,139,250,0.25)"; e.currentTarget.style.background="rgba(167,139,250,0.06)"; }}}
                  onMouseLeave={e=>{ if(!active){ e.currentTarget.style.border="1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background: active ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Server style={{ width:14, height:14, color: active ? accentColor : "rgba(255,255,255,0.3)" }} />
                      </div>
                      <div>
                        <p style={{ fontSize:12, fontWeight:800, color: active ? accentColor : "#fff", margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:130 }}>{server.name || "Servidor"}</p>
                        <p style={{ fontSize:10, color: active ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.25)", margin:0 }}>R$ {Number(server.value_per_credit||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}/cr</p>
                      </div>
                    </div>
                    {active && <div style={{ width:18, height:18, borderRadius:"50%", background:accentColor, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 8px ${accentGlow}` }}><Check style={{ width:10, height:10, color:"#0a0a0a" }} /></div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Créditos e Login */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div>
            <span style={DS.label}>Créditos * {validationErrors.requested_credits && <span style={{ color:"#fca5a5", textTransform:"none" }}>— {validationErrors.requested_credits}</span>}</span>
            <FieldInput type="number" min="1" max="1000000" value={formData.requested_credits} placeholder="Ex: 1000" disabled={loading}
              onChange={e=>setFormData(p=>({...p,requested_credits:e.target.value}))}
              onBlur={e=>validateField('requested_credits',e.target.value)}
              style={{ ...DS.input, borderColor: validationErrors.requested_credits ? "rgba(239,68,68,0.5)" : "rgba(167,139,250,0.18)" }}
            />
          </div>
          <div>
            <span style={DS.label}>Login * {validationErrors.login && <span style={{ color:"#fca5a5", textTransform:"none" }}>— {validationErrors.login}</span>}</span>
            <FieldInput value={formData.login} placeholder="Login para recebimento" disabled={loading}
              onChange={e=>setFormData(p=>({...p,login:e.target.value}))}
              onBlur={e=>validateField('login',e.target.value)}
              style={{ ...DS.input, borderColor: validationErrors.login ? "rgba(239,68,68,0.5)" : "rgba(167,139,250,0.18)" }}
            />
          </div>
        </div>

        {/* Observações */}
        <div style={{ marginBottom:14 }}>
          <span style={{ ...DS.label, display:"flex", justifyContent:"space-between" }}>
            <span>Observações</span>
            <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>{formData.notes.length}/500</span>
          </span>
          <textarea value={formData.notes} onChange={e=>setFormData(p=>({...p,notes:e.target.value}))} placeholder="Opcional..." rows={2} maxLength={500} disabled={loading}
            style={{ ...DS.input, resize:"none" }}
            onFocus={e=>{ Object.assign(e.target.style, DS.inputFocus); }}
            onBlur={e=>{ e.target.style.borderColor="rgba(167,139,250,0.18)"; e.target.style.boxShadow="none"; }}
          />
        </div>

        {/* Upload */}
        <div style={{ marginBottom:18 }}>
          <span style={DS.label}>Comprovante {isPostpaid ? "(Opcional)" : "*"} {validationErrors.proof && <span style={{ color:"#fca5a5", textTransform:"none" }}>— {validationErrors.proof}</span>}</span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf" onChange={handleFileChange} disabled={loading||uploadingFile} className="hidden" id="proof-upload" />
          {proofFile || existingProofUrl ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderRadius:12, background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <FileText style={{ width:18, height:18, color:accentColor }} />
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:accentColor, margin:0 }}>{proofFile ? proofFile.name : "Comprovante Existente"}</p>
                  {proofFile && <p style={{ fontSize:10, color:"rgba(255,255,255,0.3)", margin:0 }}>{(proofFile.size/1024).toFixed(1)} KB</p>}
                  {existingProofUrl && !proofFile && <p style={{ fontSize:10, color:"#86efac", margin:0 }}>Arquivo mantido</p>}
                </div>
              </div>
              <button type="button" onClick={removeFile} disabled={loading} style={{ width:26, height:26, borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X style={{ width:12, height:12, color:"#fca5a5" }} />
              </button>
            </div>
          ) : (
            <label htmlFor="proof-upload" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", borderRadius:14, border:"1.5px dashed rgba(167,139,250,0.2)", background:"rgba(167,139,250,0.03)", cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(167,139,250,0.4)"; e.currentTarget.style.background="rgba(167,139,250,0.06)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(167,139,250,0.2)"; e.currentTarget.style.background="rgba(167,139,250,0.03)"; }}>
              {uploadingFile
                ? <Loader2 style={{ width:22, height:22, color:accentColor, animation:"spin 0.7s linear infinite" }} />
                : <><Upload style={{ width:20, height:20, color:"rgba(167,139,250,0.5)", marginBottom:6 }} />
                   <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)", margin:0 }}>Clique para selecionar</p>
                   <p style={{ fontSize:10, color:"rgba(255,255,255,0.18)", margin:"3px 0 0" }}>JPG, PNG, GIF ou PDF (máx. 10MB)</p></>}
            </label>
          )}
        </div>

        {/* Resumo */}
        {selectedServer && formData.requested_credits && total > 0 && (
          <div style={{ padding:"14px 18px", borderRadius:14, background:"linear-gradient(135deg,rgba(167,139,250,0.12),rgba(34,211,238,0.06))", border:"1px solid rgba(167,139,250,0.28)", marginBottom:18, boxShadow:"0 0 20px rgba(167,139,250,0.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <Calculator style={{ width:14, height:14, color:accentColor }} />
              <p style={{ fontSize:11, fontWeight:800, color:accentColor, textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>Resumo</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                { label:"Servidor", value:selectedServer.name },
                { label:"Créditos", value:parseInt(formData.requested_credits).toLocaleString('pt-BR') },
              ].map(item=>(
                <div key={item.label} style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>{item.label}:</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.8)" }}>{item.value}</span>
                </div>
              ))}
              <div style={{ height:1, background:"rgba(167,139,250,0.15)", margin:"4px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, fontWeight:800, color:"#fff" }}>Total:</span>
                <span style={{ fontSize:20, fontWeight:900, color:accentColor, letterSpacing:"-0.03em", textShadow:`0 0 16px ${accentGlow}` }}>
                  R$ {total.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, paddingTop:4 }}>
          <button type="button" onClick={onCancel} disabled={loading}
            style={{ padding:"9px 18px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading||uploadingFile}
            style={{ padding:"9px 24px", borderRadius:10, fontSize:12, fontWeight:800, background:`linear-gradient(135deg,rgba(167,139,250,0.3),rgba(167,139,250,0.12))`, border:`1.5px solid rgba(167,139,250,0.5)`, color:accentColor, cursor:(loading||uploadingFile)?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:`0 0 20px rgba(167,139,250,0.2)`, opacity:(loading||uploadingFile)?0.6:1, transition:"all 0.2s" }}
            onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.boxShadow=`0 0 30px rgba(167,139,250,0.4)`; e.currentTarget.style.transform="translateY(-1px)"; }}}
            onMouseLeave={e=>{ e.currentTarget.style.boxShadow=`0 0 20px rgba(167,139,250,0.2)`; e.currentTarget.style.transform="translateY(0)"; }}>
            {(loading||uploadingFile) ? <Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> : <Check style={{ width:13, height:13 }} />}
            {loading ? "Salvando..." : uploadingFile ? "Enviando..." : request ? "Salvar Alterações" : "Criar Pedido"}
          </button>
        </div>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}



