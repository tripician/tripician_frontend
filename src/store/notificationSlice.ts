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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
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

export default notificationSlice.reducer;
