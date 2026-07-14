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

// Helper to mask tokens when logging
const mask = (s?: string | null) => {
  if (!s) return '<none>';
  try { return `${s.slice(0,8)}...${s.slice(-4)}`; } catch { return '<masked>'; }
};

// Log outgoing requests (helps diagnose missing Authorization header in prod)
apiClient.interceptors.request.use((config) => {
  try {
    const authHeader = (config.headers as any)?.Authorization || (config.headers as any)?.authorization || '<none>';
    // eslint-disable-next-line no-console
    console.debug('[apiServices] Request ->', config.method, config.url, 'baseURL=', config.baseURL, 'Authorization=', typeof authHeader === 'string' ? (authHeader.startsWith('Bearer ') ? `Bearer ${mask(authHeader.replace(/^Bearer\s*/i, ''))}` : mask(authHeader)) : authHeader);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[apiServices] Request logging failed', e);
  }
  try {
    // Attach token from localStorage if not already present on the request
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const headersAny = config.headers as any;
      if (token && !headersAny?.Authorization && !headersAny?.authorization) {
        headersAny.Authorization = `Bearer ${token}`;
      }
    }
  } catch (attachErr) {
    // eslint-disable-next-line no-console
    console.warn('[apiServices] Failed to attach Authorization token', attachErr);
  }

  return config;
});

