import {
  IconBeach,
  IconBuildingArch,
  IconBuildingCommunity,
  IconFeather,
  IconGlassFull,
  IconHeart,
  IconMoodSmile,
  IconMountain,
  IconShoppingBag,
  IconToolsKitchen2,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import type React from 'react';
import type { TripCompany, TripDietary, TripInterest, TripPace } from '../../utils/tripPreferences';

/**
 * The wording for the create dialog's mood questions.
 *
 * Kept apart from `utils/tripPreferences.ts` on purpose: that file holds the keys
 * the backend prompts read and must stay stable, this file holds copy that should
 * change freely. Nothing here is ever sent anywhere.
 *
 * The labels are answers to a spoken question rather than field values, which is
 * the cheapest way to make an intake read as a conversation instead of a form.
 * "Packed" answers "how full should the days be?" without needing a legend.
 */

export interface PreferenceOption<T extends string> {
  value: T;
  label: string;
  Icon?: React.ElementType;
  /** One short clause, shown under the group, that explains what the choice does. */
  effect?: string;
}

export const PACE_OPTIONS: PreferenceOption<TripPace>[] = [
  { value: 'slow', label: 'Slow', effect: 'a couple of places a day, with room to linger' },
  { value: 'balanced', label: 'Balanced', effect: 'about three places a day, breaks included' },
  { value: 'packed', label: 'Packed', effect: 'early starts and four or more places a day' },
];

export const COMPANY_OPTIONS: PreferenceOption<TripCompany>[] = [
  { value: 'solo', label: 'Just me', Icon: IconUser },
  { value: 'couple', label: 'Two of us', Icon: IconHeart },
  { value: 'friends', label: 'Friends', Icon: IconUsers },
  { value: 'family', label: 'Family', Icon: IconBuildingCommunity },
];

export const INTEREST_OPTIONS: PreferenceOption<TripInterest>[] = [
  { value: 'food', label: 'Food', Icon: IconToolsKitchen2 },
  { value: 'museums', label: 'Museums', Icon: IconBuildingArch },
  { value: 'hiking', label: 'Hiking', Icon: IconMountain },
  { value: 'nightlife', label: 'Nightlife', Icon: IconGlassFull },
  { value: 'markets', label: 'Markets', Icon: IconShoppingBag },
  { value: 'beaches', label: 'Beaches', Icon: IconBeach },
  { value: 'architecture', label: 'Architecture', Icon: IconBuildingCommunity },
  { value: 'wildlife', label: 'Wildlife', Icon: IconFeather },
];

export const DIETARY_OPTIONS: PreferenceOption<TripDietary>[] = [
  { value: 'none', label: 'Anything', Icon: IconMoodSmile },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'glutenFree', label: 'Gluten free' },
];
