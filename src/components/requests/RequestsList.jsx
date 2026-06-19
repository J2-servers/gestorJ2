import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { formatFullBrasiliaDate } from '../utils/dateHelper';
import {
  Clock, CheckCircle, XCircle, AlertCircle, Eye, MessageSquare,
  History, ExternalLink, CreditCard, Zap, User, Mail, Edit, Trash2, ChevronRight
} from "lucide-react";
import RequestActions from "./RequestActions";
import RequestMessages from './RequestMessages';
import AuditTrail from './AuditTrail';
import ProofViewer from './ProofViewer';

const statusCfg = {
  pending:   { icon: Clock,        color: "var(--color-warning)",    bg: "rgba(251,191,36,0.08)",    border: "rgba(251,191,36,0.25)",    label: "Pendente"   },
  analyzing: { icon: AlertCircle,  color: "var(--color-secondary)",  bg: "var(--color-secondary-light)", border: "transparent", label: "Em Análise" },
  recharged: { icon: CheckCircle,  color: "var(--color-success)",    bg: "rgba(255,75,18,0.08)",    border: "transparent",    label: "Aprovado"   },
  rejected:  { icon: XCircle,      color: "var(--color-error)",      bg: "rgba(248,113,113,0.08)",   border: "rgba(248,113,113,0.25)",   label: "Rejeitado"  },
  canceled:  { icon: XCircle,      color: "var(--color-text-muted)", bg: "var(--color-bg-tertiary)", border: "var(--color-border-default)", label: "Cancelado" },
};

