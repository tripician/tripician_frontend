// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import themeReducer from "./themeSlice";
import plannerReducer from "./plannerSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
  theme: themeReducer,
  planner: plannerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
