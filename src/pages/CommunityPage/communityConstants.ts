import type React from 'react';
import {
  IconBuildingSkyscraper,
  IconDiamond,
  IconFlame,
  IconFlower,
  IconHeart,
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
 * Every id here is a real key from vibes.ts and every label is that key's own
 * label. It used to carry the pre-fix mapping, where `luxury` showed as "Slow
 * Travel" and `romantic` as "Party", described as deliberate because the keys
 * were frozen. That stopped being true when vibes.ts gained `party` and `slow`
 * as real keys: the create dialog offers all nine, so a trip saved as `party`
 * matched no chip at all and could not be found by filter on any browse surface,
 * while a `romantic` trip appeared under a chip labelled "Party".
 */
export const CATEGORIES: CommunityCategory[] = [
  { id: 'all', label: 'All', Icon: IconWorld },
  { id: 'adventure', label: 'Adventure', Icon: IconMountain },
  { id: 'culture', label: 'Culture', Icon: IconPalette },
  { id: 'urban', label: 'Urban', Icon: IconBuildingSkyscraper },
  { id: 'scenic', label: 'Scenic', Icon: IconTrees },
  { id: 'spiritual', label: 'Spiritual', Icon: IconFlower },
  { id: 'slow', label: 'Slow Travel', Icon: IconLeaf },
  { id: 'party', label: 'Party', Icon: IconFlame },
  { id: 'romantic', label: 'Romantic', Icon: IconHeart },
  { id: 'luxury', label: 'Luxury', Icon: IconDiamond },
];

/** Three-up card grid, used by Browse, the crew directory and templates. */
export const gridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 3,
} as const;

/**
 * The community wall.
 *
 * Denser than `gridSx` and fluid rather than stepped: a wall wants as many
 * columns as the viewport can hold, so a wide screen gets four or five instead
 * of stopping at three and leaving the cards enormous. `auto-fill` rather than
 * `auto-fit` so a single card keeps its column width instead of stretching to
 * the full measure, which is what makes a sparse wall still read as a wall.
 *
 * 260px is the floor where the 4:5 jacket still carries a title, a place and a
 * name without clipping.
 */
export const wallGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: { xs: 2, sm: 2.5 },
  alignItems: 'start',
} as const;

/*
 * The hidden-scrollbar rail used to live here and is gone.
 *
 * It set overflowX: auto and then hid the scrollbar, which worked with a finger
 * and failed with a mouse: a horizontally overflowing box ignores a vertical
 * wheel, so any chip past the fold was unreachable on a desktop. Every caller now
 * uses components/ui/ChipRail, which wraps above md instead.
 */
