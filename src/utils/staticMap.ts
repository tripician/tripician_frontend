/**
 * A route drawn as one flat image by Mapbox's Static Images API.
 *
 * Used where an interactive map would cost more than it is worth: a story page a
 * crawler fetches, and the printed book, which cannot pan anyway. Both surfaces
 * get the same pixels, which is the point.
 *
 * The URL is built at RENDER time and never stored on the block. Putting it in
 * `BodyJson` would ship the access token to every reader of every story.
 */

import { BRAND } from '../theme';

export interface StaticMapStop {
  name: string;
  lat?: number | null;
  lng?: number | null;
}

interface StaticMapOptions {
  width?: number;
  height?: number;
  retina?: boolean;
  dark?: boolean;
}

const STROKE = BRAND.coral;
const MAX_STOPS = 25;

const usable = (s: StaticMapStop): s is StaticMapStop & { lat: number; lng: number } =>
  typeof s.lat === 'number' && Number.isFinite(s.lat)
  && typeof s.lng === 'number' && Number.isFinite(s.lng);

export function staticMapUrl(
  stops: StaticMapStop[],
  { width = 1000, height = 560, retina = true, dark = false }: StaticMapOptions = {},
): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  if (!token) return null;

  const points = stops.filter(usable).slice(0, MAX_STOPS);
  if (points.length === 0) return null;

  const features: unknown[] = [];

  if (points.length > 1) {
    features.push({
      type: 'Feature',
      properties: { stroke: STROKE, 'stroke-width': 3, 'stroke-opacity': 0.9 },
      geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
    });
  }

  points.forEach((p, i) => {
    features.push({
      type: 'Feature',
      properties: {
        'marker-color': STROKE,
        'marker-size': 'small',
        // Mapbox only renders 1 to 9 as a numbered pin; past that it draws a plain dot.
        ...(i < 9 ? { 'marker-symbol': String(i + 1) } : {}),
      },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    });
  });

  const overlay = encodeURIComponent(JSON.stringify({ type: 'FeatureCollection', features }));
  const style = dark ? 'dark-v11' : 'light-v11';
  const size = `${width}x${height}${retina ? '@2x' : ''}`;

  // `auto` fits the bounds of the overlay. A single stop gets a fixed zoom instead,
  // because auto-fitting one point zooms to street level and shows nothing useful.
  const viewport = points.length > 1
    ? 'auto'
    : `${points[0].lng},${points[0].lat},4`;

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/geojson(${overlay})/${viewport}/${size}`
    + `?access_token=${encodeURIComponent(token)}&padding=48`;
}
