import React, { useEffect, useState } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Activity, CheckCircle, Loader2, QrCode, RefreshCw, Send, Trash2, Wifi, WifiOff } from 'lucide-react';

const S = { minHeight: "100vh", background: "#0a0a0a", color: "#fff" };
const CARD = { background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 18 };

const Btn = ({ onClick, disabled, children, style }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", border: "none", transition: "all 0.15s", opacity: disabled ? 0.45 : 1, ...style }}>
    {children}
  </button>
);

const Panel = ({ title, icon: Icon, accent = "#a78bfa", children }) => (
  <div style={CARD}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
      <Icon style={{ width: 15, height: 15, color: accent }} />
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>{title}</h2>
    </div>
    {children}
  </div>
);

export default function WhatsAppDiagnostic() {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [queue, setQueue] = useState(null);
  const [logs, setLogs] = useState([]);
  const [qrImage, setQrImage] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Teste de notificacao via fila segura Gestor J2');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState({});

  const setLoad = (key, value) => setLoading((current) => ({ ...current, [key]: value }));

  const loadAll = async () => {
    setLoad('refresh', true);
    try {
      const [settingsData, statusData, queueData, logData] = await Promise.all([
        remoteClient.settings.get().catch(() => null),
        remoteClient.whatsapp.status().catch((error) => ({ connected: false, state: 'error', message: error.message })),
        remoteClient.whatsapp.queueStatus().catch(() => null),
        remoteClient.whatsapp.logs(80).catch(() => []),
      ]);
      setSettings(settingsData);
      setStatus(statusData);
      setQueue(queueData);
      setLogs(logData);
    } finally {
      setLoad('refresh', false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const fetchQr = async () => {
    setLoad('qr', true);
    setQrImage(null);
    try {
      const result = await remoteClient.whatsapp.qrCode();
      const data = result?.data?.data || result?.data || {};
      const b64 = data?.base64 || data?.qrcode?.base64 || null;
      if (b64) setQrImage(b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`);
      await loadAll();
    } finally {
      setLoad('qr', false);
    }
  };

  const sendTest = async () => {
    if (!testPhone || !testMessage) return;
    setLoad('send', true);
    setTestResult(null);
    try {
      const result = await remoteClient.whatsapp.test(testPhone, testMessage);
      setTestResult({ success: true, ...result });
      await loadAll();
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoad('send', false);
    }
  };

  const retryFailed = async () => {
    setLoad('retry', true);
    try {
      await remoteClient.whatsapp.retryFailed();
      await loadAll();
    } finally {
      setLoad('retry', false);
    }
  };

  const clearPending = async () => {
    setLoad('clear', true);
    try {
      await remoteClient.whatsapp.clearPending();
      await loadAll();
    } finally {
      setLoad('clear', false);
    }
  };

  const isConnected = status?.connected === true;
  const fieldStyle = { width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box" };

  return (
    <div style={S}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 96px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>Evolution API - Diagnostico</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Instancia: {settings?.evolution_instance || 'nao configurada'} | Fila com delay aleatorio anti-ban
            </p>
          </div>
          <Btn onClick={loadAll} disabled={loading.refresh} style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
            {loading.refresh ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <RefreshCw style={{ width: 13, height: 13 }} />} Atualizar
          </Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
          <Panel title="Status da instancia" icon={isConnected ? Wifi : WifiOff} accent={isConnected ? "#34d399" : "#f87171"}>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: isConnected ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: isConnected ? "#34d399" : "#f87171", fontWeight: 800, fontSize: 13 }}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Estado: {status?.state || 'unknown'}</p>
            {status?.message && <p style={{ fontSize: 12, color: "#f87171" }}>{status.message}</p>}
          </Panel>

          <Panel title="QR Code" icon={QrCode} accent="#60a5fa">
            <Btn onClick={fetchQr} disabled={loading.qr} style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
              {loading.qr ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <QrCode style={{ width: 13, height: 13 }} />} Gerar QR
            </Btn>
            {qrImage && <div style={{ marginTop: 14, background: "#fff", padding: 12, borderRadius: 12, width: 200 }}><img src={qrImage} alt="QR Code WhatsApp" style={{ width: 176, height: 176, objectFit: "contain" }} /></div>}
          </Panel>

          <Panel title="Fila anti-ban" icon={Activity} accent="#fbbf24">
            {queue ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: 10, borderRadius: 8 }}>Aguardando: {queue.waiting}</div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: 10, borderRadius: 8 }}>Agendadas: {queue.delayed}</div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: 10, borderRadius: 8 }}>Ativas: {queue.active}</div>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: 10, borderRadius: 8 }}>Falhas: {queue.failed}</div>
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  Delay: {Math.round(queue.throttle.minDelayMs / 1000)}s a {Math.round(queue.throttle.maxDelayMs / 1000)}s. Intervalo minimo: {Math.round(queue.throttle.minSendIntervalMs / 1000)}s.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn onClick={retryFailed} disabled={loading.retry || !queue.failed} style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>Tentar falhas</Btn>
                  <Btn onClick={clearPending} disabled={loading.clear} style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}><Trash2 style={{ width: 12, height: 12 }} /> Limpar pendentes</Btn>
                </div>
              </>
            ) : <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Fila indisponivel. Verifique Redis/backend.</p>}
          </Panel>

          <Panel title="Teste de envio" icon={Send} accent="#a78bfa">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="Telefone com DDD" style={fieldStyle} />
              <textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={3} style={{ ...fieldStyle, resize: "none" }} />
              <Btn onClick={sendTest} disabled={loading.send || !testPhone || !testMessage} style={{ background: "#a78bfa", color: "#0a0a0a", justifyContent: "center" }}>
                {loading.send ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Send style={{ width: 13, height: 13 }} />} Enfileirar teste
              </Btn>
              {testResult && (
                <div style={{ padding: "9px 12px", borderRadius: 8, fontSize: 12, background: testResult.success ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: testResult.success ? "#34d399" : "#f87171" }}>
                  {testResult.success ? <><CheckCircle style={{ width: 13, height: 13, display: "inline", marginRight: 6 }} /> Enfileirado: {testResult.logId}</> : testResult.error}
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div style={CARD}>
          <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>Logs recentes</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: 8, color: "#94a3b8" }}>{new Date(log.createdAt || log.created_date).toLocaleString('pt-BR')}</td>
                    <td style={{ padding: 8, color: log.status === 'sent' ? "#34d399" : log.status === 'failed' ? "#f87171" : "#fbbf24" }}>{log.status}</td>
                    <td style={{ padding: 8, color: "#e5e7eb" }}>{log.phone}</td>
                    <td style={{ padding: 8, color: "#94a3b8" }}>{log.messagePreview || log.message_preview}</td>
                  </tr>
                ))}
                {!logs.length && <tr><td style={{ padding: 18, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>Nenhum log encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