// Add response interceptor to handle 401 errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Centralize original config for possible retry logic
    const originalConfig = error.config;

    // 401 handling (don't immediately clear tokens while debugging)
    if (error.response?.status === 401) {
      try {
        const reqUrl = originalConfig?.url;
        const hadAuth = !!((originalConfig?.headers as any)?.Authorization || (originalConfig?.headers as any)?.authorization);
        // eslint-disable-next-line no-console
        console.warn('[apiServices] Received 401 for', reqUrl, 'hadAuthorization=', hadAuth);

        // If this request hasn't been retried yet, try to attach token from storage and retry once
        if (!originalConfig?._retried) {
          (originalConfig as any)._retried = true;
          const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
          if (token && !hadAuth) {
            // Attach token and retry
            originalConfig.headers = { ...(originalConfig.headers || {}), Authorization: `Bearer ${token}` };
            // eslint-disable-next-line no-console
            console.debug('[apiServices] Retrying request with attached token for', reqUrl);
            return apiClient.request(originalConfig);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[apiServices] Error handling 401', e);
      }

      // Emit event for visibility but do not clear tokens here to avoid race-driven logout
      try { window.dispatchEvent(new CustomEvent('auth:401', { detail: { url: originalConfig?.url, status: 401 } })); } catch {}
    }

    // Protocol fallback: If HTTPS localhost refuses connection, retry once over HTTP.
    // Guards: only for ERR_NETWORK / connection refused, only localhost, only once.
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
  // Response: array of Trip objects, each includes description?: string | null, vibe?: string | null, rating?: number | null
  getDashboardTrips: (token: string) => 
    apiClient.get('/api/trips/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/public - trips with Visibility=Everyone (deprecated for feed use)
  getPublicTrips: (token?: string) => 
    apiClient.get('/api/trips/public', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }),

  // GET /api/trips/published - all published trips (Published=true, IsArchived=false, any visibility)
  // Token is optional: guests can browse community trips without signing in.
  getPublishedTrips: (token?: string) =>
    apiClient.get('/api/trips/published', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }),

  // GET /api/trips/saved - trips the current user has saved (Saved Trips tab on Dashboard)
  getSavedTrips: (token: string) =>
    apiClient.get('/api/trips/saved', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/{tripId}/reactions - aggregate like/save/needswork counts + this user's state
  // Token is optional: anonymous visitors of a shared trip receive counts with user flags false.
  getTripReactions: (token: string | null | undefined, tripId: string) =>
    apiClient.get(`/api/trips/${tripId}/reactions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }),

  // POST /api/trips/{tripId}/reactions/{type} - toggle a reaction (type: 'like' | 'save' | 'needswork')
  // Returns the refreshed reaction summary.
  toggleTripReaction: (token: string, tripId: string, type: 'like' | 'save' | 'needswork') =>
    apiClient.post(`/api/trips/${tripId}/reactions/${type}`, null, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // POST /api/feedback - submit user feedback (emailed to support@tripician.com)
  sendFeedback: (token: string, message: string) =>
    apiClient.post('/api/feedback', { message }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Simple connectivity ping (GET public trips) to help diagnose local server reachability (no auth required).
  pingPublicTrips: () => apiClient.get('/api/trips/public').then(r => ({ ok: true, status: r.status })).catch(e => ({ ok: false, error: e.message })),

  // POST /api/trips - create trip
  // Request: include description (optional, ≤ 300 chars). Do NOT send rating (server-calculated/read-only).
  createTrip: (token: string, data: {
    name: string;
    countries: string[];
    startDate?: string | null;
    endDate?: string | null;
    visibility: number; // enum: 0=Private,1=Members,2=Public
    currencyCode?: string;
    invites?: string[];
    description?: string | null;
    vibe?: string | null;
  }) => {
    // Validate description length if present
    if (data.description && data.description.length > 300) {
      throw new Error('Description must be 300 characters or less.');
    }
    // Validate vibe length if present (same limits as description)
    if (data.vibe && data.vibe.length > 300) {
      throw new Error('Vibe must be 300 characters or less.');
    }
    // Never send rating from client
    return apiClient.post('/api/trips', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // GET /api/trips/{tripId}
  // Token is optional: published/shared trips are viewable without authentication.
  // Response: Trip object with description?: string | null, vibe?: string | null, rating?: number | null
  getTripById: (token: string | null | undefined, tripId: string) => apiClient.get(`/api/trips/${tripId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  }),

  // PUT /api/trips/{tripId} - update trip core + itinerary + docs/meta
  // TripUpdateDto: include description if updating. Do NOT send rating (server-calculated/read-only).
  updateTrip: (token: string, tripId: string, data: {
    trip: {
      id: string;
      name: string;
      status: 'DRAFT' | 'PUBLISHED';
      privacy: string;
      currency: string;
      startDate: string;
      endDate: string;
      generatedAt: string;
      targetNights: number;
      totalNights: number;
      geocodedDestinations: number;
      legCount: number;
      routeDistanceKm: number;
      importantNotes?: string;
      photoUrl?: string;
      countries?: string[];
      description?: string | null;
      vibe?: string | null;
      // rating?: number | null; // Do NOT send rating from client
    };
    itinerary: Array<{
      id: string;
      name: string;
      title?: string | null;
      startDate: string;
      endDate: string;
      nights: number;
      lat?: number;
      lng?: number;
      placeId?: string;
      transport?: string;
      budget?: number;
      category?: string;
      completed?: boolean;
      photoUrl?: string;
      notes?: string;
      stay?: { name?: string; reference?: string; notes?: string };
      stays?: Array<{ id: string; name?: string; reference?: string }>;
      stayNotes?: string;
      spots: Array<{ id:string; name:string; placeId?:string; checked:boolean; photoUrl?:string; description?:string; mapUrl?:string; known?:boolean }>;
      foods: Array<{ id:string; name:string; checked:boolean; known?:boolean }>;
      docs: Array<{ id:string; originalName:string; mimeType:string; url?:string }>;
    }>;
    legs: Array<{ fromId:string; toId:string; mode:string; distanceKm:number|null; from:{lat?:number; lng?:number}; to:{lat?:number; lng?:number} }>;
    expenses: any[];
    budget: number | null | undefined;
    comments: any[];
    pinnedDocIds: string[];
    globalDocs: Array<{ id:string; originalName:string; mimeType:string }>;
    visaDocs: Array<{ id:string; originalName:string; mimeType:string }>;
    destinationDocsCount: number;
    version: number;
    description?: string | null;
    vibe?: string | null;
    // rating?: number | null; // Do NOT send rating from client
  }) => {
    // Validate description length if present
    if (data.trip?.description && data.trip.description.length > 300) {
      throw new Error('Description must be 300 characters or less.');
    }
    // Validate vibe length if present (same limits as description)
    if (data.trip?.vibe && data.trip.vibe.length > 300) {
      throw new Error('Vibe must be 300 characters or less.');
    }
    // Never send rating from client
    return apiClient.put(`/api/trips/${tripId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // PATCH /api/trips/{tripId}/visibility
  // Backend enum: Members=0, Private=1, Everyone=2, ReadOnly=3 (serialised as string names)
  changeTripVisibility: (token: string, tripId: string, data: { visibility: 'Members' | 'Private' | 'Everyone' | 'ReadOnly' }) =>
    apiClient.patch(`/api/trips/${tripId}/visibility`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/{tripId}/published ,check published status
  getTripPublishedStatus: (token: string, tripId: string) =>
    apiClient.get(`/api/trips/${tripId}/published`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // PATCH /api/trips/{tripId}/publish ,publish or unpublish (owner only)
  setTripPublished: (token: string, tripId: string, published: boolean) =>
    apiClient.patch(`/api/trips/${tripId}/publish`, { published }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // DELETE /api/trips/{tripId}
  deleteTrip: (token: string, tripId: string) => apiClient.delete(`/api/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // POST /api/trips/{tripId}/clone ,clone a published/public trip into a new private draft
  cloneTrip: (token: string, tripId: string) =>
    apiClient.post<{ tripId: string }>(`/api/trips/${tripId}/clone`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/vibe-passport ,authenticated user's vibe breakdown (no extra params needed)
  getVibePassport: (token: string) =>
    apiClient.get<{
      vibes: Array<{ name: string; count: number; percentage: number }>;
      topCountries: string[];
      totalNights: number;
      totalTrips: number;
      favoriteVibe: string | null;
    }>('/api/trips/vibe-passport', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/crew ,find travelers whose published trips match destination/vibe
  getTravelersCrew: (destination?: string, vibe?: string, month?: number) => {
    const params = new URLSearchParams();
    if (destination) params.set('destination', destination);
    if (vibe) params.set('vibe', vibe);
    if (month) params.set('month', String(month));
    return apiClient.get<Array<{
      userId: number;
      name: string;
      avatar: string | null;
      destinations: string[];
      vibe: string | null;
      tripCount: number;
    }>>(`/api/trips/crew${params.toString() ? '?' + params.toString() : ''}`);
  },

  // PATCH /api/trips/{tripId}/status ,set trip lifecycle status (0=Planning, 1=Active, 2=Completed)
  setTripStatus: (token: string, tripId: string, status: 0 | 1 | 2) =>
    apiClient.patch(`/api/trips/${tripId}/status`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/{tripId}/postcards ,public postcard list for a trip
  getTripPostcards: (tripId: string) =>
    apiClient.get<Array<{
      id: string; tripId: string; caption: string; photoUrl: string | null;
      location: string | null; createdAt: string; authorName: string; authorAvatar: string | null;
    }>>(`/api/trips/${tripId}/postcards`),

  // POST /api/trips/{tripId}/postcards ,create a new postcard (trip must be Active)
  createPostcard: (token: string, tripId: string, dto: { caption: string; photoUrl?: string; location?: string }) =>
    apiClient.post<{ id: string }>(`/api/trips/${tripId}/postcards`, dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // POST /api/trips/{tripId}/publish-as-template ,mark a trip as a community template (owner only)
  publishAsTemplate: (token: string, tripId: string) =>
    apiClient.post(`/api/trips/${tripId}/publish-as-template`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/templates ,community template library (public)
  getTemplates: () =>
    apiClient.get<Array<{
      id: string; name: string; description?: string; vibe?: string;
      countries?: string[]; cloneCount: number;
      owner: { name: string; profilePicture?: string };
      isTemplate: boolean;
    }>>('/api/trips/templates'),

  // PUT /api/trips/{tripId}/settings - settings update (DTO-compatible: name, visibility, dates, countries, bannerPhotoId, description)
  // Do NOT send rating from client
  updateTripSettings: (token: string, tripId: string, data: {
    name?: string;
    description?: string | null;
    vibe?: string | null;
    visibility?: string;
    startDate?: string;
    endDate?: string;
    countries?: string[];
    bannerPhotoId?: string;
    privacy?: string;
    photoUrl?: string;
    // rating?: number | null; // Do NOT send rating from client
  }) => {
    if (data.description && data.description.length > 300) {
      throw new Error('Description must be 300 characters or less.');
    }
    if (data.vibe && data.vibe.length > 300) {
      throw new Error('Vibe must be 300 characters or less.');
    }
    // Never send rating from client
    return apiClient.put(`/api/trips/${tripId}/settings`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
  // GET /api/users/search?q=xxx ,real user search
  searchUsers: (q: string, take = 20) =>
    apiClient.get<Array<{ id: number; name: string; email: string; country: string | null; avatar: string | null }>>
      (`/api/users/search?q=${encodeURIComponent(q)}&take=${take}`),

  searchUsersByName: (token: string, q: string, take = 20) =>
    apiClient.get<Array<{ id: number; name?: string; fname?: string; lname?: string; email: string; country: string | null; avatar: string | null }>>
      (`/api/users/search?q=${encodeURIComponent(q)}&take=${take}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((resp) => ({
        ...resp,
        data: resp.data.map((user) => {
          const [firstName = '', ...lastNameParts] = (user.name || '').trim().split(/\s+/).filter(Boolean);
          return {
            id: user.id,
            fname: user.fname || firstName,
            lname: user.lname || lastNameParts.join(' '),
            email: user.email,
            country: user.country || undefined,
            avatar: user.avatar || undefined,
          };
        }),
      })),

  // GET /api/users/{userId} ,public profile by ID
  getUserById: (userId: number) =>
    apiClient.get<{ id: number; name: string; avatar: string | null; cover: string | null; country: string | null; location: string | null; website: string | null; instagram: string | null; twitter: string | null; facebook: string | null }>
      (`/api/users/${userId}`),

  // POST /api/follow/{followeeId} ,follow a user (JWT resolves follower)
  followUser: (token: string, followeeId: number) =>
    apiClient.post(`/api/follow/${followeeId}`, {}, { headers: { Authorization: `Bearer ${token}` } }),

  // DELETE /api/follow/{followeeId} ,unfollow a user
  unfollowUser: (token: string, followeeId: number) =>
    apiClient.delete(`/api/follow/${followeeId}`, { headers: { Authorization: `Bearer ${token}` } }),

  // GET /api/follow/{userId}/stats ,follower/following counts
  getFollowStats: (userId: number) =>
    apiClient.get<{ followers: number; following: number }>(`/api/follow/${userId}/stats`),

  // GET /api/follow/{userId}/followers ,list of followers
  getFollowers: (userId: number) =>
    apiClient.get<Array<{ userId: number; name: string; avatar: string | null }>>(`/api/follow/${userId}/followers`),

  // GET /api/follow/{userId}/following ,list of following
  getFollowing: (userId: number) =>
    apiClient.get<Array<{ userId: number; name: string; avatar: string | null }>>(`/api/follow/${userId}/following`),

  // GET /api/follow/is-following/{followeeId} ,is current user following?
  isFollowing: (token: string, followeeId: number) =>
    apiClient.get<{ isFollowing: boolean }>(`/api/follow/is-following/${followeeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /user-profiles/{userEmail} - search user by email (legacy)
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

  // ------------------------------------------------------------
  // Trip Comments
  // GET /api/trips/{tripId}/comments — public for published trips; token optional
  getTripComments: (token: string | null | undefined, tripId: string) =>
    apiClient.get(`/api/trips/${tripId}/comments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }),
  // POST /api/trips/{tripId}/comments
  createTripComment: (token: string, tripId: string, content: string, parentCommentId?: string) =>
    apiClient.post(`/api/trips/${tripId}/comments`, { content, parentCommentId: parentCommentId ?? null }, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // PUT /api/trips/{tripId}/comments/{commentId}
  updateTripComment: (token: string, tripId: string, commentId: string, content: string) =>
    apiClient.put(`/api/trips/${tripId}/comments/${commentId}`, { content }, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  // DELETE /api/trips/{tripId}/comments/{commentId}
  deleteTripComment: (token: string, tripId: string, commentId: string) =>
    apiClient.delete(`/api/trips/${tripId}/comments/${commentId}`, {
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
    Bio?: { highlights: { key: string; label: string; value: string; icon: string; }[] };
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

  // ------------------------------------------------------------
  // Profile Photo Upload / Remove (Cloudinary signed upload)
  // POST /api/uploads/get-profile-upload-url
  getProfileUploadUrl: (token: string, userId: string) =>
    apiClient.post('/api/uploads/get-profile-upload-url', { UserId: userId }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // POST /api/uploads/get-cover-upload-url
  getCoverUploadUrl: (token: string, userId: string) =>
    apiClient.post('/api/uploads/get-cover-upload-url', { UserId: userId }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // DELETE /api/uploads/profile-photo/{userId}
  removeProfilePhoto: (token: string, userId: number) =>
    apiClient.delete(`/api/uploads/profile-photo/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // DELETE /api/uploads/cover-photo/{userId}
  removeCoverPhoto: (token: string, userId: number) =>
    apiClient.delete(`/api/uploads/cover-photo/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // PATCH /api/profile/settings/cover-picture
  saveCoverPictureUrl: (token: string, coverPictureUrl: string) =>
    apiClient.patch('/api/profile/settings/cover-picture', { CoverPictureUrl: coverPictureUrl }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // PATCH /api/profile/settings/profile-picture
  // Persists the Cloudinary URL to the DB after a direct upload
  saveProfilePictureUrl: (token: string, profilePictureUrl: string) =>
    apiClient.patch('/api/profile/settings/profile-picture', { ProfilePictureUrl: profilePictureUrl }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  
  // ------------------------------------------------------------
  // Trip Banner Upload / Default Banner (Cloudinary signed upload)

  // POST /api/uploads/get-trip-banner-upload-url
  // Returns Cloudinary signed upload params + direct upload URL + final fileUrl
  getTripBannerUploadUrl: (token: string, tripId: string) =>
    apiClient.post(
      "/api/uploads/get-trip-banner-upload-url",
      { TripId: tripId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    ),

  // POST /api/uploads/default-trip-banner/{tripId}
  // Restores the default banner image and updates the trip
  defaultTripBanner: (token: string, tripId: string) =>
    apiClient.post(
      `/api/uploads/default-trip-banner/${tripId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    ),

  // PATCH /api/trips/{tripId}/banner
  // Persists the uploaded banner URL to the trip after Cloudinary upload
  saveTripBannerUrl: (
    token: string,
    tripId: string,
    bannerUrl: string
  ) =>
    apiClient.patch(
      `/api/trips/${tripId}/banner`,
      {
        BannerPictureUrl: bannerUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    ),

  // ------------------------------------------------------------
  // Account Deletion
  // DELETE /auth/account
  deleteAccount: (token: string) =>
    apiClient.delete('/auth/account', {
      headers: { Authorization: `Bearer ${token}` }
    }),

    // ----------------------------------------------------------
    // Notifications
    // GET /api/notifications
    getNotifications: (
      token: string,
      page: number = 1,
      pageSize: number = 20
    ) =>
      apiClient.get(
        `/api/notifications?page=${page}&pageSize=${pageSize}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ),

    getUnreadNotificationCount: (token: string) =>
      apiClient.get(
        '/api/notifications/unread-count',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ),

    markNotificationAsRead: (
      token: string,
      notificationId: string
    ) =>
      apiClient.patch(
        `/api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ),

    markAllNotificationsAsRead: (token: string) =>
      apiClient.patch(
        '/api/notifications/read-all',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ),
};
