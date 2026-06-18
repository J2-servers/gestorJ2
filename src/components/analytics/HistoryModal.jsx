import React from 'react';
import { X, Calendar, CreditCard, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatFullBrasiliaDate } from '../utils/dateHelper';
import { ScrollArea } from '@/components/ui/scroll-area';

const statusConfig = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", label: "Pendente" },
  analyzing: { icon: AlertCircle, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", label: "Analisando" },
  recharged: { icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", label: "Aprovado" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", label: "Rejeitado" }
};

export default function HistoryModal({ open, onClose, entity, requests, type }) {
  if (!entity) return null;

  const totalCredits = requests.reduce((sum, r) => sum + r.requested_credits, 0);
  const totalValue = requests.reduce((sum, r) => sum + r.total_value, 0);
  const approvedRequests = requests.filter(r => r.status === 'recharged');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] backdrop-blur-xl bg-[#060707] border-0 shadow-none">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {type === 'reseller' ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-950 flex items-center justify-center border-2 border-transparent shadow-none">
                  <span className="text-white font-bold">
                    {entity.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white">{entity.name || entity.email}</p>
                  <p className="text-sm font-normal text-muted-foreground">{entity.email}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-700 to-orange-950 flex items-center justify-center border-0 shadow-none">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white">{entity.name}</p>
                  <p className="text-sm font-normal text-muted-foreground">Histórico do Servidor</p>
                </div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="backdrop-blur-lg bg-gradient-to-br from-orange-500/10 to-orange-950/10 rounded-xl p-4 border-0 shadow-none">
            <p className="text-sm text-muted-foreground mb-1">Total de Créditos</p>
            <p className="text-2xl font-bold text-orange-400">
              {totalCredits.toLocaleString('pt-BR')}
            </p>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-orange-500/10 to-orange-950/10 rounded-xl p-4 border-0 shadow-none">
            <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
            <p className="text-2xl font-bold text-orange-300">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="backdrop-blur-lg bg-gradient-to-br from-orange-500/10 to-orange-950/10 rounded-xl p-4 border-0 shadow-none">
            <p className="text-sm text-muted-foreground mb-1">Pedidos</p>
            <p className="text-2xl font-bold text-orange-400">
              {requests.length}
              <span className="text-sm ml-2 text-muted-foreground">
                ({approvedRequests.length} aprovados)
              </span>
            </p>
          </div>
        </div>

        {/* Requests List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {requests.map((request) => {
              const statusInfo = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={request.id}
                  className="backdrop-blur-lg bg-[#090a0a] rounded-xl p-4 border-0   transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFullBrasiliaDate(request.created_date)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {type === 'server' && (
                          <div>
                            <span className="text-muted-foreground">Login:</span>
                            <span className="ml-2 font-medium">{request.login}</span>
                          </div>
                        )}
                        {type === 'reseller' && (
                          <div>
                            <span className="text-muted-foreground">Servidor:</span>
                            <span className="ml-2 font-medium">{request.server_snapshot?.name}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Créditos:</span>
                          <span className="ml-2 font-bold text-orange-400">
                            {request.requested_credits.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor:</span>
                          <span className="ml-2 font-bold text-orange-300">
                            R$ {request.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end mt-4">
          <Button 
            onClick={onClose} 
            variant="outline"
            className="border-0   transition-all"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}