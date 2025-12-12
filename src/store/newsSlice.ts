import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchNews } from '../services/APIs/news/newsService';
import type { TwinglyDocument } from '../services/APIs/news/newsService';

export interface NewsArticle extends TwinglyDocument {}

interface NewsState {
  articles: NewsArticle[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetched: string | null; // ISO string
  locations: string[]; // active country codes
}

const initialState: NewsState = {
  articles: [],
  status: 'idle',
  error: null,
  lastFetched: null,
  locations: []
};

export const loadNews = createAsyncThunk<{ articles: NewsArticle[]; locations: string[] }, { locations?: string[]; force?: boolean } | void, { state: { news: NewsState } }>(
  'news/load',
  async (arg, { getState }) => {
    const state = getState().news;
    const requested = arg?.locations && arg.locations.length ? arg.locations : state.locations;
    const normalized = Array.from(new Set(
      requested
        .map(code => String(code).trim().toLowerCase())
        .filter(Boolean)
    ));
    const activeLocations = normalized.length ? normalized : [];
    if (activeLocations.length === 0) {
      // Nothing selected – return empty payload without hitting the API.
      return { articles: [], locations: [] };
    }
    // Debug log start
    // eslint-disable-next-line no-console
    console.log('[newsSlice] Fetching news for', activeLocations.join(', '));
    const resp = await fetchNews({ locations: activeLocations, size: 40 });
    // eslint-disable-next-line no-console
    console.log('[newsSlice] Received documents:', resp.number_of_documents, 'displaying first titles:', resp.documents.slice(0,3).map(d=> d.title));
    return { articles: resp.documents as NewsArticle[], locations: activeLocations };
  }
);

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    setLocations(state, action: PayloadAction<string[]>) {
      const normalized = Array.from(new Set(action.payload.map(code => code.toLowerCase()).filter(Boolean)));
      state.locations = normalized;
      // Reset to refetch next time
      state.lastFetched = null;
      if (normalized.length === 0) {
        state.articles = [];
        state.status = 'idle';
        state.error = null;
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loadNews.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadNews.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.articles = action.payload.articles;
        state.locations = action.payload.locations;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(loadNews.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load news';
      });
  }
});

export const { setLocations } = newsSlice.actions;
export default newsSlice.reducer;
