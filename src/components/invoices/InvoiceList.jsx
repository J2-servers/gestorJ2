import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, DollarSign, User as UserIcon, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBrasiliaDate, formatDistanceToBrasilia } from '../utils/dateHelper';

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    label: 'Pendente'
  },
  paid: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    label: 'Pago'
  },
  overdue: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Vencido'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    label: 'Cancelado'
  }
};

export default function InvoiceList({ invoices, loading, onViewDetails }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="h-32 rounded-3xl backdrop-blur-xl bg-white/[0.02] border border-transparent"
          >
            <motion.div
              className="h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-20 backdrop-blur-xl bg-white/[0.02] border border-transparent rounded-3xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Nenhuma fatura encontrada</h3>
        <p className="text-gray-500">Gere a primeira fatura para começar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice, index) => {
        const statusInfo = statusConfig[invoice.status] || statusConfig.pending;
        const StatusIcon = statusInfo.icon;
        
        // Verificar se está vencido
        const isOverdue = invoice.status === 'pending' && new Date(invoice.due_date) < new Date();
        const effectiveStatus = isOverdue ? statusConfig.overdue : statusInfo;

        return (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group cursor-pointer"
            onClick={() => onViewDetails(invoice)}
          >
            <div className={`
              relative backdrop-blur-xl bg-white/[0.02] border ${effectiveStatus.border}
              rounded-3xl p-6 lg:p-8
              hover:bg-white/[0.04] transition-all duration-300
            `}>
              {/* Status Indicator */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${effectiveStatus.bg} rounded-t-3xl`} />
              
              <div className="flex flex-col lg:flex-row gap-6 justify-between">
                {/* Left: Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-12 h-12 rounded-2xl ${effectiveStatus.bg} border ${effectiveStatus.border}
                      flex items-center justify-center
                    `}>
                      <StatusIcon className={`w-6 h-6 ${effectiveStatus.color}`} strokeWidth={1.5} />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-white">{invoice.invoice_number}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {invoice.reseller_name}
                      </p>
                    </div>

                    <Badge className={`${effectiveStatus.color} ${effectiveStatus.bg} border ${effectiveStatus.border}`}>
                      {effectiveStatus.label}
                    </Badge>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Período</p>
                      <p className="text-sm text-white">
                        {formatBrasiliaDate(invoice.period_start, 'dd/MM')} - {formatBrasiliaDate(invoice.period_end, 'dd/MM')}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Vencimento</p>
                      <p className="text-sm text-white flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatBrasiliaDate(invoice.due_date, 'dd/MM/yyyy')}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Pedidos</p>
                      <p className="text-lg font-bold text-white">
                        {invoice.request_count}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Créditos</p>
                      <p className="text-lg font-bold text-white">
                        {invoice.total_credits.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Value */}
                <div className="flex flex-col justify-center items-end gap-2 min-w-[200px]">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Valor Total</p>
                    <p className="text-3xl font-bold text-orange-400 flex items-center gap-2">
                      <DollarSign className="w-6 h-6" />
                      R$ {invoice.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {invoice.status === 'paid' && invoice.paid_date && (
                    <p className="text-xs text-green-400">
                      Pago {formatDistanceToBrasilia(invoice.paid_date)}
                    </p>
                  )}

                  {isOverdue && (
                    <p className="text-xs text-red-400 font-semibold">
                      ⚠️ Vencido há {formatDistanceToBrasilia(invoice.due_date)}
                    </p>
                  )}
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-transparent">
                  <p className="text-xs text-gray-500 mb-1">Observações</p>
                  <p className="text-sm text-gray-300">{invoice.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}