import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { useAuth } from '@/lib/AuthContext';
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  CheckCheck,
  Clipboard,
  Clock,
  Download,
  MessageCircle,
  MoreVertical,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';

const quickReplies = [
  'Olá! Já estou verificando seu pedido e te retorno por aqui.',
  'Sua recarga entrou na fila. Assim que for concluída eu aviso.',
  'Me envie o login correto do painel para eu conferir.',
  'Recarga concluída. Confira os créditos disponíveis no painel.',
  'Preciso de mais uma informação para finalizar seu atendimento.',
];

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initials(name = 'Revendedor') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'R';
}

function isResellerUser(user) {
  return user?.role === 'reseller' || user?.role === 'user';
}

function threadFromUser(user) {
  return {
    resellerId: user.id,
    name: user.name || user.full_name || 'Revendedor',
    email: user.email,
    phone: user.phone,
    status: user.status,
    paymentType: user.paymentType || user.payment_type,
    createdAt: user.createdAt || user.created_date,
    lastMessage: null,
    lastAt: null,
    unread: 0,
  };
}

function mergeThreadsWithUsers(threads, users) {
  const byId = new Map();
  for (const thread of threads || []) {
    if (thread?.resellerId) byId.set(thread.resellerId, { ...thread });
  }
  for (const user of users || []) {
    if (!isResellerUser(user) || !user.id) continue;
    const existing = byId.get(user.id);
    byId.set(user.id, {
      ...threadFromUser(user),
      ...(existing || {}),
      name: existing?.name || user.name || user.full_name || 'Revendedor',
      email: existing?.email || user.email,
      phone: existing?.phone || user.phone,
      status: existing?.status || user.status,
      paymentType: existing?.paymentType || user.paymentType || user.payment_type,
      createdAt: existing?.createdAt || user.createdAt || user.created_date,
    });
  }
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(a.lastAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.lastAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export default function Chat() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'dev';
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [threadSearch, setThreadSearch] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadError, setThreadError] = useState('');

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setLoadingThreads(true);
    try {
      setThreadError('');
      const [threadData, userData] = await Promise.allSettled([
        remoteClient.chat.threads(),
        isStaff ? remoteClient.users.list() : Promise.resolve([]),
      ]);

      const chatThreads = threadData.status === 'fulfilled' && Array.isArray(threadData.value)
        ? threadData.value
        : [];
      const users = userData.status === 'fulfilled' && Array.isArray(userData.value)
        ? userData.value
        : [];

      setThreads(isStaff ? mergeThreadsWithUsers(chatThreads, users) : chatThreads);

      if (threadData.status === 'rejected' && userData.status === 'rejected') {
        throw threadData.reason;
      }
    } catch (error) {
      setThreadError(error?.message || 'Não foi possível carregar os chats.');
    } finally {
      if (!silent) setLoadingThreads(false);
    }
  }, [isStaff]);

  useEffect(() => {
    loadThreads();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadThreads(true);
    }, 12000);
    return () => clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (!isStaff && user?.id) setActiveId(user.id);
  }, [isStaff, user?.id]);

  const filteredThreads = useMemo(() => {
    const term = threadSearch.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((thread) => (
      `${thread.name || ''} ${thread.email || ''} ${thread.lastMessage || ''}`
        .toLowerCase()
        .includes(term)
    ));
  }, [threadSearch, threads]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.resellerId === activeId) || null,
    [activeId, threads],
  );

  const totalUnread = threads.reduce((sum, thread) => sum + Number(thread.unread || 0), 0);

  return (
    <div className="chat-page">
      <style>{styles}</style>

      <header className="chat-topbar">
        <div>
          <div className="chat-title-row">
            <MessageCircle size={22} />
            <h1>{isStaff ? 'Chat com Revendedores' : 'Conversa com o Administrador'}</h1>
          </div>
          <p>Atendimento interno em tempo real. O chat não dispara WhatsApp.</p>
        </div>
        <div className="chat-top-actions">
          <span className="status-pill"><ShieldCheck size={15} /> Canal interno</span>
          {isStaff && <span className="status-pill purple"><Zap size={15} /> {totalUnread} não lidas</span>}
          <button className="icon-btn" onClick={() => loadThreads(false)} title="Atualizar conversas">
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <main className={`chat-shell ${activeId ? 'has-active' : ''} ${isStaff ? 'staff' : 'solo'}`}>
        {isStaff && (
          <aside className="thread-panel">
            <div className="thread-search">
              <Search size={16} />
              <input
                value={threadSearch}
                onChange={(event) => setThreadSearch(event.target.value)}
                placeholder="Buscar por nome, email ou mensagem"
              />
            </div>

            {threadError && (
              <div className="soft-alert">
                <strong>Conexão instável</strong>
                <span>{threadError}</span>
              </div>
            )}

            <div className="thread-list">
              {loadingThreads && <ThreadSkeleton />}

              {!loadingThreads && filteredThreads.map((thread) => (
                <button
                  key={thread.resellerId}
                  className={`thread-item ${thread.resellerId === activeId ? 'active' : ''}`}
                  onClick={() => setActiveId(thread.resellerId)}
                >
                  <Avatar name={thread.name} />
                  <div className="thread-copy">
                    <div className="thread-name-line">
                      <strong>{thread.name || 'Revendedor'}</strong>
                      <span>{formatTime(thread.lastAt)}</span>
                    </div>
                    <p>{thread.lastMessage || 'Sem mensagens ainda. Abra para iniciar.'}</p>
                    <small>{thread.email || 'email não informado'}</small>
                  </div>
                  {thread.unread > 0 && <b className="unread-badge">{thread.unread}</b>}
                </button>
              ))}

              {!loadingThreads && filteredThreads.length === 0 && (
                <EmptyThreads search={threadSearch} />
              )}
            </div>
          </aside>
        )}

        <section className="conversation-panel">
          {isStaff && !activeId ? (
            <WelcomePanel threads={threads} onSelectFirst={() => setActiveId(filteredThreads[0]?.resellerId)} />
          ) : (
            <Conversation
              resellerId={activeId}
              me={user}
              thread={activeThread}
              isStaff={isStaff}
              onBack={() => { setActiveId(null); loadThreads(true); }}
              onChange={() => loadThreads(true)}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function Conversation({ resellerId, me, thread, isStaff, onBack, onChange }) {
  const [messages, setMessages] = useState([]);
  const [archives, setArchives] = useState([]);
  const [archivePreview, setArchivePreview] = useState(null);
  const [messageSearch, setMessageSearch] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const loadMessages = useCallback(async (silent = false) => {
    if (!resellerId) return;
    if (!silent) setLoading(true);
    try {
      setError('');
      const data = await remoteClient.chat.messages(resellerId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Não foi possível carregar a conversa.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [resellerId]);

  const loadArchives = useCallback(async () => {
    if (!resellerId) return;
    try {
      const data = await remoteClient.chat.archives(resellerId);
      setArchives(Array.isArray(data) ? data : []);
    } catch {
      setArchives([]);
    }
  }, [resellerId]);

  useEffect(() => {
    loadMessages(false);
    loadArchives();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadMessages(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [loadMessages, loadArchives]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const visibleMessages = useMemo(() => {
    const term = messageSearch.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter((message) => (
      `${message.content || ''} ${message.authorName || ''}`.toLowerCase().includes(term)
    ));
  }, [messageSearch, messages]);

  const mine = (message) => message.authorId === me?.id;
  const latestMessage = messages[messages.length - 1];

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText('');
    setSending(true);
    try {
      await remoteClient.chat.send(content, resellerId);
      await loadMessages(true);
      onChange?.();
    } catch (err) {
      setText(content);
      setError(err?.message || 'Não foi possível enviar.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const archive = async () => {
    if (!messages.length) return;
    const ok = window.confirm(`Empacotar ${messages.length} mensagem(ns)? A thread viva será limpa, mas o histórico ficará guardado.`);
    if (!ok) return;
    try {
      await remoteClient.chat.archive(resellerId);
      await loadMessages(true);
      await loadArchives();
      onChange?.();
    } catch (err) {
      setError(err?.message || 'Não foi possível empacotar a conversa.');
    }
  };

  const openArchive = async (archiveId) => {
    try {
      setArchivePreview(await remoteClient.chat.archiveContent(archiveId));
    } catch (err) {
      setError(err?.message || 'Não foi possível abrir o pacote.');
    }
  };

  const copySummary = async () => {
    const summary = messages.slice(-12).map((message) => (
      `[${formatDate(message.createdAt)} ${formatTime(message.createdAt)}] ${message.authorName}: ${message.content}`
    )).join('\n');
    await navigator.clipboard?.writeText(summary || 'Sem mensagens.');
  };

  return (
    <div className="conversation">
      <div className="conversation-header">
        <button className="back-btn" onClick={onBack} title="Voltar para conversas">
          <ArrowLeft size={18} />
        </button>
        <Avatar name={thread?.name || me?.name} online />
        <div className="conversation-person">
          <strong>{isStaff ? (thread?.name || 'Revendedor') : 'Administrador'}</strong>
          <span>{thread?.email || 'Canal privado do Gestor J2'}</span>
        </div>
        <div className="header-tools">
          <div className="mini-search">
            <Search size={15} />
            <input value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} placeholder="Buscar" />
          </div>
          <button className="icon-btn" onClick={copySummary} title="Copiar resumo das últimas mensagens">
            <Clipboard size={17} />
          </button>
          <button className="icon-btn amber" onClick={archive} disabled={!messages.length} title="Empacotar conversa">
            <Archive size={17} />
          </button>
          <button className="icon-btn" title="Mais opções">
            <MoreVertical size={17} />
          </button>
        </div>
      </div>

      <div className="conversation-body">
        <div className="message-stream">
          {loading && <MessageSkeleton />}

          {!loading && error && (
            <div className="soft-alert centered">
              <strong>Não consegui carregar agora</strong>
              <span>{error}</span>
              <button onClick={() => loadMessages(false)}>Tentar novamente</button>
            </div>
          )}

          {!loading && !error && visibleMessages.length === 0 && (
            <EmptyConversation hasSearch={!!messageSearch} onPick={(reply) => setText(reply)} />
          )}

          {!loading && !error && visibleMessages.map((message, index) => (
            <MessageBubble
              key={message.id || index}
              message={message}
              mine={mine(message)}
              previous={visibleMessages[index - 1]}
            />
          ))}
          <div ref={endRef} />
        </div>

        <aside className="context-rail">
          <div className="rail-card">
            <span className="rail-label"><Sparkles size={14} /> Inteligência do atendimento</span>
            <strong>{messages.length ? `${messages.length} mensagens ativas` : 'Conversa nova'}</strong>
            <p>{latestMessage ? `Última interação às ${formatTime(latestMessage.createdAt)}.` : 'Use respostas rápidas para começar sem perder contexto.'}</p>
          </div>

          <div className="rail-card">
            <span className="rail-label"><Zap size={14} /> Respostas rápidas</span>
            <div className="quick-list">
              {quickReplies.map((reply) => (
                <button key={reply} onClick={() => { setText(reply); inputRef.current?.focus(); }}>
                  {reply}
                </button>
              ))}
            </div>
          </div>

          <div className="rail-card">
            <span className="rail-label"><PackageCheck size={14} /> Pacotes arquivados</span>
            {archives.length === 0 ? (
              <p>Nenhum pacote salvo ainda.</p>
            ) : (
              <div className="archive-list">
                {archives.slice(0, 5).map((item) => (
                  <button key={item.id} onClick={() => openArchive(item.id)}>
                    <Download size={14} />
                    <span>{item.messageCount} msgs</span>
                    <small>{formatDate(item.createdAt)}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="composer">
        <button className="jump-btn" onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })} title="Ir para a última mensagem">
          <ArrowDown size={17} />
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Digite uma mensagem interna..."
          rows={1}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button className="send-btn" onClick={send} disabled={sending || !text.trim()}>
          <Send size={18} />
        </button>
      </div>

      {archivePreview && (
        <ArchiveModal archive={archivePreview} onClose={() => setArchivePreview(null)} />
      )}
    </div>
  );
}

function MessageBubble({ message, mine, previous }) {
  const showDate = !previous || formatDate(previous.createdAt) !== formatDate(message.createdAt);
  return (
    <>
      {showDate && <div className="date-chip">{formatDate(message.createdAt)}</div>}
      <div className={`bubble-row ${mine ? 'mine' : ''}`}>
        <div className="bubble">
          <p>{message.content}</p>
          <span>{formatTime(message.createdAt)} <CheckCheck size={13} /></span>
        </div>
      </div>
    </>
  );
}

function Avatar({ name, online = false }) {
  return (
    <div className="avatar">
      {initials(name)}
      {online && <i />}
    </div>
  );
}

function WelcomePanel({ threads, onSelectFirst }) {
  return (
    <div className="welcome-panel">
      <div className="welcome-mark"><MessageCircle size={34} /></div>
      <h2>Central de conversas pronta</h2>
      <p>Escolha um revendedor para abrir um atendimento em formato WhatsApp, com busca, respostas rápidas e empacotamento de histórico.</p>
      <div className="welcome-stats">
        <span><strong>{threads.length}</strong> conversas</span>
        <span><strong>{threads.reduce((sum, thread) => sum + Number(thread.unread || 0), 0)}</strong> pendências</span>
      </div>
      <button disabled={!threads.length} onClick={onSelectFirst}>Abrir primeira conversa</button>
    </div>
  );
}

function EmptyThreads({ search }) {
  return (
    <div className="empty-state">
      <User size={32} />
      <strong>{search ? 'Nada encontrado' : 'Nenhum revendedor disponível'}</strong>
      <p>{search ? 'Tente buscar por outro nome, email ou trecho de mensagem.' : 'Quando houver revendedores cadastrados, eles aparecem aqui.'}</p>
    </div>
  );
}

function EmptyConversation({ hasSearch, onPick }) {
  return (
    <div className="empty-conversation">
      <MessageCircle size={34} />
      <strong>{hasSearch ? 'Nenhuma mensagem encontrada' : 'Comece a conversa'}</strong>
      <p>{hasSearch ? 'Limpe a busca para voltar ao histórico completo.' : 'Use uma resposta rápida ou digite uma mensagem personalizada.'}</p>
      {!hasSearch && (
        <div className="empty-quick">
          {quickReplies.slice(0, 3).map((reply) => <button key={reply} onClick={() => onPick(reply)}>{reply}</button>)}
        </div>
      )}
    </div>
  );
}

function ThreadSkeleton() {
  return Array.from({ length: 5 }).map((_, index) => (
    <div className="thread-skeleton" key={index}>
      <span />
      <div><i /><b /></div>
    </div>
  ));
}

function MessageSkeleton() {
  return (
    <div className="message-skeleton">
      <span />
      <span />
      <span />
    </div>
  );
}

function ArchiveModal({ archive, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="archive-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <strong>Pacote de conversa</strong>
            <span>{archive.messageCount} mensagens preservadas</span>
          </div>
          <button onClick={onClose}>Fechar</button>
        </header>
        <div className="archive-messages">
          {(archive.messages || []).map((message) => (
            <div key={message.id} className="archive-line">
              <Clock size={13} />
              <span>{formatDate(message.createdAt)} {formatTime(message.createdAt)}</span>
              <strong>{message.authorName}</strong>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = `
.chat-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(124, 58, 237, 0.22), transparent 32rem),
    linear-gradient(135deg, #07110e 0%, #080808 45%, #10120f 100%);
  color: #f7f7f2;
  padding: 20px clamp(12px, 2vw, 28px) 28px;
}
.chat-topbar {
  max-width: 1380px;
  margin: 0 auto 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.chat-title-row { display: flex; align-items: center; gap: 10px; color: #a78bfa; }
.chat-title-row h1 {
  margin: 0;
  font-size: clamp(20px, 2vw, 30px);
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: 0;
  background: linear-gradient(135deg, #c4b5fd, #22d3ee 72%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.chat-topbar p { margin: 6px 0 0; color: rgba(247,247,242,.56); font-size: 13px; }
.chat-top-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.status-pill {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.09);
  background: rgba(255,255,255,.045);
  color: rgba(247,247,242,.74);
  font-size: 12px;
  font-weight: 800;
}
.status-pill.purple { color: #d8b4fe; border-color: rgba(167,139,250,.28); background: rgba(124,58,237,.14); }
.icon-btn, .back-btn, .jump-btn {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  background: rgba(255,255,255,.055);
  color: rgba(247,247,242,.74);
  cursor: pointer;
}
.icon-btn:hover, .back-btn:hover, .jump-btn:hover { background: rgba(255,255,255,.09); color: #fff; }
.icon-btn.amber { color: #fbbf24; border-color: rgba(251,191,36,.28); }
.icon-btn:disabled { opacity: .35; cursor: not-allowed; }
.chat-shell {
  max-width: 1380px;
  height: calc(100vh - 118px);
  min-height: 620px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(10,10,10,.72);
  box-shadow: 0 28px 80px rgba(0,0,0,.42);
}
.chat-shell.solo { grid-template-columns: minmax(0, 1fr); }
.thread-panel {
  min-width: 0;
  border-right: 1px solid rgba(255,255,255,.08);
  background: rgba(13,16,15,.92);
  display: flex;
  flex-direction: column;
}
.thread-search {
  margin: 14px;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  border-radius: 8px;
  padding: 0 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.055);
  color: rgba(247,247,242,.5);
}
.thread-search input, .mini-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #fff;
  font-size: 13px;
}
.thread-list { flex: 1; overflow-y: auto; padding: 0 10px 12px; }
.thread-item {
  position: relative;
  width: 100%;
  display: flex;
  gap: 11px;
  align-items: center;
  padding: 12px 10px;
  margin-bottom: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.thread-item:hover { background: rgba(255,255,255,.052); }
.thread-item.active { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.32); }
.avatar {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  background: linear-gradient(135deg, #10b981, #60a5fa);
  color: #07110e;
  font-weight: 950;
  font-size: 13px;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.18);
}
.avatar i {
  position: absolute;
  width: 11px;
  height: 11px;
  right: 1px;
  bottom: 2px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #111;
}
.thread-copy { min-width: 0; flex: 1; }
.thread-name-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.thread-name-line strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.thread-name-line span, .thread-copy small { color: rgba(247,247,242,.42); font-size: 11px; }
.thread-copy p {
  margin: 3px 0 2px;
  color: rgba(247,247,242,.62);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.unread-badge {
  min-width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #22c55e;
  color: #04130d;
  font-size: 11px;
}
.conversation-panel { min-width: 0; display: flex; }
.conversation { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #0b0d0c; }
.conversation-header {
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(17,20,19,.96);
}
.back-btn { display: none; }
.conversation-person { flex: 1; min-width: 0; }
.conversation-person strong { display: block; font-size: 15px; }
.conversation-person span { display: block; color: rgba(247,247,242,.48); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-tools { display: flex; align-items: center; gap: 8px; }
.mini-search {
  width: min(210px, 24vw);
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px;
  background: rgba(255,255,255,.055);
  color: rgba(247,247,242,.45);
}
.conversation-body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
}
.message-stream {
  min-width: 0;
  overflow-y: auto;
  padding: 18px clamp(14px, 2vw, 26px);
  background:
    linear-gradient(rgba(11,13,12,.92), rgba(11,13,12,.92)),
    radial-gradient(circle at 20% 20%, rgba(16,185,129,.16), transparent 24rem);
}
.date-chip {
  width: fit-content;
  margin: 10px auto;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  color: rgba(247,247,242,.58);
  font-size: 11px;
  font-weight: 800;
}
.bubble-row { display: flex; justify-content: flex-start; margin: 6px 0; }
.bubble-row.mine { justify-content: flex-end; }
.bubble {
  max-width: min(680px, 76%);
  padding: 8px 10px 6px;
  border-radius: 6px 14px 14px 14px;
  background: #1c2421;
  border: 1px solid rgba(255,255,255,.06);
  color: #f7f7f2;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
}
.bubble-row.mine .bubble {
  background: #d9fdd3;
  color: #07110e;
  border-color: rgba(217,253,211,.28);
  border-radius: 14px 6px 14px 14px;
}
.bubble p { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.42; }
.bubble span {
  margin-top: 3px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  color: rgba(247,247,242,.45);
  font-size: 10px;
}
.bubble-row.mine .bubble span { color: rgba(7,17,14,.55); }
.context-rail {
  border-left: 1px solid rgba(255,255,255,.08);
  background: rgba(12,15,14,.9);
  padding: 12px;
  overflow-y: auto;
}
.rail-card {
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  background: rgba(255,255,255,.045);
  padding: 12px;
  margin-bottom: 10px;
}
.rail-label { display: flex; align-items: center; gap: 6px; color: #86efac; font-size: 11px; font-weight: 900; text-transform: uppercase; }
.rail-card strong { display: block; margin: 9px 0 5px; font-size: 14px; }
.rail-card p { margin: 0; color: rgba(247,247,242,.56); font-size: 12px; line-height: 1.45; }
.quick-list, .archive-list { display: flex; flex-direction: column; gap: 7px; margin-top: 10px; }
.quick-list button, .archive-list button, .empty-quick button {
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  background: rgba(255,255,255,.055);
  color: rgba(247,247,242,.82);
  padding: 9px 10px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.quick-list button:hover, .archive-list button:hover, .empty-quick button:hover { background: rgba(16,185,129,.13); border-color: rgba(16,185,129,.28); }
.archive-list button { display: grid; grid-template-columns: 16px 1fr auto; align-items: center; gap: 7px; }
.archive-list small { color: rgba(247,247,242,.45); }
.composer {
  display: flex;
  gap: 9px;
  align-items: flex-end;
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
  background: rgba(17,20,19,.98);
}
.composer textarea {
  flex: 1;
  min-height: 42px;
  max-height: 118px;
  resize: vertical;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  background: rgba(255,255,255,.07);
  color: #fff;
  outline: 0;
  padding: 11px 13px;
  font-size: 13px;
  line-height: 1.35;
}
.send-btn {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #22c55e;
  color: #04130d;
  cursor: pointer;
}
.send-btn:disabled { opacity: .4; cursor: not-allowed; }
.welcome-panel, .empty-state, .empty-conversation {
  margin: auto;
  max-width: 520px;
  text-align: center;
  color: rgba(247,247,242,.66);
  padding: 22px;
}
.welcome-mark {
  width: 76px;
  height: 76px;
  margin: 0 auto 16px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: rgba(16,185,129,.12);
  color: #86efac;
  border: 1px solid rgba(16,185,129,.24);
}
.welcome-panel h2, .empty-state strong, .empty-conversation strong { display: block; color: #fff; font-size: 22px; margin: 0 0 8px; }
.welcome-panel p, .empty-state p, .empty-conversation p { margin: 0 auto 16px; line-height: 1.55; font-size: 13px; }
.welcome-stats { display: flex; justify-content: center; gap: 10px; margin: 18px 0; }
.welcome-stats span {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(255,255,255,.08);
  font-size: 12px;
}
.welcome-panel button, .soft-alert button {
  border: 0;
  border-radius: 8px;
  background: #22c55e;
  color: #04130d;
  padding: 10px 14px;
  font-weight: 900;
  cursor: pointer;
}
.welcome-panel button:disabled { opacity: .4; cursor: not-allowed; }
.soft-alert {
  margin: 0 14px 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(251,191,36,.11);
  border: 1px solid rgba(251,191,36,.26);
  color: #fde68a;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.soft-alert.centered { max-width: 380px; margin: 30px auto; text-align: center; align-items: center; }
.empty-quick { display: grid; gap: 8px; margin-top: 14px; }
.thread-skeleton { display: flex; gap: 11px; padding: 12px 10px; }
.thread-skeleton span, .thread-skeleton i, .thread-skeleton b, .message-skeleton span {
  display: block;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255,255,255,.05), rgba(255,255,255,.11), rgba(255,255,255,.05));
  animation: pulse 1.2s infinite;
}
.thread-skeleton span { width: 42px; height: 42px; }
.thread-skeleton div { flex: 1; padding-top: 4px; }
.thread-skeleton i { width: 55%; height: 10px; margin-bottom: 10px; }
.thread-skeleton b { width: 86%; height: 9px; }
.message-skeleton { display: grid; gap: 10px; max-width: 620px; }
.message-skeleton span { height: 42px; border-radius: 10px; }
.message-skeleton span:nth-child(2) { width: 72%; margin-left: auto; }
.message-skeleton span:nth-child(3) { width: 54%; }
@keyframes pulse { 0%,100%{opacity:.55} 50%{opacity:1} }
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,.72);
  padding: 18px;
}
.archive-modal {
  width: min(860px, 96vw);
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background: #111412;
  border: 1px solid rgba(255,255,255,.1);
  box-shadow: 0 30px 90px rgba(0,0,0,.55);
}
.archive-modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.archive-modal header strong { display: block; color: #fff; }
.archive-modal header span { color: rgba(247,247,242,.52); font-size: 12px; }
.archive-modal header button {
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  color: #fff;
  padding: 8px 12px;
}
.archive-messages { overflow-y: auto; padding: 12px 16px; }
.archive-line {
  display: grid;
  grid-template-columns: 16px 100px 130px 1fr;
  gap: 8px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
  font-size: 12px;
}
.archive-line span { color: rgba(247,247,242,.45); }
.archive-line p { margin: 0; color: rgba(247,247,242,.78); }
@media (max-width: 980px) {
  .chat-page { padding: 12px; }
  .chat-topbar { align-items: flex-start; flex-direction: column; }
  .chat-shell { height: calc(100vh - 148px); min-height: 560px; grid-template-columns: 1fr; }
  .chat-shell.has-active .thread-panel { display: none; }
  .conversation-body { grid-template-columns: 1fr; }
  .context-rail { display: none; }
  .back-btn { display: inline-flex; }
  .mini-search { display: none; }
  .conversation-panel { min-height: 0; }
}
@media (max-width: 560px) {
  .chat-shell { border-radius: 0; height: calc(100vh - 150px); }
  .header-tools .icon-btn:nth-last-child(1) { display: none; }
  .bubble { max-width: 88%; }
  .archive-line { grid-template-columns: 16px 1fr; }
  .archive-line strong, .archive-line p { grid-column: 2; }
}
`;
