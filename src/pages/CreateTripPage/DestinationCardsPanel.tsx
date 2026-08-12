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
import { IconPlane } from '@tabler/icons-react';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DestinationCardChecklist } from './DestinationCard';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/Notes';
import DestinationCard from './DestinationCard';
import SimpleDestinationCard from './SimpleDestinationCard';
import { DiscoverSheet, StaySheet } from './PlannerModals';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  addDestination, removeDestination, duplicateDestination, toggleDestinationCompleted, setDestinationCategory, renameDestination, setDestinationTitle,
  setDestinationNotes, addDestinationDoc, removeDestinationDoc,
  addSpot, toggleSpot, removeSpot, addFoodItem, toggleFoodItem, removeFoodItem,
  updateDestinationNights, reorderChainExact, setTargetNights,
  addStayEntry, updateStayEntry, removeStayEntry, setStayNotes, clearDestinationDiscover
} from '../../store/plannerSlice';
import { planDestination, NaviaRequestError } from '../../navia/naviaService';
import { resolveSpots, getPlaceDetails } from '../../services/placeVerification';
import ValidatedFileInput from '../../components/CommonComponents/ValidatedFileInput';
import SoonTag from '../../components/CommonComponents/SoonTag';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { DEFAULT_DOC_RULE } from '../../utils/fileValidation';
import { fetchDestinationAlerts, type DestinationAlerts } from '../../services/APIs/alerts/alertService';
// Imports nothing itself - see the note in stopHoverBus about keeping the
// mapbox-gl chunk out of this component's import graph.
import { emitStopHover } from '../../utils/stopHoverBus';
import NaviaOrb from '../../navia/NaviaOrb';

interface DestinationCardsPanelProps {
  maxed: boolean;
  readOnly?: boolean;
  canAccessDocs?: boolean;
  canEdit?: boolean;
  tripId?: string;
  authToken?: string | null;
  tripVibe?: string | null;
  /** Trip countries, used to anchor "add a stop" suggestions when the route is empty. */
  tripCountries?: string[];
  onRequestNaviaTip?: (destinationName: string) => void;
  onNaviaToast?: (type: 'success' | 'error' | 'info', message: string) => void;
  /**
   * Easy mode: render the minimal stop cards and drop every advanced surface
   * (progress stepper, Discover/Stay/Docs sheets, per-stop Navia). Nothing is
   * deleted - the data is still in the store, just not shown.
   */
  easy?: boolean;
  /** Easy mode only: called from a card's "saved in Advanced" hint. */
  onSwitchToAdvanced?: () => void;
  /**
   * Send a message to Navia. The planner implementation also reveals the chat
   * panel - firing the bare `navia:send` event would otherwise drop the reply
   * into a panel the user cannot see (in Easy the map is the default tab).
   */
  onAskNavia?: (message: string) => void;
  /**
   * Easy mode: fill in what the plan is still missing (stops for uncovered nights,
   * notes for note-less stops). This mutates the plan directly - it is not a chat
   * message - so the card needs the planner's own routine, not `navia:send`.
   */
  onCompletePlan?: () => void;
  /** True while onCompletePlan is running, so the card can show it is working. */
  completingPlan?: boolean;
}

/**
 * Last-resort suggestions, used ONLY when there is genuinely no context to work
 * from - no stops on the route and no country on the trip.
 *
 * These used to be shown unconditionally, which is how someone planning Sikkim
 * was offered Paris and Cape Town. Anything better than this list is derived from
 * the trip itself in `fetchDestinationSuggestions`.
 */
const FALLBACK_DESTINATION_SUGGESTIONS = [
  'Paris',
  'Tokyo',
  'New York',
  'Rome',
  'Barcelona',
  'Bali',
  'Istanbul',
  'Cape Town',
];

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

