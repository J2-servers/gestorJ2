import React, { useEffect, useState } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Send, AlertTriangle, Loader2, RefreshCw, Wifi, MessageSquare, Timer } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function NotificationTest({ settings }) {
  const [testing, setTesting] = useState('');
  const [result, setResult] = useState(null);
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [connStatus, setConnStatus] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (settings) setCurrentSettings(settings); }, [settings]);

  const reload = async () => {
    setLoading(true);
    try {
      const [freshSettings, queue] = await Promise.all([
        remoteClient.settings.get(),
        remoteClient.whatsapp.queueStatus().catch(() => null),
      ]);
      setCurrentSettings(freshSettings);
      setQueueStatus(queue);
    } finally {
      setLoading(false);
    }
  };

  const checkEvolutionConn = async () => {
    setConnStatus({ loading: true });
    try {
      const [status, queue] = await Promise.all([
        remoteClient.whatsapp.status(),
        remoteClient.whatsapp.queueStatus().catch(() => null),
      ]);
      setConnStatus({ ok: status.connected === true, data: status });
      setQueueStatus(queue);
    } catch (e) {
      setConnStatus({ ok: false, error: e.message });
    }
  };

  const runTest = async (type) => {
    setTesting(type);
    setResult(null);
    try {
      const destination = currentSettings?.admin_whatsapp;
      const labels = {
        admin: 'Teste de novo pedido: uma recarga entrou na fila e aguarda processamento.',
        approval: 'Teste de aprovacao: creditos liberados no painel.',
        rejection: 'Teste de rejeicao: pedido recusado com motivo demonstrativo.',
      };
      const response = await remoteClient.whatsapp.test(destination, labels[type]);
      const queue = await remoteClient.whatsapp.queueStatus().catch(() => null);
      setQueueStatus(queue);
      setResult({ success: true, ...response });
      toast({ title: 'Mensagem enfileirada', description: 'O worker enviara respeitando os intervalos anti-ban.' });
    } catch (e) {
      setResult({ success: false, error: e.message });
      toast({ title: 'Falha no teste', description: e.message, variant: 'destructive' });
    } finally {
      setTesting('');
    }
  };

  const hasEvolution = currentSettings?.evolution_api_url && currentSettings?.evolution_instance && currentSettings?.evolution_api_key;
  const hasAdmin = currentSettings?.admin_whatsapp;

  const StatusRow = ({ label, ok, value }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-mono text-gray-500">{value}</span>}
        {ok ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white text-sm flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-400" /> Diagnostico Evolution API
          </h4>
          <Button size="sm" variant="ghost" onClick={reload} disabled={loading} className="text-gray-400">
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Recarregar
          </Button>
        </div>
        <StatusRow label="URL Base" ok={!!currentSettings?.evolution_api_url} value={currentSettings?.evolution_api_url ? currentSettings.evolution_api_url.substring(0, 30) + '...' : null} />
        <StatusRow label="Instancia" ok={!!currentSettings?.evolution_instance} value={currentSettings?.evolution_instance || null} />
        <StatusRow label="API Key" ok={!!currentSettings?.evolution_api_key} value={currentSettings?.evolution_api_key ? currentSettings.evolution_api_key.substring(0, 8) + '...' : null} />
        <StatusRow label="Admin WhatsApp" ok={!!currentSettings?.admin_whatsapp} value={currentSettings?.admin_whatsapp || null} />

        <div className="mt-3 pt-3 border-t border-white/10">
          <Button size="sm" onClick={checkEvolutionConn} disabled={!hasEvolution} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
            <Wifi className="w-3 h-3 mr-1" /> Checar conexao
          </Button>
          {connStatus && !connStatus.loading && (
            <div className={`mt-2 p-2 rounded-lg text-xs border ${connStatus.ok ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              {connStatus.ok ? 'Conectado' : `Desconectado${connStatus.error ? ` - ${connStatus.error}` : ''}`}
            </div>
          )}
        </div>
      </div>

      {queueStatus && (
        <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4">
          <h4 className="font-semibold text-white text-sm flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-yellow-400" /> Fila anti-ban
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/5 rounded-lg p-2 text-gray-300">Aguardando: {queueStatus.waiting}</div>
            <div className="bg-white/5 rounded-lg p-2 text-gray-300">Agendadas: {queueStatus.delayed}</div>
            <div className="bg-white/5 rounded-lg p-2 text-gray-300">Ativas: {queueStatus.active}</div>
            <div className="bg-white/5 rounded-lg p-2 text-gray-300">Falhas: {queueStatus.failed}</div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Delay aleatorio: {Math.round(queueStatus.throttle.minDelayMs / 1000)}s a {Math.round(queueStatus.throttle.maxDelayMs / 1000)}s. Intervalo minimo: {Math.round(queueStatus.throttle.minSendIntervalMs / 1000)}s.
          </p>
        </div>
      )}

      {!hasEvolution && (
        <Alert className="bg-yellow-900/20 border-yellow-700">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="ml-2 text-yellow-300 text-sm">
            Configure a Evolution API na aba <strong>Integracoes</strong> antes de testar.
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 space-y-4">
        <h4 className="font-semibold text-white text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-green-400" /> Testes de envio para {currentSettings?.admin_whatsapp || 'numero nao configurado'}
        </h4>

        {[
          { type: 'admin', label: 'Testar novo pedido' },
          { type: 'approval', label: 'Testar aprovacao' },
          { type: 'rejection', label: 'Testar rejeicao' },
        ].map(({ type, label }) => (
          <Button key={type} onClick={() => runTest(type)} disabled={!hasEvolution || !hasAdmin || !!testing} size="sm" className="w-full bg-green-700 hover:bg-green-800">
            {testing === type ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Send className="w-3 h-3 mr-2" />}
            {label}
          </Button>
        ))}

        {result && (
          <div className={`p-2 rounded-lg text-xs border ${result.success ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {result.success ? `Enfileirado. Log: ${result.logId || '-'}` : result.error}
          </div>
        )}
      </div>
    </div>
  );
}
