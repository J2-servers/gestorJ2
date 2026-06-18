import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle, XCircle, Loader2, RefreshCw, Wifi, WifiOff,
  QrCode, Smartphone, AlertTriangle, LogOut
} from 'lucide-react';

/**
 * WhatsAppQRConnect
 * Props:
 *  - settings: objeto com evolution_api_key, evolution_api_url, evolution_instance_id
 *  - onStatusChange: callback(status) quando estado muda
 */
export default function WhatsAppQRConnect({ settings }) {
  const [status, setStatus] = useState('idle'); // idle | loading | disconnected | connecting | connected | error
  const [qrBase64, setQrBase64] = useState(null);
  const [qrExpiry, setQrExpiry] = useState(0);    // segundos restantes
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneConnected, setPhoneConnected] = useState('');

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);
  const isMounted = useRef(true);

  const QR_LIFETIME = 60; // segundos antes de expirar

  const apiKey = settings?.evolution_api_key;
  const apiUrl = settings?.evolution_api_url?.replace(/\/$/, '');
  const instanceId = settings?.evolution_instance_id;

  const hasConfig = !!(apiKey && apiUrl && instanceId);

  // Cleanup ao desmontar
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearPolling();
    };
  }, []);

  // Verificar status inicial automaticamente quando as configs existem
  useEffect(() => {
    if (hasConfig) {
      checkStatus();
    }
  }, [hasConfig, instanceId, apiUrl, apiKey]);

  const clearPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const callEvolution = async (path, method = 'GET', body = null) => {
    const url = `${apiUrl}${path}`;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      signal: AbortSignal.timeout(15000)
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
  };

  const checkStatus = useCallback(async () => {
    if (!hasConfig || !isMounted.current) return;
    try {
      setStatus('loading');
      const data = await callEvolution(`/instance/connectionState/${instanceId}`);
      if (!isMounted.current) return;
      const state = data?.instance?.state || data?.state || '';
      if (state === 'open' || state === 'connected') {
        setStatus('connected');
        setPhoneConnected(data?.instance?.profileName || data?.profileName || '');
        setQrBase64(null);
        clearPolling();
      } else {
        setStatus('disconnected');
      }
    } catch (e) {
      if (!isMounted.current) return;
      console.warn('[QR] checkStatus error:', e.message);
      setStatus('disconnected');
    }
  }, [hasConfig, apiUrl, apiKey, instanceId]);

  const startCountdown = () => {
    setQrExpiry(QR_LIFETIME);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setQrExpiry(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPolling = () => {
    clearPolling();
    pollingRef.current = setInterval(async () => {
      if (!isMounted.current) return;
      try {
        const data = await callEvolution(`/instance/connectionState/${instanceId}`);
        const state = data?.instance?.state || data?.state || '';
        if (state === 'open' || state === 'connected') {
          if (!isMounted.current) return;
          clearPolling();
          setStatus('connected');
          setQrBase64(null);
          setPhoneConnected(data?.instance?.profileName || data?.profileName || '');
        }
      } catch (error) {
        console.warn('[WhatsAppQRConnect] Falha ao consultar status:', error);
      }
    }, 3000);
  };

  const fetchQRCode = async () => {
    if (!hasConfig) return;
    try {
      setStatus('connecting');
      setErrorMsg('');
      setQrBase64(null);
      clearPolling();

      const data = await callEvolution(`/instance/connect/${instanceId}`);
      if (!isMounted.current) return;

      const base64 = data?.base64 || data?.qrcode?.base64 || data?.qr?.base64 || null;

      if (!base64) {
        // Pode já estar conectado
        const state = data?.instance?.state || data?.state || '';
        if (state === 'open' || state === 'connected') {
          setStatus('connected');
          return;
        }
        throw new Error('QR Code não retornado pela API. Verifique se a instância existe e está ativa.');
      }

      setQrBase64(base64);
      setStatus('connecting');
      startCountdown();
      startPolling();
    } catch (e) {
      if (!isMounted.current) return;
      console.error('[QR] fetchQRCode error:', e);
      setStatus('error');
      setErrorMsg(e.message);
    }
  };

  const disconnect = async () => {
    try {
      await callEvolution(`/instance/logout/${instanceId}`, 'DELETE');
    } catch (error) {
      console.warn('[WhatsAppQRConnect] Falha ao desconectar instancia:', error);
    }
    clearPolling();
    setQrBase64(null);
    setStatus('disconnected');
    setPhoneConnected('');
  };

  const refreshQR = () => {
    clearPolling();
    fetchQRCode();
  };

  // --- Render helpers ---
  if (!hasConfig) {
    return (
      <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="ml-2 text-yellow-800 dark:text-yellow-200 text-sm">
          Preencha e salve a <strong>API Key</strong>, a <strong>URL da API</strong> e o <strong>Instance ID</strong> antes de conectar o WhatsApp.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-transparent bg-white/5">
        <div className="flex items-center gap-2">
          {status === 'loading' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
          {status === 'connected' && <Wifi className="w-4 h-4 text-green-400" />}
          {(status === 'disconnected' || status === 'idle') && <WifiOff className="w-4 h-4 text-red-400" />}
          {status === 'connecting' && <QrCode className="w-4 h-4 text-orange-400 animate-pulse" />}
          {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}

          <span className="text-sm font-medium text-white">
            {status === 'loading' && 'Verificando conexão...'}
            {status === 'connected' && (phoneConnected ? `Conectado: ${phoneConnected}` : 'WhatsApp Conectado')}
            {(status === 'disconnected' || status === 'idle') && 'WhatsApp Desconectado'}
            {status === 'connecting' && 'Aguardando leitura do QR Code...'}
            {status === 'error' && 'Erro ao conectar'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Online</Badge>
          )}
          {(status === 'disconnected' || status === 'error') && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Offline</Badge>
          )}
          {status === 'connecting' && qrExpiry > 0 && (
            <Badge className={`border ${qrExpiry <= 15 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-transparent'}`}>
              {qrExpiry}s
            </Badge>
          )}
        </div>
      </div>

      {/* Erro */}
      {status === 'error' && errorMsg && (
        <Alert className="bg-red-900/20 border-red-700">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="ml-2 text-red-300 text-xs break-all">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* QR Code */}
      {qrBase64 && status === 'connecting' && (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-lg">
          <div className="text-center space-y-1">
            <p className="text-gray-800 font-semibold text-sm flex items-center gap-2 justify-center">
              <Smartphone className="w-4 h-4 text-green-600" />
              Escaneie com o WhatsApp
            </p>
            <p className="text-gray-500 text-xs">
              Abra o WhatsApp → Menu → Dispositivos vinculados → Vincular dispositivo
            </p>
          </div>

          <div className={`p-2 rounded-xl border-4 transition-all ${qrExpiry <= 15 ? 'border-red-400 opacity-60' : 'border-green-400'}`}>
            <img
              src={qrBase64}
              alt="QR Code WhatsApp"
              className="w-52 h-52 object-contain"
            />
          </div>

          {qrExpiry <= 15 && qrExpiry > 0 && (
            <p className="text-red-500 text-xs font-medium animate-pulse">
              ⚠️ QR Code expirando em {qrExpiry}s...
            </p>
          )}
          {qrExpiry === 0 && (
            <p className="text-red-500 text-xs font-medium">QR Code expirado. Gere um novo.</p>
          )}
        </div>
      )}

      {/* Sucesso */}
      {status === 'connected' && (
        <div className="flex flex-col items-center gap-3 p-5 bg-green-900/20 border border-green-500/30 rounded-xl">
          <CheckCircle className="w-10 h-10 text-green-400" />
          <p className="text-green-300 font-semibold">WhatsApp conectado com sucesso!</p>
          <p className="text-green-500 text-xs">O sistema está pronto para enviar mensagens automáticas.</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-2">
        {/* Verificar status */}
        {(status === 'idle' || status === 'disconnected' || status === 'error' || status === 'connected') && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={status === 'loading'}
            className="border-transparent text-gray-300 hover:bg-white/10"
          >
            {status === 'loading' ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Verificar Status
          </Button>
        )}

        {/* Conectar / gerar QR */}
        {(status === 'disconnected' || status === 'error' || status === 'idle') && (
          <Button
            type="button"
            size="sm"
            onClick={fetchQRCode}
            className="bg-green-600 hover:bg-green-700 text-white border-0"
          >
            <QrCode className="w-3 h-3 mr-1" />
            Conectar via QR Code
          </Button>
        )}

        {/* Renovar QR */}
        {status === 'connecting' && (
          <Button
            type="button"
            size="sm"
            onClick={refreshQR}
            variant="outline"
            className="border-0 bg-[#15191a] text-orange-400 shadow-[inset_4px_4px_10px_rgba(0,0,0,0.38),inset_-3px_-3px_8px_rgba(255,255,255,0.014)] hover:bg-[#1a1e20]"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Renovar QR Code
          </Button>
        )}

        {/* Desconectar */}
        {status === 'connected' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={disconnect}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-3 h-3 mr-1" />
            Desconectar
          </Button>
        )}
      </div>
    </div>
  );
}
