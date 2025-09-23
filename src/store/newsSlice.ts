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
  location: string; // country code
}

const initialState: NewsState = {
  articles: [],
  status: 'idle',
  error: null,
  lastFetched: null,
  location: 'us'
};

export const loadNews = createAsyncThunk<NewsArticle[], { location?: string } | void>(
  'news/load',
  async (arg, { getState }) => {
    const state = getState() as { news: NewsState };
    const location = arg?.location || state.news.location;
    // Debug log start
    // eslint-disable-next-line no-console
    console.log('[newsSlice] Fetching news for', location);
    const resp = await fetchNews({ location, size: 30 });
    // eslint-disable-next-line no-console
    console.log('[newsSlice] Received documents:', resp.number_of_documents, 'displaying first titles:', resp.documents.slice(0,3).map(d=> d.title));
    return resp.documents as NewsArticle[];
  }
);

const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    setLocation(state, action: PayloadAction<string>) {
      state.location = action.payload;
      // Reset to refetch next time
      state.lastFetched = null;
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
        state.articles = action.payload;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(loadNews.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load news';
      });
  }
});

export const { setLocation } = newsSlice.actions;
export default newsSlice.reducer;
