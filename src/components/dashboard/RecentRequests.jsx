import React from 'react';
import { formatFullBrasiliaDate } from '../utils/dateHelper';
import { Clock, CheckCircle, XCircle, AlertCircle, ExternalLink, Activity } from "lucide-react";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const statusConfig = {
  pending:   { icon: Clock,        label: "Pendente",     bg: "rgba(251,191,36,0.10)",  color: "var(--color-warning)", border: "rgba(251,191,36,0.25)"  },
  analyzing: { icon: AlertCircle,  label: "Em Análise",   bg: "rgba(96,165,250,0.10)",  color: "var(--color-info)",    border: "rgba(96,165,250,0.25)"  },
  recharged: { icon: CheckCircle,  label: "Recarregado",  bg: "rgba(52,211,153,0.10)",  color: "var(--color-success)", border: "rgba(52,211,153,0.25)"  },
  rejected:  { icon: XCircle,      label: "Rejeitado",    bg: "rgba(248,113,113,0.10)", color: "var(--color-error)",   border: "rgba(248,113,113,0.25)" },
};

export default function RecentRequests({ requests = [] }) {
  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="icon-box"><Activity className="w-4 h-4" style={{ color: "var(--color-primary)" }} /></div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Pedidos Recentes</h3>
        </div>
        <Link to={createPageUrl("CreditRequests")}>
          <ExternalLink className="w-4 h-4 transition-base" style={{ color: "var(--color-text-disabled)" }}
            onMouseEnter={e => e.target.style.color="var(--color-primary)"}
            onMouseLeave={e => e.target.style.color="var(--color-text-disabled)"} />
        </Link>
      </div>

      <div className="space-y-2">
        {requests.length > 0 ? requests.map((req) => {
          const s = statusConfig[req.status] || statusConfig.pending;
          const SIcon = s.icon;
          return (
            <div key={req.id} className="p-3 rounded-lg transition-base"
                 style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border-subtle)" }}
                 onMouseEnter={e => e.currentTarget.style.borderColor="var(--color-border-default)"}
                 onMouseLeave={e => e.currentTarget.style.borderColor="var(--color-border-subtle)"}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {req.requested_credits.toLocaleString('pt-BR')} créditos
                    </p>
                    <span className="badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                      <SIcon className="w-2.5 h-2.5 mr-1" />{s.label}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>Login: {req.login}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-disabled)" }}>{formatFullBrasiliaDate(req.created_date)}</p>
                </div>
                <p className="text-sm font-bold whitespace-nowrap" style={{ color: "var(--color-primary)" }}>
                  R$ {req.total_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          );
        }) : (
          <div className="flex flex-col items-center justify-center py-10" style={{ color: "var(--color-text-disabled)" }}>
            <Clock className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhum pedido recente</p>
          </div>
        )}
      </div>
    </div>
  );
}