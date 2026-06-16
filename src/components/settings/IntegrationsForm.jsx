import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link2, Webhook, CheckCircle, AlertCircle, XCircle, Smartphone, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

export default function IntegrationsForm({ settings, onUpdate }) {
  const [formData, setFormData] = useState({
    n8n_webhook_url: settings?.n8n_webhook_url || '',
    fcm_server_key: settings?.fcm_server_key || '',
    admin_whatsapp: settings?.admin_whatsapp || '',
    evolution_api_url: settings?.evolution_api_url || '',
    evolution_api_key: settings?.evolution_api_key || '',
    whatsapp_provider: 'evolution',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (settings) {
      setFormData({
        n8n_webhook_url: settings.n8n_webhook_url || '',
        fcm_server_key: settings.fcm_server_key || '',
        admin_whatsapp: settings.admin_whatsapp || '',
        evolution_api_url: settings.evolution_api_url || '',
        evolution_api_key: settings.evolution_api_key || '',
        whatsapp_provider: 'evolution',
      });
    }
  }, [settings]);

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(false);
    try {
      const updated = await remoteClient.settings.update({
        ...formData,
        whatsapp_provider: 'evolution',
      });
      onUpdate(updated);
      setSuccess(true);
      toast({ title: "Configurações Salvas! ✅", description: "Evolution API configurada com sucesso." });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
      toast({ title: "Erro ao Salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasEvolutionConfig = formData.evolution_api_url && formData.evolution_api_key;

  const Field = ({ label, hint, children }) => (
    <div>
      <label className="text-sm font-medium text-gray-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="neumorphic-card p-6 rounded-2xl">
      <h3 className="text-lg font-semibold text-gray-100 mb-6">Integrações</h3>

      {success && (
        <Alert className="mb-4 bg-green-900/20 border-green-800">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <AlertDescription className="ml-2 text-green-200 font-semibold">Configurações salvas!</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="mb-4 bg-red-900/20 border-red-800">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <AlertDescription className="ml-2 text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Evolution */}
      <Alert className={`mb-5 ${hasEvolutionConfig ? 'bg-green-900/20 border-green-800' : 'bg-yellow-900/20 border-yellow-800'}`}>
        {hasEvolutionConfig ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-400" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-green-200">✅ Evolution API configurada!</p>
              <p className="text-sm text-green-300">URL, Instância e API Key preenchidas.</p>
            </AlertDescription>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-yellow-200">⚠️ Evolution API não configurada</p>
              <p className="text-sm text-yellow-300">Preencha os campos abaixo para ativar o WhatsApp.</p>
            </AlertDescription>
          </>
        )}
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Evolution API ── */}
        <div className="p-5 rounded-xl border border-green-800/50 bg-green-900/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-green-400" />
              <div>
                <h4 className="font-semibold text-gray-100">Evolution API v2 — WhatsApp</h4>
                <p className="text-xs text-gray-500">Envio de notificações via WhatsApp</p>
              </div>
            </div>
            <a href="https://doc.evolution-api.com/v2" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 underline">
              Documentação <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-4">
            <Field
              label="URL Base da Evolution API *"
              hint="Ex: https://evolution.suaempresa.com ou http://localhost:8080"
            >
              <input
                type="text"
                value={formData.evolution_api_url}
                onChange={e => set('evolution_api_url', e.target.value)}
                placeholder="https://evolution.suaempresa.com"
                className="w-full mt-1 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </Field>

            <Field
              label="API Key Global *"
              hint="Chave de autenticação da Evolution API (header: apikey)"
            >
              <input
                type="password"
                value={formData.evolution_api_key}
                onChange={e => set('evolution_api_key', e.target.value)}
                placeholder="sua-api-key-aqui"
                className="w-full mt-1 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </Field>

            <Field
              label="WhatsApp do Admin (Notificações)"
              hint="📱 Número que recebe alertas de novos pedidos (apenas dígitos, com DDD)"
            >
              <input
                type="text"
                value={formData.admin_whatsapp}
                onChange={e => set('admin_whatsapp', e.target.value)}
                placeholder="49998298148"
                className="w-full mt-1 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </Field>
          </div>

          {/* Link para diagnóstico */}
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-gray-500">Para conectar o WhatsApp via QR Code, acesse: <a href="/WhatsAppDiagnostic" className="text-green-400 underline hover:text-green-300">WA Diagnóstico</a></p>
          </div>
        </div>

        {/* n8n Webhook */}
        <div className="p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Webhook className="w-5 h-5 text-blue-400" />
            <h4 className="font-medium text-gray-100">n8n Webhook (Opcional)</h4>
          </div>
          <p className="text-sm text-gray-400 mb-3">URL do webhook para automações quando pedidos são aprovados</p>
          <Input
            value={formData.n8n_webhook_url}
            onChange={e => set('n8n_webhook_url', e.target.value)}
            placeholder="https://n8n.exemplo.com/webhook/..."
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        {/* Firebase */}
        <div className="p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Link2 className="w-5 h-5 text-orange-400" />
            <h4 className="font-medium text-gray-100">Firebase Cloud Messaging (Opcional)</h4>
          </div>
          <p className="text-sm text-gray-400 mb-3">Chave do servidor para notificações push no navegador</p>
          <Textarea
            value={formData.fcm_server_key}
            onChange={e => set('fcm_server_key', e.target.value)}
            placeholder="AAAA..."
            className="bg-white/5 border-white/10 text-white"
            rows={3}
          />
        </div>

        {/* Diagnóstico rápido */}
        <div className="p-4 bg-white/[0.03] border border-white/8 rounded-lg">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">🔍 Diagnóstico Evolution API</h4>
          <div className="space-y-1.5 text-xs font-mono">
            {[
              { label: 'URL Base', val: formData.evolution_api_url },
              { label: 'API Key', val: formData.evolution_api_key ? `${formData.evolution_api_key.slice(0,8)}...` : '' },
              { label: 'Admin WhatsApp', val: formData.admin_whatsapp },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center gap-2">
                {val ? <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                <span className="text-gray-500">{label}:</span>
                <span className="text-gray-300">{val || 'não configurado'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
            {loading ? 'Salvando...' : 'Salvar Integrações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
