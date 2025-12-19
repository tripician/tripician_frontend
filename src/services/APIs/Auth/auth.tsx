import axios from 'axios';

interface SignupData {
  fname: string;
  lname: string;
  email: string;
  password: string;
}

interface SignInData {
  email: string;
  password: string;
}


interface UserProfile {
  id: string;
  email: string;
  name: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

console.log('Current Environment:', import.meta.env.VITE_ENV);
console.log('API Base URL:', API_BASE_URL);

// Base API client without authentication
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API client with Auth0 token
const createAuthenticatedClient = (token: string) => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
};

// Add request interceptor for debugging
apiClient.interceptors.request.use((config) => {
  console.log('Making API request to:', `${config.baseURL || ''}${config.url || ''}`);
  return config;
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Public API endpoints (no authentication required)
export const publicAPI = {
  // New public signup endpoint
  signup: (userData: SignupData) => apiClient.post('/auth/signup', userData),
  // New public signin endpoint
  signin: (credentials: SignInData) => apiClient.post('/auth/signin', credentials),
  health: () => apiClient.get('/health'),
};

// Authenticated API endpoints (requires Auth0 token)
export const createAuthenticatedAPI = (token: string) => {
  const authenticatedClient = createAuthenticatedClient(token);
  
  // Add request interceptor for authenticated requests
  authenticatedClient.interceptors.request.use((config) => {
    console.log('Making authenticated API request to:', `${config.baseURL || ''}${config.url || ''}`);
    console.log('With token:', token ? 'Token present' : 'No token');
    return config;
  });

  // Add response interceptor for error handling
  authenticatedClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.error('Authentication failed - token may be expired');
        // You could trigger a token refresh here
      }
      return Promise.reject(error);
    }
  );

  return {
    // UserProfile management
    getUserProfile: () => authenticatedClient.get('/user/getuserprofile'),
    updateUserProfile: (data: Partial<UserProfile>) => authenticatedClient.put('/user/updateuserprofile', data),
    deleteUserAccount: () => authenticatedClient.delete('/user/deleteuseraccount'),

    // Trip management (example endpoints)
    getTrips: () => authenticatedClient.get('/trips'),
    createTrip: (tripData: any) => authenticatedClient.post('/trips', tripData),
    updateTrip: (tripId: string, tripData: any) => authenticatedClient.put(`/trips/${tripId}`, tripData),
    deleteTrip: (tripId: string) => authenticatedClient.delete(`/trips/${tripId}`),
    
    // Add other protected endpoints here
  };
};

// Legacy export for backward compatibility
export const authAPI = publicAPI;

export default apiClient;