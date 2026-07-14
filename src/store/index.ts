// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import themeReducer from "./themeSlice";
import plannerReducer from "./plannerSlice";
import newsReducer from "./newsSlice";
import packingReducer from "./packingSlice";
import docsReducer, { persistDocs } from "./docsSlice";
import notificationReducer from "./notificationSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    theme: themeReducer,
    planner: plannerReducer,
    news: newsReducer,
    packing: packingReducer,
    docs: docsReducer,
    notifications: notificationReducer,
  },
});

// Persistence subscription for docs
try {
  store.subscribe(()=> {
    const state = store.getState();
    // Persist only docs slice
    if (typeof window !== 'undefined') {
      persistDocs(state.docs);
    }
  });
} catch {
  // ignore
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
