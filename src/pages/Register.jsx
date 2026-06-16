import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, UserPlus, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [parentUserId, setParentUserId] = useState(null); // New state for parentUserId

  useEffect(() => {
    // Garante tema escuro na página de registro
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    
    const params = new URLSearchParams(window.location.search);
    const parentId = params.get('parent');
    
    if (parentId) {
      setParentUserId(parentId);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        await remoteClient.auth.register({
        ...formData,
        parentId: parentUserId || undefined,
      });

      setSuccess(true);
    } catch (err) {
      setError('Erro ao registrar. Tente novamente.');
      console.error('Erro no registro:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl border-2 border-orange-400/30 shadow-[0_0_30px_rgba(251,146,60,0.3)] p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-50 mb-2">Registro Enviado!</h2>
            <p className="text-gray-300 mb-6">
              Seu registro foi enviado com sucesso. Aguarde o contato do administrador para ativação da sua conta.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-orange-500/50"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl border-2 border-orange-400/30 shadow-[0_0_30px_rgba(251,146,60,0.3)] p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center border-2 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.6)]">
              <UserPlus className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
              Cadastro de Revendedor
            </h1>
            <p className="text-gray-400">Preencha seus dados para começar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-800 border border-red-600 rounded-lg">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Nome Completo *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 border-none"
                placeholder="Seu nome completo"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 border-none"
                placeholder="seu@email.com"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Telefone *
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white/10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 border-none"
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-orange-500/50"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? 'Enviando...' : 'Quero ser Revendedor'}
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-400">
                Já tem uma conta?{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-orange-400 hover:text-orange-500 transition-colors duration-200"
                  onClick={() => window.location.href = '/'}
                >
                  Faça login aqui
                </Button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}