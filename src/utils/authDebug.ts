// Debug utility for testing authentication scenarios
// Remove this file in production

import { apiServices } from '../services/APIs/apiServices';

export const authDebug = {
  // Simulate expired token by setting an invalid token
  simulateExpiredToken: () => {
    localStorage.setItem('accessToken', 'expired-token-12345');
    console.log('🐛 DEBUG: Set expired token for testing');
  },

  // Clear all auth data
  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('🐛 DEBUG: Cleared all auth data');
  },

  // Check current auth state
  checkAuthState: () => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('🐛 DEBUG: Current auth state:', {
      hasToken: !!token,
      token: token ? `${token.substring(0, 10)}...` : null,
      hasRefreshToken: !!refreshToken
    });
  },

  // Trigger manual logout event
  triggerLogout: (reason = 'manual_debug') => {
    window.dispatchEvent(new CustomEvent('auth:logout', { 
      detail: { reason }
    }));
    console.log('🐛 DEBUG: Triggered logout event with reason:', reason);
  },

  // Test backend connection
  testBackendConnection: async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://localhost:44338'}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('🐛 DEBUG: Backend connection test:', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });
      return response.ok;
    } catch (error) {
      console.log('🐛 DEBUG: Backend connection failed:', error);
      return false;
    }
  },

  // Test profile API call
  testProfileAPI: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('🐛 DEBUG: No token found for profile API test');
      return;
    }

    try {
      console.log('🐛 DEBUG: Testing profile API call...');
      const response = await apiServices.getUserProfile(token);
      console.log('🐛 DEBUG: Profile API success:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('🐛 DEBUG: Profile API error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        fullError: error
      });
      return null;
    }
  }
};

// Make available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).authDebug = authDebug;
}
