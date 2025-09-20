import React from 'react';
import { Box, Stack, Typography, Fade, InputBase, Paper, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab, Chip, Checkbox, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import TrainRoundedIcon from '@mui/icons-material/TrainRounded';
import DirectionsBusFilledRoundedIcon from '@mui/icons-material/DirectionsBusFilledRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
// SearchIcon already imported (above)
// (Icons for future dialogs removed for now)
import DestinationCard from './DestinationCard';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { addDestination, removeDestination, duplicateDestination, toggleDestinationCompleted, setDestinationCategory, renameDestination, addSpot, toggleSpot, removeSpot, reorderSpots, addFoodItem, toggleFoodItem, removeFoodItem, reorderFoods, setDestinationNotes, setDestinationStay, addDestinationDoc, removeDestinationDoc, updateDestinationNights } from '../../store/plannerSlice';
import AiActionButton from '../../components/CommonComponents/AiActionButton';

// Temporary flag enabling card layout; can be toggled via env or replaced with user setting later.
const ENABLE_CARD_LAYOUT = true;

interface DestinationCardsPanelProps {
  maxed: boolean;
}

/**
 * DestinationCardsPanel
 * Container rendering the list of DestinationCard components plus:
 *  - Inline row for adding a new destination (Enter to submit)
 *  - HTML5 drag-and-drop + keyboard accessible up/down controls
 *  - Dispatches Redux actions for all mutations (rename, duplicate, etc.)
 *  - Emits custom event 'tripician:ai-suggest' for future AI integration.
 */
const DestinationCardsPanel: React.FC<DestinationCardsPanelProps> = ({ maxed }) => {
  const dispatch = useDispatch<AppDispatch>();
  const planner = useSelector((s:RootState)=> s.planner);
  const destinations = planner.destinations;
  // Nights metrics removed from header; recompute later if reintroduced.
  const completedCount = React.useMemo(()=> destinations.filter(d=> d.completed).length, [destinations]);
  // Measurement refs for dynamic rail
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [railBounds, setRailBounds] = React.useState<{ top:number; bottom:number } | null>(null);
  const [centers, setCenters] = React.useState<number[]>([]); // centers relative to container
  const recomputeCenters = React.useCallback(()=> {
    const contRect = containerRef.current?.getBoundingClientRect();
    if(!contRect){ setCenters([]); setRailBounds(null); return; }
    const list:number[] = [];
    destinations.forEach(d => {
      const el = cardRefs.current[d.id];
      if(el){ const r = el.getBoundingClientRect(); list.push(r.top - contRect.top + r.height/2); }
    });
    setCenters(list);
    if(list.length >= 2){ setRailBounds({ top:list[0], bottom:list[list.length-1] }); } else { setRailBounds(null); }
  }, [destinations]);
  React.useLayoutEffect(()=> { recomputeCenters(); }, [recomputeCenters]);
  React.useEffect(()=> {
    const onResize = () => recomputeCenters();
    window.addEventListener('resize', onResize);
    return ()=> window.removeEventListener('resize', onResize);
  }, [recomputeCenters]);
  // Observe individual card size changes to keep numbers centered if content height shifts (e.g., async data)
  React.useEffect(()=> {
    if(!('ResizeObserver' in window)) return; // graceful degrade
    const ro = new ResizeObserver(()=> recomputeCenters());
    destinations.forEach(d => {
      const el = cardRefs.current[d.id];
      if(el) ro.observe(el);
    });
    // deferred recompute after initial paint to catch late layout adjustments
    const t = setTimeout(()=> recomputeCenters(), 120);
    return ()=> { ro.disconnect(); clearTimeout(t); };
  }, [destinations, recomputeCenters]);

  if(!ENABLE_CARD_LAYOUT) return null;

  // Google Places Autocomplete integration (restored)
  const [searchValue, setSearchValue] = React.useState('');
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [loadingPred, setLoadingPred] = React.useState(false);
  const sessionTokenRef = React.useRef<any | null>(null);
  const getAutocompleteService = () => {
    const g = (window as any).google;
    if (!g?.maps?.places) return null;
    if (!sessionTokenRef.current) sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
    if (!(window as any)._tripicianPlaceService) {
      (window as any)._tripicianPlaceService = new g.maps.places.AutocompleteService();
    }
    return (window as any)._tripicianPlaceService as any;
  };
  React.useEffect(()=> {
    if(!searchValue.trim()) { setPredictions([]); return; }
    const svc = getAutocompleteService();
    if(!svc) return; // script maybe not loaded yet
    let active = true;
    setLoadingPred(true);
    svc.getPlacePredictions({ input: searchValue, sessionToken: sessionTokenRef.current, types:['geocode','establishment'] }, (res: any[], status: string) => {
      if(!active) return;
      setLoadingPred(false);
      if(status !== 'OK' || !res) { setPredictions([]); return; }
      setPredictions(res.slice(0,6));
    });
    return ()=> { active=false; };
  }, [searchValue]);
  const selectPrediction = (p:any) => {
    const g = (window as any).google;
    if(!g?.maps?.places) return;
    const placesSvc = new g.maps.places.PlacesService(document.createElement('div'));
    placesSvc.getDetails({ placeId: p.place_id, fields:['name','geometry','photos'] }, (place:any, status:string) => {
      if(status==='OK' && place) {
        const name = place.name || p.description;
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        let photoUrl: string | undefined;
        if (place.photos && place.photos.length) {
          try { photoUrl = place.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 }); } catch {}
        }
        if(name) {
          dispatch(addDestination({ name, lat, lng, placeId: p.place_id, photoUrl }));
          setSearchValue(''); setPredictions([]);
        }
      }
    });
  };
  // Discover / Docs / Notes dialog state placeholders per-destination
  // Discover dialog state + supporting local UI state
  const [discoverFor, setDiscoverFor] = React.useState<string | null>(null);
  const [discoverTab, setDiscoverTab] = React.useState<'spots'|'foods'>('spots');
  const [spotSearch, setSpotSearch] = React.useState('');
  const [spotPredictions, setSpotPredictions] = React.useState<any[]>([]);
  const [spotSearchLoading, setSpotSearchLoading] = React.useState(false);
  const placeDetailsCache = React.useRef<Record<string,{ photoUrl?: string; mapUrl?: string; description?: string }>>({});
  const [foodInput, setFoodInput] = React.useState('');
  const placesServiceRef = React.useRef<any>(null);
  const scriptLoadingRef = React.useRef(false);
  const recommendedSpots = ['Central Park','Old Town','Museum of Art','River Walk','Sunset Point'];
  const recommendedFoods = ['Local BBQ','Seafood Platter','Street Tacos','Traditional Dessert','Coffee Roastery'];

  const plannerDestinations = destinations; // alias for readability

  // Transport modes (purely local UI state between consecutive destinations)
  type TransportMode = 'car' | 'flight' | 'train' | 'bus' | 'walk';
  const [transportModes, setTransportModes] = React.useState<TransportMode[]>([]); // index i => mode between i and i+1
  interface TransportLegDetail { distanceText?: string; durationText?: string; provider?: string; loading?: boolean; error?: string; }
  const [transportDetails, setTransportDetails] = React.useState<TransportLegDetail[]>([]); // parallel to transportModes
  const ensureTransportLength = React.useCallback(() => {
    setTransportModes(m => {
      if (m.length >= Math.max(0, destinations.length - 1)) return m;
      const copy = [...m];
      while (copy.length < Math.max(0, destinations.length - 1)) copy.push('car');
      return copy;
    });
    setTransportDetails(dets => {
      if (dets.length >= Math.max(0, destinations.length - 1)) return dets;
      const copy = [...dets];
      while (copy.length < Math.max(0, destinations.length - 1)) copy.push({ provider: undefined, loading:false });
      return copy;
    });
  }, [destinations.length]);
  React.useEffect(()=> { ensureTransportLength(); }, [ensureTransportLength]);
  const updateTransportMode = (index:number, mode:TransportMode) => {
    setTransportModes(m => m.map((x,i)=> i===index? mode : x));
    // Clear provider & cached distance/duration so computeLeg assigns the new default for the new mode
    setTransportDetails(dets => dets.map((d,i)=> {
      if(i!==index) return d;
      return { provider: undefined, distanceText: undefined, durationText: undefined, loading:false, error: undefined };
    }));
    // computeLeg effect will run and repopulate
  };

  const transportIcon = (mode:TransportMode, size=16) => {
    const props = { sx:{ fontSize:size } } as any;
    switch(mode){
      case 'flight': return <FlightTakeoffRoundedIcon {...props} />;
      case 'train': return <TrainRoundedIcon {...props} />;
      case 'bus': return <DirectionsBusFilledRoundedIcon {...props} />;
      case 'walk': return <DirectionsWalkRoundedIcon {...props} />;
      case 'car': default: return <DirectionsCarRoundedIcon {...props} />;
    }
  };

  // Dropdown anchor management for transport selection
  const [transportAnchor, setTransportAnchor] = React.useState<{ index:number; el:HTMLElement } | null>(null);
  const openTransportMenu = (index:number, el:HTMLElement) => setTransportAnchor({ index, el });
  const closeTransportMenu = () => setTransportAnchor(null);

  const defaultProviderForMode = (mode:TransportMode) => {
    switch(mode){
      case 'car': return 'Car';
      case 'bus': return 'Bus';
      case 'train': return 'Train';
      case 'walk': return 'Walk';
      case 'flight': return 'Flight';
    }
    return 'Transport';
  };

  // Migrate old provider label 'Rental car' to 'Car'
  React.useEffect(()=> {
    setTransportDetails(d => d.map(det => det.provider==='Rental car'? { ...det, provider:'Car'} : det));
  }, []);

  // Distance & duration fetching (Google Distance Matrix for ground/transit modes)
  const formatDuration = (seconds:number) => {
    const h = Math.floor(seconds/3600);
    const m = Math.round((seconds%3600)/60);
    if(h>0) return `${h} hr${h>1?'s':''} ${m>0? m+' min':''}`.trim();
    return `${m} min`;
  };
  const haversineKm = (lat1:number, lon1:number, lat2:number, lon2:number) => {
    const R = 6371; const dLat = (lat2-lat1)*Math.PI/180; const dLon = (lon2-lon1)*Math.PI/180; const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R*c;
  };
  const computeLeg = React.useCallback((index:number) => {
    if(!destinations[index] || !destinations[index+1]) return;
    const a = destinations[index]; const b = destinations[index+1];
    if(a.lat==null || a.lng==null || b.lat==null || b.lng==null){
      setTransportDetails(d => d.map((v,i)=> i===index? { ...v, error:'No coordinates' }: v));
      return;
    }
    const mode = transportModes[index] || 'car';
    // Flight custom calculation
    if(mode==='flight'){
      const distKm = haversineKm(a.lat,a.lng,b.lat,b.lng);
      // assume 800 km/h + 0.5h overhead
      const hours = distKm/800 + 0.5;
      const totalMin = Math.round(hours*60);
      const h = Math.floor(totalMin/60); const m = totalMin%60;
      const durationText = h>0? `${h} hr${h>1?'s':''} ${m>0? m+' min':''}` : `${m} min`;
      setTransportDetails(d => d.map((v,i)=> i===index? { ...v, distanceText: `${Math.round(distKm)} km`, durationText, provider: v.provider || defaultProviderForMode(mode), loading:false, error: undefined }: v));
      return;
    }
    const g:any = (window as any).google;
    if(!g?.maps?.DistanceMatrixService){
      // attempt to load script (already attempted for places). We'll just fallback to haversine approximate driving distance.
      const distKm = haversineKm(a.lat,a.lng,b.lat,b.lng);
      setTransportDetails(d => d.map((v,i)=> i===index? { ...v, distanceText:`~${Math.round(distKm)} km`, durationText:'', provider: v.provider || defaultProviderForMode(mode), loading:false, error:'API not ready' }: v));
      return;
    }
    setTransportDetails(d => d.map((v,i)=> i===index? { ...v, loading:true, error: undefined, provider: v.provider || defaultProviderForMode(mode) }: v));
    const service = new g.maps.DistanceMatrixService();
    const travelMode = mode==='car'? g.maps.TravelMode.DRIVING : mode==='walk'? g.maps.TravelMode.WALKING : g.maps.TravelMode.TRANSIT;
    service.getDistanceMatrix({
      origins:[{ lat:a.lat, lng:a.lng }],
      destinations:[{ lat:b.lat, lng:b.lng }],
      travelMode,
      unitSystem: g.maps.UnitSystem.METRIC
    }, (res:any, status:string) => {
      if(status!=='OK'){ setTransportDetails(d => d.map((v,i)=> i===index? { ...v, loading:false, error:status }: v)); return; }
      const element = res.rows?.[0]?.elements?.[0];
      if(!element || element.status!=='OK'){ setTransportDetails(d => d.map((v,i)=> i===index? { ...v, loading:false, error: element?.status || 'NO_RESULT' }: v)); return; }
      setTransportDetails(d => d.map((v,i)=> i===index? { ...v, loading:false, distanceText: element.distance?.text, durationText: element.duration? formatDuration(element.duration.value): undefined, provider: v.provider || defaultProviderForMode(mode) }: v));
    });
  }, [destinations, transportModes]);

  // Recompute distances when destinations, modes change
  React.useEffect(()=> {
    for(let i=0;i<destinations.length-1;i++) computeLeg(i);
  }, [destinations, transportModes, computeLeg]);

  const editProvider = (index:number) => {
    const current = transportDetails[index]?.provider || defaultProviderForMode(transportModes[index]||'car');
    const val = window.prompt('Provider / Carrier name', current);
    if(val){
      setTransportDetails(d => d.map((v,i)=> i===index? { ...v, provider: val }: v));
    }
  };

  // Notes Dialog
  const [notesFor, setNotesFor] = React.useState<string | null>(null);
  const [notesDraft, setNotesDraft] = React.useState('');
  const openNotes = (id:string) => { setNotesFor(id); const d = plannerDestinations.find(p=> p.id===id); setNotesDraft(d?.notes||''); };
  const closeNotes = () => { setNotesFor(null); };
  const saveNotes = () => { if(notesFor) dispatch(setDestinationNotes({ id: notesFor, notes: notesDraft })); closeNotes(); };

  // Stay Dialog
  const [stayFor, setStayFor] = React.useState<string | null>(null);
  const [stayDraft, setStayDraft] = React.useState<{ name?: string; reference?: string; notes?: string }>({});
  const openStay = (id:string) => { setStayFor(id); const d = plannerDestinations.find(p=> p.id===id); setStayDraft(d?.stay || {}); };
  const closeStay = () => { setStayFor(null); };
  const saveStay = () => { if(stayFor) dispatch(setDestinationStay({ id: stayFor, stay: stayDraft })); closeStay(); };

  // Docs Dialog
  const [docsFor, setDocsFor] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const openDocs = (id:string) => { setDocsFor(id); };
  const closeDocs = () => { setDocsFor(null); };
  const onSelectDocs = (files: FileList | null) => {
    if(!docsFor || !files) return;
    Array.from(files).forEach((f,idx) => {
      const id = f.name + '_' + Date.now().toString(36) + '_' + idx;
      const url = URL.createObjectURL(f);
      dispatch(addDestinationDoc({ destinationId: docsFor, doc: { id, originalName: f.name, mimeType: f.type, url } }));
    });
  };
  const removeDoc = (docId:string) => { if(!docsFor) return; dispatch(removeDestinationDoc({ destinationId: docsFor, docId })); };

  // Load google script for spot search if needed
  const ensurePlacesScript = React.useCallback(() => {
    if (placesServiceRef.current) return true;
    const w: any = window;
    if (w.google?.maps?.places) {
      placesServiceRef.current = new w.google.maps.places.AutocompleteService();
      return true;
    }
    if (scriptLoadingRef.current) return false;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return false;
    scriptLoadingRef.current = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true; script.defer = true;
    script.onload = () => {
      scriptLoadingRef.current = false;
      if (w.google?.maps?.places) {
        placesServiceRef.current = new w.google.maps.places.AutocompleteService();
        if (spotSearch) triggerSpotSearch(spotSearch);
      }
    };
    document.head.appendChild(script);
    return false;
  }, [spotSearch]);

  const triggerSpotSearch = React.useCallback((query: string) => {
    if (!query.trim()) { setSpotPredictions([]); return; }
    const ready = ensurePlacesScript();
    if (!ready || !placesServiceRef.current) {
      setSpotSearchLoading(true);
      const fake = Array.from({length:2}).map((_,i)=> ({ description: query + ' (loading '+(i+1)+')', place_id: query + '_fake_'+i }));
      setTimeout(()=> { setSpotPredictions(fake); setSpotSearchLoading(false); }, 300);
      return;
    }
    setSpotSearchLoading(true);
    placesServiceRef.current.getPlacePredictions({ input: query }, (preds: any[]) => {
      const allow = new Set(['tourist_attraction','point_of_interest','establishment']);
      const filtered = (preds || []).filter(p => !p.types || p.types.some((t:string)=> allow.has(t)));
      setSpotPredictions(filtered);
      setSpotSearchLoading(false);
    });
  }, [ensurePlacesScript]);
  React.useEffect(()=> { const d = setTimeout(()=> triggerSpotSearch(spotSearch), 450); return ()=> clearTimeout(d); }, [spotSearch, triggerSpotSearch]);

  const fetchPlacePhoto = React.useCallback((placeId:string): Promise<{ photoUrl?: string; mapUrl?: string; description?: string }> => {
    if (placeDetailsCache.current[placeId]) return Promise.resolve(placeDetailsCache.current[placeId]);
    return new Promise(resolve => {
      const g = (window as any).google;
      if (!g?.maps?.places) return resolve({});
      const svc = new g.maps.places.PlacesService(document.createElement('div'));
      svc.getDetails({ placeId, fields:['photos','url','editorial_summary','formatted_address','types','name'] }, (place:any, status:string) => {
        if (status !== 'OK' || !place) { resolve({}); return; }
        let photoUrl: string | undefined;
        if (place.photos && place.photos.length) {
          try { photoUrl = place.photos[0].getUrl({ maxWidth: 480, maxHeight: 320 }); } catch {}
        }
        let description: string | undefined;
        if (place.editorial_summary?.overview) {
          description = place.editorial_summary.overview.split(/\n|\.|!/)[0].trim();
        }
        if (!description && place.formatted_address) {
          const addr = place.formatted_address as string;
          const nameLower = (place.name||'').toLowerCase();
          description = addr.toLowerCase().startsWith(nameLower) ? addr.slice(place.name.length).replace(/^,\s*/, '') : addr;
        }
        if (!description && Array.isArray(place.types) && place.types.length) {
          const typeMap: Record<string,string> = { tourist_attraction:'Tourist attraction', point_of_interest:'Point of interest' };
          description = typeMap[place.types[0]] || place.types[0].replace(/_/g,' ');
        }
        const result = { photoUrl, mapUrl: place.url as string | undefined, description };
        placeDetailsCache.current[placeId] = result;
        resolve(result);
      });
    });
  }, []);

  const addSpotFromPrediction = React.useCallback(async (p:any) => {
    if(!discoverFor) return;
    const { photoUrl, mapUrl, description } = await fetchPlacePhoto(p.place_id);
    dispatch(addSpot({ destinationId: discoverFor, name: p.description, known:true, mapUrl: mapUrl || `https://maps.google.com/?q=${encodeURIComponent(p.description)}`, placeId: p.place_id, photoUrl, description }));
    setSpotSearch(''); setSpotPredictions([]);
  }, [dispatch, discoverFor, fetchPlacePhoto]);

  const openDiscover = (id:string) => { setDiscoverFor(id); setDiscoverTab('spots'); setSpotSearch(''); setSpotPredictions([]); };
  const closeDiscover = () => { setDiscoverFor(null); setSpotSearch(''); setSpotPredictions([]); };


  return (
    <Fade in timeout={300}>
  <Box sx={{ px:2.5, py:2, display:'flex', flexDirection:'column', gap:2, position:'relative', minHeight: '100%' }}>
        <Box sx={{ display:'flex', alignItems:{ xs:'flex-start', sm:'center' }, justifyContent:'space-between', flexWrap:'wrap', gap:1.5, pr:1 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.25, flexWrap:'wrap' }}>
            <Typography variant='h6' sx={{ fontWeight:700, letterSpacing:.3, display:'flex', alignItems:'center', gap:1 }}>
              Destinations
              <Box component='span' sx={(t)=>({ fontSize:12, fontWeight:600, background: t.palette.mode==='dark'? t.palette.background.paper : t.palette.grey[100], color: t.palette.text.secondary, px:1, py:0.25, borderRadius:10, lineHeight:1, border:'1px solid '+t.palette.divider })}>{destinations.length}</Box>
            </Typography>
            <Typography variant='caption' sx={{ opacity:.7 }}>
              Plan each stop, discover spots & manage stays.
            </Typography>
          </Box>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
            <Box sx={(t)=>({ display:'flex', alignItems:'center', gap:.55, fontSize:11, background: t.palette.mode==='dark'? t.palette.background.paper : t.palette.common.white, border:'1px solid '+t.palette.divider, px:1, py:0.5, borderRadius:20, boxShadow: t.palette.mode==='dark'? '0 1px 2px rgba(0,0,0,0.6)':'0 1px 2px rgba(0,0,0,0.04)' })}>
              <Box sx={(t)=>({ width:6, height:6, borderRadius:'50%', background: t.palette.primary.main })} />
              <span style={{ fontWeight:600 }}>{destinations.length} stop{destinations.length!==1?'s':''}</span>
            </Box>
            {/* Removed nights pill as requested */}
            <Box sx={(t)=>({ display:'flex', alignItems:'center', gap:.55, fontSize:11, background: t.palette.mode==='dark'? t.palette.background.paper : t.palette.common.white, border:'1px solid '+t.palette.divider, px:1, py:0.5, borderRadius:20 })}>
              <Box sx={(t)=>({ width:6, height:6, borderRadius:'50%', background: t.palette.secondary.main })} />
              <span style={{ fontWeight:600 }}>{completedCount} done</span>
            </Box>
            {/* Nights progress bar removed as requested */}
          </Box>
        </Box>
        {/* Timeline rail + cards */}
  <Box ref={containerRef} sx={{ position:'relative', pl:8 /* extra space for rail */, maxWidth:1100, mx:'auto' }}>
          {/* Dynamic vertical dotted rail spanning from first to last node center */}
          {railBounds && (
            <>
              <Box aria-hidden='true' sx={{ position:'absolute', top:railBounds.top, height: railBounds.bottom - railBounds.top, left:18, width:2, background:'repeating-linear-gradient(to bottom, #6b7280 0 4px, transparent 4px 8px)', pointerEvents:'none' }} />
              {/* Nodes overlay */}
              {centers.map((c, idx)=> (
                <Box key={'node-'+idx} aria-hidden='true' sx={{ position:'absolute', top:c, left:6, width:28, height:24, display:'flex', alignItems:'center', justifyContent:'center', transform:'translateY(-50%)', zIndex:3 }}>
                  <Box sx={(t)=>({ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, background: t.palette.background.paper, border:'2px solid '+t.palette.divider, color: t.palette.text.primary, boxShadow: t.palette.mode==='dark'? '0 1px 2px rgba(0,0,0,0.8)':'0 1px 2px rgba(0,0,0,0.06)' })}>{idx+1}</Box>
                </Box>
              ))}
              {/* Transport selectors at midpoints between centers */}
              {centers.length>1 && centers.slice(0,-1).map((c, idx)=> {
                const next = centers[idx+1];
                const mid = (c + next)/2;
                const detail = transportDetails[idx];
                const mode = transportModes[idx]||'car';
                const provider = detail?.provider || defaultProviderForMode(mode);
                const tooltipContent = (
                  <Box sx={{ fontSize:12, display:'flex', flexDirection:'column', gap:0.25 }}>
                    {detail?.loading && <span style={{ opacity:.8 }}>Calculating...</span>}
                    {!detail?.loading && (detail?.distanceText || detail?.durationText) && (
                      <span><strong>{detail?.distanceText || ''}</strong>{detail?.durationText? ' • '+detail.durationText: ''}</span>
                    )}
                    {!detail?.loading && !detail?.distanceText && !detail?.durationText && !detail?.error && (
                      <span style={{ opacity:.75 }}>No data yet</span>
                    )}
                    {detail?.error && <span style={{ color:'#dc2626' }}>Error: {detail.error}</span>}
                  </Box>
                );
                return (
                  <Box key={'transport-'+idx} aria-hidden='false' sx={{ position:'absolute', top:mid, left:18, transform:'translate(-50%, -50%)', zIndex:4 }}>
                    <Tooltip arrow placement='right' title={tooltipContent} enterDelay={300}>
                      <Box onClick={(e)=> openTransportMenu(idx, e.currentTarget)} sx={(t)=>({ cursor:'pointer', display:'flex', alignItems:'center', gap:.5, background:t.palette.background.paper, border:'1px solid '+t.palette.divider, borderRadius:20, padding:'4px 10px', boxShadow: t.palette.mode==='dark'? '0 1px 3px rgba(0,0,0,0.6)':'0 1px 3px rgba(0,0,0,0.18)', fontSize:12, lineHeight:1.2, maxWidth:180, whiteSpace:'nowrap', transition:'background .15s, box-shadow .15s', '&:hover':{ background: t.palette.action.hover } })}>
                        <Box sx={(t)=>({ display:'flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', background: t.palette.mode==='dark'? t.palette.grey[800]:'#f3f4f6', color: t.palette.text.primary, flexShrink:0 })}>
                          {transportIcon(mode, 16)}
                        </Box>
                        <Box sx={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{provider}</Box>
                      </Box>
                    </Tooltip>
                  </Box>
                );
              })}
            </>
          )}
          {destinations.length===0 ? (
            <Box sx={(t)=>({ mt:2, border:'2px dashed '+t.palette.divider, borderRadius:4, p:5, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:1.5, background: t.palette.mode==='dark'? 'linear-gradient(145deg,#0f172a,#1e293b)':'linear-gradient(135deg,#f8fafc,#f1f5f9)' })}>
              <Typography variant='body2' sx={(t)=>({ maxWidth:560, fontWeight:500, lineHeight:1.5, color: t.palette.text.secondary })}>
                <strong>Explore World</strong> · <strong>Exceed Limits</strong> · <strong>Expand Mind</strong>
              </Typography>
              <Typography variant='caption' sx={{ opacity:.7 }}>Add your first destination to start building a remarkable trip.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {destinations.map((d,i)=> {
                return (
                  <Box key={d.id} ref={(el: HTMLDivElement | null)=> { cardRefs.current[d.id]=el; }} sx={{ position:'relative', pb: i < destinations.length-1 ? 3 : 0 }}>
                    <Box sx={{ borderRadius:3 }}>
                      <DestinationCard
                        destination={d}
                        onRename={(id,name)=> dispatch(renameDestination({ id, name }))}
                        onChangeCategory={(id,category)=> dispatch(setDestinationCategory({ id, category }))}
                        onToggleComplete={(id)=> dispatch(toggleDestinationCompleted({ id }))}
                        onDuplicate={(id)=> dispatch(duplicateDestination({ id }))}
                        onRemove={(id)=> dispatch(removeDestination(id))}
                        onOpenNotes={()=> openNotes(d.id)}
                        onOpenDiscover={()=> openDiscover(d.id)}
                        onOpenDocs={()=> openDocs(d.id)}
                        onOpenStay={()=> openStay(d.id)}
                        onChangeNights={(id, delta)=> dispatch(updateDestinationNights({ id, delta }))}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
        {/* Bottom Add Destination Search */}
        <Menu
          open={Boolean(transportAnchor)}
          anchorEl={transportAnchor?.el}
          onClose={closeTransportMenu}
          anchorOrigin={{ vertical:'bottom', horizontal:'center' }}
          transformOrigin={{ vertical:'top', horizontal:'center' }}
          MenuListProps={{ dense:true }}
        >
          {(['car','flight','train','bus','walk'] as TransportMode[]).map(mode => (
            <MenuItem key={mode} selected={transportModes[transportAnchor?.index||0]===mode} onClick={()=> { if(transportAnchor) updateTransportMode(transportAnchor.index, mode); closeTransportMenu(); }}>
              <ListItemIcon>
                {transportIcon(mode, 18)}
              </ListItemIcon>
              <ListItemText primary={mode.charAt(0).toUpperCase()+mode.slice(1)} />
            </MenuItem>
          ))}
          {transportAnchor && (
            <MenuItem onClick={()=> { editProvider(transportAnchor.index); }}>
              <ListItemText primary='Edit Provider Name' />
            </MenuItem>
          )}
        </Menu>

        <Box sx={{ position:'relative', mt:3, maxWidth:640 }}>
          <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5, mb:.75, display:'block', opacity:.75 }}>Add Destination</Typography>
          <Paper elevation={0} sx={(t)=>({ position:'relative', display:'flex', alignItems:'center', gap:1, px:1.25, py:0.75, pr:1, borderRadius:999, border:'1px solid '+t.palette.divider, background: t.palette.mode==='dark'? 'rgba(255,255,255,0.04)':'#fff', boxShadow: t.palette.mode==='dark'? '0 2px 8px -2px rgba(0,0,0,0.7)':'0 3px 10px -4px rgba(0,0,0,0.15)', transition:'box-shadow .25s, border-color .25s', '&:focus-within':{ borderColor: t.palette.primary.main, boxShadow: t.palette.mode==='dark'? '0 0 0 3px rgba(59,130,246,0.25)':'0 0 0 3px rgba(59,130,246,0.15)' }, opacity:maxed? .55:1 })}>
            <SearchIcon sx={{ fontSize:19, opacity:.65 }} />
            <InputBase
              disabled={maxed}
              placeholder={maxed? 'Night limit reached':'Search places to add destination'}
              value={searchValue}
              onChange={e=> setSearchValue(e.target.value)}
              sx={{ flex:1, fontSize:14.2, fontWeight:500, letterSpacing:.15, pr:1 }}
            />
            <Box sx={{ display:{ xs:'none', sm:'flex' }, alignItems:'center', fontSize:10, gap:.35, color:'text.secondary', mr:.5 }}>Powered by <Box component='img' alt='Google' src={import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'} sx={{ height:12 }} /></Box>
            <AiActionButton
              disabled={maxed}
              size='small'
              sx={{ borderRadius:30, px:2.25, py:0.85, fontSize:13 }}
            >
              AI Suggest
            </AiActionButton>
            {loadingPred && <LinearProgress sx={{ position:'absolute', left:14, right:14, bottom:4, height:2, borderRadius:1 }} />}
          </Paper>
          {predictions.length>0 && searchValue && (
            <Paper elevation={8} sx={{ position:'absolute', top:'100%', left:0, right:0, mt:1, zIndex:8, maxHeight:320, overflowY:'auto', borderRadius:3, border:'1px solid', borderColor:'divider' }}>
              {predictions.map(p => (
                <Box key={p.place_id} onClick={()=> selectPrediction(p)} sx={(t)=>({ px:1.25, py:.8, cursor:'pointer', borderBottom:`1px solid ${t.palette.divider}`, '&:last-of-type':{ borderBottom:'none' }, '&:hover':{ background:t.palette.action.hover }, fontSize:13.2, display:'flex', flexDirection:'column', gap:.2 })}>
                  <span style={{ fontWeight:600 }}>{p.structured_formatting?.main_text || p.description}</span>
                  {p.structured_formatting?.secondary_text && <span style={{ opacity:.7 }}>{p.structured_formatting.secondary_text}</span>}
                </Box>
              ))}
            </Paper>
          )}
        </Box>
        {/* Discover Dialog */}
        <Dialog
          open={Boolean(discoverFor)}
          onClose={closeDiscover}
          fullWidth
          maxWidth={false}
          PaperProps={{ sx:{ width:'min(1200px, 92vw)', height:'min(760px, 82vh)', display:'flex', flexDirection:'column', borderRadius:4 } }}
        >
          {discoverFor && (()=> {
            const pd = plannerDestinations.find(p=> p.id===discoverFor);
            const spotsCount = pd?.spots?.length || 0;
            const foodsCount = pd?.foods?.length || 0;
            const mkLabel = (text:string, count:number, colorVariant:'primary'|'secondary') => (
              <Box sx={{ display:'flex', alignItems:'center', gap:.75 }}>
                <span>{text.toUpperCase()}</span>
                {count>0 && (
                  <Box sx={(theme)=>({ minWidth:18, height:18, px:0.75, borderRadius:9, background: theme.palette[colorVariant].main, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, lineHeight:1, boxShadow:'0 0 0 2px '+theme.palette.background.paper })}>{count}</Box>
                )}
              </Box>
            );
            const renderSpotCards = (spots:any[]) => (
              <Box sx={{ display:'flex', flexDirection:'column', gap:1, maxHeight:420, overflowY:'auto', pr:1 }}>
                {spots.map((s:any, index:number) => (
                  <Paper key={s.id} elevation={0} draggable onDragStart={(e)=> { e.dataTransfer.setData('text/plain', s.id); }} onDrop={(e)=> { e.preventDefault(); if(!discoverFor) return; const fromId = e.dataTransfer.getData('text/plain'); const arr = spots; const fromIndex = arr.findIndex((x:any)=> x.id===fromId); const toIndex = arr.findIndex((x:any)=> x.id===s.id); if (fromIndex>-1 && toIndex>-1 && fromIndex!==toIndex) dispatch(reorderSpots({ destinationId: discoverFor, fromIndex, toIndex })); }} sx={(theme)=>({ display:'flex', alignItems:'stretch', border:'1px solid', borderColor:'divider', borderRadius:2, overflow:'hidden', position:'relative', background: theme.palette.background.paper, boxShadow:'0 1px 2px rgba(0,0,0,0.06)', transition:'box-shadow .2s, transform .2s', '&:hover':{ boxShadow: theme.palette.mode==='dark'? '0 4px 14px -4px rgba(0,0,0,0.6)':'0 6px 18px -6px rgba(0,0,0,0.15)', transform:'translateY(-2px)' } })}>
                    <Box sx={{ width:110, height:78, flexShrink:0, position:'relative', background: s.photoUrl? 'transparent':'linear-gradient(135deg,#EEF2F6,#E2E8F0)' , display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {s.photoUrl ? <Box component='img' src={s.photoUrl} alt={s.name} loading='lazy' sx={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <MapIcon sx={{ fontSize:34, opacity:.35 }} />}
                      <Box sx={(theme)=>({ position:'absolute', top:4, left:4, minWidth:20, height:20, px:0.75, borderRadius:10, background: theme.palette.primary.main, color:'#fff', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 2px '+theme.palette.background.paper })}>{index+1}</Box>
                    </Box>
                    <Box sx={{ flex:1, p:1, display:'flex', flexDirection:'column', gap:.5 }}>
                      <Box sx={{ display:'flex', alignItems:'flex-start', gap:1 }}>
                        <Checkbox size='small' checked={s.checked} onChange={()=> discoverFor && dispatch(toggleSpot({ destinationId: discoverFor, spotId: s.id }))} sx={{ p:0.25, mt:-0.25 }} />
                        <Box sx={{ flex:1, display:'flex', flexDirection:'column', gap:.25, minWidth:0 }}>
                          <Typography variant='body2' sx={{ fontWeight:500, lineHeight:1.3, whiteSpace:'normal' }}>{s.name}</Typography>
                          {s.description && (
                            <Typography variant='caption' sx={{ color:'text.secondary', lineHeight:1.2, display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden', textOverflow:'ellipsis' }}>{s.description}</Typography>
                          )}
                        </Box>
                        {s.mapUrl && (
                          <IconButton size='small' component='a' href={s.mapUrl} target='_blank' rel='noopener'>
                            <MapIcon fontSize='inherit' />
                          </IconButton>
                        )}
                        <IconButton size='small' onClick={()=> discoverFor && dispatch(removeSpot({ destinationId: discoverFor, spotId: s.id }))}>
                          <DeleteOutlineIcon fontSize='inherit' />
                        </IconButton>
                        <DragIndicatorIcon fontSize='small' sx={{ cursor:'grab', opacity:.5, mt:0.25 }} />
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            );
            return (
              <>
                <DialogTitle sx={{ pb:0 }}>
                  <Box sx={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
                    <Box>
                      <Typography variant='h6' sx={{ fontWeight:700 }}>{pd?.name || 'Destination'}</Typography>
                      <Typography variant='caption' sx={{ opacity:.7 }}>Curate your {discoverTab==='spots' ? 'must-see spots' : 'must-try foods'} like a pro.</Typography>
                    </Box>
                    <Tabs value={discoverTab} onChange={(_,v)=> setDiscoverTab(v)} sx={{ ml:'auto' }} textColor='primary' indicatorColor='primary'>
                      <Tab value='spots' label={mkLabel('Spots', spotsCount, 'primary')} sx={{ fontWeight:600, py:1 }} />
                      <Tab value='foods' label={mkLabel('Foods', foodsCount, 'secondary')} sx={{ fontWeight:600, py:1 }} />
                    </Tabs>
                  </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ pt:3, bgcolor:(theme)=> theme.palette.mode==='dark'? '#121212' : '#fafafa', flex:1, overflow:'auto' }}>
                  <Box sx={{ display:'flex', gap:3, alignItems:'flex-start' }}>
                    <Box sx={{ flex:2, display:'flex', flexDirection:'column', gap:1 }} onDragOver={(e)=> e.preventDefault()}>
                      <Typography variant='subtitle2' sx={{ fontWeight:700, letterSpacing:.5, textTransform:'uppercase', fontSize:12 }}>
                        {discoverTab==='spots' ? 'Spot List' : 'Food List'}
                      </Typography>
                      {discoverTab==='spots' && renderSpotCards(pd?.spots || [])}
                      {discoverTab==='spots' && (pd?.spots?.length===0) && (
                        <Typography variant='caption' sx={{ opacity:.6, fontStyle:'italic', mt:1 }}>No spots yet. Use recommendations or search to add.</Typography>
                      )}
                      {discoverTab==='foods' && pd?.foods?.map((f:any) => (
                        <Box key={f.id} draggable onDragStart={(e)=> { e.dataTransfer.setData('text/plain', f.id); }} onDrop={(e)=> { e.preventDefault(); if(!discoverFor) return; const fromId = e.dataTransfer.getData('text/plain'); const arr = pd?.foods || []; const fromIndex = arr.findIndex((x:any)=> x.id===fromId); const toIndex = arr.findIndex((x:any)=> x.id===f.id); if (fromIndex>-1 && toIndex>-1 && fromIndex!==toIndex) dispatch(reorderFoods({ destinationId: discoverFor, fromIndex, toIndex })); }} sx={(theme)=>({ position:'relative', display:'flex', alignItems:'center', gap:1, fontSize:13, p:1, pl:1.25, border:'1px solid', borderColor:'divider', borderRadius:1.5, background: theme.palette.background.paper, boxShadow: theme.palette.mode==='dark'? '0 0 0 1px rgba(255,255,255,0.04)' : '0 1px 2px rgba(0,0,0,0.06)', transition:'background .2s, border-color .2s', '&:hover':{ background: theme.palette.action.hover } })}>
                          <DragIndicatorIcon fontSize='small' sx={{ cursor:'grab', opacity:.5 }} />
                          <input type='checkbox' checked={f.checked} onChange={()=> discoverFor && dispatch(toggleFoodItem({ destinationId: discoverFor, foodId: f.id }))} />
                          <Typography variant='body2' sx={{ flex:1, fontWeight:500 }}>{f.name}</Typography>
                          <IconButton size='small' onClick={()=> discoverFor && dispatch(removeFoodItem({ destinationId: discoverFor, foodId: f.id }))}>
                            <DeleteOutlineIcon fontSize='inherit' />
                          </IconButton>
                        </Box>
                      ))}
                      {discoverTab==='foods' && (pd?.foods?.length===0) && (
                        <Typography variant='caption' sx={{ opacity:.6, fontStyle:'italic', mt:1 }}>No foods yet. Use recommendations to add.</Typography>
                      )}
                    </Box>
                    <Paper variant='outlined' sx={{ flex:1.2, p:2.25, pb:7, position:'relative', borderRadius:3, background:(theme)=> theme.palette.mode==='dark'? 'linear-gradient(145deg,#1e1e1e,#161616)' : 'linear-gradient(145deg,#ffffff,#f2f5f9)' }}>
                      <Typography variant='subtitle2' sx={{ fontWeight:700, mb:1 }}>{discoverTab==='spots' ? `Recommendations in ${pd?.name}` : `Local Foods in ${pd?.name}`}</Typography>
                      <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mb: discoverTab==='spots'? 2:2 }}>
                        {(discoverTab==='spots'? recommendedSpots: recommendedFoods).map(r => (
                          <Chip key={r} label={r} size='small' color={discoverTab==='spots'?'primary':'secondary'} variant='outlined' onClick={()=> discoverTab==='spots' ? (discoverFor && dispatch(addSpot({ destinationId: discoverFor, name: r, known:true, mapUrl:`https://maps.google.com/?q=${encodeURIComponent(r+' '+(pd?.name||''))}` }))) : (discoverFor && dispatch(addFoodItem({ destinationId: discoverFor, name: r })))} sx={{ cursor:'pointer' }} />
                        ))}
                      </Box>
                      {discoverTab==='spots' && (
                        <Box sx={{ mb:2 }}>
                          <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5, textTransform:'uppercase', display:'block', mb:.75 }}>Google Search</Typography>
                          <Box sx={{ position:'relative' }}>
                            <InputBase value={spotSearch} onChange={e=> setSpotSearch(e.target.value)} placeholder='Search attractions, landmarks...' sx={{ border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.5, width:'100%', fontSize:14 }} startAdornment={<SearchIcon fontSize='small' style={{ marginRight:4, opacity:.6 }} />} />
                            {spotSearchLoading && <LinearProgress sx={{ position:'absolute', left:0, right:0, bottom:-2, height:2 }} />}
                          </Box>
                          <Box sx={{ mt:1, maxHeight:170, overflowY:'auto', pr:0.5 }}>
                            {!spotSearchLoading && spotPredictions.map(p => (
                              <Box key={p.place_id} onClick={()=> addSpotFromPrediction(p)} sx={(theme)=>({ p:0.6, px:1, border:'1px solid', borderColor:'divider', borderRadius:1, mb:0.5, cursor:'pointer', fontSize:12.5, display:'flex', alignItems:'center', gap:.5, background: theme.palette.background.paper, '&:hover':{ background: theme.palette.action.hover } })}>
                                <SearchIcon sx={{ fontSize:14, opacity:.5 }} /> {p.description}
                              </Box>
                            ))}
                            {(!spotSearchLoading && spotSearch && spotPredictions.length===0) && (
                              <Typography variant='caption' sx={{ opacity:.6 }}>No results.</Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                      {discoverTab==='foods' && (
                        <Box sx={{ mb:2 }}>
                          <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5, textTransform:'uppercase', display:'block', mb:.75 }}>Add Custom Food</Typography>
                          <Box component='form' onSubmit={(e)=> { e.preventDefault(); const name = foodInput.trim(); if(!name || !discoverFor) return; const exists = pd?.foods?.some((f:any)=> f.name.toLowerCase() === name.toLowerCase()); if(exists) return; dispatch(addFoodItem({ destinationId: discoverFor, name })); setFoodInput(''); }} sx={{ display:'flex', gap:1 }}>
                            <InputBase value={foodInput} onChange={e=> setFoodInput(e.target.value)} placeholder='e.g. Ramen, Gelato, Tapas...' sx={{ flex:1, border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.5, fontSize:14 }} />
                            <Button variant='contained' size='small' disabled={!foodInput.trim()} type='submit' sx={{ textTransform:'none' }}>Add</Button>
                          </Box>
                          <Typography variant='caption' sx={{ display:'block', mt:.75, opacity:.6 }}>Press Enter or Add. Duplicates ignored.</Typography>
                        </Box>
                      )}
                      {discoverTab==='spots' && (
                        <Typography variant='caption' sx={{ display:'flex', alignItems:'center', gap:0.5, mt:1.5, opacity:.75 }}>
                          Powered by <Box component='img' alt='Google' src={import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'} sx={{ height:14 }} loading='lazy' />
                        </Typography>
                      )}
                      <Box sx={{ position:'absolute', bottom:12, right:12 }}>
                        <AiActionButton
                          startIcon={<SmartToyIcon />}
                          onClick={()=>{
                            // eslint-disable-next-line no-console
                            console.log('[AI] AI Suggest (discover dialog corner) clicked');
                          }}
                        >
                          AI Suggest
                        </AiActionButton>
                      </Box>
                    </Paper>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={closeDiscover}>Close</Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>
        {/* Notes Dialog */}
        <Dialog open={Boolean(notesFor)} onClose={closeNotes} fullWidth maxWidth='sm'>
          <DialogTitle>Notes</DialogTitle>
          <DialogContent>
            <InputBase
              autoFocus
              multiline
              minRows={6}
              value={notesDraft}
              onChange={e=> setNotesDraft(e.target.value)}
              placeholder='Write notes about this destination...'
              sx={{ width:'100%', border:'1px solid', borderColor:'divider', borderRadius:2, p:1, fontSize:14 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeNotes}>Cancel</Button>
            <Button variant='contained' onClick={saveNotes}>Save</Button>
          </DialogActions>
        </Dialog>
        {/* Stay Dialog */}
        <Dialog open={Boolean(stayFor)} onClose={closeStay} fullWidth maxWidth='sm'>
          <DialogTitle>Stay / Accommodation</DialogTitle>
          <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:2 }}>
            <Box>
              <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5 }}>Property Name</Typography>
              <InputBase value={stayDraft.name||''} onChange={e=> setStayDraft(s=> ({ ...s, name: e.target.value }))} placeholder='e.g. Grand Hotel' sx={{ mt:.5, width:'100%', border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.6, fontSize:14 }} />
            </Box>
            <Box>
              <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5 }}>Reference / Booking #</Typography>
              <InputBase value={stayDraft.reference||''} onChange={e=> setStayDraft(s=> ({ ...s, reference: e.target.value }))} placeholder='Confirmation code' sx={{ mt:.5, width:'100%', border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.6, fontSize:14 }} />
            </Box>
            <Box>
              <Typography variant='caption' sx={{ fontWeight:600, letterSpacing:.5 }}>Notes</Typography>
              <InputBase value={stayDraft.notes||''} onChange={e=> setStayDraft(s=> ({ ...s, notes: e.target.value }))} placeholder='Check-in details, reminders...' multiline minRows={4} sx={{ mt:.5, width:'100%', border:'1px solid', borderColor:'divider', borderRadius:1.5, px:1, py:.8, fontSize:14 }} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeStay}>Cancel</Button>
            <Button variant='contained' onClick={saveStay}>Save</Button>
          </DialogActions>
        </Dialog>
        {/* Docs Dialog */}
        <Dialog open={Boolean(docsFor)} onClose={closeDocs} fullWidth maxWidth='sm'>
          <DialogTitle>Documents</DialogTitle>
            <DialogContent>
              <input ref={fileInputRef} type='file' multiple hidden onChange={(e)=> onSelectDocs(e.target.files)} />
              {docsFor && (plannerDestinations.find(d=> d.id===docsFor)?.docs?.length ? (
                <Box sx={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                  {plannerDestinations.find(d=> d.id===docsFor)!.docs!.map(doc => {
                    const isImage = /(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.originalName);
                    return (
                      <Box key={doc.id} sx={{ width:'30%', minWidth:120 }}>
                        <Box onClick={()=> { const a=document.createElement('a'); a.href=doc.url; a.download=doc.originalName; a.target='_blank'; a.rel='noopener'; a.click(); }} sx={{ cursor:'pointer', border:'1px solid', borderColor:'divider', borderRadius:1, overflow:'hidden', p:0.5, display:'flex', flexDirection:'column', alignItems:'center', gap:0.5, position:'relative' }}>
                          {isImage ? (
                            <Box component='img' src={doc.url} alt={doc.originalName} sx={{ width:'100%', height:70, objectFit:'cover', borderRadius:0.5 }} />
                          ) : (
                            <Box sx={{ width:'100%', height:70, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'action.hover', fontSize:12 }}>
                              {doc.originalName.split('.').pop()?.toUpperCase() || 'FILE'}
                            </Box>
                          )}
                          <Typography variant='caption' sx={{ textAlign:'center', wordBreak:'break-all' }}>{doc.originalName}</Typography>
                          <IconButton size='small' sx={{ position:'absolute', top:2, right:2, bgcolor:'background.paper' }} onClick={(e)=> { e.stopPropagation(); removeDoc(doc.id); }}>
                            <DeleteOutlineIcon fontSize='inherit' />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant='body2' sx={{ opacity:.7 }}>No documents yet.</Typography>
              ))}
            </DialogContent>
            <DialogActions>
              <Button onClick={()=> fileInputRef.current?.click()} startIcon={<UploadFileIcon />}>Add Files</Button>
              <Button onClick={closeDocs}>Close</Button>
            </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default DestinationCardsPanel;
