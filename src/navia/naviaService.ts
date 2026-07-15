// naviaService.ts ,SSE streaming client for Navia AI
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function errorMessageForStatus(status: number): string {
  if (status === 401 || status === 403) return 'Please sign in to use Navia.';
  if (status === 400) return '⚠️ Navia needs a bit more context to help you. Try opening a trip and chatting from there!';
  if (status === 402) return '🪙 Out of Navia credits! A top-up option is coming soon.';
  if (status === 404) return 'z z z z z... 💤\n\nNavia is sleeping right now. Come back a little later and I\'ll be ready to plan your next adventure!';
  if (status === 429) return '⏳ Navia needs a breather — you\'ve hit the hourly limit. Try again in a little while!';
  if (status >= 500) return '😵 Navia bumped into something on the server. Give it a moment and try again!';
  return '🤔 Hmm, something went sideways. Try again in a sec!';
}

/** Pulls a human-readable message out of a non-OK response body when possible. */
async function readErrorBody(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.message === 'string' && parsed.message) return parsed.message;
    } catch {
      /* not JSON */
    }
    // Plain-text bodies from the rate limiter are already user-friendly.
    if (text.length < 300 && !text.startsWith('<')) return text;
    return null;
  } catch {
    return null;
  }
}

/**
 * Streams Navia AI response chunks via SSE.
 * Routes to /api/navia/chat when tripId is provided, otherwise /api/navia/general-chat.
 */
export interface NaviaHistoryMessage {
  role: 'user' | 'navia' | 'assistant';
  content: string;
}

export async function* streamNaviaResponse(
  tripId: string,
  userMessage: string,
  token?: string | null,
  history?: NaviaHistoryMessage[],
): AsyncGenerator<string> {
  const endpoint = tripId ? '/api/navia/chat' : '/api/navia/general-chat';
  const apiHistory = history
    ?.filter(m => m.content.trim())
    .map(m => ({
      role: m.role === 'navia' ? 'assistant' : m.role,
      content: m.content.trim(),
    }));
  const body = tripId
    ? { tripId, userMessage, history: apiHistory }
    : { userMessage, history: apiHistory };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    yield "📡 Whoops! Can't find Navia ,looks like she wandered off the network. Check your connection and try again!";
    return;
  }

  if (!response.ok) {
    console.error(`[Navia] HTTP ${response.status} from ${endpoint}`);
    const serverMessage = await readErrorBody(response);
    yield serverMessage || errorMessageForStatus(response.status);
    return;
  }

  if (!response.body) {
    yield '🫙 Navia sent back an empty reply ,like an empty suitcase. Try again!';
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        // Do NOT trim the payload: token whitespace is significant.
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);

        // Each SSE event carries a JSON envelope so newlines inside tokens
        // survive framing: {"d":"token"} | {"done":true} | {"error":"..."}
        try {
          const event = JSON.parse(data);
          if (event && typeof event === 'object') {
            if (typeof event.d === 'string') {
              yield event.d;
              continue;
            }
            if (event.done) return;
            if (typeof event.error === 'string') {
              yield event.error || 'An error occurred.';
              return;
            }
            continue;
          }
        } catch {
          /* fall through to legacy plain-text handling */
        }

        // Legacy framing (kept for older backends): raw text after "data: "
        if (data === '[DONE]') return;
        if (data.startsWith('[ERROR]')) {
          yield data.slice(7).trim() || 'An error occurred.';
          return;
        }
        yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface PlanDestinationSpot {
  name: string;
  description?: string;
}

export interface PlanDestinationFood {
  name: string;
}

export interface PlanDestinationResult {
  spots: PlanDestinationSpot[];
  foods: PlanDestinationFood[];
  journalNotes: string;
}

export interface PlanDestinationRequest {
  tripId: string;
  destinationName: string;
  planTitle?: string;
  lat?: number;
  lng?: number;
  nights?: number;
  category?: string;
  vibe?: string;
}

/**
 * Structured JSON plan for one destination stop (spots, foods, journal ,no lodging).
 */
/** Error carrying the HTTP status so callers can special-case 402 (credits) and 429 (rate limit). */
export class NaviaRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'NaviaRequestError';
    this.status = status;
  }
}

async function postNaviaJson<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const serverMessage = await readErrorBody(response);
    throw new NaviaRequestError(response.status, serverMessage || errorMessageForStatus(response.status));
  }

  return response.json() as Promise<T>;
}

export async function planDestination(
  request: PlanDestinationRequest,
  token?: string | null,
): Promise<PlanDestinationResult> {
  return postNaviaJson<PlanDestinationResult>('/api/navia/plan-destination', request, token);
}

export interface SuggestItineraryStop {
  name: string;
  nights: number;
}

export interface SuggestItineraryResult {
  stops: SuggestItineraryStop[];
}

export interface SuggestItineraryRequest {
  tripId: string;
  country: string;
  totalNights: number;
  vibe?: string;
}

/**
 * Asks Navia to break a country into an ordered multi-city route whose nights sum to totalNights.
 * Used by the "Generate with AI" flow so every day of the trip is covered with a real city.
 */
export async function suggestCountryItinerary(
  request: SuggestItineraryRequest,
  token?: string | null,
): Promise<SuggestItineraryResult> {
  return postNaviaJson<SuggestItineraryResult>('/api/navia/suggest-itinerary', request, token);
}

// ─── Trip brief (AI-written description) ────────────────────────────────────

export interface TripBriefResult {
  description: string;
  highlights: string[];
}

/** Asks Navia to write a shareable 2-3 sentence trip description + highlight phrases. */
export async function generateTripBrief(
  tripId: string,
  token?: string | null,
): Promise<TripBriefResult> {
  return postNaviaJson<TripBriefResult>('/api/navia/trip-brief', { tripId }, token);
}

// ─── Credits ────────────────────────────────────────────────────────────────

export interface NaviaCreditBalance {
  ownerType: 'user' | 'trip';
  ownerId: string;
  balance: number;
  totalGranted: number;
  totalSpent: number;
}

async function getNaviaJson<T>(path: string, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) {
    const serverMessage = await readErrorBody(response);
    throw new NaviaRequestError(response.status, serverMessage || errorMessageForStatus(response.status));
  }
  return response.json() as Promise<T>;
}

/** Personal wallet backing the home-page Navia chat. */
export async function fetchMyCredits(token?: string | null): Promise<NaviaCreditBalance> {
  const data = await getNaviaJson<{ success: boolean; data: NaviaCreditBalance }>('/api/navia/credits/me', token);
  return data.data;
}

/** Shared group wallet: every member's AI usage on the trip spends from it. */
export async function fetchTripCredits(tripId: string, token?: string | null): Promise<NaviaCreditBalance> {
  const data = await getNaviaJson<{ success: boolean; data: NaviaCreditBalance }>(`/api/navia/credits/trip/${tripId}`, token);
  return data.data;
}
