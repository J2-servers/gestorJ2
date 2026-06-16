
import React, { useState } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components

export default function CompanyForm({ settings, onUpdate }) {
  const [formData, setFormData] = useState({
    company_name: settings?.company_name || '',
    cnpj: settings?.cnpj || '',
    address: settings?.address || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedSettings = await remoteClient.settings.update(formData);
      onUpdate(updatedSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-500">Configurações salvas com sucesso!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome da Empresa</label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="mt-1"
              placeholder="Digite o nome da empresa"
            />
          </div>

          <div>
            <label className="text-sm font-medium">CNPJ</label>
            <Input
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              className="mt-1"
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Endereço</label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1"
              placeholder="Rua, número, cidade, estado"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1"
                placeholder="contato@empresa.com"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
