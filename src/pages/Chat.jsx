import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { remoteClient } from '@/api/remoteClient';
import { useAuth } from '@/lib/AuthContext';
import { Send, Search, ArrowLeft, Archive, ChevronRight, MessageSquare, Check, CheckCheck } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────
   GESTOR J2 — CHAT premium. Aurora viva, glassmorphism, balões com cauda,
   avatares com anel gradiente + status, separadores de data, ticks de leitura,
   transições iOS com parallax. Full-screen, responsivo, sem cara de remendo.
   ────────────────────────────────────────────────────────────────────────── */

const SPRING = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 };
const EASE = [0.22, 1, 0.36, 1];

/* paleta determinística de avatar a partir do nome */
const GRADIENTS = [
  ['#a78bfa', '#7c3aed'], ['#22d3ee', '#3b82f6'], ['#f472b6', '#db2777'],
  ['#34d399', '#059669'], ['#fbbf24', '#f59e0b'], ['#f87171', '#dc2626'],
  ['#818cf8', '#4f46e5'], ['#2dd4bf', '#0d9488'],
];
const gradOf = (s = '') => GRADIENTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length];

const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
const dayLabel = (d) => {
  const x = new Date(d), now = new Date();
  const k = dayKey(d), today = dayKey(now);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (k === today) return 'Hoje';
  if (k === dayKey(y)) return 'Ontem';
  return x.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: x.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};
const hhmm = (d) => d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === 'admin' || user?.role === 'dev';
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 920 : false);

  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 920);
    window.addEventListener('resize', r); return () => window.removeEventListener('resize', r);
  }, []);

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setThreads(await remoteClient.chat.threads() || []); } catch { /* */ }
    finally { if (!silent) setLoading(false); }
  }, []);
  useEffect(() => {
    loadThreads();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') loadThreads(true); }, 12000);
    return () => clearInterval(iv);
  }, [loadThreads]);

  const leave = () => { window.history.length > 1 ? navigate(-1) : navigate('/Dashboard'); };
  const filtered = useMemo(() => threads.filter(t =>
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase())), [threads, search]);
  const activeThread = threads.find(t => t.resellerId === active);

  let body;
  if (!isStaff) {
    body = <Conversation resellerId={user.id} me={user} title="Suporte Gestor J2" subtitle="Administrador" onBack={leave} onSent={() => loadThreads(true)} />;
  } else if (isMobile) {
    body = (
      <AnimatePresence initial={false} mode="popLayout">
        {!active ? (
          <motion.div key="list" style={ABS} initial={{ x: '-32%', opacity: 0.4, filter: 'blur(4px)' }} animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ x: '-32%', opacity: 0, filter: 'blur(4px)' }} transition={SPRING}>
            <ThreadList threads={filtered} loading={loading} search={search} setSearch={setSearch} onBack={leave} onPick={setActive} />
          </motion.div>
        ) : (
          <motion.div key="conv" style={ABS} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING}>
            <Conversation resellerId={active} me={user} title={activeThread?.name || 'Revendedor'} subtitle={activeThread?.email} onBack={() => { setActive(null); loadThreads(true); }} onSent={() => loadThreads(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  } else {
    body = (
      <div style={{ display: 'flex', height: '100%' }}>
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...SPRING, delay: 0.05 }}
          style={{ width: 388, flexShrink: 0, height: '100%', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <ThreadList threads={filtered} loading={loading} search={search} setSearch={setSearch} onBack={leave} onPick={setActive} activeId={active} />
        </motion.div>
        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div key={active} style={ABS} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.28, ease: EASE }}>
                <Conversation resellerId={active} me={user} title={activeThread?.name || 'Revendedor'} subtitle={activeThread?.email} onSent={() => loadThreads(true)} />
              </motion.div>
            ) : <motion.div key="empty" style={ABS} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><EmptyHero /></motion.div>}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', color: '#fff', display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
      <Aurora />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0 }}>{body}</div>
    </motion.div>
  );
}