export default function RequestsList({ requests, currentUser, onRequestUpdate, onEdit, onCancel, loading }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAuditTrail, setShowAuditTrail]   = useState(null);
  const [proofViewerUrl, setProofViewerUrl]   = useState(null);
  const [resellers, setResellers]             = useState({});

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'dev';
  // O fornecedor a atender ja vem resolvido pelo backend em request.supplier
  // (vinculo atual ou snapshot do pedido) — determinístico, sem heuristica no client.

  useEffect(() => {
    if (!requests?.length) return;
    // Tenta usar dados embedded (reseller incluído na resposta da API)
    const embedded = {};
    requests.forEach(r => {
      if (r.reseller_id && r.reseller) embedded[r.reseller_id] = r.reseller;
    });
    if (Object.keys(embedded).length > 0) {
      setResellers(embedded);
    }
    // Fallback único: busca lista de usuários uma vez só na primeira montagem
  }, []);

  useEffect(() => {
    if (!requests?.length || Object.keys(resellers).length > 0) return;
    remoteClient.users.list().then(users => {
      const m = {};
      (users || []).forEach(u => { m[u.id] = u; });
      setResellers(m);
    }).catch(() => {});
  }, [requests?.length]); // dispara só quando a contagem muda, não em cada render

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card animate-pulse" style={{ height: "120px" }}>
            <div className="h-full rounded-lg" style={{ background: "var(--color-bg-tertiary)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!requests.length) return null;

  const canPerformActions = (r) => isStaff && (r.status === 'pending' || r.status === 'analyzing');
  const canUserEdit       = (r) => currentUser?.id === r.reseller_id && r.status === 'pending';

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => {
          const cfg = statusCfg[request.status] || statusCfg.pending;
          const StatusIcon     = cfg.icon;
          const isPostpaid     = request.payment_type === 'postpaid';
          const reseller       = resellers[request.reseller_id];
          const valuePerCredit = request.server_snapshot?.value_per_credit || 0;

          return (
            <div key={request.id} className="card overflow-hidden"
                 style={{ borderLeft: `3px solid ${cfg.color}`, padding: 0 }}>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}40)` }} />
              <div className="p-3 lg:p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 rounded-xl blur-md opacity-30" style={{ backgroundColor: cfg.color }} />
                    <div className="relative w-11 h-11 rounded-xl flex items-center justify-center"
                         style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <StatusIcon className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{cfg.label}</h3>
                      {isPostpaid && (
                        <span className="badge" style={{ background:"rgba(255,75,18,0.10)", color:"var(--color-primary)", borderColor:"var(--color-primary-border)" }}>Pós-Pago</span>
                      )}
                      {request.invoice_id && <span className="badge badge-info">Faturado</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-mono px-1.5 py-0.5 rounded" style={{ background:"var(--color-bg-tertiary)", color:"var(--color-text-muted)" }}>
                        #{request.id.slice(-8).toUpperCase()}
                      </span>
                      <span style={{ color:"var(--color-text-disabled)" }}>•</span>
                      <span style={{ color:"var(--color-text-disabled)" }}>{formatFullBrasiliaDate(request.created_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Reseller */}
                {reseller && (
                  <div className="flex items-center gap-2 mb-3 pb-3 flex-wrap"
                       style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
                         style={{ background:"var(--color-bg-tertiary)", border:"1px solid var(--color-border-subtle)" }}>
                      <User className="w-3 h-3" style={{ color:"var(--color-primary)" }} />
                      <span style={{ color:"var(--color-text-secondary)" }}>{reseller.name || 'Sem nome'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
                         style={{ background:"var(--color-bg-tertiary)", border:"1px solid var(--color-border-subtle)" }}>
                      <Mail className="w-3 h-3" style={{ color:"var(--color-text-disabled)" }} />
                      <span className="font-mono" style={{ color:"var(--color-text-muted)" }}>{reseller.email}</span>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
                  {[
                    { label:"Créditos", value: request.requested_credits?.toLocaleString('pt-BR'), accent:"var(--color-warning)" },
                    { label:"Total",    value: `R$ ${request.total_value?.toLocaleString('pt-BR', { minimumFractionDigits:2 })}`, accent:"var(--color-success)", highlight:true },
                    { label:"Servidor", value: request.server_snapshot?.name },
                    { label:"Login",    value: request.login },
                    { label:"Unitário", value: valuePerCredit > 0 ? `R$ ${valuePerCredit.toFixed(2)}` : 'N/A', accent:"var(--color-primary)" },
                  ].map((item, i) => (
                    <div key={i} className="p-2 rounded-lg"
                         style={{ background: item.highlight ? "rgba(255,75,18,0.08)" : "var(--color-bg-tertiary)", border:`1px solid ${item.highlight ? "rgba(255,75,18,0.10)" : "var(--color-border-subtle)"}` }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: item.accent || "var(--color-text-muted)" }}>{item.label}</p>
                      <p className="text-sm font-bold truncate" style={{ color: item.accent || "var(--color-text-primary)" }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Notes / Rejection */}
                {request.notes && (
                  <div className="mb-3 p-2.5 rounded-lg"
                       style={{ background:"rgba(96,165,250,0.06)", border:"1px solid rgba(255,75,18,0.10)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color:"var(--color-info)" }}>Observações</p>
                    <p className="text-xs leading-relaxed" style={{ color:"var(--color-text-secondary)" }}>{request.notes}</p>
                  </div>
                )}
                {request.rejection_reason && (
                  <div className="mb-3 p-2.5 rounded-lg"
                       style={{ background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.15)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color:"var(--color-error)" }}>Motivo da Rejeição</p>
                    <p className="text-xs leading-relaxed" style={{ color:"var(--color-error)" }}>{request.rejection_reason}</p>
                  </div>
                )}

                {/* Fornecedor a atender (somente admin/dev — oculto ao revendedor) */}
                {isStaff && (() => {
                  const sup = request.supplier;
                  return sup ? (
                    <div className="mb-3 p-2.5 rounded-lg" style={{ background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color:"#fbbf24" }}>Atender por (fornecedor)</p>
                      <p className="text-xs" style={{ color:"var(--color-text-secondary)" }}>
                        <strong style={{ color:"#fff" }}>{sup.name}</strong> — login do painel: <span className="font-mono">{sup.panel_login}</span>
                        {sup.panel_link && <> • <a href={sup.panel_link} target="_blank" rel="noreferrer" style={{ color:"#fbbf24" }}>abrir painel</a></>}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3 p-2 rounded-lg" style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(251,191,36,0.25)" }}>
                      <p className="text-[10px]" style={{ color:"rgba(251,191,36,0.7)" }}>⚠ Revendedor sem fornecedor vinculado para este servidor (defina em Servidores → Ver Resellers).</p>
                    </div>
                  );
                })()}

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {request.server_snapshot?.panel_link && (
                    <button onClick={() => window.open(request.server_snapshot.panel_link, '_blank')} className="btn btn-ghost btn-sm gap-1">
                      <ExternalLink className="w-3 h-3" /> Painel
                    </button>
                  )}
                  {request.proof_of_payment_url && (
                    <button onClick={() => setProofViewerUrl(request.proof_of_payment_url)} className="btn btn-ghost btn-sm gap-1">
                      <Eye className="w-3 h-3" /> Comprovante
                    </button>
                  )}
                  <button onClick={() => setSelectedRequest(request)} className="btn btn-ghost btn-sm gap-1">
                    <MessageSquare className="w-3 h-3" /> Chat
                  </button>
                  <button onClick={() => setShowAuditTrail(request)} className="btn btn-ghost btn-sm gap-1">
                    <History className="w-3 h-3" /> Histórico
                  </button>
                  {canUserEdit(request) && (
                    <>
                      <button onClick={() => onEdit(request)} className="btn btn-sm gap-1"
                              style={{ background:"rgba(96,165,250,0.10)", color:"var(--color-info)", border:"1px solid rgba(96,165,250,0.2)" }}>
                        <Edit className="w-3 h-3" /> Editar
                      </button>
                      <button onClick={() => onCancel(request)} className="btn btn-danger btn-sm gap-1">
                        <Trash2 className="w-3 h-3" /> Cancelar
                      </button>
                    </>
                  )}
                </div>

                {/* Admin actions */}
                {canPerformActions(request) && (
                  <div className="mt-3 pt-3" style={{ borderTop:"1px solid var(--color-border-subtle)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1"
                       style={{ color:"var(--color-primary)" }}>
                      <ChevronRight className="w-3 h-3" /> Ações Admin
                    </p>
                    <RequestActions request={request} currentUser={currentUser} onUpdate={onRequestUpdate} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedRequest && <RequestMessages request={selectedRequest} user={currentUser} onClose={() => setSelectedRequest(null)} />}
      {showAuditTrail  && <AuditTrail request={showAuditTrail} onClose={() => setShowAuditTrail(null)} />}
      {proofViewerUrl  && <ProofViewer fileUrl={proofViewerUrl} isOpen={!!proofViewerUrl} onClose={() => setProofViewerUrl(null)} />}
    </>
  );
}
