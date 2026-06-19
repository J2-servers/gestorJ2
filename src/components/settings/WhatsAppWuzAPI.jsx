import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { wuzapiProxy } from '@/functions/wuzapiProxy';
import {
  CheckCircle, XCircle, Loader2, RefreshCw, Wifi, WifiOff,
  QrCode, Smartphone, AlertTriangle, LogOut, UserPlus
} from 'lucide-react';

/**
 * WhatsAppWuzAPI
 * Conecta ao WhatsApp via QR Code usando WuzAPI como backend proxy.
 * 
 * Props:
 *  - wuzapiUrl:   URL base da WuzAPI
 *  - wuzapiToken: Token do usuário na WuzAPI  
 *  - adminToken:  Token admin (WUZAPI_ADMIN_TOKEN) para gerenciar usuários
 */
export default function WhatsAppWuzAPI({ wuzapiUrl, wuzapiToken, adminToken }) {
  const [step, setStep] = useState('idle'); // idle | checking | disconnected | qr_loading | qr_ready | connected | error
  const [qrCode, setQrCode] = useState(null); // data URI completo
  const [qrExpiry, setQrExpiry] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneInfo, setPhoneInfo] = useState('');
  const [users, setUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);
  const isMounted = useRef(true);
  const QR_TTL = 60;

  const baseConfig = { wuzapi_url: wuzapiUrl, wuzapi_token: wuzapiToken, admin_token: adminToken || '' };
  const hasConfig = !!(wuzapiUrl?.trim() && wuzapiToken?.trim());
  const readSessionStatus = (payload = {}) => ({
    connected: payload.connected === true || payload.Connected === true,
    loggedIn: payload.loggedIn === true || payload.LoggedIn === true,
    phone: payload.jid || payload.JID || payload.Phone || payload.name || '',
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (hasConfig) checkStatus();
  }, [wuzapiUrl, wuzapiToken]);

  // --- helpers ---
  const call = async (action, extra = {}) => {
    const res = await wuzapiProxy({ ...baseConfig, action, ...extra });
    return res.data;
  };

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const startCountdown = () => {
    setQrExpiry(QR_TTL);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setQrExpiry(p => {
        if (p <= 1) { clearInterval(countdownRef.current); countdownRef.current = null; return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const pollStatus = () => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      if (!isMounted.current) return;
      try {
        const res = await call('session_status');
        const d = res?.data?.data || res?.data || {};
        // WuzAPI pode variar entre lowercase e PascalCase conforme versao.
        const { connected, loggedIn, phone } = readSessionStatus(d);
        if (connected && loggedIn) {
          stopPolling();
          if (!isMounted.current) return;
          setStep('connected');
          setQrCode(null);
          setPhoneInfo(phone);
        }
      } catch (error) {
        console.warn('[WhatsAppWuzAPI] Falha ao consultar status:', error);
      }
    }, 3000);
  };

  const reconnectSession = async () => {
    if (!hasConfig) return;
    setStep('checking');
    setErrorMsg('');
    setStatusMsg('Reconectando sessão existente...');
    try {
      await call('session_reconnect');
      if (!isMounted.current) return;
      // Após reconectar, verificar status
      await new Promise(r => setTimeout(r, 2000));
      await checkStatus();
    } catch (e) {
      if (!isMounted.current) return;
      setErrorMsg(e.message || 'Erro ao reconectar');
      setStep('disconnected');
    }
  };

  // --- ações ---
  const checkStatus = async () => {
    if (!hasConfig || !isMounted.current) return;
    setStep('checking');
    setErrorMsg('');
    try {
      const res = await call('session_status');
      if (!isMounted.current) return;
      // WuzAPI retorna lowercase: connected, loggedIn
      const d = res?.data?.data || res?.data || {};
      const { connected, loggedIn, phone } = readSessionStatus(d);
      if (connected && loggedIn) {
        setStep('connected');
        setPhoneInfo(phone);
      } else if (loggedIn && !connected) {
        // loggedIn mas websocket caído — pode reconectar sem QR
        setStep('needs_reconnect');
        setPhoneInfo(phone);
      } else {
        // não logado — precisa de QR
        setStep('disconnected');
      }
    } catch (e) {
      if (!isMounted.current) return;
      console.warn('[WuzAPI] checkStatus:', e.message);
      setStep('disconnected');
    }
  };

  const connectAndGetQR = async () => {
    if (!hasConfig) return;
    stopPolling();
    setStep('qr_loading');
    setErrorMsg('');
    setQrCode(null);
    setStatusMsg('Iniciando conexão com o WhatsApp...');

    try {
      // 1. Garantir que a sessão está conectada ao servidor WuzAPI
      setStatusMsg('Conectando ao servidor...');
      await call('session_connect');

      // 2. Aguardar um momento para o servidor processar
      await new Promise(r => setTimeout(r, 1500));

      // 3. Buscar o QR Code
      setStatusMsg('Buscando QR Code...');
      const res = await call('session_qr');
      if (!isMounted.current) return;

      // A resposta pode ser { data: { QRCode: "...", code: 200 } } ou nested
      const inner = res?.data?.data || res?.data || {};
      let qr = inner?.QRCode || inner?.qrCode || inner?.qr || res?.data?.QRCode || null;


      if (!qr) {
        // Talvez já esteja conectado
        const statusRes = await call('session_status');
        const sd = statusRes?.data?.data || statusRes?.data || {};
        const status = readSessionStatus(sd);
        if (status.connected && status.loggedIn) {
          setStep('connected');
          setPhoneInfo(status.phone);
          return;
        }
        setErrorMsg('QR Code não retornado pela API. Certifique-se de que o token está correto e a sessão não está conectada.');
        setStep('error');
        return;
      }

      // Normalizar: pode ser string pura base64 ou data URI
      if (!qr.startsWith('data:')) {
        // Pode ser string base64 direta
        if (qr.length > 100) {
          qr = `data:image/png;base64,${qr}`;
        } else {
          setErrorMsg(`Resposta inesperada do QR: ${qr.substring(0, 80)}`);
          setStep('error');
          return;
        }
      }

      setQrCode(qr);
      setStep('qr_ready');
      startCountdown();
      pollStatus();

    } catch (e) {
      if (!isMounted.current) return;
      console.error('[WuzAPI] connectAndGetQR:', e);
      setErrorMsg(e.message || 'Erro desconhecido');
      setStep('error');
    }
  };

  const disconnect = async () => {
    stopPolling();
    try {
      await call('session_logout');
    } catch (error) {
      console.warn('[WhatsAppWuzAPI] Falha ao encerrar sessao:', error);
    }
    setStep('disconnected');
    setQrCode(null);
    setPhoneInfo('');
  };

  const loadUsers = async () => {
    try {
      const res = await call('list_users');
      const list = res?.data?.data || [];
      setUsers(Array.isArray(list) ? list : []);
      setShowUserList(true);
    } catch (e) {
      console.error('[WuzAPI] list_users:', e);
    }
  };

  // --- Render ---
  if (!hasConfig) {
    return (
      <Alert className="bg-yellow-900/20 border-yellow-700">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="ml-2 text-yellow-300 text-sm">
          Preencha a <strong>URL do WuzAPI</strong> e o <strong>Token</strong> e salve antes de conectar.
        </AlertDescription>
      </Alert>
    );
  }

  const statusLabel = {
    idle: 'Aguardando...',
    checking: 'Verificando conexão...',
    disconnected: 'WhatsApp Desconectado',
    needs_reconnect: phoneInfo ? `Logado (${phoneInfo}) — Websocket caído` : 'Logado mas desconectado',
    qr_loading: 'Gerando QR Code...',
    qr_ready: 'Aguardando escaneamento...',
    connected: phoneInfo ? `Conectado: ${phoneInfo}` : 'WhatsApp Conectado ✅',
    error: 'Erro na conexão',
  }[step] || '';

  const statusIcon = {
    idle: <WifiOff className="w-4 h-4 text-gray-400" />,
    checking: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    disconnected: <WifiOff className="w-4 h-4 text-red-400" />,
    needs_reconnect: <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />,
    qr_loading: <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />,
    qr_ready: <QrCode className="w-4 h-4 text-orange-400 animate-pulse" />,
    connected: <Wifi className="w-4 h-4 text-green-400" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
  }[step];

  return (
    <div className="space-y-4">
      {/* Banner de status */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-transparent bg-white/5">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="text-sm font-medium text-white">{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {step === 'connected' && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Online</Badge>}
          {(step === 'disconnected' || step === 'error') && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Offline</Badge>}
          {step === 'qr_ready' && qrExpiry > 0 && (
            <Badge className={`border ${qrExpiry <= 15 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-transparent'}`}>
              {qrExpiry}s
            </Badge>
          )}
        </div>
      </div>

      {/* Info de progresso */}
      {step === 'qr_loading' && statusMsg && (
        <p className="text-xs text-orange-400 animate-pulse pl-1">{statusMsg}</p>
      )}

      {/* Erro */}
      {step === 'error' && errorMsg && (
        <Alert className="bg-red-900/20 border-red-700">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="ml-2 text-red-300 text-xs break-all">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* QR Code */}
      {step === 'qr_ready' && qrCode && (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-xl">
          <div className="text-center">
            <p className="text-gray-800 font-bold text-sm flex items-center gap-2 justify-center">
              <Smartphone className="w-4 h-4 text-green-600" />
              Escaneie com o WhatsApp
            </p>
            <p className="text-gray-500 text-xs mt-1">
              WhatsApp → ⋮ Menu → Dispositivos vinculados → Vincular dispositivo
            </p>
          </div>

          <div className={`p-2 rounded-xl border-4 transition-all ${qrExpiry <= 15 ? 'border-red-400 opacity-50' : 'border-green-400'}`}>
            <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
          </div>

          {qrExpiry > 0 && qrExpiry <= 15 && (
            <p className="text-red-500 text-xs font-medium animate-pulse">⚠️ Expirando em {qrExpiry}s...</p>
          )}
          {qrExpiry === 0 && (
            <p className="text-red-500 text-xs font-medium">QR expirado. Clique em "Renovar QR".</p>
          )}
        </div>
      )}

      {/* Conectado */}
      {step === 'connected' && (
        <div className="flex flex-col items-center gap-3 p-5 bg-green-900/20 border border-green-500/30 rounded-xl">
          <CheckCircle className="w-10 h-10 text-green-400" />
          <p className="text-green-300 font-semibold text-sm text-center">WhatsApp conectado com sucesso!</p>
          <p className="text-green-600 text-xs">O sistema está pronto para enviar mensagens automáticas.</p>
        </div>
      )}

      {/* Botões */}
      <div className="flex flex-wrap gap-2">
        {(['idle', 'disconnected', 'error', 'connected', 'needs_reconnect'].includes(step)) && (
          <Button type="button" variant="outline" size="sm" onClick={checkStatus}
            disabled={step === 'checking'}
            className="border-transparent text-gray-300 hover:bg-white/10">
            {step === 'checking' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Verificar Status
          </Button>
        )}

        {/* Reconnect sem QR quando logado mas websocket caído */}
        {step === 'needs_reconnect' && (
          <Button type="button" size="sm" onClick={reconnectSession}
            className="bg-yellow-600 hover:bg-yellow-700 text-white border-0">
            <Wifi className="w-3 h-3 mr-1" />
            Reconectar
          </Button>
        )}

        {(['idle', 'disconnected', 'error', 'needs_reconnect'].includes(step)) && (
          <Button type="button" size="sm" onClick={connectAndGetQR}
            className="bg-green-600 hover:bg-green-700 text-white border-0">
            <QrCode className="w-3 h-3 mr-1" />
            {step === 'needs_reconnect' ? 'Gerar Novo QR' : 'Conectar via QR Code'}
          </Button>
        )}

        {step === 'qr_ready' && (
          <Button type="button" size="sm" onClick={connectAndGetQR} variant="outline"
            className="border-0 bg-[#15191a] text-orange-400 shadow-[inset_4px_4px_10px_rgba(0,0,0,0.38),inset_-3px_-3px_8px_rgba(255,255,255,0.014)] hover:bg-[#1a1e20]">
            <RefreshCw className="w-3 h-3 mr-1" />
            Renovar QR Code
          </Button>
        )}

        {step === 'connected' && (
          <Button type="button" size="sm" variant="outline" onClick={disconnect}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10">
            <LogOut className="w-3 h-3 mr-1" />
            Desconectar
          </Button>
        )}

        <Button type="button" size="sm" variant="outline" onClick={loadUsers}
          className="border-transparent text-gray-400 hover:bg-white/5">
          <UserPlus className="w-3 h-3 mr-1" />
          Ver Usuários API
        </Button>
      </div>

      {/* Usuários da WuzAPI */}
      {showUserList && (
        <div className="mt-2 p-3 bg-black/40 rounded-xl border border-transparent space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400">Usuários WuzAPI ({users.length})</p>
            <button onClick={() => setShowUserList(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>
          {users.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhum usuário encontrado.</p>
          ) : (
            users.map((u, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${u.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-gray-300 font-mono">{u.name || u.id}</span>
                <span className="text-gray-500">{u.loggedIn ? '✓ logado' : '✗ deslogado'}</span>
                {u.jid && <span className="text-gray-600">{u.jid}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