/*  Sortable card wrapper (dnd-kit per-item)  */
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
  maxed, readOnly=false, canEdit=false, tripId, authToken, tripVibe, tripCountries,
  onRequestNaviaTip, onNaviaToast, easy=false, onSwitchToAdvanced, onAskNavia,
  onCompletePlan, completingPlan=false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const destinations = useSelector((s:RootState)=> s.planner.destinations);

  const askNavia = React.useCallback((message: string) => {
    if (onAskNavia) { onAskNavia(message); return; }
    window.dispatchEvent(new CustomEvent('navia:send', { detail: { message } }));
  }, [onAskNavia]);

  /**
   * Easy mode has no night-budget UI at all, so a stop must never be silently
   * refused: both `addDestination` and `updateDestinationNights` bail without
   * feedback once `targetNights` has no headroom left. Raising the target first
   * makes nights follow the stops the user adds, which is the only model that
   * makes sense when the target itself is invisible.
   */
  const ensureNightHeadroom = React.useCallback((nights = 1) => {
    if (!easy) return;
    const st = store.getState().planner;
    const total = st.destinations.reduce((a, d) => a + (d.nights || 0), 0);
    if (st.targetNights - total < nights) dispatch(setTargetNights(total + nights));
  }, [easy, store, dispatch]);

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

      // A save/refresh during the AI call may have re-hydrated Redux with server
      // ids. Re-resolve the stop from fresh state (by id, then by name) so the
      // dispatches below never target an orphaned id and silently vanish.
      const fresh = store.getState().planner.destinations;
      const liveDest = fresh.find(d => d.id === destinationId)
        ?? fresh.find(d => d.name === dest.name);
      if (!liveDest) {
        onNaviaToast?.('error', `${dest.name} is no longer in your plan, so Navia's ideas had nowhere to land.`);
        return;
      }
      const liveId = liveDest.id;

      // Resolve every generated spot against Places before it reaches the plan:
      // permanently-closed places are dropped, the rest carry a provenance chip.
      const candidates = (result.spots ?? []).filter(s => s.name?.trim());
      const resolvedSpots = await resolveSpots(candidates, dest.name);

      dispatch(clearDestinationDiscover({ destinationId: liveId }));
      for (const spot of resolvedSpots) {
        dispatch(addSpot({
          destinationId: liveId,
          name: spot.name,
          description: spot.description,
          mapUrl: spot.mapUrl,
          photoUrl: spot.photoUrl,
          placeId: spot.placeId,
          provenance: spot.provenance,
          verifiedAt: spot.verifiedAt,
          lat: spot.lat,
          lng: spot.lng,
          known: Boolean(spot.mapUrl),
        }));
      }
      for (const food of result.foods ?? []) {
        if (!food.name?.trim()) continue;
        dispatch(addFoodItem({ destinationId: liveId, name: food.name.trim() }));
      }
      const notes = (result.journalNotes ?? '').trim();
      if (notes) dispatch(setDestinationNotes({ id: liveId, notes }));

      // Report what was actually confirmed rather than a blanket success.
      const dropped = candidates.length - resolvedSpots.length;
      const unchecked = resolvedSpots.filter(s => s.provenance === 'unchecked').length;
      if (dropped > 0) {
        onNaviaToast?.('info', `${dest.name} planned. ${dropped} place${dropped === 1 ? ' had' : 's had'} closed for good, so we left ${dropped === 1 ? 'it' : 'them'} out.`);
      } else if (unchecked > 0) {
        onNaviaToast?.('info', `${dest.name} planned. ${unchecked} of ${resolvedSpots.length} places had no listing to check - marked unchecked.`);
      } else {
        onNaviaToast?.('success', `${dest.name} planned - all ${resolvedSpots.length} places confirmed.`);
      }
    } catch (err) {
      if (err instanceof NaviaRequestError && err.status === 402) {
        onNaviaToast?.('error', 'This trip is out of Navia credits.');
      } else {
        onNaviaToast?.('error', 'Navia could not plan this stop. Try again.');
      }
    } finally {
      window.dispatchEvent(new CustomEvent('navia:response'));
    }
  }, [destinations, tripId, authToken, tripVibe, dispatch, onNaviaToast, store]);
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
        if(name) { ensureNightHeadroom(); dispatch(addDestination({ name, lat, lng, placeId:p.place_id, photoUrl })); }
        setSearchValue(''); setPredictions([]);
      }
    });
  };
  const addDestinationFromQuery = React.useCallback((query: string) => {
    if (readOnly || !query.trim()) return;
    const g = (window as any).google;
    if (!g?.maps?.places) {
      setSearchValue(query);
      return;
    }
    const svc = new g.maps.places.PlacesService(document.createElement('div'));
    svc.textSearch({ query }, (results: any[] | null, status: string) => {
      if (status !== 'OK' || !Array.isArray(results) || results.length === 0) {
        setSearchValue(query);
        return;
      }
      const place = results[0];
      const name = place.name || query;
      const lat = place.geometry?.location?.lat?.();
      const lng = place.geometry?.location?.lng?.();
      let photoUrl: string | undefined;
      if (place.photos && place.photos.length) {
        try { photoUrl = place.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 }); } catch {}
      }
      ensureNightHeadroom();
      dispatch(addDestination({ name, lat, lng, placeId: place.place_id, photoUrl }));
      setSearchValue('');
      setPredictions([]);
      setGhostSearchOpen(false);
    });
  }, [dispatch, readOnly, ensureNightHeadroom]);

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
  const addSpotFromPrediction = (p:any) => { if(!discoverFor) return; getPlaceDetails(p.place_id).then(det=>{
    // A user picked this from autocomplete, so it is verified by construction -
    // unless Places says it has shut down, in which case don't let it in.
    if (det?.businessStatus === 'CLOSED_PERMANENTLY') {
      onNaviaToast?.('info', `${p.description.split(',')[0]} is permanently closed, so we left it out.`);
      setSpotSearch(''); setSpotPredictions([]);
      return;
    }
    dispatch(addSpot({
      destinationId: discoverFor,
      name: p.description.split(',')[0],
      photoUrl: det?.photoUrl,
      mapUrl: det?.mapUrl,
      description: det?.description,
      placeId: p.place_id,
      lat: det?.lat,
      lng: det?.lng,
      provenance: det ? 'verified' : 'unchecked',
      verifiedAt: det ? new Date().toISOString() : undefined,
      known: true,
    }));
    setSpotSearch(''); setSpotPredictions([]);
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

  /* ------------------- Contextual "add a stop" suggestions ------------------- */
  /**
   * Suggestions for the NEXT stop, derived from the trip rather than a global list.
   *
   * Anchored on the last stop when there is one ("towns near Gangtok" → Pelling,
   * Ravangla, Lachung), else on the trip's country ("places to visit in India").
   * The hardcoded world-cities list is only reached when the trip has neither.
   */
  const [destSuggestions, setDestSuggestions] = React.useState<QuickSuggestion[]>([]);
  const [destSuggestLoading, setDestSuggestLoading] = React.useState(false);
  const [destSuggestLabel, setDestSuggestLabel] = React.useState('Suggested destinations');
  /** Context already fetched, so reopening the search doesn't re-bill Places. */
  const destSuggestKeyRef = React.useRef<string | null>(null);

  const fetchDestinationSuggestions = React.useCallback(() => {
    const lastStop = destinations[destinations.length - 1];
    const country = tripCountries?.find(c => c && c.trim());

    const anchor = lastStop?.name?.trim()
      ? { key: `stop:${lastStop.name.toLowerCase()}`, query: `towns near ${lastStop.name}`, label: `Near ${lastStop.name}` }
      : country
        ? { key: `country:${country.toLowerCase()}`, query: `top places to visit in ${country}`, label: `Popular in ${country}` }
        : null;

    // No context at all - the global list is the honest answer.
    if (!anchor) {
      destSuggestKeyRef.current = 'global';
      setDestSuggestLabel('Suggested destinations');
      setDestSuggestions(FALLBACK_DESTINATION_SUGGESTIONS.map(name => ({ name })));
      return;
    }
    if (destSuggestKeyRef.current === anchor.key) return;
    destSuggestKeyRef.current = anchor.key;
    setDestSuggestLabel(anchor.label);

    const g = (window as any).google;
    if (!g?.maps?.places) { setDestSuggestions([]); return; }

    setDestSuggestLoading(true);
    // Never suggest somewhere already on the route.
    const taken = new Set(destinations.map(d => d.name.trim().toLowerCase()));
    const svc = new g.maps.places.PlacesService(document.createElement('div'));
    try {
      svc.textSearch({ query: anchor.query }, (results: any[] | null, status: string) => {
        setDestSuggestLoading(false);
        if (status !== 'OK' || !Array.isArray(results)) { setDestSuggestions([]); return; }
        const items: QuickSuggestion[] = [];
        for (const r of results) {
          const name = typeof r.name === 'string' ? r.name.trim() : '';
          if (!name || taken.has(name.toLowerCase())) continue;
          if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) continue;
          items.push({ name, placeId: r.place_id });
          if (items.length >= 8) break;
        }
        setDestSuggestions(items);
      });
    } catch {
      setDestSuggestLoading(false);
      setDestSuggestions([]);
    }
  }, [destinations, tripCountries]);

  // Fetch when the inline search opens, not on mount: this is a billed Places call
  // and most sessions never open it.
  React.useEffect(() => {
    if (!ghostSearchOpen || readOnly) return;
    ensurePlacesScript();
    const t = setTimeout(fetchDestinationSuggestions, 150);
    return () => clearTimeout(t);
  }, [ghostSearchOpen, readOnly, ensurePlacesScript, fetchDestinationSuggestions]);

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
  const [staySearch, setStaySearch] = React.useState('');
  const [stayPredictions, setStayPredictions] = React.useState<any[]>([]);
  const [staySearchLoading, setStaySearchLoading] = React.useState(false);
  const openStay = (id:string) => { setStayFor(id); };
  const closeStayPanel = () => { setStayFor(null); setStaySearch(''); setStayPredictions([]); };
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
  // Lodging autocomplete, mirroring the spots search. `lodging` keeps the list to
  // places you can actually sleep in rather than every business on the street.
  const triggerStaySearch = React.useCallback((query:string)=>{
    if(!query.trim()){ setStayPredictions([]); setStaySearchLoading(false); return; }
    const ready = ensurePlacesScript();
    if(!ready || !placesServiceRef.current){ setStayPredictions([]); setStaySearchLoading(false); return; }
    setStaySearchLoading(true);
    try { placesServiceRef.current.getPlacePredictions({ input:query, types:['lodging'] }, (preds:any[]|null, status:string)=>{
      setStaySearchLoading(false);
      setStayPredictions(status==='OK' && Array.isArray(preds) ? preds.slice(0,6) : []);
    }); } catch { setStaySearchLoading(false); setStayPredictions([]); }
  }, [ensurePlacesScript]);
  React.useEffect(()=> { const t=setTimeout(()=> triggerStaySearch(staySearch), 450); return ()=> clearTimeout(t); }, [staySearch, triggerStaySearch]);
  // Load the SDK when the sheet opens, so the first keystroke searches instead of
  // waiting for the script.
  React.useEffect(()=> { if(stayFor) ensurePlacesScript(); }, [stayFor, ensurePlacesScript]);

  const addStayFromPrediction = (p:any) => {
    if(!stayFor) return;
    const fallbackName = p.structured_formatting?.main_text || p.description?.split(',')[0] || p.description || '';
    getPlaceDetails(p.place_id).then(det => {
      dispatch(addStayEntry({
        destinationId: stayFor,
        name: det?.name || fallbackName,
        // The map link is the most useful thing to carry: it survives, opens in
        // one tap, and the user can still overwrite it with a booking ref.
        reference: det?.mapUrl || det?.description || '',
      }));
      setStaySearch(''); setStayPredictions([]);
    });
  };

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
    // Easy mode has no alert badge to render, so skip the per-stop advisory fetch
    // rather than paying for N requests nothing consumes.
    if (easy || destinations.length === 0) { setAlertsMap({}); return; }
    let cancelled = false;
    destinations.forEach(d => {
      fetchDestinationAlerts(d.id, d.name).then(result => {
        if (!cancelled) setAlertsMap(prev => ({ ...prev, [d.id]: result }));
      });
    });
    return () => { cancelled = true; };
  }, [easy, destinations.map(d => d.id + ':' + d.name).join(',')]);

  /*  Per-destination checklist (local, kept in sync across renders)  */
  const [checklists, setChecklists] = React.useState<Record<string, DestinationCardChecklist>>({});
  const handleChecklistChange = React.useCallback((id: string, cl: DestinationCardChecklist) => {
    setChecklists(prev => ({ ...prev, [id]: cl }));
  }, []);

  /*  Drag-to-reorder (dnd-kit)  */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    if (readOnly) return; // viewers can never reorder
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = destinations.map(d => d.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    dispatch(reorderChainExact({ ids: newIds }));
  }, [destinations, dispatch, readOnly]);


  /* --------------------------- Timeline rail helper -------------------------- */
  // Color for the connector segment leaving a given destination index (in-flow rail).
  const segmentColor = React.useCallback((di: number, dark: boolean): string => {
    const neutral = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
    // Amber/green rails encode "this stop has a stay, transport and activities" -
    // all advanced concepts. In Easy the rail is just a route line.
    if (easy) return neutral;
    const dd = destinations[di];
    const cl = dd ? checklists[dd.id] : undefined;
    const hasAlert = (dd ? alertsMap[dd.id]?.alerts.length ?? 0 : 0) > 0;
    const allDone = cl?.accommodation && cl?.transport && cl?.activities;
    if (hasAlert) return 'linear-gradient(180deg,#BA7517,#F59E0B)';
    if (allDone) return 'linear-gradient(180deg,#16a34a,#22c55e)';
    return neutral;
  }, [destinations, checklists, alertsMap, easy]);

  /** 1-based first day of each stop, so a card can label itself "Day 3-5". */
  const dayStarts = React.useMemo(() => {
    let acc = 1;
    return destinations.map(d => {
      const from = acc;
      acc += Math.max(1, d.nights || 1);
      return from;
    });
  }, [destinations]);

  /* --------------------------------- Render --------------------------------- */
  return (
    <Fade in timeout={300}>
      <Box sx={{ px:{ xs:2, sm:2.5 }, pt:2, pb:1.5, display:'flex', flexDirection:'column', gap:1.5, position:'relative' }}>

        <Box sx={{ position: 'relative', maxWidth: 900, mx: 'auto', width: '100%' }}>
          {destinations.length === 0 && (
            readOnly ? (
              <Box sx={(t) => ({
                mt: 3, p: 5, borderRadius: 3, textAlign: 'center',
                background: t.palette.mode === 'light' ? 'rgba(255,56,92,0.03)' : 'rgba(255,56,92,0.06)',
                border: '1.5px dashed rgba(255,56,92,0.18)',
              })}>
                <Box sx={{ mb: 1, color: 'text.disabled', display: 'flex', justifyContent: 'center' }}><IconPlane size={22} stroke={1.6} /></Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                  No destinations yet
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                  The creator hasn't added any stops to this trip yet.
                </Typography>
              </Box>
            ) : easy ? (
              /* Easy mode says nothing here: the add-stop card below is already
                 the loudest thing on an empty board, and a second "add a stop"
                 message above it just doubles the noise for the exact user this
                 mode exists for. */
              null
            ) : (
              <Box sx={(t) => ({ mt: 3, p: 5, border: '2px dashed rgba(255,56,92,0.2)', borderRadius: 3, textAlign: 'center', fontSize: 14, color: t.palette.text.secondary })}>Click "+ Add your next stop" below to add your first destination.</Box>
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
                        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: easy ? 0 : 1 }}>
                          {/* In-flow timeline rail: numbered node + connector (always visible, no measurement).
                              ADVANCED ONLY. Easy drops it entirely: the card carries a "Day 1-4" badge,
                              a vertical stack already reads as ordered, and the 36px gutter it needed put
                              every card on a different left edge from the header above them. With one stop
                              there is no connector either, so the node rendered as a lone floating dot. */}
                          {!easy && (
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
                              bgcolor: (checklists[d.id]?.accommodation && checklists[d.id]?.transport && checklists[d.id]?.activities)
                                ? '#16a34a' : '#FF385C',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                              transition: 'background 0.3s, box-shadow 0.3s',
                            }}>{idx + 1}</Box>
                          </Box>
                          )}
                          {/* Hover here lifts this stop's marker on the map. The
                              guard matters: dnd-kit moves elements under a
                              stationary cursor while dragging, which otherwise
                              fires a storm of enter/leave events. */}
                          <Box
                            // Scroll target for reality-check findings and the tour.
                            data-stop-id={d.id}
                            sx={{ flex: 1, minWidth: 0 }}
                            onMouseEnter={() => { if (!activeDragId) emitStopHover(d.id, 'card'); }}
                            onMouseLeave={() => { if (!activeDragId) emitStopHover(null, 'card'); }}
                          >
                          {easy ? (
                          <SimpleDestinationCard
                            destination={d}
                            dayFrom={dayStarts[idx] ?? 1}
                            isDragging={isDragging}
                            dragHandleProps={readOnly ? undefined : dragHandleProps}
                            readonly={readOnly}
                            onRename={readOnly ? undefined : (id, name) => dispatch(renameDestination({ id, name }))}
                            onChangeNotes={readOnly ? undefined : (id, text) => dispatch(setDestinationNotes({ id, notes: text }))}
                            onChangeNights={readOnly ? undefined : (id, delta) => {
                              if (delta > 0) ensureNightHeadroom(delta);
                              dispatch(updateDestinationNights({ id, delta }));
                            }}
                            onRemove={readOnly ? undefined : (id) => dispatch(removeDestination(id))}
                            onSwitchToAdvanced={readOnly ? undefined : onSwitchToAdvanced}
                          />
                          ) : (
                          <DestinationCard
                            destination={d}
                            isDragging={isDragging}
                            dragHandleProps={readOnly ? undefined : dragHandleProps}
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
                          )}
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
                const dragIdx = destinations.findIndex(x => x.id === activeDragId);
                const d = destinations[dragIdx];
                if (!d) return null;
                return (
                  <Box sx={{ opacity: 0.85, pointerEvents: 'none' }}>
                    {easy ? (
                      <SimpleDestinationCard destination={d} dayFrom={dayStarts[dragIdx] ?? 1} isDragging />
                    ) : (
                      <DestinationCard
                        destination={d}
                        isDragging
                        checklist={checklists[d.id]}
                        alertCount={alertsMap[d.id]?.alerts.length ?? 0}
                        alerts={alertsMap[d.id]?.alerts ?? []}
                      />
                    )}
                  </Box>
                );
              })() : null}
            </DragOverlay>
          </DndContext>

          {/* Ghost / inline-search "add next stop" */}
          {!readOnly && (
            <>
              {ghostSearchOpen ? (
                /* Inline search input - replaces ghost card */
                <Box sx={{ position: 'relative', mt: 1, ml: easy ? 0 : '36px' }}>
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
                  {!searchValue && (destSuggestLoading || destSuggestions.length > 0) && (
                    <Paper elevation={2} sx={{ position: 'absolute', top: '100%', left: 0, mt: 0.75, width: '100%', zIndex: 20, borderRadius: '12px', p: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant='overline' sx={{ display: 'block', px: 1, py: 0.6, color: 'text.secondary' }}>
                        {destSuggestLabel}
                      </Typography>
                      {destSuggestLoading ? (
                        <Box sx={{ px: 1, pb: 1, fontSize: 12, color: 'text.secondary' }}>Looking for places near you…</Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, px: 0.7, pb: 0.6 }}>
                          {destSuggestions.map((item) => (
                            <Button
                              key={item.placeId || item.name}
                              size='small'
                              onClick={() => {
                                // A placeId means we already know exactly which place this
                                // is - skip the text lookup and its extra billed call.
                                if (item.placeId) selectPrediction({ place_id: item.placeId, description: item.name });
                                else addDestinationFromQuery(item.name);
                                setGhostSearchOpen(false);
                              }}
                              sx={{
                                textTransform: 'none', borderRadius: '999px', fontSize: 12,
                                border: '1px solid', borderColor: 'divider', color: 'text.secondary',
                                '&:hover': { borderColor: 'rgba(255,56,92,0.4)', color: '#FF385C', bgcolor: 'rgba(255,56,92,0.05)' },
                              }}
                            >
                              {item.name}
                            </Button>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  )}
                </Box>
              ) : (
                /* Ghost card. In Easy this is the single primary action on the
                   page, so it grows and speaks in the first person when the
                   board is still empty. */
                <Box
                  data-tour='add-stop'
                  onClick={() => { if (!maxed) setGhostSearchOpen(true); }}
                  sx={(t) => ({
                    mt: 1,
                    // Line up with the cards, which sit to the right of the 28px
                    // timeline rail plus its 8px gap. With no stops there is no
                    // rail to line up with, so the CTA takes the full width.
                    // Easy has no rail to clear, so nothing to indent past.
                    ml: easy ? 0 : '36px',
                    height: easy && destinations.length === 0 ? 84 : easy ? 60 : 56,
                    // Neutral, not coral-filled. The Navia card below already carries
                    // the one brand-tinted surface on this board; a second filled
                    // coral block turned the page into a gradient sandwich. Coral is
                    // kept for the glyph and the hover state - the interactive parts.
                    border: '1.5px dashed',
                    borderColor: t.custom.surface.border,
                    borderRadius: easy ? '16px' : '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 1, cursor: maxed ? 'default' : 'pointer',
                    bgcolor: 'transparent',
                    '&:hover': maxed ? {} : { borderColor: 'rgba(255,56,92,0.40)', background: t.custom.surface.brandTint },
                    transition: `border-color ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}, background ${t.custom.motion.duration.fast} ${t.custom.motion.easing.standard}`,
                    opacity: maxed ? 0.5 : 1,
                  })}
                >
                  <Box component='svg' viewBox='0 0 24 24' sx={{ width: easy ? 20 : 18, height: easy ? 20 : 18, color: 'primary.main', flexShrink: 0 }}>
                    <path fill='currentColor' d='M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z'/>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: easy && destinations.length === 0 ? 14.5 : 13,
                      color: 'text.primary',
                      fontWeight: easy && destinations.length === 0 ? 600 : 500,
                    }}
                  >
                    {easy && destinations.length === 0 ? 'Add your first stop' : 'Add your next stop'}
                  </Typography>
                </Box>
              )}
              {easy ? (
                /* Easy mode's one Navia entry point. The per-stop orb and prompt
                   chips are gone, so this card carries the whole feature: draft
                   the route when there is nothing, extend it once there is. */
                <Box
                  component='button'
                  type='button'
                  data-tour='navia'
                  disabled={completingPlan}
                  onClick={() => {
                    if (onCompletePlan) { onCompletePlan(); return; }
                    // No planner routine wired (shouldn't happen in the app) - fall
                    // back to asking in chat rather than doing nothing.
                    askNavia(destinations.length === 0
                      ? 'Plan my whole trip - suggest a route with the right number of nights in each place.'
                      : 'Complete the rest of my plan - suggest the remaining stops for this route.');
                  }}
                  sx={(t) => ({
                    mt: 2, ml: 0, width: '100%',
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    px: 2, py: 1.5, textAlign: 'left',
                    borderRadius: '16px',
                    border: `1px solid ${t.custom.surface.border}`,
                    backgroundImage: t.custom.gradients.brandSubtle,
                    backgroundColor: 'background.paper',
                    cursor: completingPlan ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    transition: `box-shadow ${t.custom.motion.duration.base} ${t.custom.motion.easing.standard}`,
                    '&:hover': completingPlan ? {} : { boxShadow: t.custom.shadows.card },
                    '&:focus-visible': { outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 },
                  })}
                >
                  <NaviaOrb size={20} processing={completingPlan} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'text.primary' }}>
                      {completingPlan
                        ? 'Navia is working on your plan…'
                        : destinations.length === 0 ? 'Plan the whole trip with Navia' : 'Complete the rest of my plan'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.45, mt: 0.15 }}>
                      {completingPlan
                        ? 'This takes a moment - it checks every place against a real listing.'
                        : destinations.length === 0
                          ? 'Navia drafts the route and writes notes for each stop.'
                          : 'Navia fills the nights you haven’t placed yet and writes notes for stops that have none.'}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography
                    data-tour='navia'
                    onClick={() => askNavia('Can you suggest more destinations to complete my route?')}
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
            </>
          )}
        </Box>

        {/* Advanced-only surfaces. Easy mode never opens them, and leaving them
            mounted would keep their Places autocomplete effects alive for a
            sheet that has no way to appear. */}
        {!easy && (
        <>
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

          {/* Body - flat notepad */}
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
                sx={{ borderRadius:2, fontWeight:700, fontSize:13, px:3 }}
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
          staySearch={staySearch}
          onStaySearchChange={setStaySearch}
          staySearchLoading={staySearchLoading}
          stayPredictions={stayPredictions}
          onAddStayFromPrediction={addStayFromPrediction}
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
        </>
        )}
      </Box>
    </Fade>
  );
};

export default DestinationCardsPanel;
