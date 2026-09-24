/**
 * What the traveller told us when they created the trip.
 *
 * These values are stored on the trip (`TripExtras.PreferencesJson`) and read
 * server-side by every generative TripicianAI call, so the string keys below are a
 * contract with the backend prompts, not display labels. Renaming a key changes
 * what every stored trip means, exactly like a vibe id or a country name. The
 * labels live next to the UI instead.
 *
 * Pace does double duty: it also sets Reality check's usable hours per day, so a
 * traveller who told us they move slowly is not measured against a stranger's
 * idea of a full day.
 */

export type TripPace = 'slow' | 'balanced' | 'packed';
export type TripCompany = 'solo' | 'couple' | 'friends' | 'family' | 'group';
export type TripDietary = 'none' | 'vegetarian' | 'vegan' | 'halal' | 'glutenFree';
export type TripType = 'honeymoon' | 'solo' | 'friends' | 'group' | 'family';

/** Where the trip sets off from. Coordinates are optional: a name alone still reaches the prompts. */
export interface TripOrigin {
  name: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  country?: string;
}

// Every answer is optional: a question someone skipped must not reach a prompt as if they had answered it.
export interface TripPreferences {
  pace?: TripPace;
  company?: TripCompany;
  /** Interest keys, see INTEREST_KEYS. Free-form on the wire, capped at 8 server-side. */
  interests: string[];
  dietary?: TripDietary;
  origin?: TripOrigin;
  tripType?: TripType;
}

export const INTEREST_KEYS = [
  'food',
  'museums',
  'hiking',
  'nightlife',
  'markets',
  'beaches',
  'architecture',
  'wildlife',
] as const;

export type TripInterest = (typeof INTEREST_KEYS)[number];

const PACE_VALUES: TripPace[] = ['slow', 'balanced', 'packed'];
const COMPANY_VALUES: TripCompany[] = ['solo', 'couple', 'friends', 'family', 'group'];
const DIETARY_VALUES: TripDietary[] = ['none', 'vegetarian', 'vegan', 'halal', 'glutenFree'];
export const TRIP_TYPE_VALUES: TripType[] = ['solo', 'honeymoon', 'friends', 'family', 'group'];

/**
 * Sightseeing hours a day, by pace. Feasibility divides the day's visit durations
 * by this, so it is the difference between "this stop is overloaded" and "this is
 * a full but reasonable day".
 */
export const PACE_USABLE_HOURS: Record<TripPace, number> = {
  slow: 5,
  balanced: 8,
  packed: 11,
};

/** Who is going, for the prompts, from the kind of trip. A honeymoon is two people. */
export function companyForTripType(tripType: TripType): TripCompany {
  return tripType === 'honeymoon' ? 'couple' : tripType;
}

const finite = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined;

function parseOrigin(value: unknown): TripOrigin | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 120) : '';
  if (!name) return undefined;
  const lat = finite(raw.lat, -90, 90);
  const lng = finite(raw.lng, -180, 180);
  const origin: TripOrigin = { name };
  // A coordinate pair is kept whole or not at all.
  if (lat !== undefined && lng !== undefined) { origin.lat = lat; origin.lng = lng; }
  if (typeof raw.placeId === 'string' && raw.placeId.trim()) origin.placeId = raw.placeId.trim();
  if (typeof raw.country === 'string' && raw.country.trim()) origin.country = raw.country.trim().slice(0, 80);
  return origin;
}

/**
 * Reads an unknown payload (API, localStorage, an older client) into a usable object.
 * Keeps every key the server stores: the planner writes this object back on each save, so a key dropped here is erased there.
 */
export function parseTripPreferences(value: unknown): TripPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  const pace = PACE_VALUES.find((p) => p === raw.pace);
  const company = COMPANY_VALUES.find((c) => c === raw.company);
  const dietary = DIETARY_VALUES.find((d) => d === raw.dietary);
  const tripType = TRIP_TYPE_VALUES.find((t) => t === raw.tripType);
  const origin = parseOrigin(raw.origin);
  const interests = Array.isArray(raw.interests)
    ? raw.interests.filter((i): i is string => typeof i === 'string' && i.trim().length > 0).slice(0, 8)
    : [];

  // Nothing recognisable is not preferences: "we never asked" stays distinguishable from an answer.
  if (!pace && !company && !dietary && !tripType && !origin && interests.length === 0) return null;

  return {
    interests,
    ...(pace && { pace }),
    ...(company && { company }),
    ...(dietary && { dietary }),
    ...(origin && { origin }),
    ...(tripType && { tripType }),
  };
}
