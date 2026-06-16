import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/entities/Message';
import { Notification } from '@/entities/Notification';
import { CreditRequest } from '@/entities/CreditRequest';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, X } from 'lucide-react';
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

  const loadMessages = useCallback(async () => {
    if (!request) return;
    setLoading(true);
    try {
      const messageList = await Message.filter({ credit_request_id: request.id }, "created_date");
      setMessages(messageList);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      await Message.create({
        credit_request_id: request.id,
        sender_id: user.id,
        sender_name: user.name || user.email,
        message_content: newMessage
      });

      // Determinar quem é o destinatário da notificação baseado no pedido
      let recipientId = null;
      let notificationMessage = '';

      if (user.role === 'admin') {
        // Admin enviando para o revendedor
        recipientId = request.reseller_id;
        notificationMessage = `Nova mensagem do admin no pedido #${request.id.slice(-6)}`;
      } else {
        // Revendedor enviando - precisa encontrar admin responsável
        // Como não podemos listar usuários, vamos tentar encontrar através do parent_user_id
        if (user.parent_user_id) {
          recipientId = user.parent_user_id;
          notificationMessage = `Nova mensagem de ${user.name || user.email} no pedido #${request.id.slice(-6)}`;
        }
      }

      // Criar notificação se encontrou um destinatário
      if (recipientId) {
        await Notification.create({
          user_id: recipientId,
          message: notificationMessage,
          type: 'message',
          related_entity_id: request.id
        });
      }

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="neumorphic-card border-0 max-w-lg">
        <DialogHeader>
          <DialogTitle>Mensagens - Pedido #{request.id.slice(-6)}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 neumorphic-input rounded-lg">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-lg max-w-xs ${msg.sender_id === user.id ? 'bg-blue-100' : 'bg-gray-200'}`}>
                  <p className="text-sm text-gray-800">{msg.message_content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {msg.sender_name} - {format(new Date(msg.created_date), "dd/MM HH:mm", { locale: ptBR })}
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
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