import { createSlice, nanoid } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface DocItem {
  id: string;
  name: string;          // Original file name
  type: string;          // MIME type
  size: number;          // Bytes
  createdAt: string;     // ISO string
  updatedAt: string;     // ISO string
  pinned: boolean;
  content: string;       // Base64 or text content
}

export interface DocsState {
  docs: DocItem[];
  selectedId?: string;
  search: string;
}

const STORAGE_KEY = 'tripician_docs';

function loadInitial(): DocsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DocsState;
      return { ...parsed, search: '' };
    }
  } catch {
    // ignore
  }
  return { docs: [], selectedId: undefined, search: '' };
}

const initialState: DocsState = loadInitial();

interface AddDocPayload { name: string; type: string; size: number; content: string; }
interface RenameDocPayload { id: string; name: string; }
interface UpdateSearchPayload { value: string; }
interface ReorderPayload { sourceId: string; targetId: string; before: boolean; }

const docsSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    addDocument(state, action: PayloadAction<AddDocPayload>) {
      const now = new Date().toISOString();
      const doc: DocItem = {
        id: nanoid(),
        name: action.payload.name,
        type: action.payload.type,
        size: action.payload.size,
        createdAt: now,
        updatedAt: now,
        pinned: false,
        content: action.payload.content
      };
      state.docs.unshift(doc); // newest on top
      state.selectedId = doc.id;
    },
    removeDocument(state, action: PayloadAction<string>) {
      const idx = state.docs.findIndex(d => d.id === action.payload);
      if (idx >= 0) {
        const removingSelected = state.docs[idx].id === state.selectedId;
        state.docs.splice(idx, 1);
        if (removingSelected) state.selectedId = state.docs[0]?.id;
      }
    },
    togglePin(state, action: PayloadAction<string>) {
      const doc = state.docs.find(d => d.id === action.payload);
      if (doc) {
        doc.pinned = !doc.pinned;
        doc.updatedAt = new Date().toISOString();
        // Reorder: pinned docs first
        state.docs.sort((a,b)=> (a.pinned === b.pinned) ? (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : (a.pinned? -1:1));
      }
    },
    renameDocument(state, action: PayloadAction<RenameDocPayload>) {
      const doc = state.docs.find(d=> d.id===action.payload.id);
      if(doc) {
        doc.name = action.payload.name;
        doc.updatedAt = new Date().toISOString();
      }
    },
    reorderDocuments(state, action: PayloadAction<ReorderPayload>) {
      const { sourceId, targetId, before } = action.payload;
      if(sourceId === targetId) return;
      const srcIdx = state.docs.findIndex(d=> d.id===sourceId);
      const tgtIdx = state.docs.findIndex(d=> d.id===targetId);
      if(srcIdx<0 || tgtIdx<0) return;
      const source = state.docs[srcIdx];
      // Maintain pinned grouping - disallow moving between pinned/non-pinned directly
      const target = state.docs[tgtIdx];
      if(source.pinned !== target.pinned) return; // ignore cross-group reorder
      state.docs.splice(srcIdx,1);
      const newIdx = tgtIdx + (before ? 0 : (tgtIdx < srcIdx ? 1 : 1));
      state.docs.splice(newIdx,0,source);
    },
    selectDocument(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
    updateSearch(state, action: PayloadAction<UpdateSearchPayload>) {
      state.search = action.payload.value;
    },
    clearAll(state) {
      state.docs = [];
      state.selectedId = undefined;
    }
  }
});

export const { addDocument, removeDocument, togglePin, selectDocument, updateSearch, clearAll, renameDocument, reorderDocuments } = docsSlice.actions;
export default docsSlice.reducer;

// Persistence helper (called from store subscription)
export function persistDocs(state: DocsState) {
  try {
    const toSave: DocsState = { ...state, search: '' }; // avoid persisting ephemeral search
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}