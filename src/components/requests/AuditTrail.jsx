
import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { formatFullBrasiliaDate } from '../utils/dateHelper';
import { History, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditTrail({ request, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const auditLogs = await AuditLog.filter({ credit_request_id: request.id }, '-created_date');
        setLogs(auditLogs);
      } catch (error) {
        console.error("Erro ao buscar histórico de auditoria:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [request.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
          <CardTitle className="flex items-center text-lg font-semibold">
            <History className="mr-2 h-5 w-5" /> Histórico do Pedido #{request.id.slice(-6)}
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1 px-6 pb-6 pt-0">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando histórico...</p>
          ) : logs.length > 0 ? (
            <div className="space-y-6">
              {logs.map(log => (
                <div key={log.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-24 text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatFullBrasiliaDate(log.created_date)}
                    </p>
                  </div>
                  <div className="flex-1 border-l-2 pl-4 space-y-1">
                    <p className="font-semibold text-gray-800">{log.action}</p>
                    <p className="text-sm text-gray-600">
                      por <span className="font-medium">{log.user_name}</span>
                    </p>
                    {log.details && <p className="text-sm text-gray-500 mt-1">{log.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Nenhum histórico encontrado para este pedido.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
