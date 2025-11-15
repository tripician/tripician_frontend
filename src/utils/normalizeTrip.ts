// Simplified normalizer for the current stable backend shape:
// {
//   trip: { id, name, visibility, startDate, endDate, currencyCode, ... },
//   itinerary: [ { id, name, startDate, endDate, nights, lat, lng, ... } ]
// }
// We deliberately drop wide key / fallback scanning to reduce overhead.

export interface NormalizedTripMeta {
  id: string;
  name: string;
  visibility: string; // raw visibility/privacy value (UPPER/LOWER)
  startDate: string | null;
  endDate: string | null;
  currencyCode?: string | null;
  targetNights?: number | null; // optional planned target nights from backend
  importantNotes?: string | null; // trip-level notes (optional)
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
  const visibility = toStringOrUndefined(tripRoot.visibility) || 'PRIVATE';
  const startDate = toStringOrUndefined(tripRoot.startDate) || null;
  const endDate = toStringOrUndefined(tripRoot.endDate) || null;
  const currencyCode = toStringOrUndefined(tripRoot.currencyCode) || null;
  const targetNightsRaw = tripRoot.targetNights ?? tripRoot.targetNight ?? tripRoot.plannedNights;
  const importantNotes = typeof tripRoot.importantNotes === 'string' && tripRoot.importantNotes.trim().length
    ? tripRoot.importantNotes
    : (typeof tripRoot.notes === 'string' && tripRoot.notes.trim().length ? tripRoot.notes : null);
  const targetNights = typeof targetNightsRaw === 'number' && targetNightsRaw > 0 ? targetNightsRaw
    : (typeof targetNightsRaw === 'string' && targetNightsRaw.trim() && !isNaN(Number(targetNightsRaw)) ? Number(targetNightsRaw) : null);
  const itinerary = Array.isArray(input.itinerary) ? input.itinerary : (Array.isArray(tripRoot.itinerary) ? tripRoot.itinerary : []);
  return { meta: { id, name, visibility, startDate, endDate, currencyCode, targetNights, importantNotes }, itinerary, raw: input };
}

export default normalizeTrip;
