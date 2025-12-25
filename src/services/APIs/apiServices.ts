// api/apiService.ts - This is the ONLY additional file you need
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
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
  // GET /api/trips/dashboard - user dashboard trips
  getDashboardTrips: (token: string) => 
    apiClient.get('/api/trips/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/public - public trips (no auth required but we allow optional token)
  getPublicTrips: (token?: string) => 
    apiClient.get('/api/trips/public', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }),

  // Simple connectivity ping (GET public trips) to help diagnose local server reachability (no auth required).
  pingPublicTrips: () => apiClient.get('/api/trips/public').then(r => ({ ok: true, status: r.status })).catch(e => ({ ok: false, error: e.message })),

  // POST /api/trips - create trip
  createTrip: (token: string, data: {
    name: string;
    countries: string[];
    startDate?: string | null;
    endDate?: string | null;
    visibility: 'TRIP_MEMBERS' | 'FOLLOWERS' | 'EVERYONE';
    invites?: string[];
  }) => apiClient.post('/api/trips', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // GET /api/trips/{tripId}
  getTripById: (token: string, tripId: string) => apiClient.get(`/api/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // PUT /api/trips/{tripId} - update trip core + itinerary + docs/meta
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
  }) => apiClient.put(`/api/trips/${tripId}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // PATCH /api/trips/{tripId}/visibility
  changeTripVisibility: (token: string, tripId: string, data: { visibility: 'TRIP_MEMBERS' | 'FOLLOWERS' | 'EVERYONE' }) =>
    apiClient.patch(`/api/trips/${tripId}/visibility`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // DELETE /api/trips/{tripId}
  deleteTrip: (token: string, tripId: string) => apiClient.delete(`/api/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // PUT /api/trips/{tripId}/settings - settings update (DTO-compatible: name, visibility, dates, countries, bannerPhotoId)
  updateTripSettings: (token: string, tripId: string, data: {
    name?: string;
    visibility?: string; // e.g., PRIVATE | TRIP_MEMBERS | FOLLOWERS | EVERYONE
    startDate?: string; // ISO date (yyyy-MM-dd)
    endDate?: string;   // ISO date (yyyy-MM-dd)
    countries?: string[];
    bannerPhotoId?: string; // GUID as string if available
    // Backward compatibility
    privacy?: string;
    photoUrl?: string;
  }) => apiClient.put(`/api/trips/${tripId}/settings`, data, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // GET /user-profiles/{userEmail} - search user by email
  getUserProfileByEmail: (token: string, userEmail: string) =>
    apiClient.get(`/search/user-profiles/${encodeURIComponent(userEmail)}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // PATCH /api/trips/{tripId}/add-users - batch add members to trip
  addTripUsers: (token: string, tripId: string, userIds: number[]) =>
    apiClient.patch(`/api/trips/${tripId}/add-users`, { UserIds: userIds }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/{tripId}/users - fetch all users (members) of a trip
  getTripUsers: (token: string, tripId: string) =>
    apiClient.get(`/api/trips/${tripId}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // DELETE /api/trips/{tripId}/users/{userId} - remove a single user from trip (owner only)
  removeTripUser: (token: string, tripId: string, userId: string | number) =>
    apiClient.delete(`/api/trips/${tripId}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ------------------------------------------------------------
  // Profile Settings (Privacy)
  // GET api/profile/settings/privacy
  getPrivacySettings: (token: string) =>
    apiClient.get('/api/profile/settings/privacy', {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // GET profile settings (basic user profile fields)
  getProfileSettings: (token: string) =>
    apiClient.get('/api/profile/settings/Profile', {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // PATCH personal info settings (basic profile editable fields)
  updatePersonalInfoSettings: (token: string, model: {
    Fname?: string;
    Lname?: string;
    Bio?: string;
    Location?: string;
    Website?: string;
    Twitter?: string;
    Instagram?: string;
    Facebook?: string;
  }) =>
    apiClient.patch('/api/profile/settings/Personal-Info', model, {
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
  // PATCH contact info settings (email / phone)
  updateContactInfoSettings: (token: string, model: { Email?: string; Phone?: string }) =>
    apiClient.patch('/api/profile/settings/contact-info', model, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // ------------------------------------------------------------
  // Notification Settings
  // GET api/profile/settings/notification
  getNotificationSettings: (token: string) =>
    apiClient.get('/api/profile/settings/notification', {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // PATCH api/profile/settings/notification
  updateNotificationSettings: (token: string, model: Partial<{
    emailUpdates: boolean;
    communityPosts: boolean;
    blogComments: boolean;
    newsletter: boolean;
    pushNotifications: boolean;
    travelReminders: boolean;
  }>) =>
    apiClient.patch('/api/profile/settings/notification', model, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // ------------------------------------------------------------
  // Preference Settings
  // GET api/profile/settings/preference
  getPreferenceSettings: (token: string) =>
    apiClient.get('/api/profile/settings/preference', {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // PATCH api/profile/settings/preference
  updatePreferenceSettings: (token: string, model: {
    language?: string;
    timezone?: string;
    preferredCurrency?: string;
    travelStyle?: string;
    budgetRange?: string;
  }) =>
    apiClient.patch('/api/profile/settings/preference', model, {
      headers: { Authorization: `Bearer ${token}` }
    }),
};