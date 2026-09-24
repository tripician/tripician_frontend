import {
  IconHeart,
  IconHomeHeart,
  IconLeaf,
  IconMoodSmile,
  IconPlant2,
  IconSalad,
  IconUser,
  IconUsers,
  IconUsersGroup,
  IconWheatOff,
} from '@tabler/icons-react';
import type React from 'react';
import type { TripDietary, TripType } from '../../utils/tripPreferences';

// The wording for the new trip questions. The keys live in utils/tripPreferences.ts and must stay stable; this copy can change freely.

export interface PreferenceOption<T extends string> {
  value: T;
  label: string;
  Icon: React.ElementType;
  /** A few words under the label, in plain language. */
  hint?: string;
}

export const TRIP_TYPE_OPTIONS: PreferenceOption<TripType>[] = [
  { value: 'solo', label: 'Solo', Icon: IconUser, hint: 'Just me' },
  { value: 'honeymoon', label: 'Honeymoon', Icon: IconHeart, hint: 'The two of us' },
  { value: 'friends', label: 'Friends', Icon: IconUsers, hint: 'A few friends' },
  { value: 'family', label: 'Family', Icon: IconHomeHeart, hint: 'With the kids' },
  { value: 'group', label: 'Group', Icon: IconUsersGroup, hint: 'A bigger crowd' },
];

export const DIETARY_OPTIONS: PreferenceOption<TripDietary>[] = [
  { value: 'none', label: 'Anything', Icon: IconMoodSmile, hint: 'I eat it all' },
  { value: 'vegetarian', label: 'Vegetarian', Icon: IconLeaf, hint: 'No meat or fish' },
  { value: 'vegan', label: 'Vegan', Icon: IconPlant2, hint: 'Plants only' },
  { value: 'halal', label: 'Halal', Icon: IconSalad, hint: 'No pork or alcohol' },
  { value: 'glutenFree', label: 'Gluten free', Icon: IconWheatOff, hint: 'No wheat' },
];

/** Short label for a saved answer, used in summaries and settings. */
export const tripTypeLabel = (t: TripType | null | undefined) => TRIP_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? null;
export const dietaryLabel = (d: TripDietary | null | undefined) => DIETARY_OPTIONS.find((o) => o.value === d)?.label ?? null;
