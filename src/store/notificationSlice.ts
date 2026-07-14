import { apiServices } from "../services/APIs/apiServices";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

interface NotificationState {
    notifications: any[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
}

export const fetchNotifications = createAsyncThunk(
    "notifications/fetch",
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem("accessToken");

            const response =
                await apiServices.getNotifications(token!);

            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

export const fetchUnreadCount = createAsyncThunk(
    "notifications/unreadCount",
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem("accessToken");

            const response =
                await apiServices.getUnreadNotificationCount(token!);

            return response.data.count;
        } catch (err: any) {
            return rejectWithValue(err.message);
        }
    }
);

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    upsertNotifications: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      const map = new Map<string, any>();
      state.notifications.forEach((n: any) => map.set(String(n.id), n));
      incoming.forEach((n: any) => {
        if (!n?.id) return;
        const prev = map.get(String(n.id));
        map.set(String(n.id), { ...(prev || {}), ...n });
      });
      state.notifications = Array.from(map.values())
        .sort((a: any, b: any) => {
          const at = new Date(a?.createdAt || 0).getTime();
          const bt = new Date(b?.createdAt || 0).getTime();
          return bt - at;
        });
      state.unreadCount = state.notifications.filter((n: any) => !n?.isRead).length;
    },
    markNotificationReadLocal: (state, action) => {
      const id = String(action.payload || '');
      const n = state.notifications.find((x: any) => String(x.id) === id);
      if (!n) return;
      n.isRead = true;
      state.unreadCount = Math.max(0, state.notifications.filter((x: any) => !x?.isRead).length);
    },
    markAllNotificationsReadLocal: (state) => {
      state.notifications = state.notifications.map((n: any) => ({ ...n, isRead: true }));
      state.unreadCount = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = Array.isArray(action.payload) ? action.payload : [];
        state.unreadCount = state.notifications.filter((n: any) => !n?.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  }
});

export const {
  upsertNotifications,
  markNotificationReadLocal,
  markAllNotificationsReadLocal
} = notificationSlice.actions;

export default notificationSlice.reducer;