/* ── Fundo aurora vivo + grão ── */
function Aurora() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#06050c', overflow: 'hidden' }}>
      <style>{CSS}</style>
      <div className="j2-blob" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.55), transparent 60%)', width: 620, height: 620, top: -180, left: -140, animationDelay: '0s' }} />
      <div className="j2-blob" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.40), transparent 60%)', width: 560, height: 560, bottom: -220, right: -120, animationDelay: '-7s' }} />
      <div className="j2-blob" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.34), transparent 60%)', width: 500, height: 500, top: '40%', left: '55%', animationDelay: '-14s' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.05, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,5,12,0.2), rgba(6,5,12,0.72))' }} />
    </div>
  );
}

/* ── Lista de conversas ── */
function ThreadList({ threads, loading, search, setSearch, onBack, onPick, activeId }) {
  const total = threads.reduce((a, t) => a + (t.unread || 0), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ padding: '14px 18px 10px', position: 'sticky', top: 0, zIndex: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <BackBtn onClick={onBack} />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(120deg,#fff,#c4b5fd 60%,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mensagens</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
              {total > 0 ? `${total} não lida${total > 1 ? 's' : ''}` : 'Tudo em dia'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)' }}>
          <Search style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.4)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar revendedor"
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 14.5, outline: 'none' }} />
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 24px' }}>
        {loading ? <Skeletons /> : threads.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.35)' }}>
            <MessageSquare style={{ width: 30, height: 30, margin: '0 auto 10px', opacity: 0.5 }} />
            <p style={{ fontSize: 14 }}>Nenhuma conversa por aqui.</p>
          </div>
        ) : threads.map((t, i) => (
          <motion.button key={t.resellerId} onClick={() => onPick(t.resellerId)}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.035, 0.5), ease: EASE }}
            whileTap={{ scale: 0.985 }}
            className="j2-thread"
            style={{ '--ring': gradOf(t.name)[0], width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '12px 13px', marginBottom: 4,
              background: activeId === t.resellerId ? 'rgba(167,139,250,0.14)' : 'transparent',
              border: activeId === t.resellerId ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent',
              borderRadius: 18, cursor: 'pointer', textAlign: 'left' }}>
            <Avatar name={t.name} size={50} online={t.unread > 0} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name || 'Revendedor'}</p>
                {t.lastAt && <span style={{ fontSize: 11, color: t.unread ? '#34d399' : 'rgba(255,255,255,0.35)', flexShrink: 0, fontWeight: t.unread ? 700 : 400 }}>{hhmm(t.lastAt)}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                <p style={{ margin: 0, fontSize: 13, color: t.unread ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.42)', fontWeight: t.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.lastMessage || 'Toque para conversar'}
                </p>
                {t.unread > 0
                  ? <span className="j2-unread" style={{ flexShrink: 0 }}>{t.unread}</span>
                  : <ChevronRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── Conversa ── */
function Conversation({ resellerId, me, title, subtitle, onBack, onSent }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    try { const raw = await remoteClient.chat.messages(resellerId); setMessages(Array.isArray(raw) ? raw : []); }
    catch { /* */ } finally { if (!silent) setLoaded(true); }
  }, [resellerId]);

  useEffect(() => { setLoaded(false); load(); const iv = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 5000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const t = text.trim(); if (!t || sending) return;
    setText(''); setSending(true);
    try { await remoteClient.chat.send(t, resellerId); await load(true); onSent?.(); } catch { setText(t); } finally { setSending(false); }
  };
  const archive = async () => {
    if (!messages.length) return;
    if (!confirm(`Empacotar ${messages.length} mensagem(ns)? Saem do chat ativo mas ficam guardadas (compactadas).`)) return;
    try { await remoteClient.chat.archive(resellerId); await load(true); onSent?.(); } catch (e) { alert(e?.message || 'Erro ao empacotar.'); }
  };

  const mine = (m) => m.authorId === me?.id;
  const wasRead = (m) => (me?.role === 'admin' || me?.role === 'dev') ? m.readByReseller : m.readByAdmin;

  // agrupa por dia + por autor consecutivo
  const rows = useMemo(() => {
    const out = []; let lastDay = null;
    messages.forEach((m, i) => {
      const dk = dayKey(m.createdAt);
      if (dk !== lastDay) { out.push({ sep: dayLabel(m.createdAt), id: 'd' + dk }); lastDay = dk; }
      const prev = messages[i - 1];
      const firstOfGroup = !prev || prev.authorId !== m.authorId || dayKey(prev.createdAt) !== dk;
      out.push({ m, firstOfGroup });
    });
    return out;
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', minHeight: 62,
        background: 'rgba(8,7,16,0.55)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(18px)', position: 'sticky', top: 0, zIndex: 4 }}>
        {onBack && <BackBtn onClick={onBack} />}
        <Avatar name={title} size={42} online />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
          <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="j2-onlinedot" /> {subtitle || 'online'}
          </p>
        </div>
        {messages.length > 0 && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={archive} title="Empacotar e guardar"
            style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(251,191,36,0.13)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Archive style={{ width: 16, height: 16 }} />
          </motion.button>
        )}
      </header>

      {/* mensagens */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {loaded && messages.length === 0 && <EmptyChat />}
        {rows.map((r, i) => r.sep ? (
          <div key={r.id} style={{ alignSelf: 'center', margin: '10px 0', padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)' }}>{r.sep}</div>
        ) : (
          <Bubble key={r.m.id || i} m={r.m} mine={mine(r.m)} firstOfGroup={r.firstOfGroup} read={wasRead(r.m)} />
        ))}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div style={{ padding: '10px 12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, padding: 6, borderRadius: 26, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(18px)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Mensagem" rows={1}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={{ flex: 1, resize: 'none', maxHeight: 120, background: 'transparent', border: 'none', color: '#fff', fontSize: 15, lineHeight: 1.4, padding: '9px 8px 9px 12px', outline: 'none', fontFamily: 'inherit' }} />
          <motion.button whileTap={{ scale: 0.85 }} animate={text.trim() ? { scale: 1 } : { scale: 0.92 }} onClick={send} disabled={sending || !text.trim()}
            className={text.trim() ? 'j2-send-on' : ''}
            style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              background: text.trim() ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : 'rgba(255,255,255,0.1)',
              color: text.trim() ? '#fff' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send style={{ width: 19, height: 19, marginLeft: 2 }} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, mine, firstOfGroup, read }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginTop: firstOfGroup ? 8 : 1 }}>
      {firstOfGroup && !mine && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '0 12px 3px', fontWeight: 600 }}>{m.authorName}</span>}
      <div style={{ maxWidth: 'min(78%, 560px)', padding: '9px 13px 7px', fontSize: 14.5, lineHeight: 1.42, position: 'relative', wordBreak: 'break-word',
        color: mine ? '#fff' : '#f1f1f4',
        background: mine ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'rgba(255,255,255,0.08)',
        border: mine ? 'none' : '1px solid rgba(255,255,255,0.07)',
        backdropFilter: mine ? 'none' : 'blur(10px)',
        boxShadow: mine ? '0 6px 22px rgba(124,58,237,0.32)' : '0 2px 10px rgba(0,0,0,0.25)',
        borderRadius: mine ? (firstOfGroup ? '20px 20px 6px 20px' : '20px 6px 6px 20px') : (firstOfGroup ? '20px 20px 20px 6px' : '6px 20px 20px 6px') }}>
        {m.content}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, float: 'right', marginLeft: 10, marginTop: 4, fontSize: 10, opacity: 0.7, transform: 'translateY(2px)' }}>
          {hhmm(m.createdAt)}
          {mine && (read ? <CheckCheck style={{ width: 14, height: 14, color: '#67e8f9' }} /> : <Check style={{ width: 13, height: 13 }} />)}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Avatar com anel gradiente + status ── */
