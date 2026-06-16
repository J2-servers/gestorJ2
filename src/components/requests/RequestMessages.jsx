import React, { useState, useEffect, useRef, useCallback } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RequestMessages({ request, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async (silent = false) => {
    if (!request) return;
    if (!silent) setLoading(true);
    try {
      const raw = await remoteClient.creditRequests.listMessages(request.id);
      const list = Array.isArray(raw) ? raw : (raw?.data || []);
      setMessages(list);
    } catch (error) {
      if (!silent) console.error("Erro ao carregar mensagens:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [request]);

  // Carrega ao abrir + atualiza ao vivo a cada 4s (conversa em tempo real).
  useEffect(() => {
    loadMessages();
    const iv = setInterval(() => loadMessages(true), 4000);
    return () => clearInterval(iv);
  }, [loadMessages]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return;
    const text = newMessage.trim();
    setNewMessage('');
    setLoading(true);
    try {
      await remoteClient.creditRequests.sendMessage(request.id, text);
      await loadMessages(true);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setNewMessage(text); // restaura em caso de falha
    } finally {
      setLoading(false);
    }
  };

  const getSenderId = (msg) => msg.sender_id ?? msg.senderId;
  const getContent  = (msg) => msg.message_content ?? msg.content ?? '';
  const getSenderName = (msg) => msg.sender_name ?? msg.senderName ?? '';
  const getDate     = (msg) => msg.created_date ?? msg.createdAt ?? '';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="neumorphic-card border-0 max-w-lg">
        <DialogHeader>
          <DialogTitle>Mensagens — Pedido #{request.id.slice(-6)}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 neumorphic-input rounded-lg">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex flex-col ${getSenderId(msg) === user.id ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-lg max-w-xs ${getSenderId(msg) === user.id ? 'bg-blue-100' : 'bg-gray-200'}`}>
                  <p className="text-sm text-gray-800">{getContent(msg)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getSenderName(msg)} — {getDate(msg) ? format(new Date(getDate(msg)), "dd/MM HH:mm", { locale: ptBR }) : ''}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {messages.length === 0 && !loading && (
              <div className="text-center text-gray-500 pt-16">Nenhuma mensagem ainda.</div>
            )}
            {loading && messages.length === 0 && (
              <div className="text-center text-gray-500 pt-16">Carregando mensagens...</div>
            )}
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="neumorphic-input border-0"
              rows="2"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
              }}
            />
            <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()} size="icon" className="neumorphic-button bg-blue-500 text-white h-full">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
