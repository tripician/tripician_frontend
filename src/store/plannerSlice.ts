import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TripPreferences } from '../utils/tripPreferences';
// Removed differenceInDays dependency after simplifying chain recalculation (nights no longer auto-stretched)

const makeLocalId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export interface PlannerDestination {
  id: string;
  name: string;
  /** User-facing plan headline for this stop (e.g. "Coffee & explore the market") */
  title?: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  nights: number;
  transport?: string;
  notes?: string;
  /** Google Places placeId when destination added via autocomplete */
  placeId?: string;
  /** Cached primary photo URL (small/medium) for decorative card background */
  photoUrl?: string;
  /** Optional structured stay (accommodation) info */
  stay?: {
    name?: string;
    reference?: string;
    notes?: string;
  };
  /** Multiple accommodation entries (new richer model). Each minimal object contains name & reference */
  stays?: Array<{
    id: string;
    name?: string;
    reference?: string;
  }>;
  /** General notes about accommodation (check-in instructions etc.) */
  stayNotes?: string;
  lat?: number; // optional latitude for mapping
  lng?: number; // optional longitude for mapping
  spots?: PlannerSpot[]; // discover spots
  foods?: PlannerFood[]; // discover foods
  /** High-level semantic category used for color coding & filtering in card layout */
  category?: 'general' | 'must_visit' | 'skippable' | 'tentative' | 'decide_later';
  /** Marked when user considers planning for this destination complete */
  completed?: boolean;
}

/**
 * How a spot came to be in the plan. Rendered as a chip so nothing model-generated
 * is ever presented as fact without a source. See services/placeVerification.ts.
 */
export type SpotProvenance = 'verified' | 'unchecked';

export interface PlannerSpot {
  id: string;
  name: string;
  checked: boolean;
  mapUrl?: string; // link to Google Maps
  known: boolean;   // whether we have a map link (available on google)
  placeId?: string; // Google Places ID for fetching details/photos
  photoUrl?: string; // Cached first photo URL (small)
  description?: string; // One-line description fetched from Places (editorial summary or formatted address)
  /** 'verified' = resolved to a real, operational place. Absent on pre-existing spots. */
  provenance?: SpotProvenance;
  /** ISO timestamp of the check that set `provenance`. */
  verifiedAt?: string;
  /** Coordinates from Places - used by the feasibility checks for same-day clustering. */
  lat?: number;
  lng?: number;
  /**
   * The traveller said this one matters. Set when a plan is imported and its
   * author had already starred the place; never inferred on their behalf.
   *
   * DaySpots.MustVisit has existed as a column all along and was read back on
   * load, but nothing ever sent it, so the flag was zeroed by the first autosave.
   */
  mustVisit?: boolean;
}

export interface PlannerFood {
  id: string;
  name: string;
  checked: boolean;
}

export interface PlannerState {
  destinations: PlannerDestination[];
  targetNights: number;
  /** When true, targetNights was explicitly provided (backend or user) and should not auto-resync to sum of destination nights */
  targetLocked?: boolean;
  lastSaved?: string;
  /** Currently hydrated trip id (used to detect cross-trip state reuse) */
  tripId?: string;
  /** Trip-level start date (chain anchor) */
  tripStartDate?: string;
  /** Trip-level end date (chain terminus) */
  tripEndDate?: string;
  /**
   * What the traveller answered when they created the trip: pace, who is going,
   * interests, dietary. Lives here rather than in TripPlanner local state because
   * Reality check reads the pace straight from the store, and the plan save has to
   * round-trip the whole object so it survives a reload.
   */
  preferences?: TripPreferences;
}

export interface TripComment {
  id: string;
  userId: string; // 'me' or member id
  displayName: string; // cached name for quick render
  avatarUrl?: string;
  text: string;
  createdAt: string; // ISO timestamp
  editedAt?: string; // ISO timestamp if edited
  pending?: boolean; // optimistic flag
  parentId?: string; // for threaded replies (undefined => root)
  upvoterIds?: string[]; // list of userIds who upvoted
  replyCount?: number; // denormalized count of direct replies
}

const initialState: PlannerState = {
  destinations: [],
  targetNights: 8,
  targetLocked: false,
  tripId: undefined,
  tripStartDate: undefined,
  tripEndDate: undefined
};

