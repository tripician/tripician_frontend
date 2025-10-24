// Utility to normalize backend trip payloads of varying shapes
// Supports shapes: { trip: { ... }, itinerary: [...] } OR flat { id, name, visibility, ... , itinerary: [...] }
// Returns a consistent NormalizedTrip or null if input invalid.

export interface NormalizedTripMeta {
  id: string;
  name: string;
  visibility: string; // raw visibility/privacy value (UPPER/LOWER)
  startDate: string | null;
  endDate: string | null;
  currencyCode?: string | null;
}

export interface NormalizedTrip {
  meta: NormalizedTripMeta;
  itinerary: any[]; // backend itinerary items (unmapped here)
  raw: any; // original input for debugging
}

const toStringOrUndefined = (v: any): string | undefined => typeof v === 'string' && v.trim().length > 0 ? v : undefined;

export function normalizeTrip(input: any): NormalizedTrip | null {
  if (!input || typeof input !== 'object') return null;
  // Accept either direct meta or nested trip object.
  const tripRoot = (input.trip && typeof input.trip === 'object') ? input.trip : input;

  const id = toStringOrUndefined(tripRoot.id) || toStringOrUndefined(tripRoot.tripId) || 'unknown';
  const name = toStringOrUndefined(tripRoot.name) || toStringOrUndefined(tripRoot.title) || 'Untitled Trip';
  const visibility = toStringOrUndefined(tripRoot.visibility) || toStringOrUndefined(tripRoot.privacy) || 'PRIVATE';
  const startDate = toStringOrUndefined(tripRoot.startDate) || null;
  const endDate = toStringOrUndefined(tripRoot.endDate) || null;
  const currencyCode = toStringOrUndefined(tripRoot.currencyCode) || toStringOrUndefined(tripRoot.currency) || null;
  const itineraryRaw = Array.isArray(input.itinerary) ? input.itinerary : (Array.isArray(tripRoot.itinerary) ? tripRoot.itinerary : []);

  return {
    meta: { id, name, visibility, startDate, endDate, currencyCode },
    itinerary: itineraryRaw,
    raw: input
  };
}

export default normalizeTrip;
