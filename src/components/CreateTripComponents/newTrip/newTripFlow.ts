import dayjs from 'dayjs';
import type { PickedPlace } from '../../places/pickedPlace';
import {
  companyForTripType, type TripDietary, type TripPreferences, type TripType,
} from '../../../utils/tripPreferences';
import { UNTITLED_TRIP_NAME } from '../../../utils/tripNames';

export type NewTripStep = 'origin' | 'places' | 'dates' | 'tripType' | 'food' | 'finish';

/** The guided path, one question per screen. */
export const GUIDED_STEPS: NewTripStep[] = ['origin', 'places', 'dates', 'tripType', 'food', 'finish'];

export const MAX_PLACES = 8;
export const MAX_NIGHTS = 60;
export const DEFAULT_NIGHTS = 5;

export interface NewTripState {
  step: NewTripStep;
  /** "I'll plan everything myself": dates only, then an untitled trip with no places. */
  blank: boolean;
  /** Where "I'll plan everything myself" was pressed, so Back returns there. */
  blankFrom: NewTripStep | null;
  origin: PickedPlace | null;
  places: PickedPlace[];
  /** YYYY-MM-DD */
  startDate: string | null;
  nights: number;
  tripType: TripType | null;
  dietary: TripDietary | null;
  name: string;
  nameEdited: boolean;
  organizationId: string | null;
  /** Carried from a prefill (a chat that already knew the vibe). */
  vibe: string | null;
  /** Which way the last move went, so the screens slide the right way. */
  dir: 1 | -1;
}

export type NewTripAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goBlank' }
  | { type: 'setOrigin'; place: PickedPlace | null }
  | { type: 'addPlace'; place: PickedPlace }
  | { type: 'removePlace'; placeId: string }
  | { type: 'setStart'; date: string | null }
  | { type: 'setNights'; nights: number }
  | { type: 'setTripType'; value: TripType | null }
  | { type: 'setDietary'; value: TripDietary | null }
  | { type: 'setName'; name: string }
  | { type: 'reset'; prefill?: unknown };

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Starting state. Reads the prefill defensively: some callers hand over a click event instead of a prefill. */
export function initialNewTripState(prefill?: unknown): NewTripState {
  const raw = prefill && typeof prefill === 'object' && !('nativeEvent' in prefill)
    ? (prefill as Record<string, unknown>)
    : {};
  const countries = Array.isArray(raw.countries) ? raw.countries.map(str).filter((c): c is string => !!c) : [];
  const name = str(raw.name);
  return {
    step: 'origin',
    blank: false,
    blankFrom: null,
    origin: null,
    places: countries.slice(0, MAX_PLACES).map((c) => ({ placeId: `country:${c.toLowerCase()}`, name: c, country: c, kind: 'country' as const })),
    startDate: null,
    nights: DEFAULT_NIGHTS,
    tripType: null,
    dietary: null,
    name: name ?? '',
    nameEdited: !!name,
    organizationId: str(raw.organizationId),
    vibe: str(raw.vibe),
    dir: 1,
  };
}

export function isValidDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).isValid();
}

/** Whether the current screen has what it needs. Trip type and food can always be skipped. */
export function canContinue(state: NewTripState): boolean {
  switch (state.step) {
    case 'origin': return state.origin !== null;
    case 'places': return state.places.length > 0;
    case 'dates': return isValidDate(state.startDate) && state.nights >= 1;
    default: return true;
  }
}

export function newTripReducer(state: NewTripState, action: NewTripAction): NewTripState {
  switch (action.type) {
    case 'next': {
      if (state.blank || !canContinue(state)) return state;
      const i = GUIDED_STEPS.indexOf(state.step);
      return i < GUIDED_STEPS.length - 1 ? { ...state, step: GUIDED_STEPS[i + 1], dir: 1 } : state;
    }
    case 'back': {
      if (state.blank) return { ...state, blank: false, step: state.blankFrom ?? 'origin', blankFrom: null, dir: -1 };
      const i = GUIDED_STEPS.indexOf(state.step);
      return i > 0 ? { ...state, step: GUIDED_STEPS[i - 1], dir: -1 } : state;
    }
    case 'goBlank':
      return { ...state, blank: true, blankFrom: state.step, step: 'dates', dir: 1 };
    case 'setOrigin':
      return { ...state, origin: action.place };
    case 'addPlace': {
      if (state.places.length >= MAX_PLACES) return state;
      if (state.places.some((p) => p.placeId === action.place.placeId)) return state;
      return { ...state, places: [...state.places, action.place] };
    }
    case 'removePlace':
      return { ...state, places: state.places.filter((p) => p.placeId !== action.placeId) };
    case 'setStart':
      return { ...state, startDate: action.date };
    case 'setNights':
      return { ...state, nights: Math.min(MAX_NIGHTS, Math.max(1, Math.round(action.nights) || 1)) };
    case 'setTripType':
      return { ...state, tripType: action.value };
    case 'setDietary':
      return { ...state, dietary: action.value };
    case 'setName':
      return { ...state, name: action.name.slice(0, 160), nameEdited: true };
    case 'reset':
      return initialNewTripState(action.prefill);
    default:
      return state;
  }
}

