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
} from '@tabler/icons-react';

/**
 * Vibe metadata shared by community surfaces.
 *
 * The key is the value stored on `Trips.Vibe` and the value the AI prompts read,
 * so keys must stay stable forever (same rule as `countries.ts`). Labels are
 * product wording and can change.
 *
 * Two of these used to disagree with their key: `romantic` was labelled "Party"
 * and `luxury` was labelled "Slow Travel". Since the modal shows the label but
 * stores the key, and the key is what lands in the prompt, picking "Party" told
 * Navia the trip was romantic. Both now say what they store, and "Party" and
 * "Slow Travel" exist as keys of their own so the two options that were only
 * ever labels are now real, transmittable choices.
 */
export const VIBES: Record<string, { label: string; Icon: React.ElementType }> = {
  adventure: { label: 'Adventure', Icon: IconMountain },
  culture: { label: 'Culture', Icon: IconPalette },
  party: { label: 'Party', Icon: IconFlame },
  slow: { label: 'Slow Travel', Icon: IconLeaf },
  romantic: { label: 'Romantic', Icon: IconHeart },
  luxury: { label: 'Luxury', Icon: IconDiamond },
  spiritual: { label: 'Spiritual', Icon: IconFlower },
  urban: { label: 'Urban', Icon: IconBuildingSkyscraper },
  scenic: { label: 'Scenic', Icon: IconTrees },
};
