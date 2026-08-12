/**
 * What the traveller told us in the create dialog.
 *
 * These values are the point of that dialog. They are stored on the trip
 * (`TripExtras.PreferencesJson`) and read server-side by every generative Navia
 * call, so the string keys below are a contract with the backend prompts, not
 * display labels. Renaming a key changes what every stored trip means, exactly
 * like a vibe id or a country name. The labels live next to the UI instead.
 *
 * Pace does double duty: it also sets Reality check's usable hours per day, so a
 * traveller who told us they move slowly is not measured against a stranger's
 * idea of a full day.
 */

export type TripPace = 'slow' | 'balanced' | 'packed';
export type TripCompany = 'solo' | 'couple' | 'friends' | 'family';
export type TripDietary = 'none' | 'vegetarian' | 'vegan' | 'halal' | 'glutenFree';

export interface TripPreferences {
  pace: TripPace;
  company: TripCompany;
  /** Interest keys, see INTEREST_KEYS. Free-form on the wire, capped at 8 server-side. */
  interests: string[];
  dietary: TripDietary;
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

/**
 * The starting answers, and the reason none of these questions can block the
 * button. Every one is pre-answered with the most common case, so a traveller who
 * reads none of them still creates a trip carrying real values rather than nulls,
 * and one who cares spends a single tap per question.
 */
export const DEFAULT_TRIP_PREFERENCES: TripPreferences = {
  pace: 'balanced',
  company: 'solo',
  interests: [],
  dietary: 'none',
};

const PACE_VALUES: TripPace[] = ['slow', 'balanced', 'packed'];
const COMPANY_VALUES: TripCompany[] = ['solo', 'couple', 'friends', 'family'];
const DIETARY_VALUES: TripDietary[] = ['none', 'vegetarian', 'vegan', 'halal', 'glutenFree'];

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

/** Reads an unknown payload (API, localStorage, an older client) into a usable object. */
export function parseTripPreferences(value: unknown): TripPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  const pace = PACE_VALUES.find((p) => p === raw.pace);
  const company = COMPANY_VALUES.find((c) => c === raw.company);
  const dietary = DIETARY_VALUES.find((d) => d === raw.dietary);
  const interests = Array.isArray(raw.interests)
    ? raw.interests.filter((i): i is string => typeof i === 'string' && i.trim().length > 0).slice(0, 8)
    : [];

  // A payload with nothing recognisable in it is not preferences. Returning null
  // rather than the defaults keeps "we never asked" distinguishable from "they
  // answered with the defaults", which matters when deciding whether to prompt.
  if (!pace && !company && !dietary && interests.length === 0) return null;

  return {
    pace: pace ?? DEFAULT_TRIP_PREFERENCES.pace,
    company: company ?? DEFAULT_TRIP_PREFERENCES.company,
    interests,
    dietary: dietary ?? DEFAULT_TRIP_PREFERENCES.dietary,
  };
}
