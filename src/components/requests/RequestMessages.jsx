import React, { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { remoteClient } from "@/api/remoteClient";

export default function RequestMessages({ request, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const loadMessages = useCallback(async (silent = false) => {
    if (!request) return;
    if (!silent) setLoading(true);
    try {
      const raw = await remoteClient.creditRequests.listMessages(request.id);
      setMessages(Array.isArray(raw) ? raw : raw?.data || []);
    } catch (error) {
      if (!silent) console.error("Erro ao carregar mensagens:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => loadMessages(true), 4000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return;
    const text = newMessage.trim();
    setNewMessage("");
    setLoading(true);
    try {
      await remoteClient.creditRequests.sendMessage(request.id, text);
      await loadMessages(true);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setNewMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const getSenderId = (msg) => msg.sender_id ?? msg.senderId;
  const getContent = (msg) => msg.message_content ?? msg.content ?? "";
  const getSenderName = (msg) => msg.sender_name ?? msg.senderName ?? "";
  const getDate = (msg) => msg.created_date ?? msg.createdAt ?? "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="request-chat-dialog">
        <DialogHeader className="request-chat-head">
          <div className="request-chat-title">
            <div className="request-chat-icon">
              <MessageCircle size={19} />
            </div>
            <DialogTitle>Pedido #{request.id.slice(-6)}</DialogTitle>
          </div>
          <button className="request-chat-close" onClick={onClose} type="button" aria-label="Fechar chat">
            <X size={17} />
          </button>
        </DialogHeader>

        <div className="request-chat-body">
          <div className="request-chat-messages">
            {messages.map((msg, index) => {
              const mine = getSenderId(msg) === user.id;
              const date = getDate(msg);
              return (
                <article className={`request-chat-bubble ${mine ? "mine" : ""}`} key={msg.id || index}>
                  <div>
                    <p>{getContent(msg)}</p>
                  </div>
                  <span>
                    {getSenderName(msg)}
                    {date ? ` - ${format(new Date(date), "dd/MM HH:mm", { locale: ptBR })}` : ""}
                  </span>
                </article>
              );
            })}
            <div ref={messagesEndRef} />
            {messages.length === 0 && !loading && <div className="request-chat-empty">Nenhuma mensagem ainda.</div>}
            {loading && messages.length === 0 && <div className="request-chat-empty">Carregando mensagens...</div>}
          </div>

          <footer className="request-chat-composer">
            <textarea
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Digite sua mensagem..."
              rows={2}
              value={newMessage}
            />
            <button disabled={loading || !newMessage.trim()} onClick={handleSendMessage} type="button" aria-label="Enviar mensagem">
              <Send size={18} />
            </button>
          </footer>
        </div>
        <style>{requestChatStyles}</style>
      </DialogContent>
    </Dialog>
  );
}

const requestChatStyles = `
.request-chat-dialog {
  width: min(560px, calc(100vw - 24px)) !important;
  max-width: min(560px, calc(100vw - 24px)) !important;
  border: 0 !important;
  border-radius: 28px !important;
  padding: 0 !important;
  color: var(--j2-text) !important;
  background: rgba(6, 7, 7, .98) !important;
  box-shadow: var(--j2-neu) !important;
  overflow: hidden;
}

.request-chat-head {
  padding: 16px;
  display: flex;
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;
  background: rgba(9, 10, 10, .96);
}

.request-chat-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.request-chat-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.request-chat-title h2 {
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.request-chat-close,
.request-chat-composer button {
  border: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.request-chat-close {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
}

.request-chat-body {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.request-chat-messages {
  height: min(430px, 58dvh);
  border-radius: 22px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.request-chat-bubble {
  max-width: 82%;
  align-self: flex-start;
  display: grid;
  gap: 4px;
}

.request-chat-bubble.mine {
  align-self: flex-end;
}

.request-chat-bubble > div {
  border-radius: 18px 18px 18px 6px;
  padding: 10px 12px;
  color: var(--j2-text);
  background: rgba(9, 10, 10, .96);
  box-shadow: var(--j2-neu-soft);
}

.request-chat-bubble.mine > div {
  border-radius: 18px 18px 6px 18px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.request-chat-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.45;
}

.request-chat-bubble span {
  color: var(--j2-faint);
  font-size: 10px;
}

.request-chat-bubble.mine span {
  text-align: right;
}

.request-chat-empty {
  margin: auto;
  color: var(--j2-muted);
  font-size: 13px;
  text-align: center;
}

.request-chat-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  gap: 10px;
}

.request-chat-composer textarea {
  width: 100%;
  min-height: 48px;
  border: 0;
  outline: 0;
  border-radius: 17px;
  padding: 12px 14px;
  resize: none;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 13px;
}

.request-chat-composer textarea::placeholder {
  color: var(--j2-faint);
}

.request-chat-composer button {
  width: 48px;
  height: 48px;
  border-radius: 17px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: var(--j2-neu-soft);
}

.request-chat-composer button:disabled {
  cursor: not-allowed;
  opacity: .48;
}

@media (max-width: 520px) {
  .request-chat-dialog {
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    border-radius: 24px !important;
  }

  .request-chat-messages {
    height: 54dvh;
  }

  .request-chat-bubble {
    max-width: 90%;
  }
}
`;
