import type React from 'react';
import {
  IconRoute, IconBook, IconMessages, IconMessageCircleQuestion, IconMessageCircle2,
  IconTemplate, IconUsersPlus, IconRosetteDiscountCheckFilled, IconBuildingCommunity,
  IconSpeakerphone,
} from '@tabler/icons-react';

/**
 * What every kind of thing on Tripician is called, and how its ribbon reads.
 *
 * One registry, because there used to be two. Cards read from `CARD_TYPES` in
 * the tag component while the activity rail kept its own parallel map, and they
 * had already drifted: a published plan was a route glyph on a trip card and a
 * map glyph in the rail. The same object has to look the same wherever it turns
 * up, and that only holds if there is one place to change it.
 *
 * Kept in a .ts of its own rather than beside the component, so the tag can be
 * hot-reloaded and so anything needing only the vocabulary does not pull a
 * React component in with it.
 */

export type CardTypeTone = 'brand' | 'ink' | 'quiet';

export interface CardTypeSpec {
  label: string;
  Icon: React.ElementType;
  tone: CardTypeTone;
}

/**
 * Tone is the hierarchy, and it is deliberate: brand for the things somebody can
 * act on, ink for the archive, quiet for everything that is somebody talking.
 */
export const CARD_TYPES = {
  plan: { label: 'Plan', Icon: IconRoute, tone: 'brand' },
  story: { label: 'After story', Icon: IconBook, tone: 'ink' },
  recruiting: { label: 'Looking for people', Icon: IconUsersPlus, tone: 'brand' },
  template: { label: 'Template', Icon: IconTemplate, tone: 'quiet' },

  // The same two bubbles the nav uses for "The road", so the ribbon and the nav
  // item are recognisably the same thing.
  post: { label: 'From the road', Icon: IconMessages, tone: 'quiet' },
  // A question keeps its own glyph. The ribbon renders NO text - the label is
  // only a tooltip - so the icon is the whole distinction between a note and a
  // question, and giving both the bubbles would erase it.
  question: { label: 'Question', Icon: IconMessageCircleQuestion, tone: 'brand' },

  // Only the activity rail shows these today, but they are the same kind of
  // statement about what a thing is, so they live with the rest.
  comment: { label: 'Comment', Icon: IconMessageCircle2, tone: 'quiet' },
  // Distinct from `question`: asking the one person who went is a different act
  // from asking the road, and it is a quieter event.
  storyQuestion: { label: 'Asked the author', Icon: IconMessageCircleQuestion, tone: 'quiet' },
  verified: { label: 'Identity verified', Icon: IconRosetteDiscountCheckFilled, tone: 'quiet' },
  organization: { label: 'Organisation', Icon: IconBuildingCommunity, tone: 'quiet' },
  notice: { label: 'Tripician', Icon: IconSpeakerphone, tone: 'brand' },
} as const satisfies Record<string, CardTypeSpec>;

export type CardTypeKind = keyof typeof CARD_TYPES;
