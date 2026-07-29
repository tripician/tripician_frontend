/**
 * Geodesic helpers for map rendering.
 *
 * Deliberately dependency-free: `@turf/great-circle` would pull a package in for
 * one function, and the spherical interpolation below is the whole of it. The
 * distance/duration estimators live separately in
 * `pages/CreateTripPage/feasibility.ts` (`haversineKm`, `transitEstimate`) and
 * are already tested; nothing here duplicates them.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** GeoJSON order: [longitude, latitude]. Easy to get backwards, so it is named. */
export type LngLat = [number, number];

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Is this a coordinate we can actually put on a map?
 *
 * The map previously filtered with `lat != null && lng != null`, which admits
 * `0`. A stop whose geocode failed is stored as `(0, 0)` and that filter placed
 * it at Null Island - 0°N 0°E, in the Gulf of Guinea - then dragged the camera
 * across two hemispheres to fit it. (0, 0) is a real point in the ocean, but no
 * trip stop is ever there, and it is the universal "geocode failed" sentinel, so
 * rejecting it is right: better to omit a stop than to confidently misplace it.
 */
export function isUsableCoord(lat?: number | null, lng?: number | null): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Points along the great-circle path from `a` to `b`, as GeoJSON [lng, lat].
 *
 * Used for legs with no drivable route - flights and ferries, and anything the
 * Directions API refuses (it does not route between continents or over water).
 * A straight two-point LineString would be wrong on a globe: the shortest path
 * between Dubai and Tokyo bows north, and drawing it flat both looks wrong and
 * misrepresents the journey. Interpolating along the sphere gives the curve.
 *
 * Longitudes are unwrapped as they are emitted, so a path crossing the
 * antimeridian continues past ±180 instead of snapping back across the whole
 * map - the classic "line shoots the wrong way round the world" artefact.
 */
export function greatCircle(a: LatLng, b: LatLng, steps = 96): LngLat[] {
  const lat1 = toRad(a.lat);
  const lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const lng2 = toRad(b.lng);

  // Angular distance between the two points.
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const d = 2 * Math.asin(Math.min(1, Math.sqrt(h)));

  // Coincident (or effectively coincident) points have no arc to draw.
  if (d < 1e-9) return [[a.lng, a.lat], [b.lng, b.lat]];

  const sinD = Math.sin(d);
  // Near-antipodal points drive sin(d) to zero, and the interpolation below
  // divides by it: the result is NaN coordinates, which make the whole
  // FeatureCollection render as nothing with no error anywhere. There is also no
  // meaningful "shortest path" between antipodes - every direction is equal - so
  // a straight segment is as correct as anything else.
  if (Math.abs(sinD) < 1e-9) return [[a.lng, a.lat], [b.lng, b.lat]];
  const out: LngLat[] = [];
  let prevLng: number | null = null;

  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / sinD;
    const B = Math.sin(f * d) / sinD;

    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    let lng = toDeg(Math.atan2(y, x));

    // Unwrap: keep each point within 180° of the last one by shifting whole
    // turns, so the rendered line crosses the antimeridian rather than the map.
    if (prevLng !== null) {
      while (lng - prevLng > 180) lng -= 360;
      while (lng - prevLng < -180) lng += 360;
    }
    prevLng = lng;

    out.push([lng, lat]);
  }

  return out;
}

/**
 * Bounds that wrap the short way round the world.
 *
 * `LngLatBounds.extend` treats longitude linearly, so Tokyo (139.7) and Los
 * Angeles (-118.2) produce a 258° span *the wrong way* - across Europe and the
 * Atlantic - and the camera zooms out to almost the whole planet to fit it. The
 * real gap between them is ~102° across the Pacific.
 *
 * Finding the largest angular gap between sorted longitudes and wrapping through
 * it gives the true extent. Returned as [west, south, east, north], where `east`
 * may exceed 180 - which is exactly what mapbox needs to fit across the
 * antimeridian.
 */
export function routeBounds(coords: LngLat[]): [number, number, number, number] | null {
  if (coords.length === 0) return null;

  const lats = coords.map((c) => c[1]);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  const lngs = coords.map((c) => ((c[0] + 180) % 360 + 360) % 360 - 180).sort((a, b) => a - b);

  // Widest gap between consecutive longitudes, including the wrap from last to
  // first. The bounds are everything *except* that gap.
  let gapStart = lngs.length - 1;
  let widest = lngs[0] + 360 - lngs[lngs.length - 1];
  for (let i = 0; i < lngs.length - 1; i++) {
    const gap = lngs[i + 1] - lngs[i];
    if (gap > widest) { widest = gap; gapStart = i; }
  }

  const west = lngs[(gapStart + 1) % lngs.length];
  let east = lngs[gapStart];
  if (east < west) east += 360; // crossed the antimeridian; let it run past 180

  return [west, south, east, north];
}

/**
 * The first `fraction` of a line, for the draw-on animation.
 *
 * Walks the coordinate list accumulating planar segment lengths and cuts the
 * last segment proportionally, so the head of the line advances smoothly rather
 * than jumping vertex to vertex. Planar rather than geodesic on purpose: this
 * only decides where to stop drawing, and over one animation frame the
 * difference is invisible.
 */
export function sliceLine(coords: LngLat[], fraction: number): LngLat[] {
  if (coords.length < 2) return coords;
  if (fraction >= 1) return coords;
  if (fraction <= 0) return [coords[0]];

  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    total += len;
  }
  if (total === 0) return coords;

  const target = total * fraction;
  const out: LngLat[] = [coords[0]];
  let walked = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const len = segLengths[i];
    if (walked + len >= target) {
      const t = len === 0 ? 0 : (target - walked) / len;
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];
      out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
      return out;
    }
    walked += len;
    out.push(coords[i + 1]);
  }

  return out;
}
