import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, FileText, Loader2, User as UserIcon, X, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatBrasiliaDate } from '@/components/utils/dateHelper';

export default function InvoiceGenerator({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [resellers, setResellers] = useState([]);
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [lastInvoiceDate, setLastInvoiceDate] = useState(null);

  useEffect(() => {
    loadPostpaidResellers();
  }, []);

  useEffect(() => {
    if (selectedReseller) {
      loadResellerData(selectedReseller);
    }
  }, [selectedReseller]);

  const loadPostpaidResellers = async () => {
    setLoadingData(true);
    try {
      const allUsers = await remoteClient.users.list();
      const postpaidResellers = (allUsers || []).filter(u =>
        u.role === 'user' && u.payment_type === 'postpaid'
      );
      setResellers(postpaidResellers);
      if (postpaidResellers.length === 0) {
        toast({
          title: "Nenhum Revendedor Pós-Pago",
          description: "Configure pelo menos um revendedor como pós-pago primeiro.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os revendedores.", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const loadResellerData = async (reseller) => {
    setLoadingData(true);
    try {
      const [allInvoices, allReqsResult] = await Promise.all([
        remoteClient.invoices.list(),
        remoteClient.creditRequests.list(null, 1000),
      ]);
      const resellerInvoices = (allInvoices || []).filter(i => i.reseller_id === reseller.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const lastInvoice = resellerInvoices[0] || null;
      setLastInvoiceDate(lastInvoice ? lastInvoice.period_end : null);

      const allRequests = allReqsResult?.data || [];
      const startDate = lastInvoice ? new Date(lastInvoice.period_end) : new Date(0);
      const unbilled = allRequests.filter(req =>
        req.reseller_id === reseller.id &&
        req.payment_type === 'postpaid' &&
        req.status === 'recharged' &&
        !req.invoice_id &&
        new Date(req.created_date) > startDate
      );
      setPendingRequests(unbilled);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os pedidos do revendedor.", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const generateInvoice = async () => {
    if (!selectedReseller) {
      toast({
        title: "Selecione um Revendedor",
        description: "Escolha um revendedor para gerar a fatura.",
        variant: "destructive"
      });
      return;
    }

    if (pendingRequests.length === 0) {
      toast({
        title: "Nenhum Pedido Pendente",
        description: "Este revendedor não possui pedidos aprovados para faturar.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const inv = await remoteClient.invoices.generate(selectedReseller.id);
      toast({
        title: "Fatura Gerada! ✅",
        description: `Fatura ${inv.invoice_number} criada com sucesso.`,
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao Gerar Fatura",
        description: error.message || "Ocorreu um erro ao criar a fatura.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalCredits = pendingRequests.reduce((sum, req) => sum + req.requested_credits, 0);
  const totalValue = pendingRequests.reduce((sum, req) => sum + req.total_value, 0);

  return (
    <Card className="backdrop-blur-xl bg-white/[0.03] border border-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-400" />
            Gerar Nova Fatura
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Seleção de Revendedor */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Selecione o Revendedor Pós-Pago
          </label>
          
          {loadingData && !selectedReseller ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            </div>
          ) : resellers.length === 0 ? (
            <div className="backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-300 mb-1">
                    Nenhum revendedor pós-pago encontrado
                  </p>
                  <p className="text-xs text-yellow-200/80">
                    Configure pelo menos um revendedor como "Pós-Pago" em Revendedores → Editar → Tipo de Pagamento
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Select
              value={selectedReseller?.id || ''}
              onValueChange={(id) => {
                const reseller = resellers.find(r => r.id === id);
                setSelectedReseller(reseller);
              }}
              disabled={loading}
            >
              <SelectTrigger className="bg-white/[0.03] border-transparent text-white">
                <SelectValue placeholder="Escolha um revendedor..." />
              </SelectTrigger>
              <SelectContent>
                {resellers.map(reseller => (
                  <SelectItem key={reseller.id} value={reseller.id}>
                    {reseller.name || reseller.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Preview dos Pedidos */}
        {selectedReseller && (
          <>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              </div>
            ) : (
              <>
                <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-transparent rounded-2xl p-6 space-y-4">
                  <h3 className="font-semibold text-white text-lg">Preview da Fatura</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Período</p>
                      <p className="text-sm text-white">
                        {lastInvoiceDate 
                          ? formatBrasiliaDate(lastInvoiceDate, 'dd/MM/yyyy')
                          : 'Início'
                        } - Agora
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Vencimento</p>
                      <p className="text-sm text-white flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        7 dias
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Pedidos</p>
                      <p className="text-2xl font-bold text-white">
                        {pendingRequests.length}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Créditos</p>
                      <p className="text-2xl font-bold text-white">
                        {totalCredits.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-transparent">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Valor Total
                      </span>
                      <span className="text-3xl font-bold text-orange-400">
                        R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {pendingRequests.length === 0 && (
                  <div className="text-center py-6 backdrop-blur-xl bg-white/[0.02] border border-transparent rounded-2xl">
                    <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 mb-2">
                      Nenhum pedido pendente de faturamento
                    </p>
                    <p className="text-xs text-gray-500">
                      Este revendedor não possui pedidos pós-pago aprovados sem fatura.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
            className="border-transparent text-gray-400 hover:text-white"
          >
            Cancelar
          </Button>
          
          <Button 
            onClick={generateInvoice}
            disabled={loading || !selectedReseller || pendingRequests.length === 0}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 border-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Gerar Fatura
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
