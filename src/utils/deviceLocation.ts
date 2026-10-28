/**
 * "Where am I right now", as a place name: the device's own position fix,
 * turned into "City, Country" by Google's geocoder.
 *
 * Current Location on a profile is a claim about where someone is, so it is not
 * typed. It comes from the device, with the person's permission, each time they
 * ask for it. Only the place name leaves this module: the coordinates are used
 * for the one lookup and are never stored or sent anywhere else.
 */

import { ensurePlacesReady } from '../services/placeVerification';

export type LocateFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'lookup';

export class LocateError extends Error {
  readonly reason: LocateFailure;

  constructor(reason: LocateFailure) {
    super(reason);
    this.name = 'LocateError';
    this.reason = reason;
  }
}

interface GeocodeResult {
  address_components?: Array<{ long_name: string; types: string[] }>;
}

/**
 * The city and country out of a reverse-geocode response. Pure, so it can be
 * tested without Google.
 *
 * Types are tried in order across every result before falling back to the next
 * type, because Google's first result is usually a street address whose own
 * components may skip the locality that a later result carries. Not every place
 * has a locality (rural areas, some UK towns), hence the fallbacks.
 */
export function placeNameFromGeocode(results: GeocodeResult[]): string | null {
  const pick = (...types: string[]): string | null => {
    for (const type of types) {
      for (const r of results) {
        const c = r.address_components?.find((a) => a.types.includes(type));
        if (c?.long_name) return c.long_name;
      }
    }
    return null;
  };

  const city = pick('locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1');
  const country = pick('country');
  // City-states come back with both set to the same name: "Singapore", not "Singapore, Singapore".
  const parts = [city, country].filter((p): p is string => !!p);
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return unique.length ? unique.join(', ') : null;
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new LocateError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => reject(new LocateError(
        err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
      )),
      {
        // City-level is all this shows. A coarse fix is faster, and it asks the
        // device for no more precision than the result will ever carry.
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 10 * 60 * 1000,
      },
    );
  });
}

/**
 * Asks for the device's position (the browser shows its own permission prompt
 * the first time) and returns "City, Country". Throws LocateError with a reason
 * the caller can turn into a message.
 */
export async function locateCurrentPlace(): Promise<string> {
  // In parallel, so the permission prompt appears straight away rather than
  // after the Maps script has loaded.
  const [pos, ready] = await Promise.all([currentPosition(), ensurePlacesReady()]);
  const Geocoder = (window as any).google?.maps?.Geocoder;
  if (!ready || !Geocoder) throw new LocateError('lookup');

  try {
    const { results } = await new Geocoder().geocode({
      location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
    });
    const name = placeNameFromGeocode(results ?? []);
    if (!name) throw new LocateError('lookup');
    return name;
  } catch (err) {
    if (err instanceof LocateError) throw err;
    // REQUEST_DENIED here almost always means the Geocoding API is not enabled
    // for VITE_GOOGLE_MAPS_API_KEY in the Google Cloud console.
    console.warn('Reverse geocoding failed', err);
    throw new LocateError('lookup');
  }
}
