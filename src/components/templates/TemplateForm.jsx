
import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function TemplateForm({ template, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'approval',
    message_content: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        type: template.type || 'approval',
        message_content: template.message_content || '',
        is_active: template.is_active !== undefined ? template.is_active : true,
      });
    }
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (template) {
        await remoteClient.templates.update(template.id, formData);
      } else {
        await remoteClient.templates.create(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar o template.');
    } finally {
      setLoading(false);
    }
  };

  const templates = {
    queue: `*Pedido entrou na fila de recarga!*

Olá *{{resellerName}}*!

Seu pedido #{{requestId}} já foi recebido e entrou na fila.

*Detalhes:*
• Servidor: {{serverName}}
• Login: {{login}}
• Créditos: {{credits}}
• Valor: {{value}}

Aguarde, sua recarga será efetuada em breve.`,
    approval: `ðŸŽ‰ *Pedido Aprovado!*

OlÃ¡ *{{resellerName}}*!

Seu pedido #{{requestId}} foi aprovado e processado com sucesso.

ðŸ“Š *Detalhes:*
â€¢ Servidor: {{serverName}}
â€¢ Login: {{login}}
â€¢ CrÃ©ditos: {{credits}}
â€¢ Valor: {{value}}

{{adminNotes}}

âœ… Os crÃ©ditos jÃ¡ foram recarregados e estÃ£o disponÃ­veis para uso!`,

    rejection: `âŒ *Pedido Rejeitado*

OlÃ¡ *{{resellerName}}*.

Infelizmente seu pedido #{{requestId}} foi rejeitado.

ðŸ“Š *Detalhes:*
â€¢ Servidor: {{serverName}}
â€¢ Login: {{login}}
â€¢ CrÃ©ditos: {{credits}}
â€¢ Valor: {{value}}

*Motivo:* {{rejectionReason}}

Entre em contato conosco para mais informaÃ§Ãµes.`,

    payment_reminder: `â° *Lembrete de Pagamento*

OlÃ¡ *{{resellerName}}*!

Seu pedido #{{requestId}} estÃ¡ aguardando confirmaÃ§Ã£o de pagamento.

ðŸ“Š *Detalhes:*
â€¢ Servidor: {{serverName}}
â€¢ CrÃ©ditos: {{credits}}
â€¢ Valor: {{value}}

Por favor, envie o comprovante de pagamento para agilizar a aprovaÃ§Ã£o.`
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <Label>Nome do Template *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Template de AprovaÃ§Ã£o PadrÃ£o"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label>Tipo de Template *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                setFormData({ 
                  ...formData, 
                  type: value,
                  message_content: templates[value] || formData.message_content
                });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="queue">Entrada na Fila</SelectItem>
                <SelectItem value="approval">AprovaÃ§Ã£o de Pedido</SelectItem>
                <SelectItem value="rejection">RejeiÃ§Ã£o de Pedido</SelectItem>
                <SelectItem value="payment_reminder">Lembrete de Pagamento</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Selecionar um tipo prÃ©-definido carregarÃ¡ um template padrÃ£o que vocÃª pode personalizar
            </p>
          </div>

          <div>
            <Label>Mensagem *</Label>
            <Textarea
              value={formData.message_content}
              onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
              rows={12}
              placeholder="Digite a mensagem aqui..."
              required
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use as variÃ¡veis disponÃ­veis para personalizar a mensagem. Elas serÃ£o substituÃ­das automaticamente.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is-active">Template ativo</Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
