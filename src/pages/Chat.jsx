import React, { useState, useEffect, useRef, useCallback } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { useAuth } from '@/lib/AuthContext';
import { MessageSquare, Send, Search, ArrowLeft, User as UserIcon, Archive } from 'lucide-react';

const S = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '16px 14px 96px' },
  card: { background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 },
};

export default function Chat() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'dev';
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null); // resellerId selecionado (admin)
  const [search, setSearch] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setLoadingThreads(true);
    try { setThreads(await remoteClient.chat.threads() || []); }
    catch { /* ignore */ }
    finally { if (!silent) setLoadingThreads(false); }
  }, []);

  useEffect(() => {
    loadThreads();
    // Só atualiza com a aba visível — economiza carga em escala.
    const iv = setInterval(() => { if (document.visibilityState === 'visible') loadThreads(true); }, 12000);
    return () => clearInterval(iv);
  }, [loadThreads]);

  // Revendedor: vai direto pra própria conversa
  useEffect(() => {
    if (!isStaff && user?.id) setActive(user.id);
  }, [isStaff, user?.id]);

  if (!isStaff) {
    return (
      <div style={S.page}>
        <Header title="Conversa com o Administrador" />
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Conversation resellerId={user.id} me={user} onSent={() => loadThreads(true)} />
        </div>
      </div>
    );
  }

  // Admin: lista de threads + conversa
  const filtered = threads.filter(t =>
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase()));
  const activeThread = threads.find(t => t.resellerId === active);

  return (
    <div style={S.page}>
      <Header title="Chat com Revendedores" />
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: active ? '0 1fr' : '1fr', gap: 14 }}>
        <div style={{ display: active ? 'none' : 'block' }}>
          <div style={{ ...S.card, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar revendedor..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, outline: 'none' }} />
          </div>
          {loadingThreads ? <Loading /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(t => (
                <button key={t.resellerId} onClick={() => setActive(t.resellerId)}
                  style={{ ...S.card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', borderColor: t.unread ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserIcon style={{ width: 16, height: 16, color: '#a78bfa' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{t.name || 'Revendedor'}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.lastMessage || 'Sem mensagens ainda'}
                    </p>
                  </div>
                  {t.unread > 0 && (
                    <span style={{ background: '#a78bfa', color: '#0a0a0a', fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>{t.unread}</span>
                  )}
                </button>
              ))}
              {filtered.length === 0 && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '2rem 0' }}>Nenhum revendedor.</p>}
            </div>
          )}
        </div>

        {active && (
          <div>
            <button onClick={() => { setActive(null); loadThreads(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginBottom: 10 }}>
              <ArrowLeft style={{ width: 13, height: 13 }} /> Voltar
            </button>
            <Conversation resellerId={active} me={user} title={activeThread?.name} onSent={() => loadThreads(true)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Conversation({ resellerId, me, title, onSent }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    try {
      const raw = await remoteClient.chat.messages(resellerId);
      setMessages(Array.isArray(raw) ? raw : []);
    } catch { /* ignore */ }
  }, [resellerId]);

  useEffect(() => {
    load();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 5000);
    return () => clearInterval(iv);
  }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText('');
    setSending(true);
    try {
      await remoteClient.chat.send(t, resellerId);
      await load(true);
      onSent?.();
    } catch { setText(t); }
    finally { setSending(false); }
  };

  const mine = (m) => m.authorId === me?.id;

  const archive = async () => {
    if (!messages.length) return;
    if (!confirm(`Empacotar ${messages.length} mensagem(ns)? Elas saem do chat ativo mas ficam guardadas permanentemente (compactadas).`)) return;
    try { await remoteClient.chat.archive(resellerId); await load(true); onSent?.(); }
    catch (e) { alert(e?.message || 'Não foi possível empacotar.'); }
  };

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', height: '70vh', minHeight: 420, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare style={{ width: 15, height: 15, color: '#a78bfa' }} />
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{title || 'Conversa'}</span>
        {messages.length > 0 && (
          <button onClick={archive} title="Empacotar e guardar (zip)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <Archive style={{ width: 12, height: 12 }} /> Empacotar
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 20 }}>Inicie a conversa.</p>}
        {messages.map((m, i) => (
          <div key={m.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine(m) ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: 12, fontSize: 13,
              background: mine(m) ? '#a78bfa' : 'rgba(255,255,255,0.07)', color: mine(m) ? '#0a0a0a' : '#fff' }}>
              {m.content}
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 4px 0' }}>
              {m.authorName} • {m.createdAt ? new Date(m.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Digite sua mensagem..."
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, padding: '10px 14px', outline: 'none' }} />
        <button onClick={send} disabled={sending || !text.trim()}
          style={{ background: '#a78bfa', border: 'none', borderRadius: 10, color: '#0a0a0a', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: sending || !text.trim() ? 0.5 : 1 }}>
          <Send style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

const Header = ({ title }) => (
  <div style={{ maxWidth: 1100, margin: '0 auto 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
    <MessageSquare style={{ width: 20, height: 20, color: '#a78bfa' }} />
    <h1 style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#a78bfa,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>{title}</h1>
  </div>
);
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.2)', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
