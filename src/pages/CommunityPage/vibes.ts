import type React from 'react';
import {
  IconBuildingSkyscraper,
  IconFlame,
  IconFlower,
  IconLeaf,
  IconMountain,
  IconPalette,
  IconTrees,
} from '@tabler/icons-react';

/** Vibe metadata shared by community surfaces (labels are product wording). */
export const VIBES: Record<string, { label: string; Icon: React.ElementType }> = {
  adventure: { label: 'Adventure', Icon: IconMountain },
  culture: { label: 'Culture', Icon: IconPalette },
  romantic: { label: 'Party', Icon: IconFlame },
  luxury: { label: 'Slow Travel', Icon: IconLeaf },
  spiritual: { label: 'Spiritual', Icon: IconFlower },
  urban: { label: 'Urban', Icon: IconBuildingSkyscraper },
  scenic: { label: 'Scenic', Icon: IconTrees },
};
