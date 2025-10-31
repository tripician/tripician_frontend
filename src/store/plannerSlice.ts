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
  docs?: PlannerDoc[]; // uploaded documents
  /** High-level semantic category used for color coding & filtering in card layout */
  category?: 'general' | 'must_visit' | 'skippable' | 'tentative' | 'decide_later';
  /** Marked when user considers planning for this destination complete */
  completed?: boolean;
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

export interface PlannerDoc {
  id: string;
  originalName: string;
  mimeType: string;
  url: string; // object URL (runtime) or persisted reference
}

export interface PlannerExpense {
  id: string;
  label: string;
  category?: string; // e.g. Flights, Stay, Food, Transport, Activity, Misc
  amount: number; // stored in trip currency
  note?: string;
  date: string; // ISO date of expense occurrence
  createdAt: string; // ISO datetime when user added it
  /** User id of who paid (for now can be placeholder like 'me') */
  paidByUserId?: string;
  /** How the expense is split among members */
  splitStrategy?: 'none' | 'equal' | 'custom';
  /** Custom share fractions or amounts when splitStrategy==='custom' */
  shares?: { userId: string; amount: number }[];
}

export interface PlannerState {
  destinations: PlannerDestination[];
  currency: 'EUR' | 'USD' | 'GBP';
  targetNights: number;
  lastSaved?: string;
  /** Currently hydrated trip id (used to detect cross-trip state reuse) */
  tripId?: string;
  /** Trip-level supporting documents (not tied to a destination) */
  globalDocs?: PlannerDoc[];
  /** Visa specific documents (scans, letters, confirmations) */
  visaDocs?: PlannerDoc[];
  /** Set of pinned doc ids (could refer to any of the above or destination docs). */
  pinnedDocIds?: string[];
  /** Optional overall trip budget in selected currency */
  tripBudget?: number;
  /** Flat list of expenses across the trip */
  expenses?: PlannerExpense[];
  /** When true we attempt to simplify (settle) group expenses at end of trip */
  simplifyGroupExpenses?: boolean;
  /** Additional email addresses allowed to view expenses (besides group members) */
  expenseVisibilityEmails?: string[];
  /** Chat-style comments associated with the trip */
  comments?: TripComment[];
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
  currency: 'EUR',
  targetNights: 8,
  globalDocs: [],
  visaDocs: [],
  pinnedDocIds: [],
  tripBudget: undefined,
  expenses: [],
  simplifyGroupExpenses: false,
  expenseVisibilityEmails: [],
  comments: [],
  tripId: undefined
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
    addDestination(state, action: PayloadAction<{ name: string; lat?: number; lng?: number; placeId?: string; photoUrl?: string }>) {
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
        lng: action.payload.lng,
        placeId: action.payload.placeId,
        photoUrl: action.payload.photoUrl,
        category: 'general',
        completed: false
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
        // Cascade recalculation of subsequent destination start/end dates to maintain a contiguous chain
        const idx = state.destinations.findIndex(x => x.id === d.id);
        for(let i = idx + 1; i < state.destinations.length; i++) {
          const prev = state.destinations[i - 1];
          const cur = state.destinations[i];
          cur.startDate = prev.endDate;
          const startMs = new Date(cur.startDate).getTime();
          cur.endDate = new Date(startMs + cur.nights * 24*60*60*1000).toISOString().slice(0,10);
        }
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
    setDestinationNotes(state, action: PayloadAction<{ id: string; notes: string }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) d.notes = action.payload.notes;
    },
    setDestinationStay(state, action: PayloadAction<{ id: string; stay: { name?: string; reference?: string; notes?: string } }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) d.stay = { ...d.stay, ...action.payload.stay };
    },
    // --- Multi accommodation CRUD ---
    addStayEntry(state, action: PayloadAction<{ destinationId: string; name?: string; reference?: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if(!d) return; if(!d.stays) d.stays = [];
      d.stays.push({ id: 'stay_'+Date.now()+'_'+Math.random().toString(36).slice(2), name: action.payload.name?.trim(), reference: action.payload.reference?.trim() });
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
      if (d) d.name = action.payload.name;
    },
    setDestinationCategory(state, action: PayloadAction<{ id: string; category: PlannerDestination['category'] }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) d.category = action.payload.category || 'general';
    },
    toggleDestinationCompleted(state, action: PayloadAction<{ id: string }>) {
      const d = state.destinations.find(x => x.id === action.payload.id);
      if (d) d.completed = !d.completed;
    },
    duplicateDestination(state, action: PayloadAction<{ id: string }>) {
      const idx = state.destinations.findIndex(d=> d.id===action.payload.id);
      if (idx === -1) return;
      const source = state.destinations[idx];
      const totalNights = state.destinations.reduce((a,c)=> a + c.nights, 0);
      if (totalNights + source.nights > state.targetNights) return; // avoid exceeding target
      const clone: PlannerDestination = {
        ...source,
        id: Date.now().toString() + '_' + Math.random().toString(36).slice(2),
        name: source.name + ' Copy',
        spots: source.spots ? source.spots.map(s=> ({ ...s, id: s.name + Date.now() + Math.random().toString(36).slice(2), checked:false })) : [],
        foods: source.foods ? source.foods.map(f=> ({ ...f, id: f.name + Date.now() + Math.random().toString(36).slice(2), checked:false })) : [],
        docs: source.docs ? source.docs.map(doc => ({ ...doc, id: doc.id + '_copy_' + Math.random().toString(36).slice(2) })) : [],
        completed: false
      };
      // Insert after original
      state.destinations.splice(idx+1, 0, clone);
    },
    addDestinationDoc(state, action: PayloadAction<{ destinationId: string; doc: { id: string; originalName: string; mimeType: string; url: string } }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if(!d) return; if(!d.docs) d.docs = [];
      d.docs.push(action.payload.doc);
    },
    removeDestinationDoc(state, action: PayloadAction<{ destinationId: string; docId: string }>) {
      const d = state.destinations.find(x=> x.id === action.payload.destinationId);
      if(!d?.docs) return;
      d.docs = d.docs.filter(doc=> doc.id !== action.payload.docId);
    },
    addGlobalDoc(state, action: PayloadAction<{ doc: PlannerDoc }>) {
      if(!state.globalDocs) state.globalDocs = [];
      state.globalDocs.push(action.payload.doc);
    },
    removeGlobalDoc(state, action: PayloadAction<{ docId: string }>) {
      if(!state.globalDocs) return; state.globalDocs = state.globalDocs.filter(d=> d.id !== action.payload.docId);
      // also unpin if pinned
      if(state.pinnedDocIds) state.pinnedDocIds = state.pinnedDocIds.filter(id=> id !== action.payload.docId);
    },
    addVisaDoc(state, action: PayloadAction<{ doc: PlannerDoc }>) {
      if(!state.visaDocs) state.visaDocs = [];
      state.visaDocs.push(action.payload.doc);
    },
    removeVisaDoc(state, action: PayloadAction<{ docId: string }>) {
      if(!state.visaDocs) return; state.visaDocs = state.visaDocs.filter(d=> d.id !== action.payload.docId);
      if(state.pinnedDocIds) state.pinnedDocIds = state.pinnedDocIds.filter(id=> id !== action.payload.docId);
    },
    pinDoc(state, action: PayloadAction<{ docId: string }>) {
      if(!state.pinnedDocIds) state.pinnedDocIds = [];
      if(!state.pinnedDocIds.includes(action.payload.docId)) state.pinnedDocIds.push(action.payload.docId);
    },
    unpinDoc(state, action: PayloadAction<{ docId: string }>) {
      if(!state.pinnedDocIds) return;
      state.pinnedDocIds = state.pinnedDocIds.filter(id=> id !== action.payload.docId);
    },
    setTripBudget(state, action: PayloadAction<{ amount: number }>) {
      state.tripBudget = action.payload.amount >= 0 ? action.payload.amount : 0;
    },
    addExpense(state, action: PayloadAction<{ expense: Omit<PlannerExpense,'id'|'createdAt'> & { id?: string } }>) {
      if(!state.expenses) state.expenses = [];
      const id = action.payload.expense.id || 'exp_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      state.expenses.push({
        id,
        label: action.payload.expense.label,
        category: action.payload.expense.category,
        amount: Math.max(0, action.payload.expense.amount),
        note: action.payload.expense.note,
        date: action.payload.expense.date,
        createdAt: new Date().toISOString(),
        paidByUserId: action.payload.expense.paidByUserId || 'me',
        splitStrategy: action.payload.expense.splitStrategy || 'none',
        shares: action.payload.expense.shares
      });
    },
    updateExpense(state, action: PayloadAction<{ id: string; patch: Partial<Omit<PlannerExpense,'id'|'createdAt'>> }>) {
      const e = state.expenses?.find(x=> x.id === action.payload.id);
      if(e){
        if(action.payload.patch.label!==undefined) e.label = action.payload.patch.label;
        if(action.payload.patch.category!==undefined) e.category = action.payload.patch.category;
        if(action.payload.patch.amount!==undefined) e.amount = Math.max(0, action.payload.patch.amount);
        if(action.payload.patch.note!==undefined) e.note = action.payload.patch.note;
        if(action.payload.patch.date!==undefined) e.date = action.payload.patch.date;
        if(action.payload.patch.paidByUserId!==undefined) e.paidByUserId = action.payload.patch.paidByUserId;
        if(action.payload.patch.splitStrategy!==undefined) e.splitStrategy = action.payload.patch.splitStrategy as any;
        if(action.payload.patch.shares!==undefined) e.shares = action.payload.patch.shares as any;
      }
    },
    removeExpense(state, action: PayloadAction<{ id: string }>) {
      if(!state.expenses) return; state.expenses = state.expenses.filter(e=> e.id !== action.payload.id);
    },
    clearExpenses(state) {
      state.expenses = [];
    },
    setSimplifyGroupExpenses(state, action: PayloadAction<{ value: boolean }>) {
      state.simplifyGroupExpenses = action.payload.value;
    },
    addExpenseVisibilityEmail(state, action: PayloadAction<{ email: string }>) {
      const email = action.payload.email.trim().toLowerCase();
      if(!email) return;
      if(!state.expenseVisibilityEmails) state.expenseVisibilityEmails = [];
      if(!state.expenseVisibilityEmails.includes(email)) state.expenseVisibilityEmails.push(email);
    },
    removeExpenseVisibilityEmail(state, action: PayloadAction<{ email: string }>) {
      const email = action.payload.email.trim().toLowerCase();
      if(!state.expenseVisibilityEmails) return;
      state.expenseVisibilityEmails = state.expenseVisibilityEmails.filter(e=> e !== email);
    },
    clearExpenseVisibilityEmails(state) {
      state.expenseVisibilityEmails = [];
    },
    addComment(state, action: PayloadAction<{ userId: string; displayName: string; avatarUrl?: string; text: string; id?: string }>) {
      if(!state.comments) state.comments = [];
      const id = action.payload.id || 'c_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      state.comments.push({
        id,
        userId: action.payload.userId,
        displayName: action.payload.displayName,
        avatarUrl: action.payload.avatarUrl,
        text: action.payload.text,
        createdAt: new Date().toISOString(),
        upvoterIds: [],
        replyCount: 0
      });
    },
    addReply(state, action: PayloadAction<{ parentId: string; userId: string; displayName: string; text: string; avatarUrl?: string; id?: string }>) {
      if(!state.comments) state.comments = [];
      const parent = state.comments.find(c=> c.id === action.payload.parentId);
      const id = action.payload.id || 'c_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      state.comments.push({
        id,
        userId: action.payload.userId,
        displayName: action.payload.displayName,
        avatarUrl: action.payload.avatarUrl,
        text: action.payload.text,
        createdAt: new Date().toISOString(),
        parentId: action.payload.parentId,
        upvoterIds: [],
        replyCount: 0
      });
      if(parent){ parent.replyCount = (parent.replyCount || 0) + 1; }
    },
    updateComment(state, action: PayloadAction<{ id: string; text: string }>) {
      const c = state.comments?.find(x=> x.id === action.payload.id);
      if(c){ c.text = action.payload.text; c.editedAt = new Date().toISOString(); }
    },
    removeComment(state, action: PayloadAction<{ id: string }>) {
      if(!state.comments) return; state.comments = state.comments.filter(c=> c.id !== action.payload.id);
    },
    toggleUpvote(state, action: PayloadAction<{ id: string; userId: string }>) {
      const c = state.comments?.find(x=> x.id === action.payload.id);
      if(!c) return;
      if(!c.upvoterIds) c.upvoterIds = [];
      const idx = c.upvoterIds.indexOf(action.payload.userId);
      if(idx>=0) c.upvoterIds.splice(idx,1); else c.upvoterIds.push(action.payload.userId);
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
    },
    loadState(_state, action: PayloadAction<PlannerState>) {
      return { ...action.payload };
    },
    resetPlanner(state, action: PayloadAction<{ tripId?: string }>) {
      // Preserve currency preference; reset rest.
      const preservedCurrency = state.currency;
      return {
        ...initialState,
        currency: preservedCurrency,
        tripId: action.payload.tripId
      };
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
  reorderChainExact,
  loadState,
  markSaved,
  setDestinationCoords,
  setDestinationNotes,
  setDestinationStay,
  addStayEntry,
  updateStayEntry,
  removeStayEntry,
  setStayNotes,
  renameDestination,
  setDestinationCategory,
  toggleDestinationCompleted,
  duplicateDestination,
  addDestinationDoc,
  removeDestinationDoc
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

export const {
  addGlobalDoc,
  removeGlobalDoc,
  addVisaDoc,
  removeVisaDoc,
  pinDoc,
  unpinDoc
} = plannerSlice.actions;

export const {
  setTripBudget,
  addExpense,
  updateExpense,
  removeExpense,
  clearExpenses,
  setSimplifyGroupExpenses,
  addExpenseVisibilityEmail,
  removeExpenseVisibilityEmail,
  clearExpenseVisibilityEmails
} = plannerSlice.actions;

export const { addComment, addReply, updateComment, removeComment, toggleUpvote } = plannerSlice.actions;
export const { resetPlanner } = plannerSlice.actions;

// Doc actions already re-exported above

export default plannerSlice.reducer;
