import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  Inbox,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";

const QUICK_REPLIES = [
  "Pedido recebido. Voce entrou na fila de atendimento.",
  "Sua recarga foi concluida. Os creditos ja estao disponiveis.",
  "Me envie o comprovante para eu conferir por aqui.",
  "Estou verificando no painel e ja te retorno.",
];

const isStaffRole = (role) => role === "admin" || role === "dev";

const toDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatClock = (value) => {
  const date = toDateValue(value);
  if (!date) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const formatDay = (value) => {
  const date = toDateValue(value);
  if (!date) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const getName = (item, fallback = "Revendedor") =>
  item?.name || item?.full_name || item?.fullName || item?.email || fallback;

const getInitials = (name = "") => {
  const parts = String(name || "R").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const normalizeThread = (id, thread = {}, user = {}) => {
  const lastAt = thread.lastAt || thread.last_at || thread.updatedAt || thread.updated_date || null;
  return {
    resellerId: id,
    name: getName(thread, getName(user)),
    email: thread.email || user.email || "",
    phone: thread.phone || user.phone || "",
    status: thread.status || user.status || "active",
    paymentType: thread.paymentType || thread.payment_type || user.payment_type || user.paymentType || "prepaid",
    createdAt: thread.createdAt || thread.created_date || user.createdAt || user.created_date || null,
    lastMessage: thread.lastMessage || thread.last_message || null,
    lastAt,
    unread: Number(thread.unread || 0),
    hasMessages: Boolean(thread.lastMessage || thread.last_message || lastAt),
  };
};

const mergeThreadsWithUsers = (threads = [], users = []) => {
  const resellerUsers = users.filter((user) => user.role === "user" || user.role === "reseller");
  const usersById = new Map(resellerUsers.map((user) => [user.id, user]));
  const threadsById = new Map();

  threads.forEach((thread) => {
    const id = thread?.resellerId || thread?.reseller_id || thread?.id;
    if (id) threadsById.set(id, thread);
  });

  const allIds = new Set([...usersById.keys(), ...threadsById.keys()]);
  return [...allIds]
    .map((id) => normalizeThread(id, threadsById.get(id), usersById.get(id)))
    .sort((a, b) => {
      const bTime = toDateValue(b.lastAt)?.getTime() || 0;
      const aTime = toDateValue(a.lastAt)?.getTime() || 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.name.localeCompare(b.name, "pt-BR");
    });
};

function useCompactChat() {
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 860px)").matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 860px)");
    const update = () => setCompact(media.matches);
    update();
    if (media.addEventListener) media.addEventListener("change", update);
    else media.addListener(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", update);
      else media.removeListener(update);
    };
  }, []);

  return compact;
}

function Avatar({ name, active = false, size = "md" }) {
  return (
    <div className={`chat-avatar ${size} ${active ? "active" : ""}`}>
      <span>{getInitials(name)}</span>
    </div>
  );
}

