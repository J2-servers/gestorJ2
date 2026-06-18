import React, { useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { AlertTriangle, CheckCircle, Loader2, MessageSquare, RefreshCw, Send, Timer, Wifi, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function StatusRow({ label, ok, value }) {
  return (
    <div className="settings-test-row">
      <span>{label}</span>
      <strong>{value || (ok ? "configurado" : "pendente")}</strong>
      {ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
    </div>
  );
}

export default function NotificationTest({ settings }) {
  const [testing, setTesting] = useState("");
  const [result, setResult] = useState(null);
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [connStatus, setConnStatus] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (settings) setCurrentSettings(settings);
  }, [settings]);

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
      setConnStatus({ data: status, ok: status.connected === true });
      setQueueStatus(queue);
    } catch (error) {
      setConnStatus({ error: error.message, ok: false });
    }
  };

  const runTest = async (type) => {
    setTesting(type);
    setResult(null);
    try {
      const destination = currentSettings?.admin_whatsapp;
      const labels = {
        admin: "Teste de novo pedido: uma recarga entrou na fila e aguarda processamento.",
        approval: "Teste de aprovacao: creditos liberados no painel.",
        rejection: "Teste de rejeicao: pedido recusado com motivo demonstrativo.",
      };
      const response = await remoteClient.whatsapp.test(destination, labels[type]);
      const queue = await remoteClient.whatsapp.queueStatus().catch(() => null);
      setQueueStatus(queue);
      setResult({ success: true, ...response });
      toast({ title: "Mensagem enfileirada", description: "O worker enviara respeitando os intervalos anti-ban." });
    } catch (error) {
      setResult({ error: error.message, success: false });
      toast({ title: "Falha no teste", description: error.message, variant: "destructive" });
    } finally {
      setTesting("");
    }
  };

  const hasEvolution = currentSettings?.evolution_api_url && currentSettings?.evolution_instance && currentSettings?.evolution_api_key;
  const hasAdmin = currentSettings?.admin_whatsapp;
  const throttle = queueStatus?.throttle || {};

  return (
    <div className="settings-form">
      <div className="settings-form-header">
        <div className="settings-form-icon">
          <MessageSquare size={18} />
        </div>
        <div>
          <h2>Testes de notificacao</h2>
          <p>Verifique Evolution API, fila anti-ban e mensagens de teste.</p>
        </div>
      </div>

      <section className="settings-test-panel">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <Wifi size={18} />
          </div>
          <div>
            <h2>Diagnostico Evolution API</h2>
            <p>Configuracao atual usada pelo backend.</p>
          </div>
        </div>

        <div className="settings-test-list">
          <StatusRow
            label="URL Base"
            ok={!!currentSettings?.evolution_api_url}
            value={currentSettings?.evolution_api_url ? `${currentSettings.evolution_api_url.substring(0, 30)}...` : null}
          />
          <StatusRow label="Instancia" ok={!!currentSettings?.evolution_instance} value={currentSettings?.evolution_instance || null} />
          <StatusRow
            label="API Key"
            ok={!!currentSettings?.evolution_api_key}
            value={currentSettings?.evolution_api_key ? `${currentSettings.evolution_api_key.substring(0, 8)}...` : null}
          />
          <StatusRow label="Admin WhatsApp" ok={!!currentSettings?.admin_whatsapp} value={currentSettings?.admin_whatsapp || null} />
        </div>

        <div className="settings-form-actions">
          <button disabled={loading} onClick={reload} type="button">
            <RefreshCw className={loading ? "settings-spin" : ""} size={15} />
            Recarregar
          </button>
          <button disabled={!hasEvolution || connStatus?.loading} onClick={checkEvolutionConn} type="button">
            {connStatus?.loading ? <Loader2 className="settings-spin" size={15} /> : <Wifi size={15} />}
            Checar conexao
          </button>
        </div>

        {connStatus && !connStatus.loading && (
          <div className={connStatus.ok ? "settings-success" : "settings-error"}>
            {connStatus.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {connStatus.ok ? "Conectado" : `Desconectado${connStatus.error ? ` - ${connStatus.error}` : ""}`}
          </div>
        )}
      </section>

      {queueStatus && (
        <section className="settings-test-panel">
          <div className="settings-form-header">
            <div className="settings-form-icon">
              <Timer size={18} />
            </div>
            <div>
              <h2>Fila anti-ban</h2>
              <p>Status atual dos disparos enfileirados.</p>
            </div>
          </div>

          <div className="settings-queue-grid">
            <div><span>Aguardando</span><strong>{queueStatus.waiting ?? 0}</strong></div>
            <div><span>Agendadas</span><strong>{queueStatus.delayed ?? 0}</strong></div>
            <div><span>Ativas</span><strong>{queueStatus.active ?? 0}</strong></div>
            <div><span>Falhas</span><strong>{queueStatus.failed ?? 0}</strong></div>
          </div>
          <p className="settings-muted">
            Delay aleatorio: {Math.round((throttle.minDelayMs || 0) / 1000)}s a {Math.round((throttle.maxDelayMs || 0) / 1000)}s.
            Intervalo minimo: {Math.round((throttle.minSendIntervalMs || 0) / 1000)}s.
          </p>
        </section>
      )}

      {!hasEvolution && (
        <div className="settings-error">
          <AlertTriangle size={15} />
          Configure a Evolution API na aba Integracoes antes de testar.
        </div>
      )}

      <section className="settings-test-panel">
        <div className="settings-form-header">
          <div className="settings-form-icon">
            <Send size={18} />
          </div>
          <div>
            <h2>Mensagens de teste</h2>
            <p>Destino: {currentSettings?.admin_whatsapp || "numero nao configurado"}</p>
          </div>
        </div>

        <div className="settings-test-actions">
          {[
            ["admin", "Testar novo pedido"],
            ["approval", "Testar aprovacao"],
            ["rejection", "Testar rejeicao"],
          ].map(([type, label]) => (
            <button disabled={!hasEvolution || !hasAdmin || Boolean(testing)} key={type} onClick={() => runTest(type)} type="button">
              {testing === type ? <Loader2 className="settings-spin" size={15} /> : <Send size={15} />}
              {label}
            </button>
          ))}
        </div>

        {result && (
          <div className={result.success ? "settings-success" : "settings-error"}>
            {result.success ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {result.success ? `Enfileirado. Log: ${result.logId || "-"}` : result.error}
          </div>
        )}
      </section>
    </div>
  );
}
