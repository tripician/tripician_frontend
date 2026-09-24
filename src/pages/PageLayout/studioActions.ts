import type React from 'react';
import {
  IconFeather,
  IconMap,

} from '@tabler/icons-react';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import TripicianAIOrb from '../../tripicianai/TripicianAIOrb';

/**
 * Studio: every way of making something, in one list.
 *
 * There used to be two. The bottom bar held a proper array and the header held
 * the same choices as inline JSX, so they drifted: the header drew a plus on the
 * trip row and the bottom bar drew a map, and "Write a story" lived behind a
 * chevron on desktop but sat one tap deep on a phone. One list, read by both.
 *
 * Posting to the road is deliberately absent. It is a composer that lives on the
 * page you are already reading, not a destination you go to, and putting it here
 * would ask somebody to open a menu to write one line.
 */

export interface StudioAction {
  key: string;
  label: string;
  /** One clause under the label. The header shows it; the phone menu does not. */
  hint: string;
    Icon: React.ElementType;
    /** A logo rather than a line icon: drawn on its own, larger, without the tinted tile. */
    logo?: boolean;
}

export interface StudioHandlers {
  onCreateTrip: () => void;
  onWriteStory: () => void;
  onAskTripicianAI: () => void;
}

/** The label on the control that opens the menu. */
export const STUDIO_LABEL = 'Studio';

// Tools only: a group is a place you use them in, so starting one lives where groups live, never here.
export function studioActions(handlers: StudioHandlers): Array<StudioAction & { run: () => void }> {
  const actions: Array<StudioAction & { run: () => void }> = [
    {
      key: 'trip',
      label: 'Plan a trip',
      hint: 'Day by day, with your crew',
      Icon: IconMap,
      run: handlers.onCreateTrip,
    },
  ];

  if (FEATURE_FLAGS.afterStory) {
    actions.push({
      key: 'story',
      label: 'Write a story',
      hint: 'Write up a trip you already took',
      Icon: IconFeather,
      run: handlers.onWriteStory,
    });
  }

  actions.push({
    key: 'tripicianai',
    label: 'Ask TripicianAI',
    hint: 'Your travel companion, in a sentence',
    Icon: TripicianAIOrb,
    logo: true,
    run: handlers.onAskTripicianAI,
  });

  return actions;
}
