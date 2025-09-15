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
}

export interface PlannerState {
  destinations: PlannerDestination[];
  currency: 'EUR' | 'USD' | 'GBP';
  targetNights: number;
  lastSaved?: string;
}

const initialState: PlannerState = {
  destinations: [
    { id: '1', name: 'Shillong Airport', startDate: '2025-09-11', endDate: '2025-09-12', nights: 1, transport: '', budget: 0, lat: 25.7025, lng: 91.9787 },
    { id: '2', name: 'Shillong', startDate: '2025-09-12', endDate: '2025-09-14', nights: 2, transport: 'Train', budget: 0, lat: 25.5788, lng: 91.8933 },
    { id: '3', name: 'Meghalaya', startDate: '2025-09-14', endDate: '2025-09-15', nights: 1, transport: '', budget: 0, lat: 25.4670, lng: 91.3662 }
  ],
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
    addDestination(state, action: PayloadAction<{ name: string }>) {
      const last = state.destinations[state.destinations.length - 1];
      const startDate = last ? last.endDate : new Date().toISOString().slice(0,10);
      const endDate = new Date(new Date(startDate).getTime() + 24*60*60*1000).toISOString().slice(0,10);
      state.destinations.push({
        id: Date.now().toString(),
        name: action.payload.name,
        startDate,
        endDate,
        nights: 1,
        transport: '',
        budget: 0
      });
    },
    removeDestination(state, action: PayloadAction<string>) {
      state.destinations = state.destinations.filter(d => d.id !== action.payload);
    },
    updateDestinationNights(state, action: PayloadAction<{ id: string; delta: number }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) {
        d.nights = Math.max(1, d.nights + action.payload.delta);
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
    reorderDestinations(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex) return;
      const arr = state.destinations;
      const item = arr.splice(fromIndex,1)[0];
      arr.splice(toIndex,0,item);
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
  loadState,
  markSaved,
  setDestinationCoords
} = plannerSlice.actions;

export default plannerSlice.reducer;
