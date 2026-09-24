import React from 'react';
import { Box, Button, IconButton, Stack, Typography, useTheme } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconPlane, IconPlus, IconX } from '@tabler/icons-react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import {
  addDestination, removeDestination, renameDestination, setDestinationNotes, setDestinationTransport,
  addSpot, toggleSpot, removeSpot, toggleSpotMustVisit, addFoodItem, toggleFoodItem, removeFoodItem,
  updateDestinationNights, reorderChainExact, setTargetNights,
  addStayEntry, updateStayEntry, removeStayEntry, setStayNotes,
} from '../../store/plannerSlice';
import { planDestination, TripicianAIRequestError } from '../../tripicianai/tripicianAIService';
import { resolveSpots, getPlaceDetails, ensurePlacesReady } from '../../services/placeVerification';
import { emitStopHover } from '../../utils/stopHoverBus';
import TripicianAIOrb from '../../tripicianai/TripicianAIOrb';
import PlaceSearchField from '../../components/places/PlaceSearchField';
import { toPickedPlace, type PickedPlace } from '../../components/places/pickedPlace';
import { DiscoverSheet, StaySheet } from './PlannerModals';
import StopCard from './StopCard';
import StopConnector from './StopConnector';
import { ideasToAdd } from './stopIdeas';
import { PLANNER_COLUMN_MAX, PLANNER_COLUMN_PX } from './PlannerHeaderShell';

interface DestinationCardsPanelProps {
  readOnly?: boolean;
  tripId?: string;
  authToken?: string | null;
  tripVibe?: string | null;
  /** Trip countries, used to anchor "add a stop" suggestions when the route is empty. */
  tripCountries?: string[];
  onTripicianAIToast?: (type: 'success' | 'error' | 'info', message: string) => void;
  /** "Plan it for me" / "Fill in the rest" on the whole board. */
  onCompletePlan?: () => void;
  completingPlan?: boolean;
  /** A stop picked here brings its country onto the trip, so the countries follow the route. */
  onStopCountry?: (country: string) => void;
}

type QuickSuggestion = { name: string; placeId?: string };

// Street-level results are not stops.
const NOT_A_STOP = ['street_address', 'route', 'premise', 'subpremise', 'street_number', 'postal_code', 'plus_code'];
const DETAIL_FIELDS = ['place_id', 'name', 'geometry', 'address_components', 'types', 'photos'];

const places = (): any => (window as any).google?.maps?.places ?? null;

const SortableCardWrapper: React.FC<{
  id: string;
  children: (props: { isDragging: boolean; dragHandleProps: Record<string, unknown> }) => React.ReactNode;
}> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition: transition || undefined }}>
      {children({ isDragging, dragHandleProps: { ...listeners, ...attributes } })}
    </div>
  );
};

