import { useState, useEffect, useCallback } from 'react';
import { clearSessionData } from '../utils/authSession';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
}

export const useAuthToken = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    loading: true
  });

  useEffect(() => {
    const checkAuthState = () => {
      const token = localStorage.getItem('accessToken');
      
      setAuthState({
        isAuthenticated: !!token,
        token: token,
        loading: false
      });
    };

    checkAuthState();
  }, []);

  // Listen for storage changes (for multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        const newToken = e.newValue;
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: !!newToken,
          token: newToken,
        }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen for global auth logout events (e.g., from 401 responses)
  useEffect(() => {
    const handleAuthLogout = (e: CustomEvent) => {
      console.log('Global logout triggered:', e.detail?.reason);
      // A forced logout (expired token, deleted account) must leave nothing
      // behind either - this listener used to update React state only, so the
      // previous account's cached data outlived the session that owned it.
      clearSessionData();
      setAuthState({
        isAuthenticated: false,
        token: null,
        loading: false
      });
      
      // Optionally trigger navigation to signin
      if (e.detail?.reason === 'token_expired') {
        // Using setTimeout to avoid state update conflicts
        setTimeout(() => {
          window.location.href = '/signin';
        }, 100);
      }
    };

    window.addEventListener('auth:logout', handleAuthLogout as EventListener);
    return () => window.removeEventListener('auth:logout', handleAuthLogout as EventListener);
  }, []);

  const login = useCallback((token: string, refreshToken?: string) => {
    try {
      // eslint-disable-next-line no-console
      console.debug('[useAuthToken] Storing accessToken (masked):', token ? `${token.slice(0,8)}...` : '<none>');
    } catch {}
    localStorage.setItem('accessToken', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    setAuthState({
      isAuthenticated: true,
      token: token,
      loading: false
    });
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      // Optional: Call your API logout endpoint
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Update this URL to match your backend
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with client-side cleanup even if API call fails
    } finally {
      // Always clear every trace of the session, even if the API call failed
      clearSessionData();

      setAuthState({
        isAuthenticated: false,
        token: null,
        loading: false
      });
    }
  }, []);

  const getToken = useCallback((): string | null => {
    return localStorage.getItem('accessToken');
  }, []);

  return {
    ...authState,
    login,
    logout,
    getToken
  };
};