// api/apiService.ts - This is the ONLY additional file you need
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:44338';
// Debug log once (safe in dev; minimal noise in prod)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[apiServices] Using API_BASE_URL =>', API_BASE_URL);
}

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
  async (error) => {
    // 401 handling (auth expiry)
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_expired' } }));
    }

    // Protocol fallback: If HTTPS localhost refuses connection, retry once over HTTP.
    // Guards: only for ERR_NETWORK / connection refused, only localhost, only once.
    const originalConfig = error.config;
    const isNetworkRefused = !error.response && (error.code === 'ERR_NETWORK' || /ECONNREFUSED|ENOTFOUND|ERR_CONNECTION_REFUSED/i.test(error.message || ''));
    const isLocalHttps = typeof originalConfig?.baseURL === 'string' && /^https:\/\/localhost[:\d]*/i.test(originalConfig.baseURL || '');
    const alreadyRetried = originalConfig?._protocolRetry;
    if (isNetworkRefused && isLocalHttps && !alreadyRetried) {
      try {
        const httpBase = originalConfig.baseURL.replace(/^https:/, 'http:');
        originalConfig.baseURL = httpBase;
        (originalConfig as any)._protocolRetry = true;
        // eslint-disable-next-line no-console
        console.warn('[apiServices] HTTPS connection refused – retrying via HTTP', { httpBase });
        return apiClient.request(originalConfig);
      } catch (retryErr) {
        // eslint-disable-next-line no-console
        console.error('[apiServices] Protocol fallback failed', retryErr);
      }
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

  // Simple connectivity ping (GET public trips) to help diagnose local server reachability (no auth required).
  pingPublicTrips: () => apiClient.get('/trips/public').then(r => ({ ok: true, status: r.status })).catch(e => ({ ok: false, error: e.message })),

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

  // PUT /trips/{tripId} - update trip core + itinerary + docs/meta
  // TripUpdateDto should match backend expected shape; we map from front-end payload built in TripPlanner (buildPersistPayload)
  updateTrip: (token: string, tripId: string, data: {
    trip: {
      id: string;
      name: string;
      status: 'DRAFT' | 'PUBLISHED';
      privacy: string; // backend enum e.g. TRIP_MEMBERS | FOLLOWERS | EVERYONE | PRIVATE mapped server-side
      currency: string;
      startDate: string; // added to align with TripPlanImportDto expectations
      endDate: string;   // added to align with TripPlanImportDto expectations
      generatedAt: string;
      targetNights: number;
      totalNights: number;
      geocodedDestinations: number;
      legCount: number;
      routeDistanceKm: number;
      importantNotes?: string;
      photoUrl?: string;
      countries?: string[];
    };
    itinerary: Array<{
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      nights: number;
      lat?: number;
      lng?: number;
      transport?: string;
      spots: Array<{ id:string; name:string; placeId?:string; checked:boolean }>;
      foods: Array<{ id:string; name:string; checked:boolean }>;
      docs: Array<{ id:string; originalName:string; mimeType:string }>;
    }>;
    legs: Array<{ fromId:string; toId:string; mode:string; distanceKm:number|null; from:{lat?:number; lng?:number}; to:{lat?:number; lng?:number} }>;
    expenses: any[]; // refine when expense DTO known
    budget: number | null | undefined;
    comments: any[]; // refine when comment DTO known
    pinnedDocIds: string[];
    globalDocs: Array<{ id:string; originalName:string; mimeType:string }>;
    visaDocs: Array<{ id:string; originalName:string; mimeType:string }>;
    destinationDocsCount: number;
    version: number;
  }) => apiClient.put(`/trips/${tripId}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // PATCH /trips/{tripId}/visibility
  changeTripVisibility: (token: string, tripId: string, data: { visibility: 'TRIP_MEMBERS' | 'FOLLOWERS' | 'EVERYONE' }) =>
    apiClient.patch(`/trips/${tripId}/visibility`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // DELETE /trips/{tripId}
  deleteTrip: (token: string, tripId: string) => apiClient.delete(`/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // PUT /trips/{tripId}/settings - lightweight settings update (name, privacy, countries, photoUrl)
  updateTripSettings: (token: string, tripId: string, data: {
    name?: string;
    privacy?: string; // backend will map
    countries?: string[];
    photoUrl?: string;
  }) => apiClient.put(`/trips/${tripId}/settings`, data, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // GET /user-profiles/{userEmail} - search user by email
  getUserProfileByEmail: (token: string, userEmail: string) =>
    apiClient.get(`/search/user-profiles/${encodeURIComponent(userEmail)}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // PATCH /trips/{tripId}/add-users - batch add members to trip
  addTripUsers: (token: string, tripId: string, userIds: number[]) =>
    apiClient.patch(`/trips/${tripId}/add-users`, { UserIds: userIds }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /trips/{tripId}/users - fetch all users (members) of a trip
  getTripUsers: (token: string, tripId: string) =>
    apiClient.get(`/trips/${tripId}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ------------------------------------------------------------
  // Profile Settings (Privacy)
  // GET api/profile/settings/privacy
  getPrivacySettings: (token: string) =>
    apiClient.get('/api/profile/settings/privacy', {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // PATCH api/profile/settings/privacy
  // Accepts partial update object. Frontend sends only changed keys.
  updatePrivacySettings: (token: string, model: {
    Visibility: string; // e.g. Public | Friends | Private
    ShowTravelHistory: boolean;
    ShowContactInfo: boolean;
    AllowDirectMessages: boolean;
  }) =>
    apiClient.patch('/api/profile/settings/privacy', model, {
      headers: { Authorization: `Bearer ${token}` }
    }),
};