/** Country names in the order the places were picked, without repeats. */
export function derivedCountries(places: PickedPlace[]): string[] {
  const seen: string[] = [];
  for (const p of places) {
    const c = p.country?.trim();
    if (c && !seen.some((s) => s.toLowerCase() === c.toLowerCase())) seen.push(c);
  }
  return seen.slice(0, 8);
}

/** "Trip to Kyoto", "Kyoto & Osaka", "Kyoto, Osaka & more". Empty with no places. */
export function suggestTripName(places: PickedPlace[]): string {
  const names = places.map((p) => p.name.trim()).filter(Boolean);
  let name = '';
  if (names.length === 1) name = `Trip to ${names[0]}`;
  else if (names.length === 2) name = `${names[0]} & ${names[1]}`;
  else if (names.length > 2) name = `${names[0]}, ${names[1]} & more`;
  return name.slice(0, 80);
}

/** The name the trip will get: what they typed, else the suggestion, else "Untitled trip". Never empty. */
export function tripNameFor(state: NewTripState): string {
  if (state.nameEdited && state.name.trim()) return state.name.trim().slice(0, 160);
  return (state.blank ? '' : suggestTripName(state.places)) || UNTITLED_TRIP_NAME;
}

/** Nights shared across stops, the first ones taking the remainder; every stop gets at least one. */
export function splitNights(total: number, count: number): number[] {
  if (count <= 0) return [];
  const safe = Math.max(count, Math.round(total) || 0);
  const base = Math.floor(safe / count);
  const rem = safe - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
}

export function endDateFor(start: string | null, nights: number): string | null {
  return isValidDate(start) ? dayjs(start).add(Math.max(1, nights), 'day').format('YYYY-MM-DD') : null;
}

/** "Kyoto, Osaka" style list for the finish summary. */
export function placesLine(places: PickedPlace[]): string {
  if (places.length <= 3) return places.map((p) => p.name).join(', ');
  return `${places.slice(0, 2).map((p) => p.name).join(', ')} and ${places.length - 2} more`;
}

export type CreateMode = 'ai' | 'self' | 'blank';

export interface NewTripStopPayload {
  name: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  nights: number;
}

export interface NewTripPayload {
  name: string;
  description: string;
  countries: string[];
  startDate: string | null;
  endDate: string | null;
  visibility: 0;
  currencyCode: 'USD';
  vibe: string | null;
  invites: string[];
  preferences?: TripPreferences;
  stops?: NewTripStopPayload[];
  organizationId?: string;
}

/** The POST /api/trips body. Only answered questions go into preferences, so a skip never reads as an answer. */
export function buildCreatePayload(state: NewTripState, mode: CreateMode): NewTripPayload {
  const blank = mode === 'blank' || state.blank;
  const places = blank ? [] : state.places;
  const guided = !blank;

  const preferences: TripPreferences = { interests: [] };
  if (state.origin) {
    const o = state.origin;
    preferences.origin = {
      name: o.name,
      ...(o.lat !== undefined && o.lng !== undefined && { lat: o.lat, lng: o.lng }),
      ...(o.placeId && !o.placeId.startsWith('typed:') && { placeId: o.placeId }),
      ...(o.country && { country: o.country }),
    };
  }
  if (guided && state.tripType) {
    preferences.tripType = state.tripType;
    preferences.company = companyForTripType(state.tripType);
  }
  if (guided && state.dietary) preferences.dietary = state.dietary;
  const hasPreferences = !!(preferences.origin || preferences.tripType || preferences.dietary);

  // Whole countries plus "Plan it for me" send no stops, so TripicianAI picks the cities inside them.
  const allCountries = places.length > 0 && places.every((p) => p.kind === 'country');
  const sendStops = places.length > 0 && !(mode === 'ai' && allCountries);
  // Every stop gets at least a night, so more places than nights stretches the trip rather than overflowing it.
  const nights = Math.max(state.nights, sendStops ? places.length : 1);
  const split = splitNights(nights, places.length);

  return {
    name: tripNameFor({ ...state, blank }),
    description: '',
    countries: derivedCountries(places),
    startDate: isValidDate(state.startDate) ? state.startDate : null,
    endDate: endDateFor(state.startDate, nights),
    visibility: 0,
    currencyCode: 'USD',
    vibe: guided && state.tripType === 'honeymoon' ? 'romantic' : state.vibe,
    invites: [],
    ...(hasPreferences && { preferences }),
    ...(sendStops && {
      stops: places.map((p, i) => ({
        name: p.name,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        placeId: p.placeId.startsWith('typed:') || p.placeId.startsWith('country:') ? null : p.placeId,
        nights: split[i],
      })),
    }),
    ...(state.organizationId && { organizationId: state.organizationId }),
  };
}
