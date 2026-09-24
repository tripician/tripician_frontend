import { countryNameFromCode } from '../../utils/countryFlags';

/** A place someone picked from Google, in the shape the rest of the app needs. */
export interface PickedPlace {
  placeId: string;
  name: string;
  /** The second line Google showed, such as "Vietnam" or "Kyoto, Japan". */
  detail?: string;
  lat?: number;
  lng?: number;
  /** The country in the app's own English names, so it matches trip cards and covers. */
  country?: string;
  countryCode?: string;
  /** A whole country is planned differently from a city: TripicianAI picks the cities inside it. */
  kind: 'place' | 'country';
  photoUrl?: string;
}

/** What a prediction already told us, used when the details lookup fails. */
export interface PlaceFallback {
  placeId: string;
  name: string;
  detail?: string;
  types?: string[];
}

interface RawComponent { long_name?: string; short_name?: string; types?: string[] }
interface RawPlace {
  name?: string;
  types?: string[];
  address_components?: RawComponent[];
  geometry?: { location?: { lat?: () => number; lng?: () => number } };
  photos?: { getUrl?: (opts: object) => string }[];
}

const readCoord = (fn: (() => number) | undefined, lo: number, hi: number): number | undefined => {
  try {
    const v = fn?.();
    return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined;
  } catch {
    return undefined;
  }
};

/** Turns a PlacesService details result (or nothing, if it failed) into a PickedPlace. Never throws. */
export function toPickedPlace(raw: unknown, fallback: PlaceFallback): PickedPlace {
  const place = (raw && typeof raw === 'object' ? raw : {}) as RawPlace;
  const types = Array.isArray(place.types) ? place.types : (fallback.types ?? []);
  const countryPart = (place.address_components ?? []).find((c) => c.types?.includes('country'));
  const countryCode = countryPart?.short_name?.trim().toUpperCase() || undefined;
  const country = countryNameFromCode(countryCode) ?? (countryPart?.long_name?.trim() || undefined);
  const kind: PickedPlace['kind'] = types.includes('country') ? 'country' : 'place';

  let lat = readCoord(place.geometry?.location?.lat, -90, 90);
  let lng = readCoord(place.geometry?.location?.lng, -180, 180);
  // A pair is kept whole or not at all, and (0,0) is a failed lookup.
  if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) { lat = undefined; lng = undefined; }

  let photoUrl: string | undefined;
  try { photoUrl = place.photos?.[0]?.getUrl?.({ maxWidth: 800, maxHeight: 600 }) || undefined; } catch { photoUrl = undefined; }

  const name = (place.name?.trim() || fallback.name).slice(0, 160);
  return {
    placeId: fallback.placeId,
    name,
    ...(fallback.detail && { detail: fallback.detail }),
    ...(lat !== undefined && lng !== undefined && { lat, lng }),
    ...(country && { country }),
    ...(countryCode && { countryCode }),
    kind,
    ...(photoUrl && { photoUrl }),
  };
}

/** A place typed by hand when Google is unavailable: a name and nothing we would have to guess. */
export function typedPlace(name: string): PickedPlace {
  const trimmed = name.trim().slice(0, 160);
  return { placeId: `typed:${trimmed.toLowerCase()}`, name: trimmed, kind: 'place' };
}
