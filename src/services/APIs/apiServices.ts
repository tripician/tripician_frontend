// api/apiService.ts - This is the ONLY additional file you need
import axios from 'axios';
import type { TripPreferences } from '../../utils/tripPreferences';
import type {
  TripSeats, TripJoinRequest, UpdateTripSeatsDto, OrganiserRecord, PendingRequestsGroup,
} from '../../seats/types';
import type { Conversation, ConversationMessage } from '../../messages/types';
import type { TripAnnouncement } from '../../types/announcements';
import type {
  OperatorProfile, OperatorApplication, OperatorLead, OperatorLeadResult,
} from '../../operator/types';
import type {
  Organization, OrganizationAnnouncement, OrganizationMember, OrganizationPost, OrganizationPublic,
  OrganizationTrip, OrganizationWrite,
} from '../../organization/types';
import type {
  Plan, PlanList, StoryBookPriceList, StoryBookQuote, SubscriptionIntent, SubscriptionState,
} from '../../pricing/types';
import type {
  BookOrder, CreateBookOrderRequest, PaymentIntent, RazorpayResult,
} from '../../afterstory/book/types';
import { forceSignOut, getFreshToken } from '../auth/tokenService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Debug log once (safe in dev; minimal noise in prod)
if (typeof window !== 'undefined') {
   
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
apiClient.interceptors.request.use(async (config) => {
  try {
    const authHeader = (config.headers as any)?.Authorization || (config.headers as any)?.authorization || '<none>';
     
    console.debug('[apiServices] Request ->', config.method, config.url, 'baseURL=', config.baseURL, 'Authorization=', typeof authHeader === 'string' ? (authHeader.startsWith('Bearer ') ? `Bearer ${mask(authHeader.replace(/^Bearer\s*/i, ''))}` : mask(authHeader)) : authHeader);
  } catch (e) {
     
    console.warn('[apiServices] Request logging failed', e);
  }
  try {
    /*
     * Attach a FRESH token, overwriting whatever the caller passed.
     *
     * This used to only fill in a missing header, which made it dead code: every
     * one of the ~28 service methods below sets `Authorization` explicitly from a
     * token argument, so the condition never held and a stale token could never be
     * corrected here. Overwriting is what makes this interceptor authoritative, and
     * it is also why those `token` parameters do not need a 28-signature refactor:
     * they are now harmless, and they still serve as the "use exactly this token"
     * path that sign-in relies on immediately after storing one.
     *
     * `getFreshToken` returns null synchronously for a guest, so public browsing
     * pays no latency for this.
     */
    if (typeof window !== 'undefined') {
      const token = await getFreshToken();
      const headersAny = config.headers as any;
      if (token) {
        headersAny.Authorization = `Bearer ${token}`;
      }
    }
  } catch (attachErr) {
     
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

    /*
     * 401: refresh once, then retry once.
     *
     * The previous version could never fire. Its guard was `token && !hadAuth`, and
     * an expired-token 401 always had an Authorization header, so the only requests
     * it retried were ones that had never been authenticated in the first place. The
     * real case, "this token just expired", fell straight through to a rejected
     * promise, which is why an expired session showed a shell full of failing panels
     * and no way out.
     */
    if (error.response?.status === 401) {
      const reqUrl = originalConfig?.url;
      const serverCode = error.response?.data?.code;

      // Some 401s are not about expiry and a refresh cannot fix them. Retrying those
      // would burn a refresh and then sign the user out for the wrong reason.
      const unrefreshable = serverCode === 'MISSING_SUB_CLAIM' || serverCode === 'INVALID_TOKEN_TYPE';

      if (!unrefreshable && originalConfig) {
        try {
          if ((originalConfig as any)._authRetried) {
            // Already refreshed once for this request and still 401. The credential
            // is not going to start working; end the session deliberately, once.
             
            console.warn('[apiServices] 401 after refresh for', reqUrl, '- ending session');
            forceSignOut('token_expired');
          } else {
            (originalConfig as any)._authRetried = true;
            // Concurrent 401s all await the same in-flight refresh, so N failed
            // requests cause one token exchange, not N.
            const fresh = await getFreshToken({ force: true });
            if (fresh) {
              originalConfig.headers = { ...(originalConfig.headers || {}), Authorization: `Bearer ${fresh}` };
               
              console.debug('[apiServices] Retrying after token refresh for', reqUrl);
              return apiClient.request(originalConfig);
            }
            // getFreshToken returning null means the token service has already
            // decided what to do (sign out, or leave the session alone on a network
            // failure). Do not second-guess it here.
          }
        } catch (e) {
           
          console.warn('[apiServices] Error handling 401', e);
        }
      }

      // Kept for telemetry//debugging visibility.
      try { window.dispatchEvent(new CustomEvent('auth:401', { detail: { url: reqUrl, status: 401, code: serverCode } })); } catch {}
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
         
        console.warn('[apiServices] HTTPS connection refused - retrying via HTTP', { httpBase });
        return apiClient.request(originalConfig);
      } catch (retryErr) {
         
        console.error('[apiServices] Protocol fallback failed', retryErr);
      }
    }

    return Promise.reject(error);
  }
);

// Session/planner telemetry. Fire-and-forget: callers must swallow errors.
/**
 * The configured axios instance, for feature modules that keep their own service
 * file rather than adding methods here.
 *
 * Exported rather than re-created per module on purpose: the request interceptor
 * above is what attaches a fresh token, and the response interceptor is what
 * handles a 401 without eating the Auth0 refresh token. A second axios instance
 * would silently miss both, and the auth bugs that produces are the expensive
 * kind to find.
 */
export { apiClient };

export const telemetryAPI = {
  heartbeat: (clientSessionId: string, plannerTripId?: string | null) =>
    apiClient.post('/api/telemetry/heartbeat', {
      clientSessionId,
      plannerTripId: plannerTripId ?? null,
    }),

  // Final flush when the tab hides/closes. Raw fetch because axios has no
  // keepalive; the request must be allowed to outlive the page.
  //
  // Reads the stored token synchronously and does NOT refresh: `pagehide` cannot
  // await anything, so there is no opportunity to. A dropped heartbeat when the
  // token happened to expire is an acceptable loss for a telemetry ping, and it is
  // the only request in the app deliberately outside the refresh path.
  flush: (clientSessionId: string, plannerTripId?: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      fetch(`${API_BASE_URL}/api/telemetry/heartbeat`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientSessionId, plannerTripId: plannerTripId ?? null }),
      }).catch(() => {});
    } catch {
      // never let telemetry surface an error
    }
  },
};

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

  // GET /api/trips/liked - trips the current user has liked. These are other
  // people's trips, so they can never be derived from the dashboard payload.
  getLikedTrips: (token: string) =>
    apiClient.get('/api/trips/liked', {
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
    /** Which planner surface the trip opens in. Omitted => Easy (the server default). */
    plannerMode?: 'Easy' | 'Advanced';
    /**
     * The create dialog's mood answers. Stored on the trip and read server-side by
     * every generative Navia call, so the first draft is already informed.
     * Omitted by the one-sentence shortcut, which has nothing to send.
     */
    preferences?: TripPreferences;
    /** The organisation running this trip. The server ignores it unless you admin that organisation. */
    organizationId?: string;
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
      /**
       * Publishing does NOT belong to this endpoint and must not be sent here.
       *
       * The server used to write `trip.Published` from this string whenever it was
       * non-blank, and its permission bar is owner OR any active member, unlike
       * PATCH /publish which is owner-only. So a client that filled this in could
       * publish or unpublish someone else's trip as a mere member. The planner never
       * sent it, and the server no longer reads it. Use `setTripPublished`.
       */
      status?: never;
      /**
       * Visibility does not belong here either. It is derived from the published
       * state and set explicitly by `changeTripVisibility`; sending it from a plan
       * save is what silently dropped published trips out of the public listing.
       * Omitted leaves the stored visibility untouched.
       */
      privacy?: never;
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
      /** Easy | Advanced. Omitted leaves the stored mode untouched. */
      plannerMode?: 'Easy' | 'Advanced';
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

  // GET /api/trips/{tripId}/published - check published status
  getTripPublishedStatus: (token: string, tripId: string) =>
    apiClient.get(`/api/trips/${tripId}/published`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // PATCH /api/trips/{tripId}/publish - publish or unpublish (owner only)
  setTripPublished: (token: string, tripId: string, published: boolean) =>
    apiClient.patch(`/api/trips/${tripId}/publish`, { published }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // DELETE /api/trips/{tripId}
  deleteTrip: (token: string, tripId: string) => apiClient.delete(`/api/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // POST /api/trips/{tripId}/clone - clone a published/public trip into a new private draft
  cloneTrip: (token: string, tripId: string) =>
    apiClient.post<{ tripId: string }>(`/api/trips/${tripId}/clone`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/vibe-passport - authenticated user's vibe breakdown (no extra params needed)
  getVibePassport: (token: string) =>
    apiClient.get<{
      vibes: Array<{ name: string; count: number; percentage: number }>;
      topCountries: string[];
      countriesVisited: number;
      tripsTravelled: number;
      nightsTravelled: number;
      tripsPlanned: number;
      totalNights: number;
      totalTrips: number;
      favoriteVibe: string | null;
    }>('/api/trips/vibe-passport', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/crew - the public traveller roster.
  // `q` searches names and published countries in one field. `publishedOnly`
  // narrows to people who have actually published a trip - the directory browses
  // with it on and searches with it off, so an idle page shows people worth
  // seeing while a search still reaches every member.
  getTravelersCrew: (
    destination?: string,
    vibe?: string,
    month?: number,
    publishedOnly?: boolean,
    q?: string,
  ) => {
    const params = new URLSearchParams();
    if (destination) params.set('destination', destination);
    if (vibe) params.set('vibe', vibe);
    if (month) params.set('month', String(month));
    if (publishedOnly) params.set('publishedOnly', 'true');
    if (q) params.set('q', q);
    return apiClient.get<Array<{
      userId: number;
      name: string;
      avatar: string | null;
      destinations: string[];
      vibe: string | null;
      tripCount: number;
    }>>(`/api/trips/crew${params.toString() ? '?' + params.toString() : ''}`);
  },

  // PATCH /api/trips/{tripId}/status - set trip lifecycle status (0=Planning, 1=Active, 2=Completed)
  setTripStatus: (token: string, tripId: string, status: 0 | 1 | 2) =>
    apiClient.patch(`/api/trips/${tripId}/status`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Operators ───────────────────────────────────────────────────────────
  // Tripician hands over consenting leads and charges for that. It never takes
  // the fare: the traveller pays on the operator's own site.

  getMyOperatorProfile: (token: string) =>
    apiClient.get<OperatorProfile | null>('/api/operator/me', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  applyAsOperator: (token: string, dto: OperatorApplication) =>
    apiClient.post('/api/operator/apply', dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getOperatorLeads: (token: string) =>
    apiClient.get<OperatorLead[]>('/api/operator/leads', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  setLeadStatus: (token: string, leadId: string, status: string) =>
    apiClient.patch(`/api/operator/leads/${leadId}`, { status }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Requires explicit consent: this discloses the traveller's name and email.
  enquireAboutTrip: (token: string, tripId: string, dto: { consent: boolean; partySize: number; message?: string }) =>
    apiClient.post<OperatorLeadResult>(`/api/trips/${tripId}/enquire`, dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Subscriptions ───────────────────────────────────────────────────────
  // No amount crosses this boundary either. The caller names a plan and a
  // billing period; the price comes from configuration.

  getMySubscription: (token: string, organizationId?: string) =>
    apiClient.get<SubscriptionState>(
      `/api/subscriptions/me${organizationId ? `?organizationId=${organizationId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),

  createSubscription: (
    token: string,
    dto: { planId: string; annual: boolean; organizationId?: string; promoCode?: string },
  ) =>
    apiClient.post<SubscriptionIntent>('/api/subscriptions', dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  cancelSubscription: (token: string, organizationId?: string) =>
    apiClient.post('/api/subscriptions/cancel', { organizationId }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Story Book orders and payment ───────────────────────────────────────
  // Note what createBookPayment does NOT send: an amount. The figure charged
  // comes from the order the server priced and stored.

  createBookOrder: (token: string, dto: CreateBookOrderRequest) =>
    apiClient.post<{ orderId: string; status: string; total: number; currency: string }>(
      '/api/book-orders', dto, {
        headers: { Authorization: `Bearer ${token}` }
      }),

  getBookOrder: (token: string, orderId: string) =>
    apiClient.get<BookOrder>(`/api/book-orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  approveBookPreview: (token: string, orderId: string) =>
    apiClient.post(`/api/book-orders/${orderId}/approve-preview`, null, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  createBookPayment: (token: string, orderId: string) =>
    apiClient.post<PaymentIntent>(`/api/book-orders/${orderId}/payment`, null, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  verifyBookPayment: (token: string, orderId: string, result: RazorpayResult) =>
    apiClient.post(`/api/book-orders/${orderId}/payment/verify`, {
      razorpayOrderId: result.razorpay_order_id,
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Pricing ─────────────────────────────────────────────────────────────
  // Plans and the book price list are public: somebody deciding whether to
  // sign up has to be able to see what things cost without signing up first.

  getPlans: () => apiClient.get<PlanList>('/api/pricing/plans'),

  getStoryBookPrices: () => apiClient.get<StoryBookPriceList>('/api/pricing/story-book'),

  getMyPlan: (token: string) =>
    apiClient.get<Plan>('/api/pricing/me', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Renders the book to measure it, so call this once at checkout.
  //
  // The destination is required, not optional: delivery is quoted from the
  // printer for that address, and the server refuses to price a book it cannot
  // work out the postage for.
  getStoryBookQuote: (
    token: string, storyId: string, country: string, postCode: string,
    quantity = 1, promoCode?: string,
  ) =>
    apiClient.get<StoryBookQuote>(
      `/api/pricing/story-book/${storyId}/quote?quantity=${quantity}`
      + `&country=${encodeURIComponent(country)}&postCode=${encodeURIComponent(postCode)}`
      + (promoCode ? `&promoCode=${encodeURIComponent(promoCode)}` : ''), {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Organizations ───────────────────────────────────────────────────────
  // Roles are resolved server side from membership. Nothing here is trusted.

  getMyOrganizations: (token: string) =>
    apiClient.get<Organization[]>('/api/organizations/mine', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getOrganization: (token: string, organizationId: string) =>
    apiClient.get<Organization>(`/api/organizations/${organizationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getPublicOrganization: (slug: string) =>
    apiClient.get<OrganizationPublic>(`/api/organizations/by-slug/${encodeURIComponent(slug)}`),

  createOrganization: (token: string, dto: OrganizationWrite) =>
    apiClient.post<Organization>('/api/organizations', dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  updateOrganization: (token: string, organizationId: string, dto: OrganizationWrite) =>
    apiClient.patch(`/api/organizations/${organizationId}`, dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getOrganizationMembers: (token: string, organizationId: string) =>
    apiClient.get<OrganizationMember[]>(`/api/organizations/${organizationId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  addOrganizationMember: (token: string, organizationId: string, userId: number, role: string) =>
    apiClient.post(`/api/organizations/${organizationId}/members`, { userId, role }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  setOrganizationMemberRole: (token: string, organizationId: string, userId: number, role: string) =>
    apiClient.patch(`/api/organizations/${organizationId}/members/${userId}`, { role }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  removeOrganizationMember: (token: string, organizationId: string, userId: number) =>
    apiClient.delete(`/api/organizations/${organizationId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Identity verification ───────────────────────────────────────────────

  getVerificationState: (token: string) =>
    apiClient.get<{ verified: boolean; status: string; gateEnabled: boolean }>(
      '/api/identity-verification/me',
      { headers: { Authorization: `Bearer ${token}` } }),

  startVerification: (token: string) =>
    apiClient.post<{ url: string }>('/api/identity-verification/start', {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Seats ───────────────────────────────────────────────────────────────
  // Recruiting travellers onto a trip. No money moves through any of these:
  // `pricePerPerson` is a figure the organiser states and the group settles
  // between themselves.

  // GET /api/trips/{tripId}/seats - public shape when anonymous
  getTripSeats: (token: string | null | undefined, tripId: string) =>
    apiClient.get<TripSeats>(`/api/trips/${tripId}/seats`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),

  // PUT /api/trips/{tripId}/seats - owner only. Omitted fields stay unchanged.
  updateTripSeats: (token: string, tripId: string, dto: UpdateTripSeatsDto) =>
    apiClient.put(`/api/trips/${tripId}/seats`, dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  requestToJoinTrip: (token: string, tripId: string, message?: string) =>
    apiClient.post(`/api/trips/${tripId}/join-requests`, { message: message ?? null }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  cancelJoinRequest: (token: string, tripId: string) =>
    apiClient.delete(`/api/trips/${tripId}/join-requests/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/{tripId}/join-requests - owner only; empty array for anyone else
  // GET /api/trips/join-requests/pending - every pending request across all trips
  // you own, grouped by trip. Not under {tripId}: the question is cross-trip.
  getPendingJoinRequests: (token: string) =>
    apiClient.get(`/api/trips/join-requests/pending`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getJoinRequests: (token: string, tripId: string) =>
    apiClient.get<TripJoinRequest[]>(`/api/trips/${tripId}/join-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  approveJoinRequest: (token: string, tripId: string, applicantUserId: number) =>
    apiClient.post(`/api/trips/${tripId}/join-requests/${applicantUserId}/approve`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  declineJoinRequest: (token: string, tripId: string, applicantUserId: number) =>
    apiClient.post(`/api/trips/${tripId}/join-requests/${applicantUserId}/decline`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Omit reportedUserId to report the listing itself rather than a person.
  reportTrip: (token: string, tripId: string, dto: { reason: string; detail?: string; reportedUserId?: number }) =>
    apiClient.post(`/api/trips/${tripId}/reports`, dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  removeTripMember: (token: string, tripId: string, targetUserId: number) =>
    apiClient.delete(`/api/trips/${tripId}/members/${targetUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Owner only. Appoints or stands down a trip admin.
  setTripMemberRole: (token: string, tripId: string, targetUserId: number, role: 'admin' | 'member') =>
    apiClient.patch(`/api/trips/${tripId}/members/${targetUserId}/role`, { role }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Owner only. The target must already be on the trip.
  transferTripOwnership: (token: string, tripId: string, userId: number) =>
    apiClient.post(`/api/trips/${tripId}/transfer-ownership`, { userId }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  getOrganizationTrips: (token: string, organizationId: string) =>
    apiClient.get<OrganizationTrip[]>(`/api/organizations/${organizationId}/trips`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  /** Puts an organisation member on one of its trips. Writes a real TripMembers row. */
  staffOrganizationTrip: (token: string, organizationId: string, tripId: string, userId: number, role: string) =>
    apiClient.post(`/api/organizations/${organizationId}/trips/${tripId}/members`, { userId, role }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  /*
   * The staff notice board. Internal, so unlike getOrganizationPosts below it
   * is never anonymous: a signed-out reader gets an empty list, not a 404.
   */
  getOrganizationAnnouncements: (organizationId: string) =>
    apiClient.get<OrganizationAnnouncement[]>(`/api/organizations/${organizationId}/announcements`),

  createOrganizationAnnouncement: (organizationId: string, body: string, pinned: boolean) =>
    apiClient.post<OrganizationAnnouncement>(
      `/api/organizations/${organizationId}/announcements`, { Body: body, Pinned: pinned }),

  updateOrganizationAnnouncement: (announcementId: string, patch: { Body?: string; Pinned?: boolean }) =>
    apiClient.put(`/api/organizations/announcements/${announcementId}`, patch),

  deleteOrganizationAnnouncement: (announcementId: string) =>
    apiClient.delete(`/api/organizations/announcements/${announcementId}`),

  /** Pending join requests across every trip the organisation runs, not just yours. */
  getOrganizationJoinRequests: (organizationId: string) =>
    apiClient.get<PendingRequestsGroup[]>(`/api/organizations/${organizationId}/join-requests`),

  getOrganizationPosts: (organizationId: string, take = 20) =>
    apiClient.get<OrganizationPost[]>(`/api/organizations/${organizationId}/posts?take=${take}`),

  createOrganizationPost: (
    token: string,
    organizationId: string,
    body: { body: string; imageUrl?: string | null; tripId?: string | null },
  ) =>
    apiClient.post<OrganizationPost>(`/api/organizations/${organizationId}/posts`, body, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  removeOrganizationPost: (token: string, organizationId: string, postId: string) =>
    apiClient.delete(`/api/organizations/${organizationId}/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // ── Announcements ───────────────────────────────────────────────────────
  // Members only, including the read: a published trip is world-readable but its
  // pickup times are not.

  getTripAnnouncements: (token: string, tripId: string) =>
    apiClient.get<TripAnnouncement[]>(`/api/trips/${tripId}/announcements`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  createTripAnnouncement: (token: string, tripId: string, body: string, pinned = false) =>
    apiClient.post<TripAnnouncement>(`/api/trips/${tripId}/announcements`, { body, pinned }, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  updateTripAnnouncement: (
    token: string,
    tripId: string,
    announcementId: string,
    patch: { body?: string; pinned?: boolean },
  ) =>
    apiClient.patch(`/api/trips/${tripId}/announcements/${announcementId}`, patch, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  deleteTripAnnouncement: (token: string, tripId: string, announcementId: string) =>
    apiClient.delete(`/api/trips/${tripId}/announcements/${announcementId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/{tripId}/postcards - public postcard list for a trip
  getTripPostcards: (tripId: string) =>
    apiClient.get<Array<{
      id: string; tripId: string; caption: string; photoUrl: string | null;
      location: string | null; createdAt: string; authorName: string; authorAvatar: string | null;
    }>>(`/api/trips/${tripId}/postcards`),

  // POST /api/trips/{tripId}/postcards - create a new postcard (trip must be Active)
  createPostcard: (token: string, tripId: string, dto: { caption: string; photoUrl?: string; location?: string }) =>
    apiClient.post<{ id: string }>(`/api/trips/${tripId}/postcards`, dto, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // POST /api/trips/{tripId}/publish-as-template - mark a trip as a community template (owner only)
  publishAsTemplate: (token: string, tripId: string) =>
    apiClient.post(`/api/trips/${tripId}/publish-as-template`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /api/trips/templates - community template library (public)
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
    /** Easy | Advanced. Omitted leaves the stored mode untouched. */
    plannerMode?: 'Easy' | 'Advanced';
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
  // GET /api/users/search?q=xxx - names loosely, email only on an exact match.
  // Authenticated, and the email that comes back is masked.
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

  // GET /api/users/{userId} - public profile by ID
  getUserById: (userId: number) =>
    apiClient.get<{ id: number; name: string; avatar: string | null; cover: string | null; country: string | null; location: string | null; website: string | null; instagram: string | null; twitter: string | null; facebook: string | null; bio?: { highlights?: Array<{ key?: string; label?: string; value?: string; icon?: string }> } | null; joinedAt?: string | null; identityVerifiedAt?: string | null }>
      (`/api/users/${userId}`),

  // GET /api/users/{userId}/track-record - what this organiser has actually run
  getOrganiserRecord: (userId: number) =>
    apiClient.get<OrganiserRecord>(`/api/users/${userId}/track-record`),

  // GET /api/users/{userId}/travel-map - countries, tiered, in the order reached
  getTravelMap: (userId: number) =>
    apiClient.get<{
      countries: Array<{ name: string; tier: 'locked' | 'unlocked' | 'gold'; firstAt: string | null; published?: boolean }>;
      legs: string[][];
    }>(`/api/users/${userId}/travel-map`),

  // POST /api/follow/{followeeId} - follow a user (JWT resolves follower)
  followUser: (token: string, followeeId: number) =>
    apiClient.post(`/api/follow/${followeeId}`, {}, { headers: { Authorization: `Bearer ${token}` } }),

  // DELETE /api/follow/{followeeId} - unfollow a user
  unfollowUser: (token: string, followeeId: number) =>
    apiClient.delete(`/api/follow/${followeeId}`, { headers: { Authorization: `Bearer ${token}` } }),

  // GET /api/follow/{userId}/stats - follower/following counts
  getFollowStats: (userId: number) =>
    apiClient.get<{ followers: number; following: number }>(`/api/follow/${userId}/stats`),

  // GET /api/follow/{userId}/followers - list of followers
  getFollowers: (userId: number) =>
    apiClient.get<Array<{ userId: number; name: string; avatar: string | null }>>(`/api/follow/${userId}/followers`),

  // GET /api/follow/{userId}/following - list of following
  getFollowing: (userId: number) =>
    apiClient.get<Array<{ userId: number; name: string; avatar: string | null }>>(`/api/follow/${userId}/following`),

  // GET /api/follow/is-following/{followeeId} - is current user following?
  isFollowing: (token: string, followeeId: number) =>
    apiClient.get<{ isFollowing: boolean }>(`/api/follow/is-following/${followeeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // GET /user-profiles/{userEmail} - search user by email (legacy)
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
  // GET /api/trips/{tripId}/comments - public for published trips; token optional
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
  // Removing a member is `removeTripMember` in the Seats block above. There was
  // a `removeTripUser` here pointing at DELETE /api/trips/{id}/users/{id}, which
  // no controller has ever served; it is gone rather than fixed, because the
  // seats endpoint already does the job properly.

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
    /** ISO 3166-1 alpha-2. The server drops anything that is not a real code. */
    Country?: string | null;
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
  /*
   * Per-type email preferences. Distinct from getNotificationSettings below,
   * which reads a table nothing in the product consumes.
   *
   * Only the types that actually send mail are listed, so a switch here always
   * governs something. The token comes from the interceptor.
   */
  /*
   * Private threads about one trip. The token comes from the interceptor.
   *
   * canMessage is separate from openConversation so the UI never renders a
   * button that fails on click, and so hovering a name costs no writes.
   */
  canMessage: (tripId: string, userId: number) =>
    apiClient.get<{ allowed: boolean; reason: string | null }>(
      '/api/conversations/can-message', { params: { tripId, userId } }),

  openConversation: (tripId: string, userId: number) =>
    apiClient.post<Conversation>('/api/conversations/open', { TripId: tripId, UserId: userId }),

  getConversations: () => apiClient.get<Conversation[]>('/api/conversations'),

  getConversationMessages: (conversationId: string) =>
    apiClient.get<ConversationMessage[]>(`/api/conversations/${conversationId}/messages`),

  sendConversationMessage: (conversationId: string, body: string) =>
    apiClient.post<ConversationMessage>(`/api/conversations/${conversationId}/messages`, { Body: body }),

  getConversationUnreadCount: () =>
    apiClient.get<{ count: number }>('/api/conversations/unread-count'),

  getNotificationPreferences: () =>
    apiClient.get<Array<{ type: number; name: string; email: boolean }>>(
      '/api/notifications/preferences',
    ),

  setNotificationPreference: (type: number, email: boolean) =>
    apiClient.put('/api/notifications/preferences', { Type: type, Email: email }),

  /** One-click unsubscribe from an email footer. Signed, and needs no session. */
  unsubscribeFromEmails: (u: number, t: number, k: string) =>
    apiClient.get<{ message: string }>('/api/notifications/unsubscribe', { params: { u, t, k } }),

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
