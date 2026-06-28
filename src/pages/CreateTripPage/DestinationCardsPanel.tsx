/**
 * Restored rich DestinationCardsPanel with:
 *  - Google Places autocomplete (add destinations with lat/lng + optional photo)
 *  - Timeline rail + numbered nodes + transport legs between destinations
 *  - Discover dialog (spots & foods) with recommendations + spot search (Places) + photo/description fetch
 *  - Stay / Notes / Docs dialogs
 *  - Read-only gating: hide search bar & disable editing when readOnly
 */
import React from 'react';
import {
  Box, Stack, Typography, Fade, Paper, InputBase, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton
} from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import type { DestinationCardChecklist } from './DestinationCard';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/Notes';
import DestinationCard from './DestinationCard';
import { DiscoverSheet, StaySheet } from './PlannerModals';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  addDestination, removeDestination, duplicateDestination, toggleDestinationCompleted, setDestinationCategory, renameDestination, setDestinationTitle,
  setDestinationNotes, addDestinationDoc, removeDestinationDoc,
  addSpot, toggleSpot, removeSpot, addFoodItem, toggleFoodItem, removeFoodItem,
  updateDestinationNights, reorderChainExact,
  addStayEntry, updateStayEntry, removeStayEntry, setStayNotes, clearDestinationDiscover
} from '../../store/plannerSlice';
import { planDestination } from '../../navia/naviaService';
import ValidatedFileInput from '../../components/CommonComponents/ValidatedFileInput';
import SoonTag from '../../components/CommonComponents/SoonTag';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { DEFAULT_DOC_RULE } from '../../utils/fileValidation';
import { fetchDestinationAlerts, type DestinationAlerts } from '../../services/APIs/alerts/alertService';

