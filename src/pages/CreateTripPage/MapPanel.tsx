import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Tooltip, CircularProgress, Typography, TextField, Button, Stack, useTheme } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setDestinationCoords } from '../../store/plannerSlice';

// Provide minimal ambient declarations so TypeScript doesn't error when Google Maps script not yet loaded.
// These are intentionally loose; for full typing consider installing @types/google.maps.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const google: any;

// Minimal Google Maps loader without external lib
function loadGoogleMaps(apiKey: string): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve((window as any).google);
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-sdk');
    if (existing) {
      (existing as HTMLScriptElement).addEventListener('load', () => resolve((window as any).google));
      return;
    }
  const script = document.createElement('script');
  script.id = 'google-maps-sdk';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=quarterly`;
  script.async = true; // allow parallel download
  script.defer = true; // execute after document parsing
  // Add a data attribute for potential future diagnostics
  script.setAttribute('data-loader','custom-async');
    script.onerror = reject;
    script.onload = () => resolve((window as any).google);
    document.head.appendChild(script);
  });
}

const DEFAULT_CENTER = { lat: 25.5788, lng: 91.8933 };

interface MapPanelProps { widthFraction?: number }
const MapPanel: React.FC<MapPanelProps> = ({ widthFraction = 0.40 }) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const destinations = useSelector((s: RootState) => s.planner.destinations);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any | null>(null);
  const markersRef = useRef<Record<string, any>>({});
  const routeLineRef = useRef<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [tempPos, setTempPos] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Map style definitions (light & dark) – minimal, non-branded customization
  const lightStyle = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ lightness: 20 }] },
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c7e5fb' }] },
    { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#f5f7f9' }] }
  ];
  // Improved dark mode style: clearer land/water separation, higher-contrast roads, toned-down minor labels
  const darkStyle = [
    { elementType: 'geometry', stylers: [{ color: '#111518' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    // Strong stroke for text readability then bright(ish) fill
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0f11' }, { weight: 3 }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#f1f3f5' }] },
    // Administrative boundaries subtle
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a3035' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#e0e3e6' }] },
    { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
    // Hide POIs to declutter
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#15271b' }] },
    // Roads hierarchy: minor roads dim, highways clearer
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#242b30' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#343c42' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#1d2327' }, { lightness: -5 }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2d3439' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#465158' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#5d6970' }] },
    // Hide shields (route labels) for cleanliness
    { featureType: 'road.highway', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.arterial', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.local', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    // Transit hidden
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    // Water distinct
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0d2531' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#45606b' }] }
  ];

  // Initialize map ONCE; then style updates handled in separate effect
  useEffect(() => {
    if (!apiKey) { setLoading(false); return; }
    let cancelled = false;
    loadGoogleMaps(apiKey).then(g => {
      if (cancelled || !mapRef.current) return;
      if (!mapInstance.current) {
        mapInstance.current = new g.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 5,
          disableDefaultUI: true,
          clickableIcons: false,
          styles: theme.palette.mode === 'dark' ? darkStyle : lightStyle,
          gestureHandling: 'greedy'
        });
      }
      setLoading(false);
    }).catch((e) => {
      if (cancelled) return;
      console.error('Google Maps load failure', e);
      setError('Failed to load Google Maps. Check API key and billing.');
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // When expanding, force a resize so Google Maps canvas recalculates dimensions.
  // Trigger resize / style reapply when width changes (split drag) or theme mode changes
  useEffect(() => {
    const g = (window as any).google;
    if (g && mapInstance.current) {
      const t = setTimeout(() => {
        g.maps.event.trigger(mapInstance.current, 'resize');
      }, 120);
      return () => clearTimeout(t);
    }
  }, [widthFraction]);

  // Reapply styles (no full re-init) & refresh marker appearance on theme change
  useEffect(() => {
    const g = (window as any).google;
    if (g && mapInstance.current) {
      mapInstance.current.setOptions({ styles: theme.palette.mode === 'dark' ? darkStyle : lightStyle });
      // Update existing marker icons / labels contrast
      Object.values(markersRef.current).forEach((m: any) => {
        const currentLabel = m.getLabel();
        m.setIcon(makeMarkerSvg(theme));
        if (currentLabel?.text) {
          m.setLabel({ ...currentLabel, color: theme.palette.mode==='dark'? '#fff':'#111' });
        }
      });
    }
  }, [theme.palette.mode, theme.palette.primary.main]);

  const makeMarkerSvg = useCallback((th: any) => {
    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
      fillColor: th.palette.primary.main,
      fillOpacity: 0.95,
      strokeWeight: 2,
      strokeColor: th.palette.mode==='dark'? '#000' : '#fff',
      scale: 1.15,
      anchor: new (window as any).google.maps.Point(12,22)
    } as any;
  }, []);

  // Sync markers with numbering (independent of theme except for icon function)
  useEffect(() => {
    const g = (window as any).google as any | undefined;
    if (!g || !mapInstance.current) return;

    // Remove markers no longer present
    Object.keys(markersRef.current).forEach(id => {
      if (!destinations.find(d => d.id === id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });

    destinations.forEach((d, idx) => {
      if (d.lat != null && d.lng != null) {
        const icon = makeMarkerSvg(theme);
        const labelColor = theme.palette.mode==='dark'? '#fff':'#111';
        if (!markersRef.current[d.id]) {
          markersRef.current[d.id] = new g.maps.Marker({
            position: { lat: d.lat, lng: d.lng },
            map: mapInstance.current!,
            title: d.name,
            icon,
            label: { text: String(idx+1), color: labelColor, fontSize: '12px', fontWeight: '600' }
          });
        } else {
          markersRef.current[d.id].setPosition({ lat: d.lat, lng: d.lng });
          markersRef.current[d.id].setIcon(icon);
          markersRef.current[d.id].setLabel({ text: String(idx+1), color: labelColor, fontSize: '12px', fontWeight: '600' });
        }
      }
    });

    const withCoords = destinations.filter(d => d.lat != null && d.lng != null);
    if (withCoords.length > 0 && !routeLineRef.current) {
      const bounds = new g.maps.LatLngBounds();
      withCoords.forEach(d => bounds.extend({ lat: d.lat!, lng: d.lng! }));
      mapInstance.current.fitBounds(bounds);
    }
  }, [destinations, makeMarkerSvg, theme]);

  // Listen for route updates to draw polyline
  useEffect(() => {
    const handler = (e: any) => {
      const ids: string[] = e.detail?.ids || [];
      const g = (window as any).google;
      if (!g || !mapInstance.current) return;
      const ordered = ids.map(id => destinations.find(d=> d.id===id)).filter(d=> d && d.lat!=null && d.lng!=null) as any[];
      if (ordered.length < 2) return;
      const path = ordered.map(d=> ({ lat: d.lat, lng: d.lng }));
      if (routeLineRef.current) routeLineRef.current.setMap(null);
      routeLineRef.current = new g.maps.Polyline({
        path,
        strokeColor: theme.palette.primary.main,
        strokeOpacity: 0.85,
        strokeWeight: 4,
        geodesic: true
      });
      routeLineRef.current.setMap(mapInstance.current);
      const bounds = new g.maps.LatLngBounds();
      path.forEach(p=> bounds.extend(p));
      mapInstance.current.fitBounds(bounds);
    };
    window.addEventListener('tripician:route-updated', handler as any);
    return ()=> window.removeEventListener('tripician:route-updated', handler as any);
  }, [destinations, theme.palette.primary.main]);

  // Add marker by clicking map when in adding mode
  useEffect(() => {
  const g = (window as any).google as any | undefined;
    if (!g || !mapInstance.current) return;
    if (!adding) return;

  const listener = mapInstance.current.addListener('click', (e: any) => {
      if (!e.latLng) return;
      setTempPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => {
      g.maps.event.removeListener(listener);
      setTempPos(null);
    };
  }, [adding]);

  const commitNewLocation = useCallback(() => {
    if (!tempPos || !newName.trim()) return;
    // Find the first destination without coordinates matching name or ask user to edit coordinates for an existing one.
    const target = destinations.find(d => d.name.toLowerCase() === newName.trim().toLowerCase()) || destinations[0];
    if (target) {
      dispatch(setDestinationCoords({ id: target.id, lat: tempPos.lat, lng: tempPos.lng }));
    }
    setAdding(false);
    setNewName('');
    setTempPos(null);
  }, [tempPos, newName, destinations, dispatch]);

  return (
    <Box sx={{ width: `${Math.round(widthFraction*100)}%`, position: 'relative', transition: 'width .25s ease', borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', p: 1 }}>
      <Box sx={{ flex: 1, position: 'relative', borderRadius: 2, overflow: 'hidden', boxShadow: theme.palette.mode==='dark' ? '0 0 0 1px rgba(255,255,255,0.06),0 4px 18px -4px rgba(0,0,0,0.8)' : '0 0 0 1px rgba(0,0,0,0.05),0 4px 14px -4px rgba(0,0,0,0.25)', background: theme.palette.mode==='dark' ? '#121416' : '#f2f5f8' }}>
        <Box ref={mapRef} sx={{ position: 'absolute', inset: 0 }} />
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {!loading && error && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection:'column', alignItems: 'center', justifyContent: 'center', gap:2, p:3, textAlign:'center', bgcolor: 'background.default' }}>
            <Typography variant='body2' fontWeight={600}>Map could not be loaded</Typography>
            <Typography variant='caption' color='text.secondary'>Reason: {error}</Typography>
            <Typography variant='caption' color='text.secondary'>Ensure:</Typography>
            <Typography variant='caption' color='text.secondary' component='div' sx={{ fontSize:11 }}>
              1. Key present in env file as VITE_GOOGLE_MAPS_API_KEY<br />
              2. API key unrestricted or has correct HTTP referrer<br />
              3. Billing enabled & Maps JavaScript API activated
            </Typography>
          </Box>
        )}
        {adding && tempPos && (
          <Box sx={{ position:'absolute', left: 12, right: 12, bottom: 12, p:2, bgcolor:'background.paper', borderRadius:2, boxShadow:3, display:'flex', flexDirection:'column', gap:1 }}>
            <Typography variant='caption' color='text.secondary'>Assign clicked location to destination</Typography>
            <TextField size='small' label='Destination name (match existing)' value={newName} onChange={e=>setNewName(e.target.value)} />
            <Stack direction='row' spacing={1}>
              <Button size='small' variant='contained' onClick={commitNewLocation} disabled={!newName.trim()}>Save</Button>
              <Button size='small' variant='text' onClick={()=>{setAdding(false); setTempPos(null);}}>Cancel</Button>
            </Stack>
          </Box>
        )}
        {/* Floating Controls */}
        <Box sx={{ position:'absolute', top: 8, left: 8, display:'flex', flexDirection:'column', gap:1 }}>
          <Tooltip title={adding ? 'Click map to pick location' : 'Add / adjust destination location'}>
            <IconButton size='small' color={adding ? 'primary':'default'} onClick={()=> setAdding(a=> !a)} sx={{ bgcolor:'background.paper', boxShadow:1 }}>
              <AddLocationAltIcon fontSize='small' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Center on first destination'>
            <IconButton size='small' onClick={()=>{
              const first = destinations.find(d=> d.lat!=null && d.lng!=null) || destinations[0];
              if (first && mapInstance.current) {
                mapInstance.current.setCenter({ lat: first.lat ?? DEFAULT_CENTER.lat, lng: first.lng ?? DEFAULT_CENTER.lng });
                mapInstance.current.setZoom(7);
              }
            }} sx={{ bgcolor:'background.paper', boxShadow:1 }}>
              <MyLocationIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Box>
        {/* Soft gradient edge for visual polish */}
        <Box sx={{ position:'absolute', inset:0, pointerEvents:'none', background:'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 120%)', opacity: theme.palette.mode==='dark'? .35 : .15 }} />
      </Box>
      {!apiKey && (
        <Box sx={{ pt:1 }}>
          <Typography variant='caption' color='error'>Google Maps API key missing.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default MapPanel;
