import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PhoneRequiredBanner({ user }) {
  // Não mostrar para admins ou se já tiver telefone
  if (!user || user.role === 'admin' || user.phone) {
    return null;
  }

  return (
    <Alert className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="ml-2 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold text-yellow-800 dark:text-yellow-200">
            ⚠️ Ação Necessária: Cadastre seu WhatsApp
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Seu número de WhatsApp é obrigatório para receber notificações de pedidos aprovados e para criar novos pedidos.
          </p>
        </div>
        <Link to={createPageUrl("Profile")}>
          <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
            Cadastrar Agora
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}