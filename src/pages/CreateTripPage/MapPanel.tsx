import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, IconButton, Tooltip, CircularProgress, Typography, useTheme } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { PlannerDestination } from '../../store/plannerSlice';

const DEFAULT_CENTER: [number, number] = [20, 20]; // [lng, lat] - world overview
const DEFAULT_ZOOM = 2;

// Colourful styles: streets for light, navigation-night for dark
const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';
const MAP_STYLE_DARK  = 'mapbox://styles/mapbox/navigation-night-v1';

function makeMarkerEl(index: number): HTMLElement {
  const num = index + 1;
  const el = document.createElement('div');
  el.style.width = '36px';
  el.style.height = '44px';
  el.style.cursor = 'pointer';
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <defs>
        <filter id="pglow${num}" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <radialGradient id="pgrad${num}" cx="42%" cy="35%" r="58%" fx="42%" fy="35%">
          <stop offset="0%" stop-color="#FF6B89"/>
          <stop offset="100%" stop-color="#D91A50"/>
        </radialGradient>
      </defs>
      <ellipse cx="18" cy="42" rx="7" ry="2.5" fill="rgba(0,0,0,0.18)"/>
      <path d="M18 2C11.4 2 6 7.4 6 14c0 8 12 26 12 26S30 22 30 14C30 7.4 24.6 2 18 2z"
        fill="url(#pgrad${num})" filter="url(#pglow${num})"/>
      <circle cx="18" cy="14" r="7.5" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>
      <text x="18" y="18.5" text-anchor="middle" font-family="Inter,system-ui,sans-serif"
        font-weight="700" font-size="9.5" fill="#fff">${num}</text>
    </svg>`;
  return el;
}

interface MapPanelProps { widthFraction?: number }

const MapPanel: React.FC<MapPanelProps> = () => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const destinations = useSelector((s: RootState) => s.planner.destinations);
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const styleLoadedRef = useRef(false);
  const firstRenderRef = useRef(true);
  const destinationsRef = useRef(destinations);
  destinationsRef.current = destinations;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  //  Sync markers 
  const syncMarkers = useCallback((dests: PlannerDestination[]) => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    const withCoords = dests.filter(d => d.lat != null && d.lng != null);

    // Remove stale
    const liveIds = new Set(dests.map(d => d.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!liveIds.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });

    // Add / update
    withCoords.forEach((d, idx) => {
      const el = makeMarkerEl(idx);
      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLngLat([d.lng!, d.lat!]);
        markersRef.current[d.id].getElement().innerHTML = el.innerHTML;
      } else {
        markersRef.current[d.id] = new mapboxgl.Marker({ element: el })
          .setLngLat([d.lng!, d.lat!])
          .addTo(map);
      }
    });

    // Fit bounds
    if (withCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      withCoords.forEach(d => bounds.extend([d.lng!, d.lat!]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 800 });
    } else if (withCoords.length === 1) {
      map.flyTo({ center: [withCoords[0].lng!, withCoords[0].lat!], zoom: 8, duration: 800 });
    }
  }, []);

  //  Initialize map once 
  useEffect(() => {
    if (!token) { setLoading(false); setError('VITE_MAPBOX_TOKEN is not set.'); return; }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isLight ? MAP_STYLE_LIGHT : MAP_STYLE_DARK,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.on('load', () => {
      styleLoadedRef.current = true;
      setLoading(false);
      setMapReady(true);
      syncMarkers(destinationsRef.current);
    });

    map.on('style.load', () => {
      styleLoadedRef.current = true;
      syncMarkers(destinationsRef.current);
    });

    mapRef.current = map;

    // Resize when container dimensions change (fixes blank map in drawer)
    const ro = new ResizeObserver(() => { mapRef.current?.resize(); });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  //  Theme switch 
  useEffect(() => {
    if (firstRenderRef.current) { firstRenderRef.current = false; return; }
    const map = mapRef.current;
    if (!map) return;
    styleLoadedRef.current = false;
    map.setStyle(isLight ? MAP_STYLE_LIGHT : MAP_STYLE_DARK);
  }, [isLight]);

  //  Destinations change 
  useEffect(() => {
    if (mapReady) syncMarkers(destinations);
  }, [destinations, mapReady, syncMarkers]);

  //  Center on first 
  const centerOnFirst = useCallback(() => {
    const first = destinations.find(d => d.lat != null && d.lng != null);
    if (mapRef.current && first) {
      mapRef.current.flyTo({ center: [first.lng!, first.lat!], zoom: 8, duration: 600 });
    }
  }, [destinations]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Inline style, NOT sx: mapbox-gl.css sets `.mapboxgl-map { position: relative }`
          which ties with the emotion class on specificity, whichever stylesheet loads
          later wins, and with lazy chunks that's a coin flip (it collapsed the panel to
          0 height in production). Inline styles beat both, deterministically. */}
      <Box ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', zIndex: 10 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 3, textAlign: 'center', bgcolor: 'background.default', zIndex: 10 }}>
          <Typography variant="body2" fontWeight={600}>Map could not be loaded</Typography>
          <Typography variant="caption" color="text.secondary">{error}</Typography>
        </Box>
      )}

      {!loading && !error && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 1, zIndex: 5 }}>
          <Tooltip title="Centre on first destination" placement="left">
            <IconButton size="small" onClick={centerOnFirst}
              sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>
              <MyLocationIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default MapPanel;