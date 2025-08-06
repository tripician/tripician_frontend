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
    const checkAuthState = () => {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
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

  const logout = async () => {
    try {
      // Optional: Call your API logout endpoint
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch('/api/auth/logout', {
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
      // Always clear local storage and update state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      setAuthState({
        isAuthenticated: false,
        token: null,
        loading: false
      });
    }
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