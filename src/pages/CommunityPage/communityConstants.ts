import type React from 'react';
import {
  IconBuildingSkyscraper,
  IconFlame,
  IconFlower,
  IconLeaf,
  IconMountain,
  IconPalette,
  IconTrees,
  IconWorld,
} from '@tabler/icons-react';

/**
 * Shared by every community surface: the Community scroll, the crew directory
 * and the templates page all sit on the same measure so a reader moving between
 * them does not feel the column width change under them.
 */
export const CONTENT_MAX = 1280;

export interface CommunityCategory {
  /** Matches `Trips.Vibe`, so it is a backend contract and must not be renamed. */
  id: string;
  label: string;
  Icon: React.ElementType;
}

/**
 * Vibe filters for the trip feed.
 *
 * Two ids disagree with their labels on purpose: `luxury` shows as "Slow Travel"
 * and `romantic` as "Party". The keys are what the API stores and what the AI
 * prompts read, so they are frozen; the labels are product wording. See
 * vibes.ts, which documents the same trap.
 */
export const CATEGORIES: CommunityCategory[] = [
  { id: 'all', label: 'All', Icon: IconWorld },
  { id: 'adventure', label: 'Adventure', Icon: IconMountain },
  { id: 'culture', label: 'Culture', Icon: IconPalette },
  { id: 'urban', label: 'Urban', Icon: IconBuildingSkyscraper },
  { id: 'scenic', label: 'Scenic', Icon: IconTrees },
  { id: 'spiritual', label: 'Spiritual', Icon: IconFlower },
  { id: 'luxury', label: 'Slow Travel', Icon: IconLeaf },
  { id: 'romantic', label: 'Party', Icon: IconFlame },
];

/** Three-up card grid, used by every community surface. */
export const gridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 3,
} as const;

/** Horizontal rail that scrolls without showing a scrollbar. */
export const hiddenScrollbarSx = {
  display: 'flex',
  overflowX: 'auto',
  pb: 0.5,
  '::-webkit-scrollbar': { display: 'none' },
  scrollbarWidth: 'none',
} as const;
