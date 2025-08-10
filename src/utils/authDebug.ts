// Debug utility for testing authentication scenarios
// Remove this file in production

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
  }
};

// Make available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).authDebug = authDebug;
}
