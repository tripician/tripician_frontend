import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface PlannerDestination {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  nights: number;
  transport?: string;
  budget?: number; // per-destination budget amount in selected currency
  notes?: string;
  lat?: number; // optional latitude for mapping
  lng?: number; // optional longitude for mapping
  spots?: PlannerSpot[]; // discover spots
  foods?: PlannerFood[]; // discover foods
}

export interface PlannerSpot {
  id: string;
  name: string;
  checked: boolean;
  mapUrl?: string; // link to Google Maps
  known: boolean;   // whether we have a map link (available on google)
  placeId?: string; // Google Places ID for fetching details/photos
  photoUrl?: string; // Cached first photo URL (small)
  description?: string; // One-line description fetched from Places (editorial summary or formatted address)
}

export interface PlannerFood {
  id: string;
  name: string;
  checked: boolean;
}

export interface PlannerState {
  destinations: PlannerDestination[];
  currency: 'EUR' | 'USD' | 'GBP';
  targetNights: number;
  lastSaved?: string;
}

const initialState: PlannerState = {
  destinations: [],
  currency: 'EUR',
  targetNights: 8
};

// Utility to recompute nights based on start/end date (exclusive of end)
function computeNights(startISO: string, endISO: string): number {
  try {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const ms = e.getTime() - s.getTime();
    if (ms <= 0) return 1;
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

const plannerSlice = createSlice({
  name: 'planner',
  initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<'EUR' | 'USD' | 'GBP'>) {
      state.currency = action.payload;
    },
    setTargetNights(state, action: PayloadAction<number>) {
      state.targetNights = action.payload;
    },
    addDestination(state, action: PayloadAction<{ name: string; lat?: number; lng?: number }>) {
      // Prevent adding if total nights already meets or exceeds target
      const totalNights = state.destinations.reduce((a,c)=> a + c.nights, 0);
      if (totalNights >= state.targetNights) return;
      const last = state.destinations[state.destinations.length - 1];
      const startDate = last ? last.endDate : new Date().toISOString().slice(0,10);
      const endDate = new Date(new Date(startDate).getTime() + 24*60*60*1000).toISOString().slice(0,10);
      // If adding 1 night would exceed target, abort
      if (totalNights + 1 > state.targetNights) return;
      state.destinations.push({
        id: Date.now().toString(),
        name: action.payload.name,
        startDate,
        endDate,
        nights: 1,
        transport: '',
        budget: 0,
        lat: action.payload.lat,
        lng: action.payload.lng
      });
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
      }
    },
    setTransport(state, action: PayloadAction<{ id: string; transport: string }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) d.transport = action.payload.transport;
    },
    setDates(state, action: PayloadAction<{ id: string; startDate: string; endDate: string }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) {
        d.startDate = action.payload.startDate;
        d.endDate = action.payload.endDate;
        d.nights = computeNights(d.startDate, d.endDate);
      }
    },
    setDestinationBudget(state, action: PayloadAction<{ id: string; budget: number }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) d.budget = action.payload.budget;
    },
    setDestinationCoords(state, action: PayloadAction<{ id: string; lat: number; lng: number }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) { d.lat = action.payload.lat; d.lng = action.payload.lng; }
    },
  addSpot(state, action: PayloadAction<{ destinationId: string; name: string; mapUrl?: string; known: boolean; placeId?: string; photoUrl?: string; description?: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d) return;
      if (!d.spots) d.spots = [];
      if (d.spots.some(s=> s.name.toLowerCase()===action.payload.name.toLowerCase())) return;
      d.spots.push({
        id: action.payload.name + Date.now(),
        name: action.payload.name,
        mapUrl: action.payload.mapUrl,
        known: action.payload.known,
        placeId: action.payload.placeId,
        photoUrl: action.payload.photoUrl,
        description: action.payload.description,
        checked:false
      });
    },
    toggleSpot(state, action: PayloadAction<{ destinationId: string; spotId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.spots) return;
      const s = d.spots.find(x=> x.id === action.payload.spotId);
      if (s) s.checked = !s.checked;
    },
    removeSpot(state, action: PayloadAction<{ destinationId: string; spotId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.spots) return;
      d.spots = d.spots.filter(s=> s.id !== action.payload.spotId);
    },
    reorderSpots(state, action: PayloadAction<{ destinationId: string; fromIndex: number; toIndex: number }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.spots) return;
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex===toIndex) return;
      const arr = d.spots;
      const item = arr.splice(fromIndex,1)[0];
      arr.splice(toIndex,0,item);
    },
    addFoodItem(state, action: PayloadAction<{ destinationId: string; name: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d) return; if (!d.foods) d.foods = [];
      if (d.foods.some(f=> f.name.toLowerCase()===action.payload.name.toLowerCase())) return;
      d.foods.push({ id: action.payload.name + Date.now(), name: action.payload.name, checked:false });
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
    reorderFoods(state, action: PayloadAction<{ destinationId: string; fromIndex: number; toIndex: number }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if (!d?.foods) return;
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex===toIndex) return;
      const arr = d.foods;
      const item = arr.splice(fromIndex,1)[0];
      arr.splice(toIndex,0,item);
    },
    reorderDestinations(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex) return;
      const arr = state.destinations;
      const item = arr.splice(fromIndex,1)[0];
      arr.splice(toIndex,0,item);
    },
    reorderChain(state, action: PayloadAction<{ ids: string[] }>) {
      const { ids } = action.payload;
      if (!ids.length) return;
      const map: Record<string, PlannerDestination> = {};
      state.destinations.forEach(d=> { map[d.id]=d; });
      const first = state.destinations[0];
      const newOrder: PlannerDestination[] = [];
      ids.forEach(id=> { if (map[id]) newOrder.push(map[id]); });
      // Ensure first remains first
      if (newOrder[0]?.id !== first.id) {
        const idx = newOrder.findIndex(d=> d.id===first.id);
        if (idx>=0) {
          const [f] = newOrder.splice(idx,1);
          newOrder.unshift(f);
        } else {
          newOrder.unshift(first);
        }
      }
      // Recompute sequential dates chain after first using existing nights
      for (let i=1;i<newOrder.length;i++) {
        const prev = newOrder[i-1];
        const cur = newOrder[i];
        const start = prev.endDate;
        cur.startDate = start;
        const end = new Date(new Date(start).getTime() + cur.nights*24*60*60*1000).toISOString().slice(0,10);
        cur.endDate = end;
      }
      state.destinations = newOrder;
    },
    loadState(_state, action: PayloadAction<PlannerState>) {
      return { ...action.payload };
    },
    markSaved(state) {
      state.lastSaved = new Date().toISOString();
    }
  }
});

export const {
  setCurrency,
  setTargetNights,
  addDestination,
  removeDestination,
  updateDestinationNights,
  setTransport,
  setDates,
  setDestinationBudget,
  reorderDestinations,
  reorderChain,
  loadState,
  markSaved,
  setDestinationCoords
} = plannerSlice.actions;

export const {
  addSpot,
  toggleSpot,
  removeSpot,
  reorderSpots,
  addFoodItem,
  toggleFoodItem,
  removeFoodItem,
  reorderFoods
} = plannerSlice.actions;

export default plannerSlice.reducer;
