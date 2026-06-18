import React, { useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  QrCode,
  RefreshCw,
  Send,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";

function ActionButton({ children, className = "", disabled, onClick, type = "button" }) {
  return (
    <button className={`wa-action ${className}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function Metric({ icon: Icon, label, value, hint, tone = "" }) {
  return (
    <article className={`wa-metric ${tone}`}>
      <div className="wa-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
}

function Panel({ children, icon: Icon, subtitle, title }) {
  return (
    <section className="wa-panel">
      <div className="wa-panel-head">
        <div className="wa-icon">
          <Icon size={18} />
        </div>
        <div>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </div>
      {children}
    </section>
  );
}

const fmtDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
};

export default function WhatsAppDiagnostic() {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [queue, setQueue] = useState(null);
  const [logs, setLogs] = useState([]);
  const [qrImage, setQrImage] = useState(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Teste de notificacao via fila segura Gestor J2");
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState({});

  const setLoad = (key, value) => setLoading((current) => ({ ...current, [key]: value }));

  const loadAll = async () => {
    setLoad("refresh", true);
    try {
      const [settingsData, statusData, queueData, logData] = await Promise.all([
        remoteClient.settings.get().catch(() => null),
        remoteClient.whatsapp.status().catch((error) => ({ connected: false, state: "error", message: error.message })),
        remoteClient.whatsapp.queueStatus().catch(() => null),
        remoteClient.whatsapp.logs(80).catch(() => []),
      ]);
      setSettings(settingsData);
      setStatus(statusData);
      setQueue(queueData);
      setLogs(Array.isArray(logData) ? logData : []);
    } finally {
      setLoad("refresh", false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const fetchQr = async () => {
    setLoad("qr", true);
    setQrImage(null);
    try {
      const result = await remoteClient.whatsapp.qrCode();
      const data = result?.data?.data || result?.data || {};
      const b64 = data?.base64 || data?.qrcode?.base64 || null;
      if (b64) setQrImage(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
      await loadAll();
    } finally {
      setLoad("qr", false);
    }
  };

  const sendTest = async () => {
    if (!testPhone || !testMessage) return;
    setLoad("send", true);
    setTestResult(null);
    try {
      const result = await remoteClient.whatsapp.test(testPhone, testMessage);
      setTestResult({ success: true, ...result });
      await loadAll();
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setLoad("send", false);
    }
  };

  const retryFailed = async () => {
    setLoad("retry", true);
    try {
      await remoteClient.whatsapp.retryFailed();
      await loadAll();
    } finally {
      setLoad("retry", false);
    }
  };

  const clearPending = async () => {
    const ok = window.confirm("Limpar mensagens pendentes da fila?");
    if (!ok) return;
    setLoad("clear", true);
    try {
      await remoteClient.whatsapp.clearPending();
      await loadAll();
    } finally {
      setLoad("clear", false);
    }
  };

  const isConnected = status?.connected === true;
  const throttle = queue?.throttle || {};
  const delayText = useMemo(() => {
    if (!throttle.minDelayMs && !throttle.maxDelayMs) return "nao informado";
    return `${Math.round((throttle.minDelayMs || 0) / 1000)}s a ${Math.round((throttle.maxDelayMs || 0) / 1000)}s`;
  }, [throttle.maxDelayMs, throttle.minDelayMs]);

  return (
    <div className="wa-page">
      <main className="wa-shell">
        <section className="wa-hero">
          <div>
            <span>Evolution API</span>
            <h1>WA Diagnostico</h1>
            <p>Monitore conexao, QR Code, fila anti-ban, teste de envio e logs recentes da automacao WhatsApp.</p>
          </div>
          <ActionButton disabled={loading.refresh} onClick={loadAll}>
            {loading.refresh ? <Loader2 className="wa-spin" size={15} /> : <RefreshCw size={15} />}
            Atualizar
          </ActionButton>
        </section>

        <section className="wa-metrics">
          <Metric
            icon={isConnected ? Wifi : WifiOff}
            label="Instancia"
            tone={isConnected ? "ok" : "bad"}
            value={isConnected ? "Conectada" : "Offline"}
            hint={status?.state || "unknown"}
          />
          <Metric icon={Activity} label="Aguardando" value={queue?.waiting ?? 0} hint="mensagens em fila" />
          <Metric icon={Clock} label="Agendadas" value={queue?.delayed ?? 0} hint={`delay ${delayText}`} />
          <Metric icon={AlertTriangle} label="Falhas" tone={(queue?.failed || 0) > 0 ? "bad" : ""} value={queue?.failed ?? 0} hint="jobs com erro" />
        </section>

        <section className="wa-grid">
          <Panel icon={isConnected ? Wifi : WifiOff} subtitle={`Estado: ${status?.state || "unknown"}`} title="Status da instancia">
            <div className={`wa-status-card ${isConnected ? "ok" : "bad"}`}>
              {isConnected ? <CheckCircle size={18} /> : <WifiOff size={18} />}
              <strong>{isConnected ? "Conectado e pronto" : "Desconectado"}</strong>
              <span>{status?.message || `Instancia: ${settings?.evolution_instance || "nao configurada"}`}</span>
            </div>
            <div className="wa-mini-grid">
              <div>
                <span>Instancia</span>
                <strong>{settings?.evolution_instance || "-"}</strong>
              </div>
              <div>
                <span>API</span>
                <strong>{settings?.evolution_api_url ? "configurada" : "pendente"}</strong>
              </div>
            </div>
          </Panel>

          <Panel icon={QrCode} subtitle="Conecte ou renove a sessao" title="QR Code">
            <ActionButton className="primary" disabled={loading.qr} onClick={fetchQr}>
              {loading.qr ? <Loader2 className="wa-spin" size={15} /> : <QrCode size={15} />}
              Gerar QR
            </ActionButton>
            <div className={`wa-qr ${qrImage ? "ready" : ""}`}>
              {qrImage ? (
                <img alt="QR Code WhatsApp" src={qrImage} />
              ) : (
                <>
                  <QrCode size={34} />
                  <span>O QR aparecera aqui depois de gerar.</span>
                </>
              )}
            </div>
          </Panel>

          <Panel icon={Activity} subtitle="Controle seguro de disparos" title="Fila anti-ban">
            {queue ? (
              <>
                <div className="wa-queue-grid">
                  <div><span>Ativas</span><strong>{queue.active ?? 0}</strong></div>
                  <div><span>Aguardando</span><strong>{queue.waiting ?? 0}</strong></div>
                  <div><span>Agendadas</span><strong>{queue.delayed ?? 0}</strong></div>
                  <div><span>Falhas</span><strong>{queue.failed ?? 0}</strong></div>
                </div>
                <div className="wa-queue-note">
                  <span>Delay aleatorio: {delayText}</span>
                  <small>Intervalo minimo: {Math.round((throttle.minSendIntervalMs || 0) / 1000)}s</small>
                </div>
                <div className="wa-panel-actions">
                  <ActionButton disabled={loading.retry || !queue.failed} onClick={retryFailed}>
                    <RefreshCw size={14} />
                    Tentar falhas
                  </ActionButton>
                  <ActionButton className="danger" disabled={loading.clear} onClick={clearPending}>
                    <Trash2 size={14} />
                    Limpar pendentes
                  </ActionButton>
                </div>
              </>
            ) : (
              <div className="wa-empty-mini">Fila indisponivel. Verifique Redis/backend.</div>
            )}
          </Panel>

          <Panel icon={Send} subtitle="Enfileire uma mensagem controlada" title="Teste de envio">
            <div className="wa-form">
              <label>
                <span>Telefone com DDD</span>
                <input onChange={(event) => setTestPhone(event.target.value)} placeholder="11999999999" value={testPhone} />
              </label>
              <label>
                <span>Mensagem</span>
                <textarea onChange={(event) => setTestMessage(event.target.value)} rows={4} value={testMessage} />
              </label>
              <ActionButton className="primary" disabled={loading.send || !testPhone || !testMessage} onClick={sendTest}>
                {loading.send ? <Loader2 className="wa-spin" size={15} /> : <Send size={15} />}
                Enfileirar teste
              </ActionButton>
              {testResult && (
                <div className={`wa-test-result ${testResult.success ? "ok" : "bad"}`}>
                  {testResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span>{testResult.success ? `Enfileirado: ${testResult.logId || "-"}` : testResult.error}</span>
                </div>
              )}
            </div>
          </Panel>
        </section>

        <section className="wa-panel wa-logs">
          <div className="wa-panel-head">
            <div className="wa-icon">
              <Activity size={18} />
            </div>
            <div>
              <strong>Logs recentes</strong>
              <span>{logs.length} registros carregados</span>
            </div>
          </div>

          <div className="wa-log-list">
            {logs.length === 0 ? (
              <div className="wa-empty-mini">Nenhum log encontrado.</div>
            ) : (
              logs.map((log) => {
                const statusName = log.status || "pending";
                return (
                  <article className={`wa-log ${statusName}`} key={log.id || `${log.phone}-${log.createdAt || log.created_date}`}>
                    <div className="wa-log-status">{statusName}</div>
                    <div>
                      <strong>{log.phone || "-"}</strong>
                      <span>{log.messagePreview || log.message_preview || "Sem previa"}</span>
                    </div>
                    <time>{fmtDate(log.createdAt || log.created_date)}</time>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      <style>{whatsappDiagnosticStyles}</style>
    </div>
  );
}

const whatsappDiagnosticStyles = `
.wa-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.wa-shell {
  min-height: 100dvh;
  width: 100%;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.6vw, 22px);
}

.wa-hero,
.wa-metric,
.wa-panel {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.wa-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.wa-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.wa-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(34px, 5.6vw, 64px);
  line-height: .9;
  font-weight: 950;
}

.wa-hero p {
  max-width: 780px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.wa-action {
  border: 0;
  min-height: 42px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.wa-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.wa-action.danger {
  color: #ffb4b4;
  background: rgba(255, 91, 91, .08);
}

.wa-action:disabled {
  cursor: not-allowed;
  opacity: .52;
}

.wa-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.wa-metric {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.wa-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.wa-metric.bad .wa-icon,
.wa-status-card.bad svg,
.wa-test-result.bad svg {
  color: #ff5b5b;
}

.wa-metric span,
.wa-panel-head span,
.wa-mini-grid span,
.wa-queue-grid span,
.wa-form label span,
.wa-locked-price span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.wa-metric strong {
  display: block;
  max-width: 100%;
  margin-top: 5px;
  overflow: hidden;
  color: var(--j2-text);
  font-size: clamp(20px, 2.2vw, 29px);
  line-height: 1.05;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wa-metric small {
  display: block;
  max-width: 100%;
  margin-top: 5px;
  overflow: hidden;
  color: var(--j2-faint);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wa-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.wa-panel {
  min-width: 0;
  border-radius: 26px;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.wa-panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wa-panel-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.wa-status-card,
.wa-mini-grid div,
.wa-queue-grid div,
.wa-queue-note,
.wa-qr,
.wa-empty-mini,
.wa-test-result,
.wa-log,
.wa-form input,
.wa-form textarea {
  border: 0;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.wa-status-card {
  min-height: 116px;
  border-radius: 20px;
  padding: 15px;
  display: grid;
  align-content: center;
  gap: 8px;
}

.wa-status-card svg,
.wa-test-result svg {
  color: var(--j2-accent);
}

.wa-status-card strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.wa-status-card span {
  color: var(--j2-muted);
  font-size: 12px;
}

.wa-mini-grid,
.wa-queue-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.wa-mini-grid div,
.wa-queue-grid div {
  min-width: 0;
  border-radius: 17px;
  padding: 12px;
}

.wa-mini-grid strong,
.wa-queue-grid strong {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 16px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wa-queue-grid strong {
  color: var(--j2-accent);
  font-size: 24px;
}

.wa-queue-note {
  border-radius: 17px;
  padding: 12px;
}

.wa-queue-note span,
.wa-queue-note small {
  display: block;
  color: var(--j2-muted);
  font-size: 12px;
}

.wa-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.wa-qr {
  min-height: 226px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  gap: 9px;
  color: var(--j2-muted);
  text-align: center;
}

.wa-qr.ready {
  background: #fff;
  box-shadow: var(--j2-neu);
}

.wa-qr img {
  width: min(210px, 74vw);
  height: min(210px, 74vw);
  object-fit: contain;
}

.wa-form {
  display: grid;
  gap: 11px;
}

.wa-form label {
  display: grid;
  gap: 7px;
}

.wa-form input,
.wa-form textarea {
  width: 100%;
  min-width: 0;
  border-radius: 16px;
  padding: 12px;
  color: var(--j2-text);
  outline: 0;
  font: inherit;
  font-size: 13px;
}

.wa-form textarea {
  resize: vertical;
  line-height: 1.5;
}

.wa-test-result {
  border-radius: 16px;
  padding: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--j2-muted);
  font-size: 12px;
  font-weight: 850;
}

.wa-empty-mini {
  border-radius: 17px;
  padding: 18px;
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.wa-logs {
  gap: 16px;
}

.wa-log-list {
  display: grid;
  gap: 9px;
}

.wa-log {
  min-width: 0;
  border-radius: 18px;
  padding: 12px;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.wa-log-status {
  min-height: 30px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--j2-accent);
  background: rgba(255, 255, 255, .035);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.wa-log.failed .wa-log-status {
  color: #ff5b5b;
}

.wa-log strong,
.wa-log span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wa-log strong {
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.wa-log span,
.wa-log time {
  color: var(--j2-muted);
  font-size: 12px;
}

.wa-log time {
  text-align: right;
  white-space: nowrap;
}

.wa-spin {
  animation: waSpin .8s linear infinite;
}

@keyframes waSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  .wa-metrics,
  .wa-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .wa-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .wa-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .wa-hero h1 {
    font-size: clamp(34px, 10vw, 50px);
  }

  .wa-hero .wa-action,
  .wa-panel-actions .wa-action,
  .wa-form .wa-action {
    width: 100%;
  }

  .wa-metrics,
  .wa-grid,
  .wa-panel-actions {
    grid-template-columns: 1fr;
    display: grid;
  }

  .wa-panel {
    border-radius: 22px;
  }

  .wa-log {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .wa-log-status {
    justify-content: flex-start;
    padding: 0 10px;
    width: fit-content;
  }

  .wa-log time {
    text-align: left;
  }
}

@media (max-width: 420px) {
  .wa-mini-grid,
  .wa-queue-grid {
    grid-template-columns: 1fr;
  }
}
`;