interface DestinationCardsPanelProps {
  maxed: boolean;
  readOnly?: boolean;
  canAccessDocs?: boolean;
  canEdit?: boolean;
  isPublished?: boolean;
  tripId?: string;
  authToken?: string | null;
  tripVibe?: string | null;
  onRequestNaviaTip?: (destinationName: string) => void;
  onNaviaToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

/* ---- Google Maps JS SDK loader (standalone, since MapPanel now uses Mapbox) ---- */
function ensureGoogleMapsLoaded(apiKey: string): Promise<void> {
  if ((window as any).google?.maps?.places) return Promise.resolve();
  const existing = document.getElementById('gm-sdk');
  if (existing) {
    return new Promise(resolve => existing.addEventListener('load', () => resolve(), { once: true }));
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = 'gm-sdk';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=quarterly`;
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ─ Sortable card wrapper (dnd-kit per-item) ─ */
const SortableCardWrapper: React.FC<{
  id: string;
  children: (props: { isDragging: boolean; dragHandleProps: Record<string, unknown> }) => React.ReactNode;
}> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition: transition || undefined };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ isDragging, dragHandleProps: { ...listeners, ...attributes } })}
    </div>
  );
};

const DestinationCardsPanel: React.FC<DestinationCardsPanelProps> = ({
  maxed, readOnly=false, canEdit=false, isPublished=false, tripId, authToken, tripVibe,
  onRequestNaviaTip, onNaviaToast,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const destinations = useSelector((s:RootState)=> s.planner.destinations);

  const handlePlanDestination = React.useCallback(async (destinationId: string) => {
    const dest = destinations.find(d => d.id === destinationId);
    if (!dest || !tripId || !authToken) {
      onNaviaToast?.('error', 'Sign in and save your trip before using Navia here.');
      window.dispatchEvent(new CustomEvent('navia:response'));
      return;
    }
    try {
      const result = await planDestination({
        tripId,
        destinationName: dest.name,
        planTitle: dest.title,
        lat: dest.lat,
        lng: dest.lng,
        nights: dest.nights,
        category: dest.category,
        vibe: tripVibe ?? undefined,
      }, authToken);

      dispatch(clearDestinationDiscover({ destinationId }));
      for (const spot of result.spots ?? []) {
        if (!spot.name?.trim()) continue;
        dispatch(addSpot({
          destinationId,
          name: spot.name.trim(),
          description: spot.description?.trim(),
          known: true,
        }));
      }
      for (const food of result.foods ?? []) {
        if (!food.name?.trim()) continue;
        dispatch(addFoodItem({ destinationId, name: food.name.trim() }));
      }
      const notes = (result.journalNotes ?? '').trim();
      if (notes) dispatch(setDestinationNotes({ id: destinationId, notes }));
      onNaviaToast?.('success', `Navia planned ${dest.name}`);
    } catch {
      onNaviaToast?.('error', 'Navia could not plan this stop. Try again.');
    } finally {
      window.dispatchEvent(new CustomEvent('navia:response'));
    }
  }, [destinations, tripId, authToken, tripVibe, dispatch, onNaviaToast]);
  // completedCount removed with Timeline header
  /* Load Google Maps SDK once on mount so Places autocomplete works independently of MapPanel */
  React.useEffect(() => {
    const key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (key) ensureGoogleMapsLoaded(key).catch(() => {});
  }, []);
  const ENABLE_DOC_UPLOAD = FEATURE_FLAGS.docsUpload;

  /* ----------------------------- Inline ghost search ----------------------------- */
  const [ghostSearchOpen, setGhostSearchOpen] = React.useState(false);
  const ghostInputRef = React.useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = React.useState('');
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [loadingPred, setLoadingPred] = React.useState(false);
  const sessionTokenRef = React.useRef<any | null>(null);
  const getAutocompleteService = () => {
    const g = (window as any).google;
    if(!g?.maps?.places) return null;
    if(!sessionTokenRef.current) sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
    if(!(window as any)._tripicianPlaceService){ (window as any)._tripicianPlaceService = new g.maps.places.AutocompleteService(); }
    return (window as any)._tripicianPlaceService as any;
  };
  React.useEffect(()=> {
    if(!searchValue.trim() || readOnly){ setPredictions([]); return; }
    const svc = getAutocompleteService(); if(!svc) return; let active=true; setLoadingPred(true);
    try {
      svc.getPlacePredictions({ input: searchValue, sessionToken: sessionTokenRef.current, types:['geocode','establishment'] }, (res:any[]|null,status:string)=>{
        if(!active) return; setLoadingPred(false);
        if(status!=='OK' || !Array.isArray(res)){ setPredictions([]); return; }
        setPredictions(res.slice(0,7));
      });
    } catch { setLoadingPred(false); setPredictions([]); }
    return ()=> { active=false; };
  }, [searchValue, readOnly]);
  const selectPrediction = (p:any) => {
    if(readOnly) return; const g=(window as any).google; if(!g?.maps?.places) return;
    const svc = new g.maps.places.PlacesService(document.createElement('div'));
    svc.getDetails({ placeId: p.place_id, fields:['name','geometry','photos'] }, (place:any,status:string)=>{
      if(status==='OK' && place){
        const name = place.name || p.description;
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        let photoUrl: string | undefined;
        if(place.photos && place.photos.length){ try { photoUrl = place.photos[0].getUrl({ maxWidth:800, maxHeight:600 }); } catch {} }
        if(name) dispatch(addDestination({ name, lat, lng, placeId:p.place_id, photoUrl }));
        setSearchValue(''); setPredictions([]);
      }
    });
  };

  /* -------------------------- Discover dialog (spots) -------------------------- */
  const [discoverFor, setDiscoverFor] = React.useState<string | null>(null);
  const [discoverTab, setDiscoverTab] = React.useState<'spots'|'foods'>('spots');
  const [spotSearch, setSpotSearch] = React.useState('');
  const [spotPredictions, setSpotPredictions] = React.useState<any[]>([]);
  const [spotSearchLoading, setSpotSearchLoading] = React.useState(false);
  const recommendedFoods = ['Local BBQ','Seafood Platter','Street Tacos','Traditional Dessert','Coffee Roastery'];
  type QuickSuggestion = { name: string; placeId?: string };
  const [nearbySpots, setNearbySpots] = React.useState<QuickSuggestion[]>([]);
  const [nearbyLoading, setNearbyLoading] = React.useState(false);
  const placesServiceRef = React.useRef<any>(null);
  const scriptLoadingRef = React.useRef(false);
  const ensurePlacesScript = React.useCallback(()=>{
    if(placesServiceRef.current) return true; const w:any = window;
    if(w.google?.maps?.places){ placesServiceRef.current = new w.google.maps.places.AutocompleteService(); return true; }
    if(scriptLoadingRef.current) return false; const key=import.meta.env.VITE_GOOGLE_MAPS_API_KEY; if(!key) return false;
    scriptLoadingRef.current = true; const script=document.createElement('script'); script.src=`https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`; script.async=true; script.defer=true;
    script.onload=()=>{ scriptLoadingRef.current=false; if(w.google?.maps?.places){ placesServiceRef.current = new w.google.maps.places.AutocompleteService(); if(spotSearch) triggerSpotSearch(spotSearch); } };
    document.head.appendChild(script); return false;
  }, [spotSearch]);
  const triggerSpotSearch = React.useCallback((query:string)=>{
    if(!query.trim()){ setSpotPredictions([]); return; }
    const ready = ensurePlacesScript(); if(!ready || !placesServiceRef.current){
      setSpotSearchLoading(true); const fake=Array.from({length:2}).map((_,i)=>({ description:query+` (loading ${i+1})`, place_id:query+'_fake_'+i }));
      setTimeout(()=>{ setSpotPredictions(fake); setSpotSearchLoading(false); }, 300); return; }
    setSpotSearchLoading(true);
    try { placesServiceRef.current.getPlacePredictions({ input:query }, (preds:any[]|null,status:string)=>{
      if(status!=='OK' || !Array.isArray(preds)){ setSpotPredictions([]); setSpotSearchLoading(false); return; }
      const allow = new Set(['tourist_attraction','point_of_interest','establishment']);
      const filtered = preds.filter(p=> !p.types || p.types.some((t:string)=> allow.has(t)));
      setSpotPredictions(filtered.slice(0,8)); setSpotSearchLoading(false);
    }); } catch{ setSpotSearchLoading(false); setSpotPredictions([]); }
  }, [ensurePlacesScript]);
  React.useEffect(()=> { const t=setTimeout(()=> triggerSpotSearch(spotSearch), 450); return ()=> clearTimeout(t); }, [spotSearch, triggerSpotSearch]);
  const placeDetailsCache = React.useRef<Record<string,{ photoUrl?: string; mapUrl?: string; description?: string }>>({});
  const fetchPlacePhoto = React.useCallback((placeId:string):Promise<{ photoUrl?:string; mapUrl?:string; description?:string }>=>(
    placeDetailsCache.current[placeId] ? Promise.resolve(placeDetailsCache.current[placeId]) : new Promise(resolve=>{
      const g=(window as any).google; if(!g?.maps?.places) return resolve({});
      const svc=new g.maps.places.PlacesService(document.createElement('div'));
      svc.getDetails({ placeId, fields:['photos','url','editorial_summary','formatted_address','types','name'] }, (pl:any, status:string)=>{
        if(status!=='OK'||!pl) return resolve({});
        let photoUrl: string | undefined; if(pl.photos && pl.photos.length){ try { photoUrl = pl.photos[0].getUrl({ maxWidth:480, maxHeight:320 }); } catch {} }
        let description: string | undefined; if(pl.editorial_summary?.overview){ description = pl.editorial_summary.overview.split(/\n|\.|!/)[0].trim(); }
        if(!description && pl.formatted_address){ const addr = pl.formatted_address as string; const nameLower=(pl.name||'').toLowerCase(); description = addr.toLowerCase().startsWith(nameLower)? addr.slice(pl.name.length).replace(/^,\s*/, ''): addr; }
        if(!description && Array.isArray(pl.types) && pl.types.length){ description = pl.types[0].replace(/_/g,' '); }
        const result={ photoUrl, mapUrl:pl.url as string|undefined, description }; placeDetailsCache.current[placeId]=result; resolve(result);
      });
    })
  ), []);
  const addSpotFromPrediction = (p:any) => { if(!discoverFor) return; fetchPlacePhoto(p.place_id).then(det=>{
    dispatch(addSpot({ destinationId: discoverFor, name: p.description.split(',')[0], photoUrl: det.photoUrl, mapUrl: det.mapUrl, description: det.description, placeId: p.place_id, known:true })); setSpotSearch(''); setSpotPredictions([]);
  }); };

  const fetchNearbySuggestions = React.useCallback((dest: { lat?: number; lng?: number; name: string }) => {
    setNearbyLoading(true);
    setNearbySpots([]);
    const g = (window as any).google;
    if (!g?.maps?.places) {
      setNearbyLoading(false);
      return;
    }
    const finish = (items: QuickSuggestion[]) => {
      setNearbySpots(items.slice(0, 6));
      setNearbyLoading(false);
    };
    const svc = new g.maps.places.PlacesService(document.createElement('div'));
    if (dest.lat != null && dest.lng != null) {
      svc.nearbySearch(
        { location: new g.maps.LatLng(dest.lat, dest.lng), radius: 8000, type: 'tourist_attraction' },
        (results: any[] | null, status: string) => {
          if (status === 'OK' && Array.isArray(results) && results.length > 0) {
            finish(results.map(r => ({ name: r.name as string, placeId: r.place_id as string })).filter(r => r.name));
            return;
          }
          svc.textSearch({ query: `top attractions near ${dest.name}` }, (textRes: any[] | null, textStatus: string) => {
            if (textStatus === 'OK' && Array.isArray(textRes)) {
              finish(textRes.map(r => ({ name: r.name as string, placeId: r.place_id as string })).filter(r => r.name));
            } else finish([]);
          });
        }
      );
      return;
    }
    svc.textSearch({ query: `top attractions in ${dest.name}` }, (textRes: any[] | null, textStatus: string) => {
      if (textStatus === 'OK' && Array.isArray(textRes)) {
        finish(textRes.map(r => ({ name: r.name as string, placeId: r.place_id as string })).filter(r => r.name));
      } else finish([]);
    });
  }, []);

  React.useEffect(() => {
    if (!discoverFor || discoverTab !== 'spots') { setNearbySpots([]); return; }
    const d = destinations.find(p => p.id === discoverFor);
    if (!d) return;
    ensurePlacesScript();
    const t = setTimeout(() => fetchNearbySuggestions({ lat: d.lat, lng: d.lng, name: d.name }), 200);
    return () => clearTimeout(t);
  }, [discoverFor, discoverTab, destinations, ensurePlacesScript, fetchNearbySuggestions]);

  /* ---------------------------- Notes / Stay / Docs ---------------------------- */
  const [notesFor, setNotesFor] = React.useState<string | null>(null);
  const [notesDraft, setNotesDraft] = React.useState('');
  const openNotes = (id:string) => { setNotesFor(id); const d=destinations.find(p=> p.id===id); setNotesDraft(d?.notes||''); };
  const saveNotes = () => { if(notesFor) dispatch(setDestinationNotes({ id: notesFor, notes: notesDraft })); setNotesFor(null); };
  // Multi Stay panel
  const [stayFor, setStayFor] = React.useState<string | null>(null);
  const openStay = (id:string) => { setStayFor(id); };
  const closeStayPanel = () => setStayFor(null);
  const destinationStays = React.useMemo(()=> {
    if(!stayFor) return [] as Array<{ id:string; name?:string; reference?:string }>;
    const d = destinations.find(p=> p.id===stayFor);
    return d?.stays || [];
  }, [stayFor, destinations]);
  const stayNotesVal = React.useMemo(()=> {
    if(!stayFor) return '';
    const d = destinations.find(p=> p.id===stayFor);
    return d?.stayNotes || '';
  }, [stayFor, destinations]);
  const addProperty = () => { if(!stayFor) return; dispatch(addStayEntry({ destinationId: stayFor })); };
  const updatePropertyField = (stayId:string, patch: { name?:string; reference?:string }) => { if(!stayFor) return; dispatch(updateStayEntry({ destinationId: stayFor, stayId, patch })); };
  const deleteProperty = (stayId:string) => { if(!stayFor) return; dispatch(removeStayEntry({ destinationId: stayFor, stayId })); };
  const saveStayNotes = (notes:string) => { if(!stayFor) return; dispatch(setStayNotes({ destinationId: stayFor, notes })); };
  const [docsFor, setDocsFor] = React.useState<string | null>(null);
  // Docs feature disabled (Coming Soon); openDocs intentionally unused
  const onAcceptDocs = (files: File[]) => { if(!docsFor) return; files.forEach((f,idx)=>{ const id=f.name+'_'+Date.now().toString(36)+'_'+idx; const url=URL.createObjectURL(f); dispatch(addDestinationDoc({ destinationId: docsFor, doc:{ id, originalName:f.name, mimeType:f.type, url } })); }); };
  const removeDoc = (docId:string) => { if(!docsFor) return; dispatch(removeDestinationDoc({ destinationId: docsFor, docId })); };

  /* ------------------------------ Destination alerts ----------------------------- */
  const [alertsMap, setAlertsMap] = React.useState<Record<string, DestinationAlerts>>({});
  React.useEffect(() => {
    if (destinations.length === 0) { setAlertsMap({}); return; }
    let cancelled = false;
    destinations.forEach(d => {
      fetchDestinationAlerts(d.id, d.name).then(result => {
        if (!cancelled) setAlertsMap(prev => ({ ...prev, [d.id]: result }));
      });
    });
    return () => { cancelled = true; };
  }, [destinations.map(d => d.id + ':' + d.name).join(',')]);

  /*  Per-destination checklist (local, kept in sync across renders)  */
  const [checklists, setChecklists] = React.useState<Record<string, DestinationCardChecklist>>({});
  const handleChecklistChange = React.useCallback((id: string, cl: DestinationCardChecklist) => {
    setChecklists(prev => ({ ...prev, [id]: cl }));
  }, []);

  /* ─ Drag-to-reorder (dnd-kit)  */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = destinations.map(d => d.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    dispatch(reorderChainExact({ ids: newIds }));
  }, [destinations, dispatch]);

  /*  Completion signals (Feature 3) ─ */
  const completionSignals = React.useMemo(() => {
    const hasDestinations = destinations.length > 0;
    const hasDates = destinations.some(d => !!d.startDate);
    const hasAccommodation = destinations.some(d => {
      const cl = checklists[d.id];
      const hasStay = Array.isArray((d as any).stays) ? (d as any).stays.length > 0 : !!((d as any).stay?.name || (d as any).stay?.reference);
      return cl?.accommodation || hasStay;
    });
    const hasActivities = destinations.some(d => {
      const cl = checklists[d.id];
      return cl?.activities || ((d as any).spots?.length > 0) || ((d as any).foods?.length > 0);
    });
    return [
      { label: 'Destinations added', done: hasDestinations },
      { label: 'Dates set', done: hasDates },
      { label: 'Accommodation', done: hasAccommodation },
      { label: 'Activities added', done: hasActivities },
      { label: 'Plan published', done: isPublished },
    ];
  }, [destinations, checklists, isPublished]);
  const completedSignals = completionSignals.filter(s => s.done).length;
  const progressPct = Math.round((completedSignals / completionSignals.length) * 100);

  /* Fire confetti when progress hits 100% */
  const prevProgressRef = React.useRef(0);
  React.useEffect(() => {
    if (progressPct === 100 && prevProgressRef.current < 100) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#e8436a', '#FF385C', '#fff', '#f0abfc'] });
    }
    prevProgressRef.current = progressPct;
  }, [progressPct]);

  /* --------------------------- Timeline rail helper -------------------------- */
  // Color for the connector segment leaving a given destination index (in-flow rail).
  const segmentColor = React.useCallback((di: number, dark: boolean): string => {
    const dd = destinations[di];
    const cl = dd ? checklists[dd.id] : undefined;
    const hasAlert = (dd ? alertsMap[dd.id]?.alerts.length ?? 0 : 0) > 0;
    const allDone = cl?.accommodation && cl?.transport && cl?.activities;
    if (hasAlert) return 'linear-gradient(180deg,#BA7517,#F59E0B)';
    if (allDone) return 'linear-gradient(180deg,#16a34a,#22c55e)';
    return dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  }, [destinations, checklists, alertsMap]);

  /* --------------------------------- Render --------------------------------- */
  return (
    <Fade in timeout={300}>
      <Box sx={{ px:2.5, pt:2, pb:1.5, display:'flex', flexDirection:'column', gap:1.5, position:'relative' }}>

        {/*  Progress milestone stepper  */}
        {destinations.length > 0 && (
          <Box sx={(t) => ({
            maxWidth: 900, mx: 'auto', width: '100%', mb: 0.5,
            borderRadius: '16px',
            border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
            background: t.palette.mode === 'dark'
              ? 'rgba(22,24,28,0.92)'
              : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            boxShadow: t.palette.mode === 'dark'
              ? '0 2px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 2px 14px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
            px: { xs: 1.5, sm: 2.5 }, py: { xs: 1.25, sm: 1.5 },
            display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 },
          })}>

            {/* Percentage hero */}
            <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: { xs: 38, sm: 48 } }}>
              <Typography sx={{
                fontSize: { xs: 18, sm: 22 }, fontWeight: 800, lineHeight: 1,
                fontFamily: "'Inter', sans-serif",
                background: progressPct === 100 ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#FF385C,#E31C5F)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                transition: 'all 0.4s',
              }}>{progressPct}%</Typography>
              <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.disabled', letterSpacing: '0.07em', textTransform: 'uppercase', mt: 0.3 }}>
                done
              </Typography>
            </Box>

            {/* 1px vertical divider */}
            <Box sx={(t) => ({ width: '1px', alignSelf: 'stretch', flexShrink: 0, bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)' })} />

            {/* Stepper — absolute track line + evenly spaced circles */}
            <Box sx={{ flex: 1, minWidth: 0, position: 'relative', pt: { xs: 0.5, sm: 0.75 }, pb: { xs: 0.25, sm: 0.5 } }}>
              {/* Grey track */}
              <Box sx={(t) => ({
                position: 'absolute', top: { xs: 16, sm: 20 }, left: '5%', right: '5%', height: '2px', borderRadius: 1,
                bgcolor: t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              })} />
              {/* Rose filled track */}
              <Box sx={{
                position: 'absolute', top: { xs: 16, sm: 20 }, left: '5%', height: '2px', borderRadius: 1,
                width: `${Math.max(0, progressPct - 10)}%`,
                background: progressPct === 100 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : 'linear-gradient(90deg,#FF385C,#E31C5F)',
                transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
              }} />
              {/* Steps row */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                {completionSignals.map((s, i) => {
                  const isDone = s.done;
                  const isNext = !isDone && completionSignals.slice(0, i).every(x => x.done);
                  return (
                    <Box key={s.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 0.4, sm: 0.6 } }}>
                      {/* Circle */}
                      <Box sx={{
                        width: { xs: 24, sm: 28 }, height: { xs: 24, sm: 28 }, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        bgcolor: 'background.paper',
                        transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                        ...(isDone ? {
                          background: progressPct === 100 && i === completionSignals.length - 1
                            ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                            : 'linear-gradient(135deg,#FF385C,#E31C5F)',
                          boxShadow: progressPct === 100 && i === completionSignals.length - 1
                            ? '0 2px 10px rgba(22,163,74,0.4)'
                            : '0 2px 10px rgba(255,56,92,0.35)',
                        } : isNext ? {
                          border: '2px solid rgba(255,56,92,0.5)',
                          '@keyframes nextPulse': { '0%,100%': { boxShadow: '0 0 0 0 rgba(255,56,92,0.22)' }, '50%': { boxShadow: '0 0 0 5px rgba(255,56,92,0)' } },
                          animation: 'nextPulse 2s ease-in-out infinite',
                        } : {
                          border: (t: any) => `2px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        }),
                      }}>
                        {isDone ? (
                          <Box component='svg' viewBox='0 0 12 12' sx={{ width: { xs: 10, sm: 12 }, height: { xs: 10, sm: 12 } }}>
                            <polyline points='2,6 5,9 10,3' fill='none' stroke='#fff' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: { xs: 9, sm: 10 }, fontWeight: 700, lineHeight: 1, color: isNext ? '#FF385C' : 'text.disabled' }}>
                            {i + 1}
                          </Typography>
                        )}
                      </Box>
                      {/* Label — hidden on xs */}
                      <Typography sx={{
                        display: { xs: 'none', sm: 'block' },
                        fontSize: 9.5, fontWeight: isDone ? 700 : 500, textAlign: 'center', lineHeight: 1.25,
                        whiteSpace: 'nowrap', letterSpacing: '-0.1px', transition: 'color 0.3s',
                        color: isDone
                          ? (t: any) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.62)'
                          : 'text.disabled',
                      }}>
                        {s.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ position: 'relative', maxWidth: 900, mx: 'auto', width: '100%' }}>
          {destinations.length === 0 && (
            readOnly ? (
              <Box sx={(t) => ({
                mt: 3, p: 5, borderRadius: 3, textAlign: 'center',
                background: t.palette.mode === 'light' ? 'rgba(255,56,92,0.03)' : 'rgba(255,56,92,0.06)',
                border: '1.5px dashed rgba(255,56,92,0.18)',
              })}>
                <Typography sx={{ fontSize: 22, mb: 1 }}>✈️</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                  No destinations yet
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                  The creator hasn't added any stops to this trip yet.
                </Typography>
              </Box>
            ) : (
              <Box sx={(t) => ({ mt: 3, p: 5, border: '2px dashed rgba(255,56,92,0.2)', borderRadius: 3, textAlign: 'center', fontSize: 14, color: t.palette.text.secondary })}>Click "+ Add your next stop" below to add your first destination.</Box>
            )
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={e => setActiveDragId(e.active.id as string)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={destinations.map(d => d.id)} strategy={verticalListSortingStrategy}>
              <Stack spacing={1}>
                <AnimatePresence initial={false}>
                  {destinations.map((d, idx) => (
                    <SortableCardWrapper key={d.id} id={d.id}>
                      {({ isDragging, dragHandleProps }) => (
                        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
                          {/* In-flow timeline rail: numbered node + connector (always visible, no measurement) */}
                          <Box sx={{ position: 'relative', width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                            {idx > 0 && (
                              <Box sx={(t) => ({ position: 'absolute', top: -8, height: 'calc(50% + 8px)', width: 2, background: segmentColor(idx - 1, t.palette.mode === 'dark'), transition: 'background 0.3s' })} />
                            )}
                            {idx < destinations.length - 1 && (
                              <Box sx={(t) => ({ position: 'absolute', top: '50%', bottom: -8, width: 2, background: segmentColor(idx, t.palette.mode === 'dark'), transition: 'background 0.3s' })} />
                            )}
                            <Box sx={{
                              position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 1,
                              width: 22, height: 22, borderRadius: '50%',
                              background: (checklists[d.id]?.accommodation && checklists[d.id]?.transport && checklists[d.id]?.activities)
                                ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#e8436a,#E31C5F)',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                              boxShadow: (checklists[d.id]?.accommodation && checklists[d.id]?.transport && checklists[d.id]?.activities)
                                ? '0 2px 8px rgba(22,163,74,0.4)' : '0 2px 8px rgba(232,67,106,0.4)',
                              transition: 'background 0.3s, box-shadow 0.3s',
                            }}>{idx + 1}</Box>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                          <DestinationCard
                            destination={d}
                            isDragging={isDragging}
                            dragHandleProps={dragHandleProps}
                            checklist={checklists[d.id]}
                            onChecklistChange={handleChecklistChange}
                            onRename={readOnly ? undefined : (id, name) => dispatch(renameDestination({ id, name }))}
                            onChangeTitle={readOnly ? undefined : (id, t) => dispatch(setDestinationTitle({ id, title: t }))}
                            onChangeCategory={readOnly ? undefined : (id, cat) => dispatch(setDestinationCategory({ id, category: cat }))}
                            onToggleComplete={readOnly ? undefined : (id) => dispatch(toggleDestinationCompleted({ id }))}
                            onDuplicate={readOnly ? undefined : (id) => dispatch(duplicateDestination({ id }))}
                            onRemove={readOnly ? undefined : (id) => dispatch(removeDestination(id))}
                            onOpenNotes={readOnly ? undefined : () => openNotes(d.id)}
                            onChangeNotes={readOnly ? undefined : (id, text) => dispatch(setDestinationNotes({ id, notes: text }))}
                            onOpenStay={readOnly ? undefined : () => openStay(d.id)}
                            onOpenDiscover={readOnly ? undefined : () => { setDiscoverFor(d.id); setDiscoverTab('spots'); }}
                            onChangeNights={readOnly ? undefined : (id, delta) => dispatch(updateDestinationNights({ id, delta }))}
                            onRequestNaviaTip={onRequestNaviaTip}
                            onPlanDestination={readOnly ? undefined : handlePlanDestination}
                            alertCount={alertsMap[d.id]?.alerts.length ?? 0}
                            alerts={alertsMap[d.id]?.alerts ?? []}
                            readonly={readOnly}
                          />
                          </Box>
                        </Box>
                      )}
                    </SortableCardWrapper>
                  ))}
                </AnimatePresence>
              </Stack>
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (() => {
                const d = destinations.find(x => x.id === activeDragId);
                if (!d) return null;
                return (
                  <Box sx={{ opacity: 0.85, pointerEvents: 'none' }}>
                    <DestinationCard
                      destination={d}
                      isDragging
                      checklist={checklists[d.id]}
                      alertCount={alertsMap[d.id]?.alerts.length ?? 0}
                      alerts={alertsMap[d.id]?.alerts ?? []}
                    />
                  </Box>
                );
              })() : null}
            </DragOverlay>
          </DndContext>

          {/* Ghost / inline-search "add next stop" */}
          {!readOnly && (
            <>
              {ghostSearchOpen ? (
                /* Inline search input — replaces ghost card */
                <Box sx={{ position: 'relative', mt: 1, ml: '36px' }}>
                  <Paper elevation={0} sx={(t) => ({
                    display: 'flex', alignItems: 'center', gap: 1, pl: 1.5, pr: 0.75, py: 0.65,
                    borderRadius: '12px',
                    border: `1.5px solid rgba(255,56,92,0.45)`,
                    boxShadow: '0 0 0 3px rgba(255,56,92,0.10)',
                    background: t.palette.mode === 'dark' ? t.palette.background.paper : '#fff',
                  })}>
                    <SearchIcon fontSize='small' sx={{ opacity: 0.45, flexShrink: 0, color: '#FF385C' }} />
                    <InputBase
                      value={searchValue}
                      onChange={e => setSearchValue(e.target.value)}
                      placeholder={maxed ? 'Night limit reached' : 'Tag a place on Google (e.g. Hanoi, Old Quarter)…'}
                      disabled={maxed}
                      inputRef={ghostInputRef}
                      autoFocus
                      sx={{ flex: 1, fontSize: 13.5 }}
                      onKeyDown={e => {
                        if (e.key === 'Escape') { setSearchValue(''); setPredictions([]); setGhostSearchOpen(false); }
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, opacity: 0.45, fontSize: 10.5, whiteSpace: 'nowrap', mr: 0.5, flexShrink: 0 }}>
                      <Box component='img' alt='Google' src={import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'} sx={{ height: 11 }} />
                    </Box>
                    <IconButton size='small' onClick={() => { setSearchValue(''); setPredictions([]); setGhostSearchOpen(false); }}
                      sx={{ p: 0.4, color: 'text.disabled', '&:hover': { color: '#ef4444' } }}>
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Paper>
                  {(predictions.length > 0 || loadingPred) && searchValue && (
                    <Paper elevation={8} sx={{ position: 'absolute', top: '100%', left: 0, mt: 0.75, width: '100%', maxHeight: 280, overflowY: 'auto', zIndex: 20, borderRadius: '12px', overflow: 'hidden' }}>
                      {loadingPred && <Box sx={{ px: 2, py: 1, fontSize: 12, opacity: 0.7 }}>Searching…</Box>}
                      {predictions.map(p => (
                        <Box key={p.place_id} onClick={() => { selectPrediction(p); setGhostSearchOpen(false); }}
                          sx={{ px: 2, py: 0.9, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider', '&:hover': { background: 'rgba(255,56,92,0.05)' }, fontSize: 13, transition: 'background .12s' }}>
                          <strong>{p.structured_formatting?.main_text || p.description}</strong>
                          {p.structured_formatting?.secondary_text && <Box sx={{ fontSize: 11, opacity: 0.55, mt: 0.15 }}>{p.structured_formatting.secondary_text}</Box>}
                        </Box>
                      ))}
                      {!loadingPred && predictions.length === 0 && <Box sx={{ px: 2, py: 1, fontSize: 12, opacity: 0.65 }}>No matches</Box>}
                    </Paper>
                  )}
                </Box>
              ) : (
                /* Ghost card */
                <Box
                  onClick={() => { if (!maxed) setGhostSearchOpen(true); }}
                  sx={{
                    mt: 1, ml: '36px', height: 56, border: '1.5px dashed',
                    borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 1, cursor: maxed ? 'default' : 'pointer',
                    '&:hover': maxed ? {} : { borderColor: 'rgba(255,56,92,0.40)', background: 'rgba(255,56,92,0.025)' },
                    transition: 'border-color .15s, background .15s',
                    opacity: maxed ? 0.5 : 1,
                  }}
                >
                  <Box component='svg' viewBox='0 0 24 24' sx={{ width: 18, height: 18, color: '#e8436a', flexShrink: 0 }}>
                    <path fill='currentColor' d='M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z'/>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500 }}>Add your next stop</Typography>
                </Box>
              )}
              <Typography
                onClick={() => window.dispatchEvent(new CustomEvent('navia:send', { detail: { message: 'Can you suggest more destinations to complete my route?' } }))}
                sx={{ mt: 2, textAlign: 'center', fontSize: 12, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: '#FF385C' }, transition: 'color .15s' }}
              >
                Not sure what to add? Ask Navia to complete your route →
              </Typography>
              {destinations.length >= 2 && (
                <Typography sx={{ mt: 1.5, textAlign: 'center', fontSize: 11, color: 'text.secondary' }}>
                  ⠿ Drag stops to reorder your journey
                </Typography>
              )}
            </>
          )}
        </Box>

        <DiscoverSheet
          open={!!discoverFor}
          onClose={() => setDiscoverFor(null)}
          destination={discoverFor ? destinations.find(p => p.id === discoverFor) : undefined}
          tab={discoverTab}
          onTabChange={setDiscoverTab}
          spotSearch={spotSearch}
          onSpotSearchChange={setSpotSearch}
          spotSearchLoading={spotSearchLoading}
          spotPredictions={spotPredictions}
          nearbySpots={nearbySpots}
          nearbyLoading={nearbyLoading}
          recommendedFoods={recommendedFoods}
          readOnly={readOnly}
          onAddSpotFromPrediction={addSpotFromPrediction}
          onQuickAddSpot={(item) => {
            if (!discoverFor) return;
            if (item.placeId) addSpotFromPrediction({ place_id: item.placeId, description: item.name });
            else {
              const pd = destinations.find(p => p.id === discoverFor);
              dispatch(addSpot({ destinationId: discoverFor, name: item.name, known: true, mapUrl: `https://maps.google.com/?q=${encodeURIComponent(item.name + ' ' + (pd?.name || ''))}` }));
            }
          }}
          onQuickAddFood={(name) => discoverFor && dispatch(addFoodItem({ destinationId: discoverFor, name }))}
          onToggleSpot={(spotId) => discoverFor && dispatch(toggleSpot({ destinationId: discoverFor, spotId }))}
          onRemoveSpot={(spotId) => discoverFor && dispatch(removeSpot({ destinationId: discoverFor, spotId }))}
          onToggleFood={(foodId) => discoverFor && dispatch(toggleFoodItem({ destinationId: discoverFor, foodId }))}
          onRemoveFood={(foodId) => discoverFor && dispatch(removeFoodItem({ destinationId: discoverFor, foodId }))}
        />

        {/* Notes Dialog */}
        <Dialog
          open={!!notesFor}
          onClose={()=> setNotesFor(null)}
          fullWidth
          maxWidth='xs'
          PaperProps={{ sx:(t)=>({ borderRadius:3, overflow:'hidden', background: t.palette.mode==='dark'? '#1a1a1a':'#fff', boxShadow:'0 24px 80px rgba(0,0,0,0.18)' }) }}
        >
          {/* Header */}
          <Box sx={(t)=>({ display:'flex', alignItems:'center', gap:1.5, px:3, pt:2.5, pb:2, borderBottom:`1px solid ${t.palette.divider}` })}>
            <Box sx={{ width:32, height:32, borderRadius:'10px', background:'linear-gradient(135deg,#FF385C,#E31C5F)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <NotesIcon sx={{ fontSize:16, color:'#fff' }} />
            </Box>
            <Box sx={{ flex:1 }}>
              <Typography sx={{ fontSize:15, fontWeight:700, lineHeight:1.2 }}>
                {destinations.find(p=>p.id===notesFor)?.name || 'Destination'}
              </Typography>
              <Typography sx={{ fontSize:11, color:'text.secondary', lineHeight:1.3 }}>Travel notes</Typography>
            </Box>
            <IconButton size='small' onClick={()=>setNotesFor(null)} sx={{ color:'text.disabled', '&:hover':{ color:'text.primary', background:'action.hover' }, p:.5 }}>
              <CloseIcon sx={{ fontSize:16 }} />
            </IconButton>
          </Box>

          {/* Body – flat notepad */}
          <Box sx={(t)=>({
            mx:0, px:3, pt:2, pb:2,
            background: t.palette.mode==='dark'
              ? 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(255,255,255,0.05) 28px)'
              : 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(0,0,0,0.06) 28px)',
            backgroundPositionY: '16px',
          })}>
            <InputBase
              autoFocus
              disabled={readOnly}
              multiline
              minRows={7}
              maxRows={14}
              value={notesDraft}
              onChange={e=>setNotesDraft(e.target.value)}
              placeholder='Write your travel notes here…'
              sx={{
                width:'100%',
                fontSize:14,
                lineHeight:'28px',
                color:'text.primary',
                alignItems:'flex-start',
                border:'none',
                p:0,
                '& textarea': { lineHeight:'28px', padding:0, backgroundImage:'none' },
                '& textarea::placeholder':{ color:'text.disabled', opacity:1 },
              }}
            />
          </Box>

          {/* Footer */}
          {!readOnly && (
            <Box sx={(t)=>({ display:'flex', justifyContent:'flex-end', gap:1, px:3, pb:2.5, pt:.5, borderTop:`1px solid ${t.palette.divider}` })}>
              <Button
                onClick={()=>setNotesFor(null)}
                sx={{ borderRadius:2, textTransform:'none', fontWeight:600, fontSize:13, color:'text.secondary', px:2, '&:hover':{ background:'action.hover' } }}
              >Discard</Button>
              <Button
                variant='contained'
                onClick={saveNotes}
                sx={{ borderRadius:2, textTransform:'none', fontWeight:700, fontSize:13, px:3, background:'linear-gradient(135deg,#FF385C,#E31C5F)', boxShadow:'none', '&:hover':{ background:'linear-gradient(135deg,#e02d50,#c91855)', boxShadow:'0 4px 16px rgba(255,56,92,0.35)' } }}
              >Save</Button>
            </Box>
          )}
          {readOnly && (
            <Box sx={(t)=>({ display:'flex', justifyContent:'flex-end', px:3, pb:2.5, pt:.5, borderTop:`1px solid ${t.palette.divider}` })}>
              <Button onClick={()=>setNotesFor(null)} sx={{ borderRadius:2, textTransform:'none', fontWeight:600, fontSize:13, color:'text.secondary', px:2 }}>Close</Button>
            </Box>
          )}
        </Dialog>

        <StaySheet
          open={!!stayFor}
          onClose={closeStayPanel}
          destination={stayFor ? destinations.find(p => p.id === stayFor) : undefined}
          stays={destinationStays}
          stayNotes={stayNotesVal}
          readOnly={readOnly}
          onAddProperty={addProperty}
          onUpdateProperty={updatePropertyField}
          onDeleteProperty={deleteProperty}
          onStayNotesChange={saveStayNotes}
        />

        {/* Docs Dialog */}
        <Dialog open={!!docsFor} onClose={()=> setDocsFor(null)} fullWidth maxWidth='sm'>
          <DialogTitle>Documents</DialogTitle>
          <DialogContent>
            {canEdit && ENABLE_DOC_UPLOAD && (
              <ValidatedFileInput
                buttonLabel='Add Files'
                startIcon={<UploadFileIcon />}
                onAccept={onAcceptDocs}
                rule={DEFAULT_DOC_RULE}
                multiple
              />
            )}
            {!ENABLE_DOC_UPLOAD && (<SoonTag sx={{ mb:2 }} />)}
            {docsFor && (destinations.find(d=> d.id===docsFor)?.docs?.length ? (
              <Box sx={{ mt:2, display:'flex', flexWrap:'wrap', gap:2 }}>
                {destinations.find(d=> d.id===docsFor)!.docs!.map(doc => { const isImage=/(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.originalName); return (
                  <Box key={doc.id} sx={{ width:'30%', minWidth:120 }}>
                    <Box onClick={()=> { const a=document.createElement('a'); a.href=doc.url; a.download=doc.originalName; a.target='_blank'; a.rel='noopener'; a.click(); }} sx={{ cursor:'pointer', border:'1px solid', borderColor:'divider', borderRadius:1, overflow:'hidden', p:0.5, display:'flex', flexDirection:'column', alignItems:'center', gap:0.5, position:'relative' }}>
                      {isImage ? <Box component='img' src={doc.url} alt={doc.originalName} sx={{ width:'100%', height:70, objectFit:'cover', borderRadius:0.5 }} /> : <Box sx={{ width:'100%', height:70, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'action.hover', fontSize:12 }}>{doc.originalName.split('.').pop()?.toUpperCase()}</Box>}
                      <Typography variant='caption' sx={{ textAlign:'center', wordBreak:'break-all' }}>{doc.originalName}</Typography>
                      {canEdit && ENABLE_DOC_UPLOAD && (
                        <IconButton
                          size='small'
                          sx={{ position:'absolute', top:2, right:2, bgcolor:'background.paper' }}
                          onClick={(e)=> { e.stopPropagation(); removeDoc(doc.id); }}
                        >
                          <DeleteOutlineIcon fontSize='inherit' />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                ); })}
              </Box>
            ) : (<Typography variant='body2' sx={{ opacity:.7, mt:2 }}>No documents yet.</Typography>))}
          </DialogContent>
          <DialogActions><Button onClick={()=> setDocsFor(null)}>Close</Button></DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default DestinationCardsPanel;