function Avatar({ name, size = 44, online }) {
  const [a, b] = gradOf(name);
  const i = (name || 'R').trim()[0]?.toUpperCase() || 'R';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', padding: 2, background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: `0 4px 16px ${a}55` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0b0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.4, color: '#fff' }}>{i}</div>
      </div>
      {online && <span style={{ position: 'absolute', right: 1, bottom: 1, width: size * 0.26, height: size * 0.26, borderRadius: '50%', background: '#34d399', border: '2.5px solid #0b0a14', boxShadow: '0 0 8px #34d399' }} />}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <motion.button whileTap={{ scale: 0.86 }} onClick={onClick}
      style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
      <ArrowLeft style={{ width: 20, height: 20 }} />
    </motion.button>
  );
}

function EmptyHero() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 30, textAlign: 'center' }}>
      <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 110, height: 110, borderRadius: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(34,211,238,0.18))', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 24px 60px rgba(124,58,237,0.35)' }}>
        <MessageSquare style={{ width: 48, height: 48, color: '#c4b5fd' }} />
      </motion.div>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, background: 'linear-gradient(120deg,#fff,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Suas conversas</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 320 }}>Escolha um revendedor à esquerda para abrir a conversa. Mensagens em tempo real, com notificação no celular.</p>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 70, height: 70, borderRadius: 22, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <MessageSquare style={{ width: 30, height: 30, color: 'rgba(167,139,250,0.6)' }} />
      </motion.div>
      <p style={{ fontSize: 14, margin: 0 }}>Diga olá 👋</p>
    </div>
  );
}

