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
  // Store individual leg polylines keyed by fromId->toId
  const legPolylinesRef = useRef<Record<string, any>>({});
  const directionsCacheRef = useRef<Record<string, any>>({});
  const pendingLegsRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [tempPos, setTempPos] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Map style definitions (light & dark) – minimal, non-branded customization
  const lightStyle = [
    { featureType: 'poi.attraction', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.business', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ lightness: 30 }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ lightness: 10 }, { color: '#d1d7dc' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e7ebef' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c7e5fb' }] },
    { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#f5f7f9' }] }
  ];
  // Improved dark mode style: clearer land/water separation, higher-contrast roads, toned-down minor labels
  const darkStyle = [
    { elementType: 'geometry', stylers: [{ color: '#111518' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0f11' }, { weight: 3 }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#f1f3f5' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a3035' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#e0e3e6' }] },
    { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.attraction', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.business', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#242b30' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#343c42' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#1d2327' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2d3439' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#465158' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#5d6970' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
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
      path: 'M12 2C8.1 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.1-7-7-7z',
      fillColor: th.palette.primary.main,
      fillOpacity: 0.98,
      strokeWeight: 2,
      strokeColor: th.palette.mode==='dark'? '#06080A' : '#ffffff',
      scale: 1.2,
      labelOrigin: new (window as any).google.maps.Point(12,10),
      anchor: new (window as any).google.maps.Point(12,24)
    } as any;
  }, []);

  const polylineStyleForMode = (mode:string, baseColor:string) => {
    switch(mode){
      case 'walk': return { strokeColor: baseColor, strokeWeight: 4, strokeOpacity: 0.9, icons:[{ icon:{ path:'M 0,-1 0,1', strokeOpacity:1, scale:2 }, offset:'0', repeat:'10px'}] };
      case 'bike': return { strokeColor: '#16a34a', strokeWeight: 5, strokeOpacity: 0.85, icons:[{ icon:{ path:'M 0,-1 0,1', strokeOpacity:1, scale:2 }, offset:'25px', repeat:'22px'}] };
      case 'bus': return { strokeColor: '#db7c00', strokeWeight: 5, strokeOpacity: 0.85 };
      case 'train': return { strokeColor: '#4f46e5', strokeWeight: 5, strokeOpacity: 0.85 };
      case 'flight': return { strokeColor: '#0ea5e9', strokeWeight: 4, strokeOpacity: 0.75, geodesic:true, icons:[{ icon:{ path:'M 0,-1 0,1', strokeOpacity:1, scale:2 }, offset:'0', repeat:'16px'}] };
      default: return { strokeColor: baseColor, strokeWeight: 6, strokeOpacity: 0.9 }; // car
    }
  };

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
    if (withCoords.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      withCoords.forEach(d => bounds.extend({ lat: d.lat!, lng: d.lng! }));
      mapInstance.current.fitBounds(bounds);
    }
  }, [destinations, makeMarkerSvg, theme]);
  // Build transport-based leg routes using Directions API with caching & fallback.
  useEffect(() => {
    const g = (window as any).google;
    if (!g || !mapInstance.current) return;
    const svc = new g.maps.DirectionsService();
    const map = mapInstance.current;
    // Remove obsolete polylines (sequence change)
    Object.keys(legPolylinesRef.current).forEach(key => {
      const [fromId,toId] = key.split('->');
      const fromIdx = destinations.findIndex(d=> d.id===fromId);
      const toIdx = destinations.findIndex(d=> d.id===toId);
      if (fromIdx === -1 || toIdx !== fromIdx + 1) {
        legPolylinesRef.current[key].setMap(null);
        delete legPolylinesRef.current[key];
      }
    });
    const legs: Array<{ from:any; to:any; mode:string; key:string }> = [];
    for (let i=1;i<destinations.length;i++) {
      const from = destinations[i-1]; const to = destinations[i];
      if(from.lat!=null && from.lng!=null && to.lat!=null && to.lng!=null) {
        const mode = to.transport || 'car';
        legs.push({ from, to, mode, key: from.id+'->'+to.id+'@'+mode });
      }
    }
    if(!legs.length) return;
    const bounds = new g.maps.LatLngBounds();
    let anyPath = false;
    const baseColor = theme.palette.primary.main;
    const fetchLeg = async (leg:{ from:any; to:any; mode:string; key:string }) => {
      const polyKey = leg.from.id+'->'+leg.to.id; // polyline store key independent of mode
      const cacheKey = leg.key;
      // Cache hit
      if(directionsCacheRef.current[cacheKey]) {
        const path = directionsCacheRef.current[cacheKey];
        if(legPolylinesRef.current[polyKey]) { legPolylinesRef.current[polyKey].setMap(null); delete legPolylinesRef.current[polyKey]; }
        const style = polylineStyleForMode(leg.mode, baseColor);
        const poly = new g.maps.Polyline({ ...style, path });
        poly.setMap(map); legPolylinesRef.current[polyKey] = poly; path.forEach((p:any)=> bounds.extend(p)); anyPath = true; return;
      }
      // Custom flight rendering: skip Directions API, draw geodesic great-circle path
      if(leg.mode === 'flight') {
        // Minimal great-circle approximation using only endpoints is acceptable (Google renders geodesic arc)
        // For longer distances we can interpolate for smoother dashed pattern.
        const interpolateGreatCircle = (a:{lat:number; lng:number}, b:{lat:number; lng:number}, steps=32) => {
          const toRad = (deg:number)=> deg*Math.PI/180; const toDeg=(rad:number)=> rad*180/Math.PI;
          const lat1=toRad(a.lat), lon1=toRad(a.lng); const lat2=toRad(b.lat), lon2=toRad(b.lng);
          const d = 2*Math.asin(Math.sqrt(Math.sin((lat2-lat1)/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin((lon2-lon1)/2)**2));
          if(d===0) return [a,b];
          const sinD = Math.sin(d);
          const path: {lat:number; lng:number}[] = [];
          for(let i=0;i<=steps;i++){
            const f = i/steps;
            const A = Math.sin((1-f)*d)/sinD; const B = Math.sin(f*d)/sinD;
            const x = A*Math.cos(lat1)*Math.cos(lon1) + B*Math.cos(lat2)*Math.cos(lon2);
            const y = A*Math.cos(lat1)*Math.sin(lon1) + B*Math.cos(lat2)*Math.sin(lon2);
            const z = A*Math.sin(lat1) + B*Math.sin(lat2);
            const lat = Math.atan2(z, Math.sqrt(x*x + y*y));
            const lon = Math.atan2(y, x);
            path.push({ lat: toDeg(lat), lng: toDeg(lon) });
          }
          return path;
        };
        const path = interpolateGreatCircle({ lat:leg.from.lat, lng:leg.from.lng }, { lat:leg.to.lat, lng:leg.to.lng });
        directionsCacheRef.current[cacheKey] = path; // cache custom path
        if(legPolylinesRef.current[polyKey]) { legPolylinesRef.current[polyKey].setMap(null); delete legPolylinesRef.current[polyKey]; }
        const style = polylineStyleForMode(leg.mode, baseColor);
        const poly = new g.maps.Polyline({ ...style, path, geodesic:true });
        poly.setMap(map); legPolylinesRef.current[polyKey] = poly; path.forEach(p=> bounds.extend(p)); anyPath = true; return;
      }
      if(pendingLegsRef.current.has(cacheKey)) return; // already fetching
      pendingLegsRef.current.add(cacheKey);
  const travelMode = leg.mode==='walk' ? 'WALKING' : leg.mode==='car' ? 'DRIVING' : leg.mode==='bike' ? 'BICYCLING' : (leg.mode==='bus' || leg.mode==='train') ? 'TRANSIT' : 'DRIVING';
      const request:any = { origin:{ lat:leg.from.lat, lng:leg.from.lng }, destination:{ lat:leg.to.lat, lng:leg.to.lng }, travelMode };
      if(travelMode==='TRANSIT') request.transitOptions = { modes: leg.mode==='bus'? ['BUS'] : ['TRAIN'] };
      await new Promise<void>((resolve)=> {
        svc.route(request, (res:any, status:string) => {
          pendingLegsRef.current.delete(cacheKey);
          let path: any[] | null = null;
          if(status==='OK' && res?.routes?.length) {
            path = res.routes[0].overview_path.map((p:any)=> ({ lat:p.lat(), lng:p.lng() }));
            directionsCacheRef.current[cacheKey] = path;
          }
          if(!path) { path = [ { lat:leg.from.lat, lng:leg.from.lng }, { lat:leg.to.lat, lng:leg.to.lng } ]; }
          if(legPolylinesRef.current[polyKey]) { legPolylinesRef.current[polyKey].setMap(null); delete legPolylinesRef.current[polyKey]; }
          const style = polylineStyleForMode(leg.mode, baseColor);
          const poly = new g.maps.Polyline({ ...style, path });
          poly.setMap(map); legPolylinesRef.current[polyKey] = poly; path.forEach(p=> bounds.extend(p)); anyPath = true; resolve();
        });
      });
    };
    (async () => { for(const leg of legs) await fetchLeg(leg); if(anyPath) map.fitBounds(bounds); })();
  }, [destinations, theme.palette.primary.main]);

  // Clear polylines when route ordering explicitly optimized; they will regenerate next effect.
  useEffect(() => {
    const handler = () => {
      // Clear existing leg polylines fully so next destinations change regenerates them
      Object.values(legPolylinesRef.current).forEach(p=> p.setMap(null));
      legPolylinesRef.current = {}; // FIX: previously mistakenly assigned to .current property
      if(import.meta.env.DEV){
        // eslint-disable-next-line no-console
        console.log('[MapPanel] Cleared cached leg polylines after route-updated event');
      }
    };
    window.addEventListener('tripician:route-updated', handler as any);
    return () => window.removeEventListener('tripician:route-updated', handler as any);
  }, []);

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
    <Box sx={{ width: `${Math.round(widthFraction*100)}%`, position: 'relative', transition: 'width .25s ease', borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', p: 0 }}>
      <Box sx={{ flex: 1, position: 'relative', borderRadius: 0, overflow: 'hidden', /* removed shadow & rounded corners for flush layout */ boxShadow: 'none', background: theme.palette.mode==='dark' ? '#121416' : '#f2f5f8' }}>
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
