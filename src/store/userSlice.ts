// src/store/userSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiServices } from "../services/APIs/apiServices";

interface UserProfile {
  id?: string;
  email?: string;
  fname?: string;
  lname?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  bio?: string;
  coverpicture?: string;
  profilepicture?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
  // add more fields if backend returns them (dob, phone, etc.)
}

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

// 🔹 Async thunk to fetch user profile
export const fetchUserProfile = createAsyncThunk<UserProfile, void, { rejectValue: string }>(
  "user/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No token available");

      const response = await apiServices.getUserProfile(token);
      return response.data as UserProfile;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUser: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch profile";
      });
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;
