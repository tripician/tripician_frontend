// Simplified normalizer for the current stable backend shape:
// {
//   trip: { id, name, visibility, startDate, endDate, currencyCode, ... },
//   itinerary: [ { id, name, startDate, endDate, nights, lat, lng, ... } ]
// }
// We deliberately drop wide key / fallback scanning to reduce overhead.

/**
 * Which planner surface a trip opens in. Mirrors the backend
 * `Tripician.WebApi.Models.TripCoreModel.PlannerMode` enum (Easy = 0, Advanced = 1).
 */
export type PlannerMode = 'easy' | 'advanced';

/**
 * The backend serialises this enum as a PascalCase string, but older payloads and
 * some list endpoints can hand back the raw int - accept both rather than silently
 * dropping a trip into the wrong planner.
 */
export const parsePlannerMode = (value: unknown): PlannerMode | null => {
  if (typeof value === 'number') return value === 0 ? 'easy' : value === 1 ? 'advanced' : null;
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'easy' || v === '0') return 'easy';
  if (v === 'advanced' || v === '1') return 'advanced';
  return null;
};

/** Wire form the API expects (PascalCase, matching the C# enum member names). */
export const plannerModeToWire = (mode: PlannerMode): 'Easy' | 'Advanced' =>
  mode === 'easy' ? 'Easy' : 'Advanced';

export interface NormalizedTripMeta {
  id: string;
  name: string;
  visibility: string; // raw visibility/privacy value (UPPER/LOWER)
  startDate: string | null;
  endDate: string | null;
  currencyCode?: string | null;
  targetNights?: number | null; // optional planned target nights from backend
  importantNotes?: string | null; // trip-level notes (optional)
  description?: string | null; // optional trip description
  vibe?: string | null; // optional trip vibe
  photoUrl?: string | null; // trip banner/cover photo URL
  published?: boolean; // whether the trip has been explicitly published (visible to global community)
  plannerMode?: PlannerMode | null; // easy (minimal board) vs advanced (full planner)
}

export interface NormalizedTrip {
  meta: NormalizedTripMeta;
  itinerary: any[]; // backend itinerary items (unmapped here)
  raw: any; // original input for debugging
}

const toStringOrUndefined = (v: any): string | undefined => typeof v === 'string' && v.trim().length > 0 ? v : undefined;

export function normalizeTrip(input: any): NormalizedTrip | null {
  if (!input || typeof input !== 'object') return null;
  const tripRoot = (input.trip && typeof input.trip === 'object') ? input.trip : input;
  const id = toStringOrUndefined(tripRoot.id) || 'unknown';
  const name = toStringOrUndefined(tripRoot.name) || 'Untitled Trip';
  const visibility =
    toStringOrUndefined(tripRoot.visibility) ||
    toStringOrUndefined(tripRoot.Visibility) ||
    toStringOrUndefined(tripRoot.privacy) ||
    toStringOrUndefined(tripRoot.Privacy) ||
    'PRIVATE';
  const startDate = toStringOrUndefined(tripRoot.startDate) || null;
  const endDate = toStringOrUndefined(tripRoot.endDate) || null;
  const currencyCode = toStringOrUndefined(tripRoot.currencyCode) || null;
  const targetNightsRaw = tripRoot.targetNights ?? tripRoot.targetNight ?? tripRoot.plannedNights;
  const importantNotes = typeof tripRoot.importantNotes === 'string' && tripRoot.importantNotes.trim().length
    ? tripRoot.importantNotes
    : (typeof tripRoot.notes === 'string' && tripRoot.notes.trim().length ? tripRoot.notes : null);
  const targetNights = typeof targetNightsRaw === 'number' && targetNightsRaw > 0 ? targetNightsRaw
    : (typeof targetNightsRaw === 'string' && targetNightsRaw.trim() && !isNaN(Number(targetNightsRaw)) ? Number(targetNightsRaw) : null);
  const description = typeof tripRoot.description === 'string' ? tripRoot.description : null;
  const vibe = typeof tripRoot.vibe === 'string' ? tripRoot.vibe : null;
  const plannerMode = parsePlannerMode(tripRoot.plannerMode ?? tripRoot.PlannerMode);
  const photoUrl = typeof tripRoot.photoUrl === 'string' && tripRoot.photoUrl.trim().length ? tripRoot.photoUrl : null;
  // `undefined`, not `false`, when no shape carried the field. The planner adopts
  // this as the trip's published state, and defaulting to `false` would tell it an
  // already-published trip is a draft whenever a payload simply omits the flag.
  // "We were not told" and "it is not published" are different facts.
  const published =
    typeof tripRoot.published === 'boolean'
      ? tripRoot.published
      : typeof tripRoot.Published === 'boolean'
        ? tripRoot.Published
        : typeof tripRoot.isPublished === 'boolean'
          ? tripRoot.isPublished
          : typeof tripRoot.IsPublished === 'boolean'
            ? tripRoot.IsPublished
            : undefined;
  const itinerary =
    Array.isArray(input.itinerary) ? input.itinerary :
    Array.isArray(input.Itinerary) ? input.Itinerary :
    Array.isArray(input.destinations) ? input.destinations :
    Array.isArray(input.Destinations) ? input.Destinations :
    Array.isArray(tripRoot.itinerary) ? tripRoot.itinerary :
    Array.isArray(tripRoot.Itinerary) ? tripRoot.Itinerary :
    Array.isArray(tripRoot.destinations) ? tripRoot.destinations :
    Array.isArray(tripRoot.Destinations) ? tripRoot.Destinations :
    [];
  return { meta: { id, name, visibility, startDate, endDate, currencyCode, targetNights, importantNotes, description, vibe, photoUrl, published, plannerMode }, itinerary, raw: input };
}

export default normalizeTrip;
