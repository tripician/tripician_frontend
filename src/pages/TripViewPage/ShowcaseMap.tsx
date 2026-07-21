import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
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

function makeMarkerEl(index: number): HTMLElement {
  const num = index + 1;
  const el = document.createElement('div');
  el.style.width = '32px';
  el.style.height = '40px';
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 36 44">
      <defs>
        <radialGradient id="sgrad${num}" cx="42%" cy="35%" r="58%" fx="42%" fy="35%">
          <stop offset="0%" stop-color="#FF6B89"/>
          <stop offset="100%" stop-color="#D91A50"/>
        </radialGradient>
      </defs>
      <ellipse cx="18" cy="42" rx="7" ry="2.5" fill="rgba(0,0,0,0.18)"/>
      <path d="M18 2C11.4 2 6 7.4 6 14c0 8 12 26 12 26S30 22 30 14C30 7.4 24.6 2 18 2z" fill="url(#sgrad${num})"/>
      <circle cx="18" cy="14" r="7.5" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>
      <text x="18" y="18.5" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-weight="700" font-size="9.5" fill="#fff">${num}</text>
    </svg>`;
  return el;
}

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
  const withCoords = stops.filter(s => s.lat != null && s.lng != null);

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
      withCoords.forEach((s, idx) => {
        new mapboxgl.Marker({ element: makeMarkerEl(idx) })
          .setLngLat([s.lng!, s.lat!])
          .addTo(map);
      });
      if (withCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        withCoords.forEach(s => bounds.extend([s.lng!, s.lat!]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 9, duration: 0 });
      } else if (withCoords.length === 1) {
        map.jumpTo({ center: [withCoords[0].lng!, withCoords[0].lat!], zoom: 7 });
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
        <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontFamily: "'Inter',sans-serif" }}>
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