const plannerSlice = createSlice({
  name: 'planner',
  initialState,
  reducers: {
    /** Recalculate contiguous chain dates based on tripStartDate + each destination's own nights.
     *  Rules:
     *   - First destination start forced to tripStartDate (if provided) else keep existing.
     *   - Subsequent destinations start at previous end.
     *   - No automatic expansion/clamping of nights to fill overall span.
     *   - tripEndDate becomes the last destination's end (max itinerary end); never forces night changes.
     */
    _recalcChain(state) {
      if(!state.destinations.length) return;
      const anchorStart = state.tripStartDate || state.destinations[0].startDate || new Date().toISOString().slice(0,10);
      state.destinations[0].startDate = anchorStart;
      state.destinations[0].endDate = new Date(new Date(anchorStart).getTime() + state.destinations[0].nights*24*60*60*1000).toISOString().slice(0,10);
      for(let i=1;i<state.destinations.length;i++) {
        const prev = state.destinations[i-1];
        const cur = state.destinations[i];
        cur.startDate = prev.endDate;
        cur.endDate = new Date(new Date(cur.startDate).getTime() + cur.nights*24*60*60*1000).toISOString().slice(0,10);
      }
      // Derive tripEndDate from last destination end (max itinerary date)
      const lastEnd = state.destinations[state.destinations.length-1].endDate;
      if(lastEnd) state.tripEndDate = lastEnd;
      // If target not locked, sync target to total nights
      if(!state.targetLocked) {
        const total = state.destinations.reduce((a,c)=> a + c.nights, 0);
        state.targetNights = total || state.targetNights;
      }
    },
    /** How you LEAVE this stop for the next one: the same meaning the map and the saved legs already use. */
    setDestinationTransport(state, action: PayloadAction<{ id: string; transport: string }>) {
      const stop = state.destinations.find((d) => d.id === action.payload.id);
      if (stop) stop.transport = action.payload.transport;
    },
    setTargetNights(state, action: PayloadAction<number>) {
      state.targetNights = action.payload;
      state.targetLocked = true; // manual override locks target
    },
    setTripDates(state, action: PayloadAction<{ startDate?: string; endDate?: string }>) {
      if(action.payload.startDate) state.tripStartDate = action.payload.startDate;
      if(action.payload.endDate) state.tripEndDate = action.payload.endDate;
      plannerSlice.caseReducers._recalcChain(state);
    },
    addDestination(state, action: PayloadAction<{ name: string; nights?: number; lat?: number; lng?: number; placeId?: string; photoUrl?: string }>) {
      // Multi-day creation support: allow specifying nights upfront (default 1). Clamp to remaining nights.
      const requested = Math.max(1, Math.round(action.payload.nights || 1));
      const totalNights = state.destinations.reduce((a,c)=> a + c.nights, 0);
      const remaining = state.targetNights - totalNights;
      if (remaining <= 0) return;
      const useNights = Math.min(requested, remaining);
      const last = state.destinations[state.destinations.length - 1];
      const startDate = last ? last.endDate : (state.tripStartDate || new Date().toISOString().slice(0,10));
      const endDate = new Date(new Date(startDate).getTime() + useNights * 24*60*60*1000).toISOString().slice(0,10);
      state.destinations.push({
        id: makeLocalId('dest'),
        name: action.payload.name,
        startDate,
        endDate,
        nights: useNights,
        transport: '',
        lat: action.payload.lat,
        lng: action.payload.lng,
        placeId: action.payload.placeId,
        photoUrl: action.payload.photoUrl,
        category: 'general',
        completed: false
      });
      // If target not locked, resync target to new total so progress ring denominator stays meaningful
      if(!state.targetLocked) {
        const newTotal = state.destinations.reduce((a,c)=> a + c.nights, 0);
        state.targetNights = newTotal;
      }
    },
    removeDestination(state, action: PayloadAction<string>) {
      state.destinations = state.destinations.filter(d => d.id !== action.payload);
    },
    updateDestinationNights(state, action: PayloadAction<{ id: string; delta: number }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) {
        const totalNights = state.destinations.reduce((a,c)=> a + c.nights, 0);
        // If increasing and would exceed target, block
        if (action.payload.delta > 0 && totalNights >= state.targetNights) return;
        const proposed = d.nights + action.payload.delta;
        if (proposed < 1) return; // keep at least 1
        // If proposed increase pushes overall total beyond target, clamp or block
        if (action.payload.delta > 0) {
          const overshoot = (totalNights - d.nights + proposed) - state.targetNights;
          if (overshoot > 0) {
            // Reduce proposed by overshoot (could become same as current -> no-op)
            const adjusted = proposed - overshoot;
            if (adjusted <= 0) return;
            d.nights = adjusted;
          } else {
            d.nights = proposed;
          }
        } else {
          d.nights = proposed;
        }
        // adjust endDate relative to startDate
        const s = new Date(d.startDate).getTime();
        d.endDate = new Date(s + d.nights * 24*60*60*1000).toISOString().slice(0,10);
        // Cascade recalculation of subsequent destination start/end dates to maintain a contiguous chain
        const idx = state.destinations.findIndex(x => x.id === d.id);
        for(let i = idx + 1; i < state.destinations.length; i++) {
          const prev = state.destinations[i - 1];
          const cur = state.destinations[i];
          cur.startDate = prev.endDate;
          const startMs = new Date(cur.startDate).getTime();
          cur.endDate = new Date(startMs + cur.nights * 24*60*60*1000).toISOString().slice(0,10);
        }
        // Recompute contiguous chain + derived tripEndDate (no auto night expansion)
        plannerSlice.caseReducers._recalcChain(state);
      }
    },
    setDestinationCoords(state, action: PayloadAction<{ id: string; lat: number; lng: number }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) { d.lat = action.payload.lat; d.lng = action.payload.lng; }
    },
    setDestinationNotes(state, action: PayloadAction<{ id: string; notes: string }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) d.notes = action.payload.notes;
    },
    // --- Multi accommodation CRUD ---
    addStayEntry(state, action: PayloadAction<{ destinationId: string; name?: string; reference?: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if(!d) return; if(!d.stays) d.stays = [];
      d.stays.push({ id: makeLocalId('stay'), name: action.payload.name?.trim(), reference: action.payload.reference?.trim() });
    },
    updateStayEntry(state, action: PayloadAction<{ destinationId: string; stayId: string; patch: { name?: string; reference?: string } }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if(!d?.stays) return; const s = d.stays.find(x=> x.id === action.payload.stayId); if(!s) return;
      if(action.payload.patch.name!==undefined) s.name = action.payload.patch.name.trim();
      if(action.payload.patch.reference!==undefined) s.reference = action.payload.patch.reference.trim();
    },
    removeStayEntry(state, action: PayloadAction<{ destinationId: string; stayId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if(!d?.stays) return; d.stays = d.stays.filter(s=> s.id !== action.payload.stayId);
    },
    setStayNotes(state, action: PayloadAction<{ destinationId: string; notes: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if(!d) return; d.stayNotes = action.payload.notes;
    },
    renameDestination(state, action: PayloadAction<{ id: string; name: string }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (!d) return;
      const next = action.payload.name;
      if (d.name.trim().toLowerCase() === next.trim().toLowerCase()) { d.name = next; return; }
      // A rename points the stop at a DIFFERENT place, so the old geometry is now
      // a lie - it would leave the map pin and the route leg on the previous city.
      // Cleared rather than re-resolved here (reducers must stay synchronous); the
      // planner's backfill sweep picks the stop up and geocodes the new name.
      d.name = next;
      d.lat = undefined;
      d.lng = undefined;
      d.placeId = undefined;
    },
  addSpot(state, action: PayloadAction<{ destinationId: string; name: string; mapUrl?: string; known: boolean; placeId?: string; photoUrl?: string; description?: string; provenance?: SpotProvenance; verifiedAt?: string; lat?: number; lng?: number; mustVisit?: boolean }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d) return;
      if (!d.spots) d.spots = [];
      if (d.spots.some(s=> s.name.toLowerCase()===action.payload.name.toLowerCase())) return;
      d.spots.push({
        id: makeLocalId('spot'),
        name: action.payload.name,
        mapUrl: action.payload.mapUrl,
        known: action.payload.known,
        placeId: action.payload.placeId,
        photoUrl: action.payload.photoUrl,
        description: action.payload.description,
        provenance: action.payload.provenance,
        verifiedAt: action.payload.verifiedAt,
        lat: action.payload.lat,
        lng: action.payload.lng,
        mustVisit: action.payload.mustVisit,
        checked:false
      });
    },
    toggleSpot(state, action: PayloadAction<{ destinationId: string; spotId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.spots) return;
      const s = d.spots.find(x=> x.id === action.payload.spotId);
      if (s) s.checked = !s.checked;
    },
    /** The star on a place chip: a must see, which the public trip page and the prompts both read. */
    toggleSpotMustVisit(state, action: PayloadAction<{ destinationId: string; spotId: string }>) {
      const spot = state.destinations
        .find((d) => d.id === action.payload.destinationId)?.spots
        ?.find((s) => s.id === action.payload.spotId);
      if (spot) spot.mustVisit = !spot.mustVisit;
    },
    removeSpot(state, action: PayloadAction<{ destinationId: string; spotId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.spots) return;
      d.spots = d.spots.filter(s=> s.id !== action.payload.spotId);
    },
    addFoodItem(state, action: PayloadAction<{ destinationId: string; name: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d) return; if (!d.foods) d.foods = [];
      if (d.foods.some(f=> f.name.toLowerCase()===action.payload.name.toLowerCase())) return;
      d.foods.push({ id: makeLocalId('food'), name: action.payload.name, checked:false });
    },
    toggleFoodItem(state, action: PayloadAction<{ destinationId: string; foodId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.foods) return;
      const f = d.foods.find(x=> x.id === action.payload.foodId);
      if (f) f.checked = !f.checked;
    },
    removeFoodItem(state, action: PayloadAction<{ destinationId: string; foodId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.foods) return;
      d.foods = d.foods.filter(f=> f.id !== action.payload.foodId);
    },
    clearDestinationDiscover(state, action: PayloadAction<{ destinationId: string }>) {
      const d = state.destinations.find(x => x.id === action.payload.destinationId);
      if (!d) return;
      d.spots = [];
      d.foods = [];
    },
    // Exact reorder (allow first to move). Dates recomputed starting from original first startDate.
    reorderChainExact(state, action: PayloadAction<{ ids: string[] }>) {
      const { ids } = action.payload; if(!ids.length) return;
      const map: Record<string, PlannerDestination> = {}; state.destinations.forEach(d=> { map[d.id]=d; });
      const newOrder: PlannerDestination[] = []; ids.forEach(id=> { if(map[id]) newOrder.push(map[id]); });
      if(newOrder.length !== state.destinations.length) return; // safety
      // Preserve original trip start date from earliest current start (first element before reorder)
      const originalStart = state.destinations[0]?.startDate || new Date().toISOString().slice(0,10);
      let cursorStart = originalStart;
      for(let i=0;i<newOrder.length;i++) {
        const d = newOrder[i];
        d.startDate = cursorStart;
        const end = new Date(new Date(cursorStart).getTime() + d.nights*24*60*60*1000).toISOString().slice(0,10);
        d.endDate = end;
        cursorStart = end; // next start
      }
      state.destinations = newOrder;
      plannerSlice.caseReducers._recalcChain(state);
    },
    loadState(_state, action: PayloadAction<PlannerState>) {
      return { ...action.payload, targetLocked: action.payload.targetLocked };
    },
    resetPlanner(_state, action: PayloadAction<{ tripId?: string }>) {
      return {
        ...initialState,
        tripId: action.payload.tripId
      };
    },
    /** Set once on hydration, from what the trip was created with. */
    setTripPreferences(state, action: PayloadAction<TripPreferences | undefined>) {
      state.preferences = action.payload;
    }
  }
});

export const {
    setDestinationTransport,
    setTargetNights,
  setTripDates,
  addDestination,
  removeDestination,
  updateDestinationNights,
  reorderChainExact,
  loadState,
  setDestinationCoords,
  setDestinationNotes,
  addStayEntry,
  updateStayEntry,
  removeStayEntry,
  setStayNotes,
  renameDestination
} = plannerSlice.actions;

export const {
  addSpot,
  toggleSpot,
    removeSpot,
    toggleSpotMustVisit,
  addFoodItem,
  toggleFoodItem,
  removeFoodItem,
  clearDestinationDiscover
} = plannerSlice.actions;

export const {
  resetPlanner,
  setTripPreferences
} = plannerSlice.actions;

export default plannerSlice.reducer;
