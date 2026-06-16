import React, { useState, useRef } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  X, Plus, Upload, FileText, Calculator, AlertCircle, 
  Loader2, CreditCard, Server, AlertTriangle, Phone 
} from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from "@/components/ui/use-toast";
import { withRetry, getFriendlyError, isOnline } from '@/components/utils/apiHelper';

import ServerItemForm from './ServerItemForm';

const MAX_SERVERS = 10;

export default function MultiRequestForm({ servers, user, onSuccess, onCancel }) {
  const { toast } = useToast();
  const [selectedServers, setSelectedServers] = useState([]);
  const [serverDataList, setServerDataList] = useState([]);
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);

  const isPostpaid = user?.payment_type === 'postpaid';

  const DS = {
    card: { position:"relative", background:"linear-gradient(160deg,#111114 0%,#0d0d10 50%,#0a0a0d 100%)", border:"1px solid rgba(167,139,250,0.18)", borderRadius:18, boxShadow:"0 0 0 1px rgba(167,139,250,0.06) inset, 0 8px 32px rgba(0,0,0,0.7), 0 0 40px rgba(167,139,250,0.06)", padding:"24px", overflow:"hidden" },
    label: { fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8, display:"block" },
  };
  const AC = "#a78bfa";
  const AG = "rgba(167,139,250,0.4)";

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
          <p style={{ fontSize:14, fontWeight:800, color:"#fcd34d", margin:"0 0 6px" }}>Nenhum servidor cadastrado</p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)", margin:"0 0 16px" }}>Cadastre um servidor antes de fazer pedidos.</p>
          <button onClick={onCancel} style={{ padding:"8px 20px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>Fechar</button>
        </div>
      </div>
    );
  }

  const availableServers = servers.filter(s => 
    !selectedServers.some(sel => sel.id === s.id)
  );

  const handleAddServer = (server) => {
    if (selectedServers.length >= MAX_SERVERS) {
      toast({
        title: "Limite Atingido",
        description: `Máximo de ${MAX_SERVERS} servidores por pedido.`,
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    setSelectedServers([...selectedServers, server]);
    setServerDataList([...serverDataList, {
      serverId: server.id,
      serverName: server.name,
      login: server.username || "",
      credits: "",
      notes: "",
      valuePerCredit: server.value_per_credit
    }]);
    setError("");
  };

  const handleRemoveServer = (index) => {
    setSelectedServers(selectedServers.filter((_, i) => i !== index));
    setServerDataList(serverDataList.filter((_, i) => i !== index));
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  const handleUpdateServerData = (index, newData) => {
    const updated = [...serverDataList];
    updated[index] = newData;
    setServerDataList(updated);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo: 10MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo não permitido. Use: JPG, PNG, GIF ou PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setProofFile(file);
    setError("");
  };

  const removeFile = () => {
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const errors = {};

    if (selectedServers.length === 0) {
      setError('Adicione pelo menos um servidor');
      return false;
    }

    serverDataList.forEach((data, index) => {
      const serverErrors = {};

      if (!data.credits || data.credits.trim() === '') {
        serverErrors.credits = 'Obrigatório';
      } else {
        const credits = parseInt(data.credits);
        if (isNaN(credits) || credits <= 0) {
          serverErrors.credits = 'Número positivo';
        } else if (credits > 1000000) {
          serverErrors.credits = 'Máx. 1.000.000';
        }
      }

      if (!data.login || data.login.trim() === '') {
        serverErrors.login = 'Obrigatório';
      }

      if (Object.keys(serverErrors).length > 0) {
        errors[index] = serverErrors;
      }
    });

    if (!isPostpaid && !proofFile) {
      setError('Comprovante obrigatório para pré-pago');
      errors.proof = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateGrandTotal = () => {
    return serverDataList.reduce((sum, data) => {
      const credits = parseInt(data.credits) || 0;
      const value = credits * (data.valuePerCredit || 0);
      return sum + value;
    }, 0);
  };

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
      return;
    }

    setLoading(true);

    try {
      // 1. Upload comprovante único com retry automático
      let fileUrl = null;
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

      const createdOperationalRequests = [];
      const failedOperationalRequests = [];

      for (const data of serverDataList) {
        try {
          const created = await withRetry(() => remoteClient.creditRequests.create({
            server_id: data.serverId,
            requested_credits: parseInt(data.credits),
            login: data.login.trim(),
            proof_of_payment_url: fileUrl,
            notes: data.notes?.trim() || "",
            payment_type: isPostpaid ? "postpaid" : "prepaid",
          }));

          if (!created?.id) throw new Error('Resposta invalida do servidor');
          createdOperationalRequests.push(created);
        } catch (err) {
          failedOperationalRequests.push({ server: data.serverName, error: getFriendlyError(err) });
        }
      }

      if (createdOperationalRequests.length === 0 && failedOperationalRequests.length > 0) {
        throw new Error(`Todos os ${failedOperationalRequests.length} pedidos falharam. Verifique sua conexao e tente novamente.`);
      }

      if (failedOperationalRequests.length === 0) {
        toast({ title: "Pedidos Criados", description: `${createdOperationalRequests.length} pedidos criados com sucesso!`, duration: 3000 });
      } else {
        toast({
          title: "Parcialmente Concluido",
          description: `${createdOperationalRequests.length} criados, ${failedOperationalRequests.length} falharam: ${failedOperationalRequests.map(f => f.server).join(', ')}`,
          variant: "destructive",
          duration: 5000
        });
      }

      onSuccess();
      return;

    } catch (err) {
      console.error("Erro ao criar pedidos:", err);
      const friendlyMsg = getFriendlyError(err);
      setError(friendlyMsg);
      toast({
        title: "Erro ao criar pedidos",
        description: friendlyMsg,
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const grandTotal = calculateGrandTotal();

  return (
    <div style={DS.card}>
      {/* Top strip */}
      <div style={{ height:3, background:"linear-gradient(90deg,#a78bfa,#a78bfacc 45%,#22d3ee 75%,transparent)", borderRadius:"18px 18px 0 0", margin:"-24px -24px 20px", boxShadow:"0 0 16px rgba(167,139,250,0.7)" }} />
      {/* Glow */}
      <div style={{ position:"absolute", top:-50, right:-50, width:160, height:160, background:"#a78bfa", borderRadius:"50%", filter:"blur(80px)", opacity:0.07, pointerEvents:"none", zIndex:0 }} />

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,rgba(167,139,250,0.25),rgba(167,139,250,0.08))", border:"1.5px solid rgba(167,139,250,0.4)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 16px rgba(167,139,250,0.3)" }}>
            <Plus style={{ width:16, height:16, color:AC, filter:"drop-shadow(0 0 4px rgba(167,139,250,0.8))" }} />
          </div>
          <div>
            <p style={{ fontSize:16, fontWeight:900, color:"#fff", margin:0, letterSpacing:"-0.02em" }}>Pedido Múltiplo</p>
            {isPostpaid && <p style={{ fontSize:11, color:"#fdba74", margin:"3px 0 0", display:"flex", alignItems:"center", gap:4 }}><CreditCard style={{ width:11, height:11 }} /> Pós-Pago: Comprovante opcional</p>}
          </div>
        </div>
        <button onClick={onCancel} disabled={loading} style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.3)" }}
          onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="rgba(255,255,255,0.3)"; }}>
          <X style={{ width:14, height:14 }} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ position:"relative", zIndex:1 }}>
        {error && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 14px", borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.28)", marginBottom:18 }}>
            <AlertCircle style={{ width:13, height:13, color:"#fca5a5", flexShrink:0 }} />
            <p style={{ fontSize:12, color:"rgba(252,165,165,0.9)", margin:0 }}>{error}</p>
          </div>
        )}

        {/* Adicionar Servidor */}
        {availableServers.length > 0 && selectedServers.length < MAX_SERVERS && (
          <div style={{ marginBottom:18 }}>
            <span style={DS.label}>
              <Server style={{ width:10, height:10, display:"inline", marginRight:4 }} />
              Adicionar Servidor ({selectedServers.length}/{MAX_SERVERS})
            </span>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:8 }}>
              {availableServers.map(server => (
                <button key={server.id} type="button" onClick={() => handleAddServer(server)} disabled={loading}
                  style={{ padding:"10px 12px", borderRadius:12, border:"1.5px dashed rgba(167,139,250,0.2)", background:"rgba(167,139,250,0.03)", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(167,139,250,0.45)"; e.currentTarget.style.background="rgba(167,139,250,0.08)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(167,139,250,0.2)"; e.currentTarget.style.background="rgba(167,139,250,0.03)"; }}>
                  <p style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,0.8)", margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{server.name}</p>
                  <p style={{ fontSize:10, color:"rgba(167,139,250,0.6)", margin:0 }}>R$ {Number(server.value_per_credit||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}/cr</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Servidores Selecionados */}
        {selectedServers.length > 0 && (
          <div style={{ marginBottom:18 }}>
            <span style={DS.label}>Servidores Selecionados ({selectedServers.length})</span>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {selectedServers.map((server, index) => (
                <ServerItemForm
                  key={server.id}
                  serverData={serverDataList[index]}
                  serverInfo={server}
                  index={index}
                  onUpdate={handleUpdateServerData}
                  onRemove={handleRemoveServer}
                  disabled={loading}
                  validationErrors={validationErrors}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upload Comprovante */}
        <div style={{ marginBottom:18 }}>
          <span style={DS.label}>Comprovante {isPostpaid ? "(Opcional)" : "*"}</span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf" onChange={handleFileChange} disabled={loading||uploadingFile} className="hidden" id="multi-proof-upload" />
          {proofFile ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderRadius:12, background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <FileText style={{ width:18, height:18, color:AC }} />
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:AC, margin:0 }}>{proofFile.name}</p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,0.3)", margin:0 }}>{(proofFile.size/1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button type="button" onClick={removeFile} disabled={loading} style={{ width:26, height:26, borderRadius:8, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X style={{ width:12, height:12, color:"#fca5a5" }} />
              </button>
            </div>
          ) : (
            <label htmlFor="multi-proof-upload" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"22px", borderRadius:14, border:`1.5px dashed ${validationErrors.proof ? "rgba(239,68,68,0.5)" : "rgba(167,139,250,0.2)"}`, background:"rgba(167,139,250,0.03)", cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(167,139,250,0.4)"; e.currentTarget.style.background="rgba(167,139,250,0.06)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=validationErrors.proof?"rgba(239,68,68,0.5)":"rgba(167,139,250,0.2)"; e.currentTarget.style.background="rgba(167,139,250,0.03)"; }}>
              {uploadingFile
                ? <Loader2 style={{ width:22, height:22, color:AC, animation:"spin 0.7s linear infinite" }} />
                : <><Upload style={{ width:20, height:20, color:"rgba(167,139,250,0.5)", marginBottom:6 }} />
                   <p style={{ fontSize:12, color:"rgba(255,255,255,0.3)", margin:0 }}>Clique para selecionar</p>
                   <p style={{ fontSize:10, color:"rgba(255,255,255,0.18)", margin:"3px 0 0" }}>Um comprovante para todos os servidores</p></>}
            </label>
          )}
        </div>

        {/* Resumo Consolidado */}
        {selectedServers.length > 0 && grandTotal > 0 && (
          <div style={{ padding:"14px 18px", borderRadius:14, background:"linear-gradient(135deg,rgba(167,139,250,0.12),rgba(34,211,238,0.06))", border:"1px solid rgba(167,139,250,0.28)", marginBottom:18, boxShadow:"0 0 20px rgba(167,139,250,0.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <Calculator style={{ width:14, height:14, color:AC }} />
              <p style={{ fontSize:11, fontWeight:800, color:AC, textTransform:"uppercase", letterSpacing:"0.1em", margin:0 }}>Resumo Total</p>
            </div>
            {serverDataList.map((data, idx) => {
              const credits = parseInt(data.credits) || 0;
              const value = credits * (data.valuePerCredit || 0);
              if (credits === 0) return null;
              return (
                <div key={idx} style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"60%" }}>{data.serverName}:</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.7)", fontFamily:"monospace" }}>R$ {value.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                </div>
              );
            })}
            <div style={{ height:1, background:"rgba(167,139,250,0.15)", margin:"8px 0" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:800, color:"#fff" }}>Total Geral:</span>
              <span style={{ fontSize:20, fontWeight:900, color:AC, letterSpacing:"-0.03em", textShadow:`0 0 16px ${AG}` }}>
                R$ {grandTotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}
              </span>
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, paddingTop:4 }}>
          <button type="button" onClick={onCancel} disabled={loading}
            style={{ padding:"9px 18px", borderRadius:10, fontSize:12, fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading||uploadingFile||selectedServers.length===0}
            style={{ padding:"9px 24px", borderRadius:10, fontSize:12, fontWeight:800, background:`linear-gradient(135deg,rgba(167,139,250,0.3),rgba(167,139,250,0.12))`, border:`1.5px solid rgba(167,139,250,0.5)`, color:AC, cursor:(loading||uploadingFile||selectedServers.length===0)?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:6, boxShadow:`0 0 20px rgba(167,139,250,0.2)`, opacity:(loading||uploadingFile||selectedServers.length===0)?0.5:1, transition:"all 0.2s" }}
            onMouseEnter={e=>{ if(!loading&&selectedServers.length>0){ e.currentTarget.style.boxShadow=`0 0 30px rgba(167,139,250,0.4)`; e.currentTarget.style.transform="translateY(-1px)"; }}}
            onMouseLeave={e=>{ e.currentTarget.style.boxShadow=`0 0 20px rgba(167,139,250,0.2)`; e.currentTarget.style.transform="translateY(0)"; }}>
            {loading
              ? <><Loader2 style={{ width:13, height:13, animation:"spin 0.7s linear infinite" }} /> Criando {selectedServers.length} Pedidos...</>
              : <><Plus style={{ width:13, height:13 }} /> Criar {selectedServers.length} Pedido{selectedServers.length>1?"s":""}</>}
          </button>
        </div>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}