function EmptyState({ icon: Icon = Inbox, title, text }) {
  return (
    <div className="chat-empty">
      <div className="chat-empty-icon">
        <Icon size={26} />
      </div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function ThreadSkeletons() {
  return (
    <div className="chat-skeleton-list">
      {Array.from({ length: 7 }).map((_, index) => (
        <div className="chat-skeleton-row" key={index}>
          <span />
          <div>
            <i />
            <b />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadList({
  activeId,
  loading,
  onBack,
  onPick,
  search,
  setSearch,
  stats,
  threads,
}) {
  return (
    <section className="chat-list-panel" aria-label="Lista de revendedores">
      <div className="chat-list-header">
        <button className="chat-icon-btn" type="button" onClick={onBack} aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <div>
          <span>Atendimento</span>
          <h1>Chat</h1>
        </div>
      </div>

      <div className="chat-search">
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar revendedor"
          aria-label="Buscar revendedor"
        />
      </div>

      <div className="chat-list-stats" aria-label="Resumo do chat">
        <div>
          <strong>{stats.total}</strong>
          <span>revendedores</span>
        </div>
        <div>
          <strong>{stats.unread}</strong>
          <span>nao lidas</span>
        </div>
      </div>

      <div className="chat-thread-scroll">
        {loading ? (
          <ThreadSkeletons />
        ) : threads.length === 0 ? (
          <EmptyState
            title="Nada encontrado"
            text="Nenhum revendedor combina com a busca atual."
          />
        ) : (
          threads.map((thread) => (
            <button
              className={`chat-thread ${activeId === thread.resellerId ? "active" : ""}`}
              key={thread.resellerId}
              onClick={() => onPick(thread.resellerId)}
              type="button"
            >
              <Avatar name={thread.name} active={thread.unread > 0} />
              <div className="chat-thread-main">
                <div className="chat-thread-top">
                  <strong>{thread.name}</strong>
                  <span>{thread.lastAt ? formatClock(thread.lastAt) : "novo"}</span>
                </div>
                <div className="chat-thread-bottom">
                  <p>{thread.lastMessage || "Sem conversa ainda"}</p>
                  {thread.unread > 0 ? <b>{thread.unread}</b> : <i />}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function MessageBubble({ message, mine, read }) {
  return (
    <div className={`chat-message ${mine ? "mine" : "theirs"}`}>
      {!mine && <span className="chat-author">{message.authorName || "Revendedor"}</span>}
      <div className="chat-bubble">
        <p>{message.content}</p>
        <span>
          {formatClock(message.createdAt)}
          {mine && (read ? <CheckCheck size={14} /> : <Check size={14} />)}
        </span>
      </div>
    </div>
  );
}

function Messages({ loaded, messages, me }) {
  const rows = useMemo(() => {
    const result = [];
    let currentDay = "";
    messages.forEach((message) => {
      const day = formatDay(message.createdAt);
      if (day && day !== currentDay) {
        currentDay = day;
        result.push({ type: "day", id: `day-${message.createdAt}-${day}`, label: day });
      }
      result.push({ type: "message", id: message.id || `${message.createdAt}-${message.content}`, message });
    });
    return result;
  }, [messages]);

  if (loaded && messages.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Conversa pronta"
        text="Envie a primeira mensagem para iniciar o atendimento."
      />
    );
  }

  return rows.map((row) => {
    if (row.type === "day") {
      return (
        <div className="chat-day" key={row.id}>
          {row.label}
        </div>
      );
    }

    const message = row.message;
    const mine = message.authorId === me?.id;
    const staff = isStaffRole(me?.role);
    const read = staff ? message.readByReseller : message.readByAdmin;
    return <MessageBubble key={row.id} message={message} mine={mine} read={read} />;
  });
}

function Conversation({
  compact,
  me,
  onBack,
  onRefreshThreads,
  reseller,
  resellerId,
  singleMode = false,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!resellerId) return;
      if (!silent) setLoaded(false);
      setError("");
      try {
        const result = await remoteClient.chat.messages(resellerId);
        setMessages(Array.isArray(result) ? result : []);
        onRefreshThreads?.(true);
      } catch (err) {
        setError(err?.message || "Nao foi possivel carregar a conversa.");
      } finally {
        setLoaded(true);
      }
    },
    [onRefreshThreads, resellerId],
  );

  useEffect(() => {
    setMessages([]);
    setLoaded(false);
    loadMessages();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadMessages(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending || !resellerId) return;
    setText("");
    setSending(true);
    setError("");
    try {
      await remoteClient.chat.send(content, resellerId);
      await loadMessages(true);
      onRefreshThreads?.(true);
    } catch (err) {
      setText(content);
      setError(err?.message || "Nao foi possivel enviar.");
    } finally {
      setSending(false);
    }
  };

  const archiveConversation = async () => {
    if (!messages.length || !resellerId) return;
    const ok = window.confirm(`Arquivar ${messages.length} mensagem(ns) desta conversa?`);
    if (!ok) return;
    setError("");
    try {
      await remoteClient.chat.archive(resellerId);
      await loadMessages(true);
      onRefreshThreads?.(true);
    } catch (err) {
      setError(err?.message || "Nao foi possivel arquivar.");
    }
  };

  const title = reseller?.name || (singleMode ? "Suporte Gestor J2" : "Revendedor");
  const subtitle = reseller?.email || reseller?.phone || "Canal direto";

  return (
    <section className="chat-conversation-panel" aria-label="Conversa">
      <header className="chat-conversation-header">
        {(compact || singleMode) && (
          <button className="chat-icon-btn" type="button" onClick={onBack} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
        )}
        <Avatar name={title} active />
        <div className="chat-conversation-title">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <div className="chat-header-actions">
          <span className="chat-live">
            <ShieldCheck size={14} />
            seguro
          </span>
          <button
            className="chat-icon-btn"
            disabled={!messages.length}
            onClick={archiveConversation}
            title="Arquivar conversa"
            type="button"
          >
            <Archive size={17} />
          </button>
        </div>
      </header>

      <div className="chat-context-strip">
        <div>
          <Clock3 size={15} />
          <span>{messages.length ? `${messages.length} mensagens` : "sem historico ativo"}</span>
        </div>
        {reseller?.paymentType && <b>{reseller.paymentType === "postpaid" ? "pos-pago" : "pre-pago"}</b>}
      </div>

      <div className="chat-messages">
        {!loaded && (
          <div className="chat-loading">
            <span />
            <span />
            <span />
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
        <Messages loaded={loaded} messages={messages} me={me} />
        <div ref={bottomRef} />
      </div>

      <div className="chat-quick-replies" aria-label="Respostas rapidas">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            type="button"
            onClick={() => setText((current) => current || reply)}
          >
            {reply}
          </button>
        ))}
      </div>

      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <textarea
          aria-label="Mensagem"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Digite uma mensagem"
          rows={1}
          value={text}
        />
        <button disabled={sending || !text.trim()} type="submit">
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const compact = useCompactChat();
  const isStaff = isStaffRole(user?.role);
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/Dashboard");
  };

  const loadThreads = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setLoading(true);
      setLoadError("");
      try {
        const [threadResult, usersResult] = await Promise.all([
          remoteClient.chat.threads().catch(() => []),
          isStaff ? remoteClient.users.list().catch(() => []) : Promise.resolve([]),
        ]);

        const merged = isStaff
          ? mergeThreadsWithUsers(threadResult || [], usersResult || [])
          : [
              normalizeThread(
                user.id,
                (threadResult || [])[0] || {},
                { ...user, role: "user", name: user.name || user.full_name, email: user.email },
              ),
            ];

        setThreads(merged);
      } catch (err) {
        setLoadError(err?.message || "Nao foi possivel carregar os chats.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isStaff, user],
  );

  useEffect(() => {
    loadThreads();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadThreads(true);
    }, 12000);
    return () => window.clearInterval(interval);
  }, [loadThreads]);

  useEffect(() => {
    if (!isStaff || compact || activeId || threads.length === 0) return;
    setActiveId(threads[0].resellerId);
  }, [activeId, compact, isStaff, threads]);

  useEffect(() => {
    if (!activeId) return;
    if (!threads.some((thread) => thread.resellerId === activeId)) setActiveId(null);
  }, [activeId, threads]);

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((thread) =>
      [thread.name, thread.email, thread.phone, thread.paymentType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [search, threads]);

  const activeThread = threads.find((thread) => thread.resellerId === activeId);
  const stats = useMemo(
    () => ({
      total: threads.length,
      unread: threads.reduce((sum, thread) => sum + Number(thread.unread || 0), 0),
    }),
    [threads],
  );

  if (!isStaff) {
    const reseller = threads[0] || normalizeThread(user?.id, {}, user || {});
    return (
      <div className="chat-page">
        <div className="chat-single-shell">
          <Conversation
            compact
            me={user}
            onBack={goBack}
            onRefreshThreads={loadThreads}
            reseller={reseller}
            resellerId={user?.id}
            singleMode
          />
        </div>
        <style>{chatStyles}</style>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-shell">
        <div className={`chat-pane-slot ${compact && activeId ? "chat-mobile-hidden" : ""}`}>
          <ThreadList
            activeId={activeId}
            loading={loading}
            onBack={goBack}
            onPick={setActiveId}
            search={search}
            setSearch={setSearch}
            stats={stats}
            threads={filteredThreads}
          />
        </div>

        <div className={`chat-pane-slot ${compact && !activeId ? "chat-mobile-hidden" : ""}`}>
          {activeThread ? (
            <Conversation
              compact={compact}
              me={user}
              onBack={() => (compact ? setActiveId(null) : goBack())}
              onRefreshThreads={loadThreads}
              reseller={activeThread}
              resellerId={activeThread.resellerId}
            />
          ) : (
            <section className="chat-conversation-panel">
              <div className="chat-welcome">
                <div className="chat-welcome-mark">
                  <Sparkles size={30} />
                </div>
                <h2>Escolha um revendedor</h2>
                <p>Todos os revendedores reais aparecem aqui, mesmo antes da primeira mensagem.</p>
                {loadError && <span>{loadError}</span>}
              </div>
            </section>
          )}
        </div>
      </div>
      <style>{chatStyles}</style>
    </div>
  );
}

const chatStyles = `
.app-main--chat {
  height: 100dvh;
  min-height: 0 !important;
  overflow: hidden;
  padding-bottom: 0 !important;
}

.app-layout:has(.app-main--chat),
.app-content:has(.app-main--chat) {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

.chat-page {
  width: 100%;
  height: 100dvh;
  min-height: 0;
  max-height: 100dvh;
  padding: clamp(14px, 1.7vw, 26px);
  color: var(--j2-text);
  background:
    linear-gradient(180deg, rgba(255, 75, 18, .026), transparent 22%),
    linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 52%, #010202 100%);
  overflow: hidden;
  overscroll-behavior: none;
  box-sizing: border-box;
  --chat-panel: rgba(6, 7, 7, .97);
  --chat-panel-2: rgba(9, 10, 10, .96);
  --chat-sunken: rgba(3, 4, 4, .78);
  --chat-line: rgba(255, 255, 255, .045);
  --chat-soft: rgba(255, 255, 255, .034);
  --chat-shadow-raised: 12px 18px 38px rgba(0,0,0,.55), -5px -5px 14px rgba(255,255,255,.014), inset 1px 1px 0 rgba(255,255,255,.012);
  --chat-shadow-soft: 7px 10px 22px rgba(0,0,0,.36), -3px -3px 9px rgba(255,255,255,.012);
  --chat-shadow-inset: inset 4px 4px 12px rgba(0,0,0,.42), inset -3px -3px 8px rgba(255,255,255,.014);
}

.chat-shell,
.chat-single-shell {
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.chat-shell {
  display: grid;
  grid-template-columns: minmax(286px, 360px) minmax(0, 1fr);
  gap: clamp(12px, 1.5vw, 18px);
  align-items: stretch;
}

.chat-pane-slot {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.chat-single-shell {
  max-width: 1060px;
  margin: 0 auto;
}

.chat-list-panel,
.chat-conversation-panel {
  height: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.026), transparent 30%),
    var(--chat-panel);
  box-shadow: var(--chat-shadow-raised);
  isolation: isolate;
}

.chat-list-panel,
.chat-conversation-panel {
  display: flex;
  flex-direction: column;
}

.chat-list-header,
.chat-conversation-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px;
}

.chat-list-header span {
  display: block;
  margin-bottom: 3px;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.chat-list-header h1 {
  margin: 0;
  color: var(--j2-text);
  font-size: 28px;
  line-height: 1;
  font-weight: 950;
}

.chat-icon-btn {
  width: 43px;
  height: 43px;
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--chat-panel-2);
  box-shadow: var(--chat-shadow-soft);
  cursor: pointer;
  transition: transform .18s ease, color .18s ease, opacity .18s ease, background .18s ease;
}

.chat-icon-btn:hover {
  color: var(--j2-accent);
  transform: translateY(-1px);
  background: rgba(255,255,255,.04);
}

.chat-icon-btn:disabled {
  cursor: not-allowed;
  opacity: .35;
  transform: none;
}

.chat-search {
  margin: 0 17px 12px;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 18px;
  color: var(--j2-faint);
  background: var(--chat-sunken);
  box-shadow: var(--chat-shadow-inset);
}

.chat-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
  font-size: 14px;
}

.chat-search input::placeholder {
  color: var(--j2-faint);
}

.chat-list-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0 17px 13px;
}

.chat-list-stats div {
  min-width: 0;
  padding: 14px;
  border-radius: 19px;
  background: var(--chat-sunken);
  box-shadow: var(--chat-shadow-inset);
}

.chat-list-stats strong {
  display: block;
  color: var(--j2-accent);
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
}

.chat-list-stats span {
  display: block;
  margin-top: 5px;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 750;
}

.chat-thread-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 0 10px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 75, 18, .45) transparent;
}

.chat-thread-scroll::-webkit-scrollbar,
.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-thread-scroll::-webkit-scrollbar-track,
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-thread-scroll::-webkit-scrollbar-thumb,
.chat-messages::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255,75,18,.28);
}

.chat-thread {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 7px;
  padding: 12px;
  border: 0;
  border-radius: 21px;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: background .18s ease, transform .18s ease, box-shadow .18s ease, color .18s ease;
}

.chat-thread:hover,
.chat-thread.active {
  background: var(--chat-soft);
  box-shadow: var(--chat-shadow-soft);
}

.chat-thread:hover {
  transform: translateY(-1px);
}

.chat-thread.active {
  color: var(--j2-accent);
}

.chat-thread.active::after {
  content: "";
  position: absolute;
  right: 12px;
  top: 50%;
  width: 6px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--j2-accent), var(--j2-accent-deep));
  transform: translateY(-50%);
}

.chat-thread-main {
  flex: 1;
  min-width: 0;
  padding-right: 10px;
}

.chat-thread-top,
.chat-thread-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chat-thread-top strong {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-thread-top span {
  flex: 0 0 auto;
  color: var(--j2-faint);
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
}

.chat-thread-bottom {
  margin-top: 4px;
}

.chat-thread-bottom p {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-thread-bottom b,
.chat-thread-bottom i {
  flex: 0 0 auto;
  width: 19px;
  height: 19px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
}

.chat-thread-bottom b {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
}

.chat-thread-bottom i {
  background: rgba(255, 255, 255, .035);
  box-shadow: var(--j2-sunken);
}

.chat-avatar {
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 19px;
  color: #fff;
  background:
    linear-gradient(135deg, rgba(255, 75, 18, .92), rgba(143, 22, 8, .92)),
    var(--j2-surface-2);
  box-shadow: var(--chat-shadow-soft);
  position: relative;
}

.chat-avatar.sm {
  width: 38px;
  height: 38px;
  border-radius: 14px;
}

.chat-avatar span {
  font-size: 14px;
  font-weight: 950;
}

.chat-avatar.active::after {
  content: "";
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--j2-accent);
}

.chat-conversation-header {
  min-height: 78px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.028), transparent),
    rgba(4, 5, 5, .72);
  box-shadow: 0 12px 26px rgba(0,0,0,.24);
  position: relative;
  z-index: 2;
  backdrop-filter: blur(18px);
}

.chat-conversation-title {
  flex: 1;
  min-width: 0;
}

.chat-conversation-title strong {
  display: block;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 15px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-conversation-title span {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.chat-live {
  min-height: 31px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--j2-accent);
  background: var(--chat-sunken);
  box-shadow: var(--chat-shadow-inset);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.chat-context-strip {
  margin: 12px 17px 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 13px;
  border-radius: 16px;
  background: var(--chat-sunken);
  box-shadow: var(--chat-shadow-inset);
  color: var(--j2-muted);
  font-size: 12px;
}

.chat-context-strip div {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.chat-context-strip b {
  color: var(--j2-accent);
  font-size: 11px;
  text-transform: uppercase;
}

.chat-messages {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 18px 19px 11px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.012), transparent 18%),
    linear-gradient(90deg, rgba(255,75,18,.018), transparent 42%, rgba(255,255,255,.008));
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 75, 18, .45) transparent;
}

.chat-day {
  align-self: center;
  margin: 9px 0;
  padding: 6px 13px;
  border-radius: 999px;
  color: var(--j2-muted);
  background: var(--chat-sunken);
  box-shadow: var(--chat-shadow-inset);
  font-size: 11px;
  font-weight: 900;
}

.chat-message {
  max-width: min(76%, 640px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-message.mine {
  align-self: flex-end;
  align-items: flex-end;
}

.chat-message.theirs {
  align-self: flex-start;
  align-items: flex-start;
}

.chat-author {
  margin-left: 10px;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 800;
}

.chat-bubble {
  min-width: 96px;
  padding: 11px 13px 8px;
  border-radius: 20px 20px 20px 8px;
  color: var(--j2-text);
  background: var(--chat-panel-2);
  box-shadow: var(--chat-shadow-soft);
  word-break: break-word;
  position: relative;
}

.chat-message.mine .chat-bubble {
  color: #fff;
  border-radius: 20px 20px 8px 20px;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 7px 10px 20px rgba(0,0,0,.34), inset 1px 1px 0 rgba(255,255,255,.12);
}

.chat-message.theirs .chat-bubble {
  background: rgba(3, 4, 4, .88);
  box-shadow: var(--chat-shadow-inset);
}

.chat-bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.chat-bubble span {
  float: right;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin: 5px 0 0 10px;
  color: rgba(255, 255, 255, .62);
  font-size: 10px;
  font-weight: 800;
}

.chat-quick-replies {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 17px 1px;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.chat-quick-replies::-webkit-scrollbar {
  display: none;
}

.chat-quick-replies button {
  flex: 0 0 auto;
  max-width: min(300px, 70vw);
  height: 36px;
  display: inline-block;
  border: 0;
  border-radius: 999px;
  padding: 0 14px;
  color: var(--j2-muted);
  background: rgba(255, 255, 255, .052);
  box-shadow: var(--chat-shadow-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  line-height: 36px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color .18s ease, transform .18s ease, background .18s ease;
}

.chat-quick-replies button:hover {
  color: var(--j2-accent);
  background: rgba(255, 75, 18, .08);
  transform: translateY(-1px);
}

.chat-composer {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin: 11px 17px 17px;
  padding: 8px;
  border-radius: 25px;
  background: var(--chat-sunken);
  box-shadow: var(--chat-shadow-inset);
}

.chat-composer textarea {
  flex: 1;
  min-width: 0;
  max-height: 118px;
  min-height: 43px;
  resize: none;
  border: 0;
  outline: 0;
  padding: 11px 12px;
  color: var(--j2-text);
  background: transparent;
  font: inherit;
  font-size: 14px;
  line-height: 1.35;
}

.chat-composer textarea::placeholder {
  color: var(--j2-faint);
}

.chat-composer button {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 18px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: var(--chat-shadow-soft);
  cursor: pointer;
  transition: transform .18s ease, opacity .18s ease;
}

.chat-composer button:not(:disabled):hover {
  transform: translateY(-1px);
}

.chat-composer button:disabled {
  color: var(--j2-faint);
  background: rgba(255, 255, 255, .045);
  cursor: not-allowed;
  box-shadow: var(--chat-shadow-inset);
}

.chat-empty,
.chat-welcome {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
  text-align: center;
}

.chat-empty-icon,
.chat-welcome-mark {
  width: 78px;
  height: 78px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  border-radius: 25px;
  color: var(--j2-accent);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu);
}

.chat-empty strong,
.chat-welcome h2 {
  margin: 0;
  color: var(--j2-text);
  font-size: 22px;
  font-weight: 950;
}

.chat-empty p,
.chat-welcome p {
  max-width: 320px;
  margin: 7px 0 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.45;
}

.chat-messages .chat-empty {
  flex: 1;
  min-height: 0;
}

.chat-welcome span,
.chat-error {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  color: #ffb4b4;
  background: rgba(255, 91, 91, .10);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  font-weight: 750;
}

.chat-error {
  align-self: center;
  margin: 4px 0 10px;
}

.chat-loading {
  align-self: center;
  display: inline-flex;
  gap: 6px;
  margin-top: 20px;
}

.chat-loading span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--j2-accent);
  animation: chatBounce 1s ease-in-out infinite;
}

.chat-loading span:nth-child(2) {
  animation-delay: .12s;
}

.chat-loading span:nth-child(3) {
  animation-delay: .24s;
}

.chat-skeleton-list {
  display: grid;
  gap: 8px;
  padding: 2px;
}

.chat-skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
}

.chat-skeleton-row span,
.chat-skeleton-row i,
.chat-skeleton-row b {
  display: block;
  border-radius: 999px;
  background: linear-gradient(100deg, rgba(255,255,255,.025) 30%, rgba(255,255,255,.075) 50%, rgba(255,255,255,.025) 70%);
  background-size: 200% 100%;
  box-shadow: var(--j2-sunken);
  animation: chatShimmer 1.4s linear infinite;
}

.chat-skeleton-row span {
  width: 48px;
  height: 48px;
  border-radius: 18px;
}

.chat-skeleton-row div {
  flex: 1;
}

.chat-skeleton-row i {
  width: 58%;
  height: 12px;
  margin-bottom: 9px;
}

.chat-skeleton-row b {
  width: 86%;
  height: 10px;
}

.chat-mobile-hidden {
  display: block;
}

@keyframes chatBounce {
  0%, 100% { transform: translateY(0); opacity: .45; }
  50% { transform: translateY(-5px); opacity: 1; }
}

@keyframes chatShimmer {
  to { background-position: -200% 0; }
}

@media (max-width: 1180px) {
  .chat-shell {
    grid-template-columns: minmax(260px, 330px) minmax(0, 1fr);
  }
}

@media (max-width: 860px) {
  .app-layout:has(.app-main--chat),
  .app-content:has(.app-main--chat),
  .app-main--chat {
    height: 100dvh;
    min-height: 0 !important;
    overflow: hidden;
  }

  .chat-page {
    height: 100dvh;
    max-height: 100dvh;
    min-height: 0;
    padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom));
    background:
      linear-gradient(180deg, rgba(255,75,18,.045), transparent 26%),
      linear-gradient(135deg, #f3efe7 0%, #fffaf3 54%, #ffffff 100%) !important;
    color: #101010 !important;
    color-scheme: light;
    --j2-bg: #f3efe7;
    --j2-bg-soft: #fffaf3;
    --j2-surface: rgba(255, 255, 255, .95);
    --j2-surface-2: rgba(255, 250, 243, .96);
    --j2-surface-sunken: rgba(232, 225, 215, .78);
    --j2-text: #101010;
    --j2-muted: #433d38;
    --j2-faint: #746a62;
    --chat-panel: rgba(255, 255, 255, .95);
    --chat-panel-2: rgba(255, 250, 243, .96);
    --chat-sunken: rgba(232, 225, 215, .78);
    --chat-line: rgba(16, 16, 16, .05);
    --chat-soft: rgba(255, 75, 18, .055);
    --chat-shadow-raised: 7px 9px 18px rgba(86,65,47,.18), -5px -5px 14px rgba(255,255,255,.9), inset 1px 1px 0 rgba(255,255,255,.72);
    --chat-shadow-soft: 4px 5px 12px rgba(86,65,47,.14), -3px -3px 10px rgba(255,255,255,.86);
    --chat-shadow-inset: inset 3px 3px 8px rgba(99,79,58,.16), inset -3px -3px 8px rgba(255,255,255,.84);
  }

  .chat-shell,
  .chat-single-shell {
    height: 100%;
    min-height: 0;
  }

  .chat-shell {
    display: block;
  }

  .chat-pane-slot,
  .chat-single-shell {
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .chat-mobile-hidden {
    display: none;
  }

  .chat-list-panel,
  .chat-conversation-panel {
    height: 100%;
    border-radius: 25px;
  }

  .chat-list-header,
  .chat-conversation-header {
    padding: 12px;
    min-height: 68px;
  }

  .chat-list-header h1 {
    font-size: 24px;
  }

  .chat-search,
  .chat-list-stats,
  .chat-context-strip {
    margin-left: 12px;
    margin-right: 12px;
  }

  .chat-thread-scroll {
    padding: 0 8px 12px;
  }

  .chat-thread {
    padding: 10px;
    border-radius: 17px;
  }

  .chat-avatar {
    width: 44px;
    height: 44px;
    border-radius: 16px;
  }

  .chat-live {
    display: none;
  }

  .chat-messages {
    padding: 14px 12px 8px;
    background:
      linear-gradient(180deg, rgba(255,255,255,.22), transparent 20%),
      linear-gradient(90deg, rgba(255,75,18,.03), transparent 45%, rgba(0,0,0,.012));
  }

  .chat-message {
    max-width: 86%;
  }

  .chat-message.theirs .chat-bubble {
    background: rgba(255, 255, 255, .72);
  }

  .chat-quick-replies {
    padding-left: 12px;
    padding-right: 12px;
  }

  .chat-composer {
    margin: 9px 12px 12px;
    border-radius: 22px;
  }

  .chat-composer textarea {
    font-size: 13px;
  }
}

@media (max-width: 420px) {
  .chat-page {
    padding-left: 8px;
    padding-right: 8px;
  }

  .chat-list-stats {
    gap: 8px;
  }

  .chat-list-stats div {
    padding: 11px;
  }

  .chat-list-stats strong {
    font-size: 21px;
  }

  .chat-header-actions .chat-icon-btn {
    width: 38px;
    height: 38px;
  }

  .chat-bubble p {
    font-size: 13px;
  }
}
`;
