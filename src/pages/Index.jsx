import React, { useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Define dark mode como padrÃ£o no primeiro acesso
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }

    const checkAuth = async () => {
      try {
        const currentUser = await remoteClient.auth.me();
        if (currentUser) {
          navigate(createPageUrl('Dashboard'));
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Carregando...</p>
      </div>
    </div>
  );
}
