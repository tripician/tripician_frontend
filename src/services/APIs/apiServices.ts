// api/apiService.ts - This is the ONLY additional file you need
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:44338';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle 401 errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is expired or invalid - trigger logout
      // Clear local storage immediately
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Dispatch custom event for logout
      window.dispatchEvent(new CustomEvent('auth:logout', { 
        detail: { reason: 'token_expired' }
      }));
    }
    return Promise.reject(error);
  }
);

// API service that accepts token
export const apiServices = {
  // User Profile methods - matching your backend routes
  getUserProfile: (token: string) => 
    apiClient.get('/profile/getuserprofile', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  updateUserProfile: (token: string, data: any) => 
    apiClient.post('/profile/updateuserprofile', data, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  deleteUserProfile: (token: string, id: number) => 
    apiClient.post(`/profile/deleteuserprofilebyid/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  deactivateUserProfile: (token: string, id: number) => 
    apiClient.post(`/profile/deactivateuserprofilebyid/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Trip endpoints (updated to match new TripController)
  // GET /trips/dashboard - user dashboard trips
  getDashboardTrips: (token: string) => 
    apiClient.get('/trips/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /trips/public - public trips (no auth required but we allow optional token)
  getPublicTrips: (token?: string) => 
    apiClient.get('/trips/public', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }),

  // POST /trips - create trip
  createTrip: (token: string, data: {
    name: string;
    countries: string[];
    startDate?: string | null;
    endDate?: string | null;
    visibility: 'TRIP_MEMBERS' | 'FOLLOWERS' | 'EVERYONE';
    invites?: string[];
  }) => apiClient.post('/trips', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // GET /trips/{tripId}
  getTripById: (token: string, tripId: string) => apiClient.get(`/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // PATCH /trips/{tripId}/visibility
  changeTripVisibility: (token: string, tripId: string, data: { visibility: 'TRIP_MEMBERS' | 'FOLLOWERS' | 'EVERYONE' }) =>
    apiClient.patch(`/trips/${tripId}/visibility`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }),
};