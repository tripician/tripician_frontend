// src/store/userSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiServices } from "../services/APIs/apiServices";
import { tokenSubject } from "../utils/authSession";

interface BioHighlight {
  key: string;
  label: string;
  value: string;
  icon: string;
}

interface UserProfile {
  bannertint: string | undefined;
  id?: string;
  email?: string;
  fname?: string;
  lname?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  location?: string;
  bio?: { highlights: BioHighlight[] };
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

const coerceProfileValue = (value: unknown, fieldName?: string): string | { highlights: BioHighlight[] } | undefined => {
  if (value === undefined || value === null) return undefined;
  
  // Special handling for bio field - only accept object format
  if (fieldName === 'bio') {
    if (typeof value === 'object' && value !== null && 'highlights' in value) {
      return value as { highlights: BioHighlight[] };
    }
    // Ignore string bio values - backend only accepts object format now
    return undefined;
  }
  
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      const asString = JSON.stringify(value);
      return asString === '{}' ? undefined : asString;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const normalizeProfile = (raw: any, previous: UserProfile | null = null): UserProfile | null => {
  if (!raw && !previous) return null;

  const source = raw ?? {};
  const base: UserProfile = {
    bannertint: previous?.bannertint,
    id: previous?.id,
    email: previous?.email,
    fname: previous?.fname,
    lname: previous?.lname,
    phone: previous?.phone,
    dateOfBirth: previous?.dateOfBirth,
    gender: previous?.gender,
    country: previous?.country,
    location: previous?.location,
    bio: previous?.bio,
    coverpicture: previous?.coverpicture,
    profilepicture: previous?.profilepicture,
    facebook: previous?.facebook,
    twitter: previous?.twitter,
    instagram: previous?.instagram,
    website: previous?.website,
  };

  const assign = (field: keyof UserProfile, keys: string[]) => {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const candidate = coerceProfileValue(source[key], field);
      if (candidate !== undefined) {
        base[field] = candidate as any;
        return;
      }
    }
  };

  assign('bannertint', ['bannertint', 'bannerTint', 'BannerTint']);
  assign('id', ['id', 'Id', 'userId', 'UserId', 'userID']);
  assign('email', ['email', 'Email', 'userEmail', 'UserEmail']);
  assign('fname', ['fname', 'Fname', 'firstName', 'FirstName']);
  assign('lname', ['lname', 'Lname', 'lastName', 'LastName']);
  assign('phone', ['phone', 'Phone', 'mobile', 'Mobile']);
  assign('dateOfBirth', ['dateOfBirth', 'DateOfBirth', 'dob', 'Dob']);
  assign('gender', ['gender', 'Gender']);
  assign('country', ['country', 'Country']);
  assign('location', ['location', 'Location', 'city', 'City']);
  assign('bio', ['bio', 'Bio']);
  assign('coverpicture', ['coverpicture', 'coverPicture', 'CoverPicture']);
  assign('profilepicture', ['profilepicture', 'profilePicture', 'ProfilePicture']);
  assign('facebook', ['facebook', 'Facebook', 'facebookUrl', 'FacebookUrl']);
  assign('twitter', ['twitter', 'Twitter', 'twitterUrl', 'TwitterUrl']);
  assign('instagram', ['instagram', 'Instagram', 'instagramUrl', 'InstagramUrl']);
  assign('website', ['website', 'Website', 'site', 'Site']);

  return base;
};

const PROFILE_CACHE_KEY = 'userProfile';

/**
 * The cached profile is stored tagged with the `sub` of the token that produced
 * it, and is only ever handed back for that same account.
 *
 * Without this tag the cache was just "the last profile anyone loaded on this
 * browser": deleting an account left it behind, the next sign-in read it
 * instead of calling the API, and account A's identity rendered inside account
 * B's session. An untagged (pre-fix) entry fails the check and is refetched.
 */
interface CachedProfileEnvelope {
  sub: string;
  profile: UserProfile;
}

const currentToken = (): string | null => {
  try { return localStorage.getItem('accessToken'); } catch { return null; }
};

/** Cached profile for this exact account, or null - never a different account's. */
const readCachedProfile = (token?: string | null): UserProfile | null => {
  const sub = tokenSubject(token ?? currentToken());
  if (!sub) return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedProfileEnvelope>;
    if (!parsed || parsed.sub !== sub || !parsed.profile) return null;
    return normalizeProfile(parsed.profile);
  } catch {
    return null;
  }
};

const writeCachedProfile = (profile: UserProfile | null, token?: string | null): void => {
  try {
    if (!profile) { localStorage.removeItem(PROFILE_CACHE_KEY); return; }
    const sub = tokenSubject(token ?? currentToken());
    // No identifiable account means no cache: an untagged entry is exactly the
    // bug this replaced.
    if (!sub) { localStorage.removeItem(PROFILE_CACHE_KEY); return; }
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ sub, profile } satisfies CachedProfileEnvelope));
  } catch { /* private mode - the app works fine without the cache */ }
};

const initialState: UserState = {
  profile: readCachedProfile(),
  loading: false,
  error: null,
};

// 🔹 Async thunk to fetch user profile
export const fetchUserProfile = createAsyncThunk<
  UserProfile,
  { token?: string; force?: boolean } | undefined,
  { rejectValue: string }
>(
  "user/fetchProfile",
  async (arg, { rejectWithValue }) => {
    try {
      const tokenToUse = arg?.token ?? localStorage.getItem("accessToken");
      if (!tokenToUse) throw new Error("No token available");

      const force = Boolean(arg?.force);

      // Only ever a cache belonging to THIS token's account; see readCachedProfile.
      if (!force) {
        const cached = readCachedProfile(tokenToUse);
        if (cached && cached.id) return cached;
      }

      // Fallback to API using the provided token (or the one from storage)
      const response = await apiServices.getUserProfile(tokenToUse);
      const normalized = normalizeProfile(response.data);
      if (!normalized) throw new Error('Invalid profile data');
      if (normalized.id) writeCachedProfile(normalized, tokenToUse);
      return normalized;
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
      writeCachedProfile(null);
    },
    setUserProfile: (state, action: PayloadAction<UserProfile | null>) => {
      if (action.payload === null) {
        state.profile = null;
        state.error = null;
        writeCachedProfile(null);
        return;
      }

      const normalized = normalizeProfile(action.payload, state.profile);
      state.profile = normalized;
      state.error = null;
      writeCachedProfile(normalized);
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
        state.profile = normalizeProfile(action.payload, state.profile);
        if (state.profile && state.profile.id) writeCachedProfile(state.profile);
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch profile";
      });
  },
});

export const { clearUser, setUserProfile } = userSlice.actions;
export type { UserProfile, BioHighlight };
export default userSlice.reducer;
