import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { remoteClient } from '@/api/remoteClient';
import { useAuth } from '@/lib/AuthContext';
import { MessageSquare, Send, Search, ArrowLeft, User as UserIcon, Archive, ChevronRight } from 'lucide-react';

/* Paleta / estilo (iOS-like, dark, blur) */
const BG = 'radial-gradient(1200px 600px at 50% -10%, #1a0f2e 0%, #0a0a0a 55%, #050505 100%)';
const spring = { type: 'spring', stiffness: 380, damping: 38 };

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === 'admin' || user?.role === 'dev';
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 900 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setThreads(await remoteClient.chat.threads() || []); }
    catch { /* ignore */ }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    loadThreads();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') loadThreads(true); }, 12000);
    return () => clearInterval(iv);
  }, [loadThreads]);

  const leave = () => { if (window.history.length > 1) navigate(-1); else navigate('/Dashboard'); };
  const filtered = threads.filter(t =>
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase()));
  const activeThread = threads.find(t => t.resellerId === active);

  // ───────── Revendedor: conversa única em tela cheia ─────────
  if (!isStaff) {
    return (
      <Shell>
        <Conversation
          resellerId={user.id}
          me={user}
          title="Administrador"
          subtitle="Suporte Gestor J2"
          onBack={leave}
          onSent={() => loadThreads(true)}
        />
      </Shell>
    );
  }

  // ───────── Admin: lista + conversa ─────────
  // Mobile: push navigation (lista -> conversa). Desktop: master-detail lado a lado.
  if (isMobile) {
    return (
      <Shell>
        <AnimatePresence initial={false} mode="popLayout">
          {!active ? (
            <motion.div key="list" style={panel}
              initial={{ x: '-30%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-30%', opacity: 0 }} transition={spring}>
              <ThreadList threads={filtered} loading={loading} search={search} setSearch={setSearch}
                onBack={leave} onPick={setActive} />
            </motion.div>
          ) : (
            <motion.div key="conv" style={panel}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}>
              <Conversation resellerId={active} me={user} title={activeThread?.name || 'Revendedor'}
                subtitle={activeThread?.email} onBack={() => { setActive(null); loadThreads(true); }}
                onSent={() => loadThreads(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: 'flex', height: '100%' }}>
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring}
          style={{ width: 360, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', height: '100%' }}>
          <ThreadList threads={filtered} loading={loading} search={search} setSearch={setSearch}
            onBack={leave} onPick={setActive} activeId={active} />
        </motion.div>
        <div style={{ flex: 1, height: '100%' }}>
          {active ? (
            <Conversation key={active} resellerId={active} me={user} title={activeThread?.name || 'Revendedor'}
              subtitle={activeThread?.email} onSent={() => loadThreads(true)} embedded />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare style={{ width: 30, height: 30, color: 'rgba(167,139,250,0.5)' }} />
              </div>
              <p style={{ fontSize: 14, margin: 0 }}>Selecione um revendedor para conversar</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* Overlay full-screen com entrada (sensação de "abrir o WhatsApp") */
function Shell({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: BG, color: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {children}
    </motion.div>
  );
}

const panel = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' };

/* Lista de revendedores (admin) */
function ThreadList({ threads, loading, search, setSearch, onBack, onPick, activeId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar onBack={onBack} title="Conversas" big />
      <div style={{ padding: '4px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '9px 12px' }}>
          <Search style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.35)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar revendedor"
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
        {loading ? <Loading /> : threads.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 40 }}>Nenhuma conversa.</p>
        ) : threads.map((t, i) => (
          <motion.button key={t.resellerId} onClick={() => onPick(t.resellerId)}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', marginBottom: 2,
              background: activeId === t.resellerId ? 'rgba(167,139,250,0.14)' : 'transparent',
              border: 'none', borderRadius: 14, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (activeId !== t.resellerId) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (activeId !== t.resellerId) e.currentTarget.style.background = 'transparent'; }}>
            <Avatar name={t.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name || 'Revendedor'}</p>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lastMessage || 'Toque para conversar'}</p>
            </div>
            {t.unread > 0 && <span style={{ background: '#34d399', color: '#04221a', fontSize: 11, fontWeight: 800, borderRadius: 20, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{t.unread}</span>}
            <ChevronRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.2)' }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* Conversa */
function Conversation({ resellerId, me, title, subtitle, onBack, onSent, embedded }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    try {
      const raw = await remoteClient.chat.messages(resellerId);
      setMessages(Array.isArray(raw) ? raw : []);
    } catch { /* ignore */ } finally { if (!silent) setLoaded(true); }
  }, [resellerId]);

  useEffect(() => {
    setLoaded(false); load();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 5000);
    return () => clearInterval(iv);
  }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText(''); setSending(true);
    try { await remoteClient.chat.send(t, resellerId); await load(true); onSent?.(); }
    catch { setText(t); }
    finally { setSending(false); }
  };

  const archive = async () => {
    if (!messages.length) return;
    if (!confirm(`Empacotar ${messages.length} mensagem(ns)? Saem do chat ativo mas ficam guardadas (compactadas).`)) return;
    try { await remoteClient.chat.archive(resellerId); await load(true); onSent?.(); }
    catch (e) { alert(e?.message || 'Não foi possível empacotar.'); }
  };

  const mine = (m) => m.authorId === me?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar onBack={onBack} title={title} subtitle={subtitle} avatar
        right={messages.length > 0 && (
          <button onClick={archive} title="Empacotar e guardar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Archive style={{ width: 13, height: 13 }} />
          </button>
        )} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loaded && messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <MessageSquare style={{ width: 26, height: 26, color: 'rgba(167,139,250,0.5)' }} />
            </div>
            <p style={{ fontSize: 13, margin: 0 }}>Inicie a conversa 👋</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showName = !mine(m) && (!prev || prev.authorId !== m.authorId);
          return (
            <motion.div key={m.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: mine(m) ? 'flex-end' : 'flex-start' }}>
              {showName && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '6px 6px 2px' }}>{m.authorName}</span>}
              <div style={{
                maxWidth: '80%', padding: '9px 13px', fontSize: 14, lineHeight: 1.4,
                borderRadius: mine(m) ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
                background: mine(m) ? 'linear-gradient(135deg,#a78bfa,#8b5cf6)' : 'rgba(255,255,255,0.08)',
                color: mine(m) ? '#0a0a0a' : '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.3)', wordBreak: 'break-word',
              }}>
                {m.content}
                <span style={{ display: 'block', fontSize: 10, marginTop: 3, opacity: 0.6, textAlign: 'right' }}>
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)' }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Mensagem"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, color: '#fff', fontSize: 14, padding: '11px 16px', outline: 'none' }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={send} disabled={sending || !text.trim()}
          style={{ width: 44, height: 44, borderRadius: '50%', background: text.trim() ? 'linear-gradient(135deg,#a78bfa,#8b5cf6)' : 'rgba(255,255,255,0.1)', border: 'none', color: '#0a0a0a', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send style={{ width: 18, height: 18 }} />
        </motion.button>
      </div>
    </div>
  );
}

/* Barra superior estilo iOS */
function TopBar({ onBack, title, subtitle, right, avatar, big }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(14px)',
      position: 'sticky', top: 0, zIndex: 5, minHeight: 56,
    }}>
      {onBack && (
        <motion.button whileTap={{ scale: 0.85 }} onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 15, fontWeight: 600, padding: 4 }}>
          <ArrowLeft style={{ width: 22, height: 22 }} /> {big ? '' : 'Voltar'}
        </motion.button>
      )}
      {avatar && <Avatar name={title} small />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: big ? 20 : 15, fontWeight: 800, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        {subtitle && <p style={{ fontSize: 11.5, color: 'rgba(52,211,153,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Avatar({ name, small }) {
  const initial = (name || 'R').trim()[0]?.toUpperCase() || 'R';
  const sz = small ? 34 : 44;
  return (
    <div style={{ width: sz, height: sz, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#a78bfa,#22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0a0a0a', fontSize: small ? 14 : 17 }}>
      {initial}
    </div>
  );
}

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem 0' }}>
    <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
