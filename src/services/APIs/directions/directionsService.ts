import { greatCircle, type LatLng, type LngLat } from '../../../utils/geo';

/**
 * Route geometry for one leg of a trip.
 *
 * Road geometry comes from the Mapbox Directions API. Where no road route
 * exists the leg falls back to a great-circle arc - and that is not an edge
 * case: Mapbox explicitly does not route between continents or over water, so
 * any trip with a flight in it depends on the fallback. A leg the user has
 * already marked as a flight or ferry never calls the API at all, which is both
 * faster and more honest than asking for a road route we would then discard.
 */

export type LegKind = 'road' | 'arc';

export interface LegRoute {
  coords: LngLat[];
  /** Metres along the returned geometry; null when it came from the fallback. */
  distanceKm: number | null;
  /** Minutes, from the routing engine. Null for arcs - we do not invent one. */
  durationMin: number | null;
  kind: LegKind;
  /** The transport mode this leg was resolved for, lowercased. */
  mode: string;
}

/** Mapbox routing profiles we can actually request. */
type Profile = 'driving' | 'walking' | 'cycling';

/**
 * Transport mode to routing profile.
 *
 * Modes are matched lowercased because the codebase stores both `'Car'` (the
 * picker in DestinationsPanel) and `'car'` (the default in TripPlanner's leg
 * builder). `null` means "do not ask for a road route" - draw an arc.
 *
 * Train maps to `driving`: there is no rail profile, and a land corridor is a
 * far better approximation of a rail journey than a straight line across the
 * countryside. It is styled distinctly so it never reads as a drive.
 */
function profileFor(mode: string): Profile | null {
  switch (mode.trim().toLowerCase()) {
    case 'flight':
    case 'ferry':
      return null;
    case 'walk':
      return 'walking';
    case 'bike':
      return 'cycling';
    case 'car':
    case 'bus':
    case 'train':
    case '':
    default:
      return 'driving';
  }
}

const round = (n: number) => n.toFixed(4); // ~11 m; plenty to key a cache on

/**
 * Resolved legs and in-flight requests, keyed identically.
 *
 * Module-level so the cache survives the map unmounting and remounting - the
 * planner's map panel is lazy-loaded from two places and toggled by a tab, so
 * without this a user flipping between tabs would re-bill the same routes.
 * Reordering stops re-derives leg keys but hits the cache for any pair that
 * still travels together.
 */
const cache = new Map<string, LegRoute>();
const inFlight = new Map<string, Promise<LegRoute>>();

const keyFor = (from: LatLng, to: LatLng, profile: Profile | null) =>
  `${profile ?? 'arc'}:${round(from.lng)},${round(from.lat)}>${round(to.lng)},${round(to.lat)}`;

function arcFor(from: LatLng, to: LatLng, mode: string): LegRoute {
  return {
    coords: greatCircle(from, to),
    distanceKm: null,
    durationMin: null,
    kind: 'arc',
    mode: mode.trim().toLowerCase(),
  };
}

/**
 * Geometry for a single leg. Never rejects - a failed lookup degrades to an arc,
 * because a map with a slightly-approximate line is far better than a map with a
 * missing one, and the dashed styling already tells the user it is not a road.
 */
export async function fetchLeg(
  from: LatLng,
  to: LatLng,
  mode: string,
  token: string | undefined,
  signal?: AbortSignal,
): Promise<LegRoute> {
  const profile = profileFor(mode);
  const key = keyFor(from, to, profile);

  const hit = cache.get(key);
  if (hit) return hit;

  // Air and sea legs never touch the network.
  if (!profile || !token) {
    const arc = arcFor(from, to, mode);
    cache.set(key, arc);
    return arc;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async (): Promise<LegRoute> => {
    try {
      const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}` +
        `?geometries=geojson&overview=full&access_token=${token}`;

      const res = await fetch(url, { signal });
      // Mapbox answers "no route possible" with HTTP 200 and a code in the body,
      // so the status alone is not enough to know this worked.
      const json = res.ok ? await res.json() : null;
      const route = json?.code === 'Ok' ? json.routes?.[0] : null;
      const line = route?.geometry?.coordinates as LngLat[] | undefined;

      if (!line || line.length < 2) return arcFor(from, to, mode);

      return {
        coords: line,
        distanceKm: typeof route.distance === 'number' ? route.distance / 1000 : null,
        durationMin: typeof route.duration === 'number' ? route.duration / 60 : null,
        kind: 'road',
        mode: mode.trim().toLowerCase(),
      };
    } catch {
      // Aborts land here too. Returning an arc for an aborted request is
      // harmless: the caller has already stopped caring, and the value is
      // cached against coordinates that will resolve the same way next time.
      return arcFor(from, to, mode);
    }
  })();

  inFlight.set(key, request);
  try {
    const result = await request;
    cache.set(key, result);
    return result;
  } finally {
    inFlight.delete(key);
  }
}

/** Test seam - the cache is module state and would otherwise leak across tests. */
export function __clearDirectionsCache() {
  cache.clear();
  inFlight.clear();
}
