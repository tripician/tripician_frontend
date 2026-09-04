import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { greatCircle, isUsableCoord, routeBounds, type LngLat } from '../../utils/geo';
import { makeStopMarker } from '../../components/map/stopMarker';
import { BRAND } from '../../theme';
import { Box, Typography, useTheme } from '@mui/material';

export interface ShowcaseStop {
  name: string;
  lat?: number;
  lng?: number;
}

interface ShowcaseMapProps {
  stops: ShowcaseStop[];
}

const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';
const MAP_STYLE_DARK = 'mapbox://styles/mapbox/navigation-night-v1';

/**
 * Read-only route map for the public trip showcase.
 * Stops come in as props (no Redux), markers + fitted bounds, nothing editable.
 */
const ShowcaseMap: React.FC<ShowcaseMapProps> = ({ stops }) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  // `!= null` admitted 0, which put a failed geocode at Null Island and then
  // stretched the camera across two hemispheres to fit it. Index is kept so the
  // marker numbers match the itinerary rather than the filtered list.
  const indexed = stops
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => isUsableCoord(s.lat, s.lng));
  const withCoords = indexed.map(({ s }) => s);

  useEffect(() => {
    if (!token) { setError('Map unavailable'); return; }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: isLight ? MAP_STYLE_LIGHT : MAP_STYLE_DARK,
        center: [20, 20],
        zoom: 1.4,
        attributionControl: false,
        interactive: true,
        scrollZoom: false,
      });
    } catch {
      setError('Map unavailable');
      return;
    }
    mapRef.current = map;
    map.on('error', () => setError('Map unavailable'));

    map.on('load', () => {
      // Numbered by position in the itinerary, not among the mappable stops, so
      // the numbers match the ones on the page.
      indexed.forEach(({ s, index }) => {
        const el = makeStopMarker({ index });
        new mapboxgl.Marker({ element: el })
          .setLngLat([s.lng!, s.lat!])
          .addTo(map);
      });

      /*
       * Arcs only - this page never calls the Directions API.
       *
       * TripShowcase is public and crawlable, so bots and link-preview fetchers
       * would spend the routing quota before any human saw the page, and they
       * would do it on every published trip. The planner is behind auth and is
       * where road geometry earns its cost. A geodesic arc still shows the shape
       * of the journey, which is what this page is for.
       */
      if (indexed.length > 1) {
        const features = [];
        for (let i = 0; i < indexed.length - 1; i++) {
          const a = indexed[i].s;
          const b = indexed[i + 1].s;
          features.push({
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: greatCircle({ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! }),
            },
          });
        }
        map.addSource('tp-showcase-route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });
        map.addLayer({
          id: 'tp-showcase-route-casing',
          type: 'line',
          source: 'tp-showcase-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,14,0.85)',
            'line-width': 5,
          },
        });
        map.addLayer({
          id: 'tp-showcase-route-line',
          type: 'line',
          source: 'tp-showcase-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': BRAND.coral,
            'line-width': 2,
            'line-dasharray': [1.5, 1.5],
            'line-opacity': 0.9,
          },
        });
      }

      if (indexed.length > 1) {
        const box = routeBounds(indexed.map(({ s }) => [s.lng!, s.lat!] as LngLat));
        if (box) map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: 48, maxZoom: 9, duration: 0 });
      } else if (indexed.length === 1) {
        map.jumpTo({ center: [indexed[0].s.lng!, indexed[0].s.lat!], zoom: 7 });
      }
    });

    const ro = new ResizeObserver(() => { mapRef.current?.resize(); });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (withCoords.length === 0 || error) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.disabled',}}>
          {error ?? 'Route map appears once stops are pinned'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Inline style, NOT sx: mapbox-gl.css sets `.mapboxgl-map { position: relative }`
          which can override an emotion class depending on stylesheet load order. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </Box>
  );
};

export default ShowcaseMap;