// The route: one card per stop, a way to add the next one, and TripicianAI to fill the gaps.
const DestinationCardsPanel: React.FC<DestinationCardsPanelProps> = ({
  readOnly = false, tripId, authToken, tripVibe, tripCountries, onTripicianAIToast, onCompletePlan, completingPlan = false, onStopCountry,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const destinations = useSelector((s: RootState) => s.planner.destinations);

  // Nights follow the stops: a stop is never refused because the trip's night count is full.
  const ensureNightHeadroom = React.useCallback((nights = 1) => {
    const st = store.getState().planner;
    const total = st.destinations.reduce((a, d) => a + (d.nights || 0), 0);
    if (st.targetNights - total < nights) dispatch(setTargetNights(total + nights));
  }, [store, dispatch]);

  /* ---------------------------- Adding a stop ---------------------------- */
  const [adding, setAdding] = React.useState(false);

  const addPicked = React.useCallback((p: PickedPlace) => {
    ensureNightHeadroom();
    dispatch(addDestination({ name: p.name, lat: p.lat, lng: p.lng, placeId: p.placeId.startsWith('typed:') ? undefined : p.placeId, photoUrl: p.photoUrl }));
    if (p.country) onStopCountry?.(p.country);
    setAdding(false);
  }, [dispatch, ensureNightHeadroom, onStopCountry]);

  // A suggestion already names its place, so one details call gives it coordinates and a country.
  const addSuggestion = React.useCallback((s: QuickSuggestion) => {
    const svc = places();
    if (!s.placeId || !svc) { addPicked({ placeId: `typed:${s.name.toLowerCase()}`, name: s.name, kind: 'place' }); return; }
    new svc.PlacesService(document.createElement('div')).getDetails(
      { placeId: s.placeId, fields: DETAIL_FIELDS },
      (place: unknown, status: string) => addPicked(toPickedPlace(status === 'OK' ? place : null, { placeId: s.placeId!, name: s.name })),
    );
  }, [addPicked]);

  const [destSuggestions, setDestSuggestions] = React.useState<QuickSuggestion[]>([]);
  const [destSuggestLabel, setDestSuggestLabel] = React.useState('');
  const destSuggestKeyRef = React.useRef<string | null>(null);

  // Ideas for the next stop, anchored on the last stop, else the trip's country. Fetched on open because it is a billed call.
  React.useEffect(() => {
    if (!adding || readOnly) return;
    const lastStop = destinations[destinations.length - 1];
    const country = tripCountries?.find((c) => c && c.trim());
    const anchor = lastStop?.name?.trim()
      ? { key: `stop:${lastStop.name.toLowerCase()}`, query: `towns near ${lastStop.name}`, label: `Near ${lastStop.name}` }
      : country ? { key: `country:${country.toLowerCase()}`, query: `top places to visit in ${country}`, label: `Popular in ${country}` } : null;
    if (!anchor) { setDestSuggestions([]); return; }
    if (destSuggestKeyRef.current === anchor.key) return;
    let live = true;
    void ensurePlacesReady().then((ok) => {
      const svc = places();
      if (!live || !ok || !svc) return;
      destSuggestKeyRef.current = anchor.key;
      setDestSuggestLabel(anchor.label);
      const taken = new Set(destinations.map((d) => d.name.trim().toLowerCase()));
      try {
        new svc.PlacesService(document.createElement('div')).textSearch({ query: anchor.query }, (results: any[] | null, status: string) => {
          if (!live) return;
          if (status !== 'OK' || !Array.isArray(results)) { setDestSuggestions([]); return; }
          const items: QuickSuggestion[] = [];
          for (const r of results) {
            const name = typeof r.name === 'string' ? r.name.trim() : '';
            if (!name || taken.has(name.toLowerCase()) || items.some((i) => i.name.toLowerCase() === name.toLowerCase())) continue;
            items.push({ name, placeId: r.place_id });
            if (items.length >= 6) break;
          }
          setDestSuggestions(items);
        });
      } catch {
        setDestSuggestions([]);
      }
    });
    return () => { live = false; };
  }, [adding, readOnly, destinations, tripCountries]);

  /* ------------------------ TripicianAI for one stop ------------------------ */
  const [planningId, setPlanningId] = React.useState<string | null>(null);

  const handlePlanDestination = React.useCallback(async (destinationId: string) => {
    const dest = store.getState().planner.destinations.find((d) => d.id === destinationId);
    if (!dest || !tripId || !authToken) {
      onTripicianAIToast?.('error', 'Sign in and save your trip before using TripicianAI here.');
      return;
    }
    setPlanningId(destinationId);
    try {
      const result = await planDestination({
        tripId, destinationName: dest.name, planTitle: dest.title, lat: dest.lat, lng: dest.lng,
        nights: dest.nights, category: dest.category, vibe: tripVibe ?? undefined,
      }, authToken);

      // A save during the call can swap client ids for server ones, so find the stop again by id, then by name.
      const fresh = store.getState().planner.destinations;
      const live = fresh.find((d) => d.id === destinationId) ?? fresh.find((d) => d.name === dest.name);
      if (!live) {
        onTripicianAIToast?.('error', `${dest.name} is no longer in your plan, so the ideas had nowhere to go.`);
        return;
      }

      // Every place is checked against a live listing first; ones that closed for good are dropped.
      const candidates = (result.spots ?? []).filter((s) => s.name?.trim());
      const resolvedSpots = await resolveSpots(candidates, dest.name);
      const newSpots = ideasToAdd(live.spots ?? [], resolvedSpots);
      for (const spot of newSpots) {
        dispatch(addSpot({
          destinationId: live.id, name: spot.name, description: spot.description, mapUrl: spot.mapUrl, photoUrl: spot.photoUrl,
          placeId: spot.placeId, provenance: spot.provenance, verifiedAt: spot.verifiedAt, lat: spot.lat, lng: spot.lng, known: Boolean(spot.mapUrl),
        }));
      }
      const newFoods = ideasToAdd(live.foods ?? [], (result.foods ?? []).map((f) => ({ name: f.name?.trim() ?? '' })));
      for (const food of newFoods) dispatch(addFoodItem({ destinationId: live.id, name: food.name }));
      const notes = (result.journalNotes ?? '').trim();
      if (notes && !(live.notes || '').trim()) dispatch(setDestinationNotes({ id: live.id, notes }));

      const dropped = candidates.length - resolvedSpots.length;
      if (newSpots.length === 0 && newFoods.length === 0) {
        onTripicianAIToast?.('info', `${dest.name} already has everything TripicianAI suggested.`);
      } else if (dropped > 0) {
        onTripicianAIToast?.('info', `Added ideas for ${dest.name}. ${dropped} place${dropped === 1 ? ' had' : 's had'} closed for good, so we left ${dropped === 1 ? 'it' : 'them'} out.`);
      } else {
        onTripicianAIToast?.('success', `Added ideas for ${dest.name}.`);
      }
    } catch (err) {
      onTripicianAIToast?.('error', err instanceof TripicianAIRequestError && err.status === 402
        ? 'This trip is out of TripicianAI credits.'
        : 'TripicianAI could not fill this stop. Try again.');
    } finally {
      setPlanningId(null);
    }
  }, [store, tripId, authToken, tripVibe, dispatch, onTripicianAIToast]);

  /* ------------------------- Places and food sheet ------------------------- */
  const [discoverFor, setDiscoverFor] = React.useState<string | null>(null);
  const [discoverTab, setDiscoverTab] = React.useState<'spots' | 'foods'>('spots');
  const [spotSearch, setSpotSearch] = React.useState('');
  const [spotPredictions, setSpotPredictions] = React.useState<any[]>([]);
  const [spotSearchLoading, setSpotSearchLoading] = React.useState(false);
  const [nearbySpots, setNearbySpots] = React.useState<QuickSuggestion[]>([]);
  const [nearbyLoading, setNearbyLoading] = React.useState(false);
  const discoverDest = discoverFor ? destinations.find((d) => d.id === discoverFor) : undefined;

  React.useEffect(() => {
    const q = spotSearch.trim();
    if (!q) { setSpotPredictions([]); setSpotSearchLoading(false); return; }
    let live = true;
    setSpotSearchLoading(true);
    const t = setTimeout(() => {
      void ensurePlacesReady().then((ok) => {
        const svc = places();
        if (!live) return;
        if (!ok || !svc) { setSpotSearchLoading(false); setSpotPredictions([]); return; }
        new svc.AutocompleteService().getPlacePredictions({ input: q }, (preds: any[] | null, status: string) => {
          if (!live) return;
          setSpotSearchLoading(false);
          if (status !== 'OK' || !Array.isArray(preds)) { setSpotPredictions([]); return; }
          const allow = new Set(['tourist_attraction', 'point_of_interest', 'establishment']);
          setSpotPredictions(preds.filter((p) => !p.types || p.types.some((ty: string) => allow.has(ty))).slice(0, 8));
        });
      });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [spotSearch]);

  const addSpotFromPrediction = (p: any) => {
    if (!discoverFor) return;
    const target = discoverFor;
    void getPlaceDetails(p.place_id).then((det) => {
      // Picked from Google, so checked by construction, unless Google says it has shut for good.
      if (det?.businessStatus === 'CLOSED_PERMANENTLY') {
        onTripicianAIToast?.('info', `${p.description.split(',')[0]} has closed for good, so we left it out.`);
      } else {
        dispatch(addSpot({
          destinationId: target, name: p.description.split(',')[0], photoUrl: det?.photoUrl, mapUrl: det?.mapUrl,
          description: det?.description, placeId: p.place_id, lat: det?.lat, lng: det?.lng,
          provenance: det ? 'verified' : 'unchecked', verifiedAt: det ? new Date().toISOString() : undefined, known: true,
        }));
      }
      setSpotSearch('');
      setSpotPredictions([]);
    });
  };

  // Real places near the stop, never a made-up list.
  React.useEffect(() => {
    if (!discoverDest || discoverTab !== 'spots') { setNearbySpots([]); return; }
    let live = true;
    setNearbyLoading(true);
    setNearbySpots([]);
    void ensurePlacesReady().then((ok) => {
      const g = (window as any).google;
      if (!live) return;
      if (!ok || !g?.maps?.places) { setNearbyLoading(false); return; }
      const finish = (items: QuickSuggestion[]) => { if (live) { setNearbySpots(items.slice(0, 6)); setNearbyLoading(false); } };
      const toItems = (rs: any[] | null) => (Array.isArray(rs) ? rs.map((r) => ({ name: r.name as string, placeId: r.place_id as string })).filter((r) => r.name) : []);
      const svc = new g.maps.places.PlacesService(document.createElement('div'));
      const byText = () => svc.textSearch({ query: `top attractions in ${discoverDest.name}` }, (rs: any[] | null, st: string) => finish(st === 'OK' ? toItems(rs) : []));
      if (discoverDest.lat != null && discoverDest.lng != null) {
        svc.nearbySearch({ location: new g.maps.LatLng(discoverDest.lat, discoverDest.lng), radius: 8000, type: 'tourist_attraction' }, (rs: any[] | null, st: string) => {
          if (st === 'OK' && Array.isArray(rs) && rs.length > 0) finish(toItems(rs)); else byText();
        });
      } else byText();
    });
    return () => { live = false; };
  }, [discoverDest?.id, discoverTab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------- Stay sheet ------------------------------- */
  const [stayFor, setStayFor] = React.useState<string | null>(null);
  const [staySearch, setStaySearch] = React.useState('');
  const [stayPredictions, setStayPredictions] = React.useState<any[]>([]);
  const [staySearchLoading, setStaySearchLoading] = React.useState(false);
  const stayDest = stayFor ? destinations.find((d) => d.id === stayFor) : undefined;
  const closeStay = () => { setStayFor(null); setStaySearch(''); setStayPredictions([]); };

  React.useEffect(() => {
    const q = staySearch.trim();
    if (!q) { setStayPredictions([]); setStaySearchLoading(false); return; }
    let live = true;
    setStaySearchLoading(true);
    const t = setTimeout(() => {
      void ensurePlacesReady().then((ok) => {
        const svc = places();
        if (!live) return;
        if (!ok || !svc) { setStaySearchLoading(false); setStayPredictions([]); return; }
        // Lodging only, so the list is places you can sleep in rather than every business on the street.
        new svc.AutocompleteService().getPlacePredictions({ input: q, types: ['lodging'] }, (preds: any[] | null, status: string) => {
          if (!live) return;
          setStaySearchLoading(false);
          setStayPredictions(status === 'OK' && Array.isArray(preds) ? preds.slice(0, 6) : []);
        });
      });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [staySearch]);

  const addStayFromPrediction = (p: any) => {
    if (!stayFor) return;
    const target = stayFor;
    const fallbackName = p.structured_formatting?.main_text || p.description?.split(',')[0] || p.description || '';
    void getPlaceDetails(p.place_id).then((det) => {
      // The map link is the most useful thing to keep: it opens in one tap and can be overwritten with a booking ref.
      dispatch(addStayEntry({ destinationId: target, name: det?.name || fallbackName, reference: det?.mapUrl || det?.description || '' }));
      setStaySearch('');
      setStayPredictions([]);
    });
  };

  /* ------------------------------ Drag to reorder ------------------------------ */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = destinations.map((d) => d.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    dispatch(reorderChainExact({ ids: arrayMove(ids, from, to) }));
  }, [destinations, dispatch, readOnly]);

  const dayStarts = React.useMemo(() => {
    let acc = 1;
    return destinations.map((d) => { const from = acc; acc += Math.max(1, d.nights || 1); return from; });
  }, [destinations]);

  const cardProps = (id: string) => (readOnly ? {} : {
    onAddPlace: (sid: string, place: PickedPlace) => dispatch(addSpot({
      destinationId: sid, name: place.name, placeId: place.placeId, lat: place.lat, lng: place.lng,
      description: place.detail, provenance: 'verified', verifiedAt: new Date().toISOString(), known: true,
    })),
    // Typed rather than picked, so it is recorded as unchecked instead of claiming Google agreed.
    onAddPlaceText: (sid: string, name: string) => dispatch(addSpot({ destinationId: sid, name, known: false, provenance: 'unchecked' })),
    onAddStay: (sid: string, name: string) => dispatch(addStayEntry({ destinationId: sid, name, reference: '' })),
    onAddFood: (sid: string, name: string) => dispatch(addFoodItem({ destinationId: sid, name })),
    onRemoveSpot: (sid: string, spotId: string) => dispatch(removeSpot({ destinationId: sid, spotId })),
    onRemoveStay: (sid: string, stayId: string) => dispatch(removeStayEntry({ destinationId: sid, stayId })),
    onRemoveFood: (sid: string, foodId: string) => dispatch(removeFoodItem({ destinationId: sid, foodId })),
    onToggleMustVisit: (sid: string, spotId: string) => dispatch(toggleSpotMustVisit({ destinationId: sid, spotId })),
    onRename: (sid: string, name: string) => dispatch(renameDestination({ id: sid, name })),
    onChangeNights: (sid: string, delta: number) => { if (delta > 0) ensureNightHeadroom(delta); dispatch(updateDestinationNights({ id: sid, delta })); },
    onChangeNotes: (sid: string, notes: string) => dispatch(setDestinationNotes({ id: sid, notes })),
    onRemove: (sid: string) => dispatch(removeDestination(sid)),
    onOpenPlaces: () => { setDiscoverFor(id); setDiscoverTab('spots'); },
    onOpenFood: () => { setDiscoverFor(id); setDiscoverTab('foods'); },
    onOpenStay: () => setStayFor(id),
    onFillWithAI: (sid: string) => { void handlePlanDestination(sid); },
  });

  const empty = destinations.length === 0;

  return (
    <Box sx={{ px: PLANNER_COLUMN_PX, pt: 2, pb: 12 }}>
      <Box sx={{ maxWidth: PLANNER_COLUMN_MAX, mx: 'auto', width: '100%' }}>
        {empty && readOnly && (
          <Box sx={{ mt: 3, p: 5, borderRadius: '18px', textAlign: 'center', border: `1.5px dashed ${theme.custom.surface.border}` }}>
            <Box sx={{ mb: 1, color: 'text.disabled', display: 'flex', justifyContent: 'center' }}><IconPlane size={22} stroke={1.6} /></Box>
            <Typography variant="subtitle2">No stops yet</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>The planner has not added any places to this trip yet.</Typography>
          </Box>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveDragId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <SortableContext items={destinations.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <Stack spacing={1.5}>
              <AnimatePresence initial={false}>
                {destinations.map((d, idx) => (
                  <React.Fragment key={d.id}>
                  {/* Outside the sortable item on purpose: a connector belongs to the gap, not to either card. */}
                  {idx > 0 && (
                    <StopConnector
                      from={destinations[idx - 1]}
                      to={d}
                      readOnly={readOnly}
                      onChange={(transport) => dispatch(setDestinationTransport({ id: destinations[idx - 1].id, transport }))}
                    />
                  )}
                  <SortableCardWrapper id={d.id}>
                    {({ isDragging, dragHandleProps }) => (
                      <Box
                        data-stop-id={d.id}
                        onMouseEnter={() => { if (!activeDragId) emitStopHover(d.id, 'card'); }}
                        onMouseLeave={() => { if (!activeDragId) emitStopHover(null, 'card'); }}
                      >
                        <StopCard
                          destination={d}
                          dayFrom={dayStarts[idx] ?? 1}
                          readOnly={readOnly}
                          isDragging={isDragging}
                          dragHandleProps={readOnly ? undefined : dragHandleProps}
                          aiBusy={planningId === d.id}
                          {...cardProps(d.id)}
                        />
                      </Box>
                    )}
                  </SortableCardWrapper>
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </Stack>
          </SortableContext>
          <DragOverlay>
            {activeDragId ? (() => {
              const i = destinations.findIndex((x) => x.id === activeDragId);
              const d = destinations[i];
              return d ? <Box sx={{ opacity: 0.95, pointerEvents: 'none', transform: 'rotate(-1.2deg)' }}><StopCard destination={d} dayFrom={dayStarts[i] ?? 1} readOnly isDragging /></Box> : null;
            })() : null}
          </DragOverlay>
        </DndContext>

        {!readOnly && (
          <>
            {adding ? (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '18px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">{empty ? 'Where do you go first?' : 'Where next?'}</Typography>
                  <IconButton size="small" aria-label="Close" onClick={() => setAdding(false)}><IconX size={16} /></IconButton>
                </Box>
                <PlaceSearchField
                  ariaLabel="Add a stop"
                  placeholder="A city, town or area"
                  types={['geocode', 'establishment']}
                  exclude={NOT_A_STOP}
                  autoFocus
                  onPick={addPicked}
                />
                {destSuggestions.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>{destSuggestLabel}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                      {destSuggestions.map((s) => (
                        <Button
                          key={s.placeId || s.name}
                          size="small"
                          onClick={() => addSuggestion(s)}
                          startIcon={<IconPlus size={14} />}
                          sx={{ borderRadius: '999px', px: 1.25, border: `1px solid ${theme.custom.surface.border}`, color: 'text.primary', '&:hover': { borderColor: 'text.secondary', bgcolor: 'transparent' } }}
                        >
                          {s.name}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                component="button"
                type="button"
                data-tour="add-stop"
                onClick={() => setAdding(true)}
                sx={{
                  mt: 1.5, width: '100%', height: empty ? 84 : 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  border: `1.5px dashed ${theme.custom.surface.border}`, borderRadius: '18px', bgcolor: 'transparent', cursor: 'pointer',
                  font: 'inherit', color: 'text.primary',
                  transition: `border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
                  '&:hover': { borderColor: 'text.secondary', bgcolor: theme.custom.surface.hover },
                  '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
                }}
              >
                <IconPlus size={empty ? 20 : 18} stroke={2.2} />
                <Typography sx={{ fontWeight: empty ? 700 : 600, fontSize: empty ? 15 : 13.5 }}>
                  {empty ? 'Add your first stop' : 'Add another stop'}
                </Typography>
              </Box>
            )}

            <Box
              component="button"
              type="button"
              data-tour="tripicianai"
              disabled={completingPlan}
              onClick={() => onCompletePlan?.()}
              sx={{
                mt: 1.5, width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.75, textAlign: 'left',
                borderRadius: '18px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: theme.custom.surface.brandTint,
                cursor: completingPlan ? 'default' : 'pointer', font: 'inherit', color: 'text.primary',
                transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
                '&:hover': completingPlan ? {} : { boxShadow: theme.custom.shadows.card },
                '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
              }}
            >
              <TripicianAIOrb size={26} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
                  {completingPlan ? 'TripicianAI is working on your plan' : empty ? 'Plan it for me' : 'Fill in the rest for me'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.2 }}>
                  {completingPlan
                    ? 'Every place is checked against a real listing, so this takes a moment.'
                    : empty
                      ? 'TripicianAI picks the stops and adds places, food and tips. Uses trip credits.'
                      : 'Adds stops for the nights left open and ideas for empty stops. Nothing you added is changed.'}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>

      <DiscoverSheet
        open={!!discoverFor}
        onClose={() => { setDiscoverFor(null); setSpotSearch(''); setSpotPredictions([]); }}
        destination={discoverDest}
        tab={discoverTab}
        onTabChange={setDiscoverTab}
        spotSearch={spotSearch}
        onSpotSearchChange={setSpotSearch}
        spotSearchLoading={spotSearchLoading}
        spotPredictions={spotPredictions}
        nearbySpots={nearbySpots}
        nearbyLoading={nearbyLoading}
        readOnly={readOnly}
        onAddSpotFromPrediction={addSpotFromPrediction}
        onQuickAddSpot={(item) => {
          if (!discoverFor) return;
          if (item.placeId) addSpotFromPrediction({ place_id: item.placeId, description: item.name });
          else dispatch(addSpot({ destinationId: discoverFor, name: item.name, known: true, mapUrl: `https://maps.google.com/?q=${encodeURIComponent(`${item.name} ${discoverDest?.name || ''}`)}` }));
        }}
        onQuickAddFood={(name) => discoverFor && dispatch(addFoodItem({ destinationId: discoverFor, name }))}
        onToggleSpot={(spotId) => discoverFor && dispatch(toggleSpot({ destinationId: discoverFor, spotId }))}
        onRemoveSpot={(spotId) => discoverFor && dispatch(removeSpot({ destinationId: discoverFor, spotId }))}
        onToggleFood={(foodId) => discoverFor && dispatch(toggleFoodItem({ destinationId: discoverFor, foodId }))}
        onRemoveFood={(foodId) => discoverFor && dispatch(removeFoodItem({ destinationId: discoverFor, foodId }))}
      />

      <StaySheet
        open={!!stayFor}
        onClose={closeStay}
        destination={stayDest}
        stays={stayDest?.stays || []}
        stayNotes={stayDest?.stayNotes || ''}
        readOnly={readOnly}
        onAddProperty={() => stayFor && dispatch(addStayEntry({ destinationId: stayFor }))}
        onUpdateProperty={(stayId, patch) => stayFor && dispatch(updateStayEntry({ destinationId: stayFor, stayId, patch }))}
        onDeleteProperty={(stayId) => stayFor && dispatch(removeStayEntry({ destinationId: stayFor, stayId }))}
        onStayNotesChange={(notes) => stayFor && dispatch(setStayNotes({ destinationId: stayFor, notes }))}
        staySearch={staySearch}
        onStaySearchChange={setStaySearch}
        staySearchLoading={staySearchLoading}
        stayPredictions={stayPredictions}
        onAddStayFromPrediction={addStayFromPrediction}
      />
    </Box>
  );
};

export default DestinationCardsPanel;
