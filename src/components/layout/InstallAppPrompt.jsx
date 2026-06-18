import { useEffect, useState, useCallback, useRef } from 'react';
import { Download, X, Share, Plus, Smartphone, BellRing } from 'lucide-react';
import { isInstalledPWA, isPushSupported, enablePush } from '@/lib/pushManager';

const SNOOZE_KEY = 'gestorj2.install_prompt_snooze';
const COUNT_KEY = 'gestorj2.install_prompt_count';
const MAX_PROMPTS = 3;                               // insiste ate 3 vezes
const REINSIST_MS = 1000 * 90;                       // 90s entre cada insistencia
const LONG_SNOOZE_MS = 1000 * 60 * 60 * 24 * 3;      // 3 dias apos esgotar as 3 vezes

const AVAILABLE_KEY = 'gestorj2.install_available';   // sinaliza que instalar é uma opção real

const getCount = () => Number(localStorage.getItem(COUNT_KEY) || 0);
const isSnoozed = () => Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0);
const markInstallAvailable = () => {
  localStorage.setItem(AVAILABLE_KEY, '1');
  // avisa o banner de notificações para reavaliar quem aparece
  window.dispatchEvent(new Event('gestorj2:install-state'));
};
const resetPromptState = () => {
  localStorage.removeItem(SNOOZE_KEY);
  localStorage.removeItem(COUNT_KEY);
  localStorage.removeItem(AVAILABLE_KEY);
  window.dispatchEvent(new Event('gestorj2:install-state'));
};

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Prompt de instalação do PWA (best-in-class):
 * - Android/Chrome/Edge: usa o evento nativo beforeinstallprompt (botão "Instalar").
 * - iOS/Safari: instrui o passo "Compartilhar -> Adicionar à Tela de Início".
 * - Após instalar, pede permissão de notificações automaticamente.
 */
export default function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('android'); // 'android' | 'ios'
  const [installing, setInstalling] = useState(false);
  const deferredRef = useRef(null);
  const reinsistRef = useRef(null);

  const evaluate = useCallback(() => {
    if (isInstalledPWA() || isSnoozed() || getCount() >= MAX_PROMPTS) { setVisible(false); return; }
    if (deferredRef.current) { markInstallAvailable(); setMode('android'); setVisible(true); return; }
    if (isIos()) { markInstallAvailable(); setMode('ios'); setVisible(true); return; }
    // sem evento nativo e não-iOS: não força (desktop/navegador sem suporte)
  }, []);

  useEffect(() => {
    const onBIP = (e) => {
      e.preventDefault();
      deferredRef.current = e;
      markInstallAvailable();
      if (!isInstalledPWA() && !isSnoozed() && getCount() < MAX_PROMPTS) { setMode('android'); setVisible(true); }
    };
    const onInstalled = async () => {
      setVisible(false);
      if (reinsistRef.current) clearTimeout(reinsistRef.current);
      resetPromptState();
      deferredRef.current = null;
      // Após instalar, pede notificações (algumas plataformas exigem novo gesto;
      // o banner de notificação cobre o fallback).
      try { if (isPushSupported()) await enablePush(); } catch { /* banner cobre */ }
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    // iOS não dispara beforeinstallprompt — avalia após montar
    const t = setTimeout(evaluate, 1500);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(t);
      if (reinsistRef.current) clearTimeout(reinsistRef.current);
    };
  }, [evaluate]);

  const install = async () => {
    const dp = deferredRef.current;
    if (!dp) return;
    setInstalling(true);
    try {
      dp.prompt();
      const choice = await dp.userChoice;
      deferredRef.current = null;
      setVisible(false);
      if (choice?.outcome === 'accepted') {
        if (reinsistRef.current) clearTimeout(reinsistRef.current);
        resetPromptState();
      } else {
        // recusou no diálogo nativo: conta como uma insistência
        dismiss();
      }
    } finally { setInstalling(false); }
  };

  // Fecha o banner e reaparece ate atingir o limite (insiste 3 vezes).
  const dismiss = () => {
    setVisible(false);
    if (reinsistRef.current) clearTimeout(reinsistRef.current);
    const next = getCount() + 1;
    localStorage.setItem(COUNT_KEY, String(next));
    // avisa o banner de notificações (quando esgota, ele assume a vez no navegador)
    window.dispatchEvent(new Event('gestorj2:install-state'));
    if (next >= MAX_PROMPTS) {
      // esgotou as 3 insistencias: descansa por 3 dias
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + LONG_SNOOZE_MS));
      return;
    }
    // ainda insiste: pausa curta e reaparece (inclusive na mesma sessao)
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + REINSIST_MS));
    reinsistRef.current = setTimeout(() => { evaluate(); }, REINSIST_MS + 200);
  };

  if (!visible) return null;

  return (
    <div style={wrap}>
      <style>{`@keyframes j2up{from{transform:translateY(120%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <button onClick={dismiss} aria-label="Fechar" style={closeBtn}>
        <X style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.85)' }} />
      </button>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingRight: 28 }}>
        <div style={iconBox}><Smartphone style={{ width: 20, height: 20, color: '#fff' }} /></div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Instale o app Gestor J2</p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>
            {mode === 'ios'
              ? 'Acesso rápido na tela inicial e notificações de pedidos/mensagens mesmo com o app fechado.'
              : 'Tela inicial, abertura instantânea e notificações em tempo real de pedidos e mensagens.'}
          </p>
        </div>
      </div>

      {mode === 'ios' ? (
        <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.18)', borderRadius: 12, padding: '10px 12px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>1. Toque em <Share style={{ width: 14, height: 14 }} /> (Compartilhar)</span>
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>2. <Plus style={{ width: 14, height: 14 }} /> "Adicionar à Tela de Início"</span>
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
            3. Abra pelo ícone instalado e ative as notificações.
          </p>
          <button onClick={dismiss} style={{ ...primaryBtn, marginTop: 10, background: 'rgba(255,255,255,0.14)', color: '#fff' }}>Entendi</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={dismiss} style={ghostBtn}>Agora não</button>
          <button onClick={install} disabled={installing} style={{ ...primaryBtn, flex: 2, opacity: installing ? 0.7 : 1 }}>
            <Download style={{ width: 14, height: 14 }} /> {installing ? 'Instalando...' : 'Instalar app'}
          </button>
        </div>
      )}

      <p style={{ margin: '10px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        <BellRing style={{ width: 11, height: 11 }} /> As notificações são ativadas após a instalação.
      </p>
    </div>
  );
}

const wrap = {
  position: 'fixed', left: 12, right: 12, bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
  zIndex: 9998, maxWidth: 460, margin: '0 auto',
  background: 'linear-gradient(145deg, #111516, #0b0e0f)',
  border: '0', borderRadius: 18,
  boxShadow: '10px 10px 24px rgba(0,0,0,0.5), -7px -7px 18px rgba(255,255,255,0.018)', padding: '16px 16px 14px',
  backdropFilter: 'blur(16px)', animation: 'j2up 0.35s cubic-bezier(0.34,1.56,0.64,1)',
};
const closeBtn = { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 8, background: '#15191a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const iconBox = { width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'rgba(255,75,18,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const primaryBtn = { flex: 1, padding: '10px', borderRadius: 11, background: 'linear-gradient(135deg,#ff4b12,#d93810)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
const ghostBtn = { flex: 1, padding: '10px', borderRadius: 11, background: '#101314', border: '0', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', boxShadow: 'inset 4px 4px 10px rgba(0,0,0,0.42), inset -3px -3px 8px rgba(255,255,255,0.014)' };