function Skeletons() {
  return (
    <div style={{ padding: '8px 2px' }}>
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 13px' }}>
          <div className="j2-shimmer" style={{ width: 50, height: 50, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className="j2-shimmer" style={{ width: '55%', height: 13, borderRadius: 7, marginBottom: 8 }} />
            <div className="j2-shimmer" style={{ width: '80%', height: 11, borderRadius: 7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const ABS = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' };
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

const CSS = `
.j2-blob{ position:absolute; border-radius:50%; filter:blur(60px); opacity:0.9; will-change:transform; animation:j2drift 22s ease-in-out infinite; }
@keyframes j2drift{ 0%,100%{ transform:translate(0,0) scale(1); } 33%{ transform:translate(60px,-50px) scale(1.12); } 66%{ transform:translate(-40px,40px) scale(0.94); } }
.j2-thread{ transition:background .18s, transform .18s, box-shadow .25s; }
.j2-thread:hover{ background:rgba(255,255,255,0.05)!important; box-shadow:0 8px 30px rgba(0,0,0,0.35), inset 0 0 0 1px var(--ring,#a78bfa)22; transform:translateY(-1px); }
.j2-unread{ min-width:22px; height:22px; padding:0 7px; border-radius:20px; background:linear-gradient(135deg,#34d399,#059669); color:#04221a; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 0 rgba(52,211,153,0.6); animation:j2pulse 2s infinite; }
@keyframes j2pulse{ 0%{ box-shadow:0 0 0 0 rgba(52,211,153,0.55);} 70%{ box-shadow:0 0 0 9px rgba(52,211,153,0);} 100%{ box-shadow:0 0 0 0 rgba(52,211,153,0);} }
.j2-onlinedot{ width:7px; height:7px; border-radius:50%; background:#34d399; display:inline-block; box-shadow:0 0 8px #34d399; animation:j2blink 2.4s infinite; }
@keyframes j2blink{ 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
.j2-send-on{ box-shadow:0 6px 22px rgba(124,58,237,0.5); animation:j2sendpulse 2.2s infinite; }
@keyframes j2sendpulse{ 0%,100%{ box-shadow:0 6px 22px rgba(124,58,237,0.45);} 50%{ box-shadow:0 6px 30px rgba(124,58,237,0.75);} }
.j2-shimmer{ background:linear-gradient(100deg, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 70%); background-size:200% 100%; animation:j2sh 1.4s infinite; }
@keyframes j2sh{ to{ background-position:-200% 0; } }
`;
