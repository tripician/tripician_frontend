import { useState, useEffect } from 'react';

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
    // Check for stored token on component mount
    const checkAuthState = () => {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        // You might want to validate the token here
        // For now, we'll assume it's valid if it exists
        setAuthState({
          isAuthenticated: true,
          token: token,
          loading: false
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          token: null,
          loading: false
        });
      }
    };

    checkAuthState();
  }, []);

  const login = (token: string, refreshToken?: string) => {
    localStorage.setItem('accessToken', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    setAuthState({
      isAuthenticated: true,
      token: token,
      loading: false
    });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    setAuthState({
      isAuthenticated: false,
      token: null,
      loading: false
    });
  };

  const getToken = () => {
    return localStorage.getItem('accessToken');
  };

  return {
    ...authState,
    login,
    logout,
    getToken
  };
};