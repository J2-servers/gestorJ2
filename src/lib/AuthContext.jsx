import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { remoteClient } from '@/api/remoteClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ id: 'gestorj2', public_settings: { auth_required: true } });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      await checkUserAuth();
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await remoteClient.auth.me();
      if (!currentUser?.id) {
        throw new Error('Usuario nao autenticado');
      }
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const logout = async (shouldRedirect = true) => {
    await remoteClient.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.assign('/');
  };

  const navigateToLogin = () => {
    window.location.assign('/Login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

