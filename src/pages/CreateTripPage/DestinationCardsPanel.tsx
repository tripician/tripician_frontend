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
  Button, IconButton, Chip, Tabs, Tab, Checkbox, LinearProgress
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
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/Notes';
import HotelIcon from '@mui/icons-material/Hotel';
import DestinationCard from './DestinationCard';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  addDestination, removeDestination, duplicateDestination, toggleDestinationCompleted, setDestinationCategory, renameDestination,
  setDestinationNotes, addDestinationDoc, removeDestinationDoc,
  addSpot, toggleSpot, removeSpot, addFoodItem, toggleFoodItem, removeFoodItem,
  updateDestinationNights, reorderChainExact,
  addStayEntry, updateStayEntry, removeStayEntry, setStayNotes
} from '../../store/plannerSlice';
import ValidatedFileInput from '../../components/CommonComponents/ValidatedFileInput';
import SoonTag from '../../components/CommonComponents/SoonTag';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { DEFAULT_DOC_RULE } from '../../utils/fileValidation';
import AiActionButton from '../../components/CommonComponents/AiActionButton';
import { fetchDestinationAlerts, type DestinationAlerts } from '../../services/APIs/alerts/alertService';

interface DestinationCardsPanelProps {
  maxed: boolean;
  readOnly?: boolean;
  canAccessDocs?: boolean;
  canEdit?: boolean;
  isPublished?: boolean;
  onRequestNaviaTip?: (destinationName: string) => void;
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

/* ─── Sortable card wrapper (dnd-kit per-item) ─── */
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

const DestinationCardsPanel: React.FC<DestinationCardsPanelProps> = ({ maxed, readOnly=false, canAccessDocs=false, canEdit=false, isPublished=false, onRequestNaviaTip }) => {
  const dispatch = useDispatch<AppDispatch>();
  const destinations = useSelector((s:RootState)=> s.planner.destinations);
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
  const searchInputRef = ghostInputRef; // alias kept for autocomplete logic
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
  const recommendedSpots = ['Central Park','Old Town','Museum of Art','River Walk','Sunset Point'];
  const recommendedFoods = ['Local BBQ','Seafood Platter','Street Tacos','Traditional Dessert','Coffee Roastery'];
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

  /* ──────── Per-destination checklist (local, kept in sync across renders) ──── */
  const [checklists, setChecklists] = React.useState<Record<string, DestinationCardChecklist>>({});
  const handleChecklistChange = React.useCallback((id: string, cl: DestinationCardChecklist) => {
    setChecklists(prev => ({ ...prev, [id]: cl }));
  }, []);

  /* ─────────────────────── Drag-to-reorder (dnd-kit) ────────────────────────── */
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

  /* ────────────────────── Completion signals (Feature 3) ─────────────────────── */
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

  /* --------------------------- Timeline rail geometry -------------------------- */
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [centers, setCenters] = React.useState<number[]>([]);
  const [railBounds, setRailBounds] = React.useState<{ top:number; bottom:number } | null>(null);
  const recompute = React.useCallback(()=>{
    const cont=containerRef.current; if(!cont){ setCenters([]); setRailBounds(null); return; }
    const list:number[]=[]; destinations.forEach(d=>{ const el=cardRefs.current[d.id]; if(el){ const r=el.getBoundingClientRect(); const cr=cont.getBoundingClientRect(); list.push(r.top-cr.top + r.height/2); } });
    setCenters(list); if(list.length>=2) setRailBounds({ top:list[0], bottom:list[list.length-1] }); else setRailBounds(null);
  }, [destinations]);
  React.useLayoutEffect(()=> { recompute(); }, [recompute]);
  React.useEffect(()=> { const onResize=()=> recompute(); window.addEventListener('resize', onResize); return ()=> window.removeEventListener('resize', onResize); }, [recompute]);
  // Observe card height changes (e.g. notes expand/collapse) to keep timeline rail in sync
  React.useEffect(()=> {
    const ro = new ResizeObserver(()=> recompute());
    Object.values(cardRefs.current).forEach(el => { if(el) ro.observe(el); });
    return ()=> ro.disconnect();
  }, [destinations, recompute]);

  /* --------------------------------- Render --------------------------------- */
  return (
    <Fade in timeout={300}>
      <Box sx={{ px:2.5, pt:2, pb:1.5, display:'flex', flexDirection:'column', gap:1.5, position:'relative' }}>

        {/* ── Progress milestone stepper ── */}
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

        <Box ref={containerRef} sx={{ position: 'relative', pl: 8, maxWidth: 900, mx: 'auto', width: '100%' }}>
          {railBounds && (
            <>
              {/* Living journey line: per-segment coloring (Feature 4) */}
              {centers.length >= 2 && centers.map((c, idx) => {
                if (idx >= centers.length - 1) return null;
                const d = destinations[idx];
                const cl = checklists[d?.id];
                const hasAlert = (alertsMap[d?.id]?.alerts.length ?? 0) > 0;
                const allDone = cl?.accommodation && cl?.transport && cl?.activities;
                return (
                  <Box key={`seg-${idx}`} sx={(t) => ({
                    position: 'absolute', top: c, height: centers[idx + 1] - c,
                    left: 18, width: 2, pointerEvents: 'none',
                    background: hasAlert
                      ? 'linear-gradient(180deg,#BA7517,#F59E0B)'
                      : allDone
                      ? 'linear-gradient(180deg,#16a34a,#22c55e)'
                      : t.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
                    transition: 'background 0.3s',
                  })} />
                );
              })}
              {/* State-aware numbered nodes (Feature 4) */}
              {centers.map((c, idx) => {
                const d = destinations[idx];
                const cl = checklists[d?.id];
                const hasAlert = (alertsMap[d?.id]?.alerts.length ?? 0) > 0;
                const allDone = cl?.accommodation && cl?.transport && cl?.activities;
                return (
                  <Box key={idx} sx={{ position: 'absolute', top: c, left: 6, width: 28, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-50%)', zIndex: 3 }}>
                    <Box sx={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: allDone ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#e8436a,#E31C5F)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      boxShadow: allDone ? '0 2px 8px rgba(22,163,74,0.4)' : '0 2px 8px rgba(232,67,106,0.4)',
                      transition: 'background 0.3s, box-shadow 0.3s',
                    }}>{idx + 1}</Box>
                  </Box>
                );
              })}
            </>
          )}
          {destinations.length === 0 && (
            <Box sx={(t) => ({ mt: 3, p: 5, border: '2px dashed rgba(255,56,92,0.2)', borderRadius: 3, textAlign: 'center', fontSize: 14, color: t.palette.text.secondary })}>Click "+ Add your next stop" below to add your first destination.</Box>
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
                  {destinations.map(d => (
                    <SortableCardWrapper key={d.id} id={d.id}>
                      {({ isDragging, dragHandleProps }) => (
                        <Box ref={el => { cardRefs.current[d.id] = el as HTMLDivElement | null; }}>
                          <DestinationCard
                            destination={d}
                            isDragging={isDragging}
                            dragHandleProps={dragHandleProps}
                            checklist={checklists[d.id]}
                            onChecklistChange={handleChecklistChange}
                            onRename={readOnly ? undefined : (id, name) => dispatch(renameDestination({ id, name }))}
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
                            alertCount={alertsMap[d.id]?.alerts.length ?? 0}
                            alerts={alertsMap[d.id]?.alerts ?? []}
                          />
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
                <Box sx={{ position: 'relative', mt: 1 }}>
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
                      placeholder={maxed ? 'Night limit reached' : 'Search destination…'}
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
                    mt: 1, height: 56, border: '1.5px dashed',
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

        {/* Discover Dialog — premium compact */}
        <Dialog
          open={!!discoverFor} onClose={() => setDiscoverFor(null)}
          fullWidth maxWidth='sm'
          PaperProps={{ sx: (t) => ({
            borderRadius: '20px', overflow: 'hidden',
            background: t.palette.mode === 'dark' ? '#111314' : '#fff',
            boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
            height: '78vh', display: 'flex', flexDirection: 'column',
          }) }}
        >
          {discoverFor && (() => {
            const pd = destinations.find(p => p.id === discoverFor);
            const spots = pd?.spots || [];
            const foods = pd?.foods || [];
            return (
              <>
                {/* Header */}
                <Box sx={(t) => ({
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2.5, pt: 2.25, pb: 1.5,
                  borderBottom: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                  flexShrink: 0,
                })}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{pd?.name || 'Destination'}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.2 }}>Curate spots & local foods</Typography>
                  </Box>
                  {/* Tabs as pill toggles */}
                  <Box sx={(t) => ({
                    display: 'flex', borderRadius: '10px', overflow: 'hidden',
                    border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)'}`,
                  })}>
                    {(['spots', 'foods'] as const).map(tab => (
                      <Box key={tab} onClick={() => setDiscoverTab(tab)} sx={(t) => ({
                        px: 1.5, py: 0.55, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: discoverTab === tab
                          ? 'linear-gradient(135deg,#FF385C,#E31C5F)'
                          : (t.palette.mode === 'dark' ? 'transparent' : 'transparent'),
                        color: discoverTab === tab ? '#fff' : 'text.secondary',
                        transition: 'background .15s, color .15s',
                        '&:hover': discoverTab !== tab ? { background: 'rgba(255,56,92,0.07)', color: '#FF385C' } : {},
                      })}>
                        {tab === 'spots' ? `Spots (${spots.length})` : `Foods (${foods.length})`}
                      </Box>
                    ))}
                  </Box>
                  <IconButton size='small' onClick={() => setDiscoverFor(null)} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>

                {/* Body — two columns */}
                <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {/* Left: curated list */}
                  <Box sx={(t) => ({
                    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    borderRight: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                  })}>
                    <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.6,
                      '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { borderRadius: 2, background: 'rgba(0,0,0,0.12)' } }}>
                      {discoverTab === 'spots' && (<>
                        {spots.length === 0 && <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'center', mt: 3 }}>No spots added yet.</Typography>}
                        {spots.map((s: any) => (
                          <Box key={s.id} sx={(t) => ({
                            display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.9,
                            borderRadius: '10px', border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                            background: s.checked ? (t.palette.mode === 'dark' ? 'rgba(22,163,74,0.08)' : 'rgba(22,163,74,0.04)') : 'transparent',
                            transition: 'background .12s',
                          })}>
                            <Box onClick={() => dispatch(toggleSpot({ destinationId: discoverFor!, spotId: s.id }))}
                              sx={{ width: 18, height: 18, borderRadius: '5px', flexShrink: 0, cursor: 'pointer',
                                border: `2px solid ${s.checked ? '#16a34a' : 'rgba(0,0,0,0.2)'}`,
                                background: s.checked ? '#16a34a' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
                              }}>
                              {s.checked && <Box component='svg' viewBox='0 0 12 12' sx={{ width: 9, height: 9 }}><path fill='#fff' d='M1.5 6l3 3 6-6'/></Box>}
                            </Box>
                            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 500, color: s.checked ? 'text.secondary' : 'text.primary',
                              textDecoration: s.checked ? 'line-through' : 'none', lineHeight: 1.3 }}>
                              {s.name}
                            </Typography>
                            <IconButton size='small' onClick={() => dispatch(removeSpot({ destinationId: discoverFor!, spotId: s.id }))}
                              sx={{ p: 0.3, opacity: 0, '.MuiBox-root:hover &': { opacity: 1 }, color: 'text.disabled', '&:hover': { color: '#ef4444' } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Box>
                        ))}
                      </>)}
                      {discoverTab === 'foods' && (<>
                        {foods.length === 0 && <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'center', mt: 3 }}>No foods added yet.</Typography>}
                        {foods.map((f: any) => (
                          <Box key={f.id} sx={(t) => ({
                            display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.9,
                            borderRadius: '10px', border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                            background: f.checked ? (t.palette.mode === 'dark' ? 'rgba(22,163,74,0.08)' : 'rgba(22,163,74,0.04)') : 'transparent',
                          })}>
                            <Box onClick={() => dispatch(toggleFoodItem({ destinationId: discoverFor!, foodId: f.id }))}
                              sx={{ width: 18, height: 18, borderRadius: '5px', flexShrink: 0, cursor: 'pointer',
                                border: `2px solid ${f.checked ? '#16a34a' : 'rgba(0,0,0,0.2)'}`,
                                background: f.checked ? '#16a34a' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
                              }}>
                              {f.checked && <Box component='svg' viewBox='0 0 12 12' sx={{ width: 9, height: 9 }}><path fill='#fff' d='M1.5 6l3 3 6-6'/></Box>}
                            </Box>
                            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{f.name}</Typography>
                            <IconButton size='small' onClick={() => dispatch(removeFoodItem({ destinationId: discoverFor!, foodId: f.id }))}
                              sx={{ p: 0.3, color: 'text.disabled', '&:hover': { color: '#ef4444' } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Box>
                        ))}
                      </>)}
                    </Box>
                  </Box>

                  {/* Right: add panel */}
                  <Box sx={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', px: 2, py: 1.5, gap: 1.25, overflowY: 'auto' }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                      {discoverTab === 'spots' ? 'Quick adds' : 'Local staples'}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {(discoverTab === 'spots' ? recommendedSpots : recommendedFoods).map(r => (
                        <Box key={r} onClick={() => discoverTab === 'spots'
                          ? dispatch(addSpot({ destinationId: discoverFor!, name: r, known: true, mapUrl: `https://maps.google.com/?q=${encodeURIComponent(r + ' ' + (pd?.name || ''))}` }))
                          : dispatch(addFoodItem({ destinationId: discoverFor!, name: r }))
                        } sx={(t) => ({
                          px: 1.25, py: 0.65, borderRadius: '8px', fontSize: 12.5, cursor: 'pointer',
                          border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                          color: 'text.secondary', transition: 'background .12s, color .12s, border-color .12s',
                          '&:hover': { background: 'rgba(255,56,92,0.06)', borderColor: 'rgba(255,56,92,0.28)', color: '#FF385C' },
                        })}>+ {r}</Box>
                      ))}
                    </Box>
                    {discoverTab === 'spots' && (
                      <>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', mt: 0.5 }}>Search places</Typography>
                        <Box sx={{ position: 'relative' }}>
                          <InputBase value={spotSearch} onChange={e => setSpotSearch(e.target.value)}
                            placeholder='Search attractions…'
                            sx={(t) => ({ width: '100%', fontSize: 13, border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '8px', px: 1.25, py: 0.6,
                              '&:focus-within': { borderColor: 'rgba(255,56,92,0.45)' } })}
                            startAdornment={<SearchIcon sx={{ fontSize: 14, mr: 0.5, opacity: 0.4 }} />}
                          />
                          {spotSearchLoading && <LinearProgress sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: 1 }} />}
                        </Box>
                        {spotPredictions.length > 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                            {spotPredictions.slice(0, 5).map(p => (
                              <Box key={p.place_id} onClick={() => addSpotFromPrediction(p)}
                                sx={(t) => ({ px: 1, py: 0.6, borderRadius: '8px', fontSize: 12, cursor: 'pointer',
                                  border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                                  color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  '&:hover': { background: 'rgba(255,56,92,0.06)', color: '#FF385C', borderColor: 'rgba(255,56,92,0.25)' } })}>
                                {p.description.split(',')[0]}
                              </Box>
                            ))}
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto', pt: 1 }}>
                          <Box component='img' alt='Google' src={import.meta.env.VITE_GOOGLE_LOGO || 'https://developers.google.com/static/maps/documentation/images/google_on_white.png'} sx={{ height: 12, opacity: 0.6 }} />
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </>
            );
          })()}
        </Dialog>

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

        {/* Stay Dialog — premium compact */}
        <Dialog
          open={!!stayFor} onClose={closeStayPanel}
          fullWidth maxWidth='xs'
          PaperProps={{ sx: (t) => ({
            borderRadius: '20px', overflow: 'hidden',
            background: t.palette.mode === 'dark' ? '#111314' : '#fff',
            boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }) }}
        >
          {stayFor && (() => {
            const d = destinations.find(p => p.id === stayFor);
            return (
              <>
                {/* Header */}
                <Box sx={(t) => ({
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  px: 2.25, pt: 2, pb: 1.5,
                  borderBottom: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                  flexShrink: 0,
                })}>
                  <HotelIcon sx={{ fontSize: 18, color: '#FF385C', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{d?.name || 'Stays'}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Where you're sleeping</Typography>
                  </Box>
                  <IconButton size='small' onClick={closeStayPanel} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>

                {/* Body */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2.25, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75,
                  '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { borderRadius: 2, background: 'rgba(0,0,0,0.12)' } }}>
                  {destinationStays.length === 0 && (
                    <Typography sx={{ fontSize: 12, color: 'text.disabled', textAlign: 'center', mt: 2 }}>No properties added yet.</Typography>
                  )}
                  {destinationStays.map((prop: any) => (
                    <Box key={prop.id} sx={(t) => ({
                      display: 'flex', alignItems: 'flex-start', gap: 1, px: 1.25, py: 1,
                      borderRadius: '10px',
                      border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                      transition: 'border-color .12s',
                      '&:hover': { borderColor: 'rgba(255,56,92,0.25)' },
                    })}>
                      <HotelIcon sx={{ fontSize: 16, color: '#FF385C', flexShrink: 0, mt: 0.5 }} />
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <InputBase disabled={readOnly} value={prop.name || ''} onChange={e => updatePropertyField(prop.id, { name: e.target.value })}
                          placeholder='Property name'
                          sx={(t) => ({ fontSize: 13, fontWeight: 600, px: 0.75, py: 0.3, borderRadius: '6px',
                            border: `1px solid transparent`, '&:hover': { border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` },
                            '&.Mui-focused': { border: `1px solid rgba(255,56,92,0.4)` } })} />
                        <InputBase disabled={readOnly} value={prop.reference || ''} onChange={e => updatePropertyField(prop.id, { reference: e.target.value })}
                          placeholder='Booking ref / address'
                          sx={(t) => ({ fontSize: 12, px: 0.75, py: 0.2, borderRadius: '6px', color: 'text.secondary',
                            border: `1px solid transparent`, '&:hover': { border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` },
                            '&.Mui-focused': { border: `1px solid rgba(255,56,92,0.4)` } })} />
                      </Box>
                      {!readOnly && (
                        <IconButton size='small' onClick={() => deleteProperty(prop.id)}
                          sx={{ p: 0.35, color: 'text.disabled', '&:hover': { color: '#ef4444' } }}>
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                    </Box>
                  ))}

                  {!readOnly && (
                    <Box onClick={addProperty} sx={(t) => ({
                      display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.8,
                      borderRadius: '10px', border: `1.5px dashed ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      cursor: 'pointer', color: 'text.secondary', fontSize: 13,
                      '&:hover': { borderColor: 'rgba(255,56,92,0.35)', color: '#FF385C', background: 'rgba(255,56,92,0.03)' },
                      transition: 'all .15s',
                    })}>
                      <Box component='svg' viewBox='0 0 24 24' sx={{ width: 16, height: 16, flexShrink: 0 }}>
                        <path fill='currentColor' d='M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z'/>
                      </Box>
                      Add property
                    </Box>
                  )}

                  {/* Notes */}
                  <Box sx={{ mt: 0.5 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', mb: 0.75 }}>Notes</Typography>
                    <InputBase disabled={readOnly} multiline minRows={3}
                      value={stayNotesVal} onChange={e => saveStayNotes(e.target.value)}
                      placeholder='Check-in time, access codes, parking notes…'
                      sx={(t) => ({ width: '100%', fontSize: 12.5, border: `1px solid ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'}`, borderRadius: '10px', px: 1.25, py: 0.75,
                        '&:hover': { borderColor: 'rgba(255,56,92,0.3)' }, '&.Mui-focused': { borderColor: '#FF385C' } })}
                    />
                  </Box>
                </Box>
              </>
            );
          })()}
        </Dialog>

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
