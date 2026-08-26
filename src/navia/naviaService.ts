// naviaService.ts - SSE streaming client for Navia AI
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function errorMessageForStatus(status: number): string {
  if (status === 401 || status === 403) return 'Please sign in to use Navia.';
  if (status === 400) return '⚠️ Navia needs a bit more context to help you. Try opening a trip and chatting from there!';
  if (status === 402) return "You've used all your Navia credits. Top-ups are on the way, see Settings → Credits for your balance and usage.";
  if (status === 404) return 'z z z z z... 💤\n\nNavia is sleeping right now. Come back a little later and I\'ll be ready to plan your next adventure!';
  if (status === 429) return '⏳ Navia needs a breather - you\'ve hit the hourly limit. Try again in a little while!';
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
    yield "📡 Whoops! Can't find Navia - looks like she wandered off the network. Check your connection and try again!";
    return;
  }

  if (!response.ok) {
    console.error(`[Navia] HTTP ${response.status} from ${endpoint}`);
    const serverMessage = await readErrorBody(response);
    yield serverMessage || errorMessageForStatus(response.status);
    return;
  }

  if (!response.body) {
    yield '🫙 Navia sent back an empty reply - like an empty suitcase. Try again!';
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
 * Structured JSON plan for one destination stop (spots, foods, journal - no lodging).
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

// ─── Chat → trip (one-click conversion from the home chat) ──────────────────

export interface ChatTripSpot {
  name: string;
  description: string;
}

export interface ChatTripStop {
  name: string;
  nights: number;
  spots: ChatTripSpot[];
  foods: string[];
  notes: string;
}

export interface ChatTripExtract {
  name: string;
  countries: string[];
  vibe: string | null;
  stops: ChatTripStop[];
}

/**
 * Turns a plan from the Navia chat into structured trip data (free, the chat
 * that produced the plan already cost credits).
 */
export async function extractTripFromChat(
  planText: string,
  userPrompt: string | undefined,
  token?: string | null,
): Promise<ChatTripExtract> {
  return postNaviaJson<ChatTripExtract>('/api/navia/chat-to-trip', { planText, userPrompt }, token);
}

export interface DraftTripFromPrompt {
  name: string;
  countries: string[];
  vibe: string | null;
  /** Total nights, always >= 1. */
  nights: number;
  /** yyyy-MM-dd when the request implied timing, else null. */
  startDate: string | null;
}

/**
 * Reads a one-line request ("weekend in Rome") into a trip skeleton the client
 * can create a trip from.
 *
 * This is only the shape of the trip. The route and the places still come from
 * suggest-itinerary and plan-destination once the planner opens - which is what
 * makes a one-sentence trip identical to one built through the create dialog,
 * rather than a second, thinner generation path.
 *
 * Costs 1 personal credit; the trip does not exist yet, so there is no trip
 * wallet to bill.
 */
export async function draftTripFromPrompt(
  prompt: string,
  token?: string | null,
): Promise<DraftTripFromPrompt> {
  return postNaviaJson<DraftTripFromPrompt>('/api/navia/draft-trip', { prompt }, token);
}

export interface ImportedSpot {
  name: string;
  description: string;
  /** True only where the traveller's own plan marked it. Never our judgement. */
  mustVisit: boolean;
}

export interface ImportedStay {
  name: string;
  reference: string;
}

export interface ImportedStop {
  name: string;
  nights: number;
  notes: string;
  spots: ImportedSpot[];
  foods: string[];
  stays: ImportedStay[];
}

export interface ImportedChecklistItem {
  category: string;
  name: string;
  qty: number;
}

export interface ImportedExpense {
  label: string;
  amount: number;
  category: string;
}

export interface ImportedPlan {
  name: string;
  countries: string[];
  vibe: string | null;
  /** yyyy-MM-dd only where the plan states one. Never guessed. */
  startDate: string | null;
  currency: string | null;
  importantNotes: string;
  stops: ImportedStop[];
  checklist: ImportedChecklistItem[];
  budget: number | null;
  expenses: ImportedExpense[];
  /** Lines that are not stops, places or costs: tasks, questions, debts, links. */
  unplaced: string[];
}

/** At most five, and the server refuses a sixth. Groq's per-request ceiling. */
export const IMPORT_MAX_IMAGES = 5;

/**
 * Reads a plan the traveller already wrote elsewhere.
 *
 * Images are base64 data URLs, sent inside this request and stored nowhere. A
 * WhatsApp screenshot carries other people's messages and numbers, so the only
 * honest way to handle one is not to keep it.
 *
 * Costs 3 personal credits. One call however many images, so a five-screenshot
 * import is billed and rate-limited the same as a one-screenshot import.
 */
export async function importPlan(
  images: string[],
  text: string,
  token?: string | null,
): Promise<ImportedPlan> {
  return postNaviaJson<ImportedPlan>('/api/navia/import-plan', { images, text }, token);
}

// Plan review used to be a model call that graded the model's own output. It is
// now pages/CreateTripPage/feasibility.ts - deterministic checks over real
// distances and opening hours, which cost nothing and cannot hallucinate.

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

/** One ledger row: positive delta = grant/refund, negative = spend. */
export interface NaviaCreditHistoryEntry {
  delta: number;
  action: string;
  createdAt: string;
}

export interface NaviaCreditHistory {
  wallet: NaviaCreditBalance;
  entries: NaviaCreditHistoryEntry[];
}

/** Personal wallet balance + recent activity, newest first. */
export async function fetchMyCreditHistory(token?: string | null, limit = 50): Promise<NaviaCreditHistory> {
  const data = await getNaviaJson<{ success: boolean; data: NaviaCreditHistory }>(
    `/api/navia/credits/me/history?limit=${limit}`, token);
  return data.data;
}

/** Human labels for ledger actions (mirrors backend action keys). */
export const CREDIT_ACTION_LABELS: Record<string, string> = {
  general_chat: 'Navia chat',
  trip_chat: 'Trip chat',
  trip_agent_mention: '@navia proposal',
  plan_destination: 'Destination plan',
  suggest_itinerary: 'Route suggestion',
  trip_brief: 'Trip brief',
  // Plan review no longer costs credits, but old ledger rows still reference it -
  // keep the label so past entries read as words rather than a raw action key.
  plan_review: 'Plan review',
  draft_trip: 'Quick plan',
  story_polish: 'Story proof-read',
  import_plan: 'Imported plan',
  trial_grant: 'Welcome credits',
  refund_general_chat: 'Refund · Navia chat',
  refund_trip_chat: 'Refund · trip chat',
  refund_plan_destination: 'Refund · destination plan',
  refund_suggest_itinerary: 'Refund · route suggestion',
  refund_trip_brief: 'Refund · trip brief',
  refund_plan_review: 'Refund · plan review',
  refund_draft_trip: 'Refund · quick plan',
  refund_story_polish: 'Refund · story proof-read',
  refund_import_plan: 'Refund · imported plan',
};

export function creditActionLabel(action: string): string {
  return CREDIT_ACTION_LABELS[action]
    ?? action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/** What credits buy (mirrors backend NaviaCreditCosts). */
export const CREDIT_PRICES: { label: string; cost: number; wallet: 'personal' | 'trip' }[] = [
  { label: 'Navia chat message', cost: 1, wallet: 'personal' },
  { label: 'Trip chat message', cost: 1, wallet: 'trip' },
  { label: '@navia proposal in trip chat', cost: 2, wallet: 'trip' },
  { label: 'Drafting a stop', cost: 2, wallet: 'trip' },
  { label: 'Drafting a route', cost: 2, wallet: 'trip' },
  { label: 'Writing a trip description', cost: 1, wallet: 'trip' },
  { label: 'A trip from one sentence', cost: 1, wallet: 'personal' },
  { label: 'Proof-reading a story', cost: 1, wallet: 'personal' },
  { label: 'Importing a plan you already wrote', cost: 3, wallet: 'personal' },
];
