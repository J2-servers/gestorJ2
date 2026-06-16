import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ServerForm({ server, onSuccess, onCancel, currentUser }) {
  const [formData, setFormData] = useState({
    name: '',
    panel_link: '',
    username: '',
    value_per_credit: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name || '',
        panel_link: server.panel_link || '',
        username: server.username || '',
        value_per_credit: server.value_per_credit || '',
      });
    }
  }, [server]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação rigorosa do valor por crédito
    const value = parseFloat(formData.value_per_credit);
    if (isNaN(value) || value <= 0) {
      setError('O "Valor por Crédito" deve ser um número positivo. Ex: 0.05');
      setLoading(false);
      return;
    }

    try {
      // Segurança: validar permissão de edição
      if (server && currentUser.id !== server.owner_id && currentUser.role !== 'admin') {
        setError('Você não tem permissão para editar este servidor');
        setLoading(false);
        return;
      }

      const serverData = {
        ...formData,
        value_per_credit: value, // Usar o valor numérico validado
        owner_id: server ? server.owner_id : currentUser.id, // Preservar owner_id original
      };

      if (server) {
        await remoteClient.servers.update(server.id, serverData);
      } else {
        await remoteClient.servers.create(serverData);
      }
      
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{server ? 'Editar Servidor' : 'Novo Servidor'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive-foreground">{error}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium">Nome do Servidor</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Servidor Premium"
              className="mt-1"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Link do Painel</label>
            <Input
              type="url"
              value={formData.panel_link}
              onChange={(e) => setFormData({ ...formData, panel_link: e.target.value })}
              placeholder="https://exemplo.com/painel"
              className="mt-1"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Usuário</label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="seu_usuario"
              className="mt-1"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Valor por Crédito (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.value_per_credit}
              onChange={(e) => setFormData({ ...formData, value_per_credit: e.target.value })}
              placeholder="Ex: 0.05"
              className="mt-1"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}