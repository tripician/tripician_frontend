/**
 * Story templates.
 *
 * A template is presentation plus a starting scaffold. It never owns content:
 * switching template restyles what is already there and, the first time only,
 * offers to insert the headings the new shape expects. That separation is what
 * stops this becoming a page builder, where every layout choice is welded to the
 * words and changing your mind means retyping.
 */

import { createBlock } from '../blockSchema';
import type { PhotoWidth, StoryBlock, StoryTemplate } from '../types';

export interface StoryTemplateStyle {
  key: StoryTemplate;
  label: string;
  /** One line, shown in the picker. Says what it is good for, not what it looks like. */
  description: string;
  /** Prose measure in characters. Anything past roughly 75 gets hard to track. */
  measure: number;
  /** What a newly added photo defaults to. */
  defaultPhotoWidth: PhotoWidth;
  /** Headings carry voice in the serif display face; body copy never does. */
  headingSerif: boolean;
  /** Oversized opening letter on the first prose block. */
  dropCap: boolean;
  /** Vertical rhythm multiplier against the base spacing unit. */
  blockGap: number;
  captionAlign: 'left' | 'center';
  captionCaps: boolean;
  /** Headings the shape expects, offered on first switch. Never applied silently. */
  scaffold: () => StoryBlock[];
}

function heading(text: string): StoryBlock {
  const block = createBlock('heading');
  return { ...block, type: 'heading', text, level: 2 };
}

function prose(): StoryBlock {
  return createBlock('text');
}

export const STORY_TEMPLATES: Record<StoryTemplate, StoryTemplateStyle> = {
  journal: {
    key: 'journal',
    label: 'Journal',
    description: 'Day by day, in order. Best for a trip with several stops.',
    measure: 68,
    defaultPhotoWidth: 'inset',
    headingSerif: true,
    dropCap: true,
    blockGap: 3,
    captionAlign: 'left',
    captionCaps: false,
    scaffold: () => [prose(), heading('Day one'), prose()],
  },

  photoEssay: {
    key: 'photoEssay',
    label: 'Photo essay',
    description: 'Pictures lead, words follow. Best when you came back with good photos.',
    measure: 56,
    defaultPhotoWidth: 'full',
    headingSerif: true,
    dropCap: false,
    blockGap: 4,
    captionAlign: 'center',
    captionCaps: true,
    scaffold: () => [prose(), createBlock('gallery')],
  },

  guide: {
    key: 'guide',
    label: 'Guide',
    description: 'Structured and searchable. Best if you want the next traveller to use it.',
    measure: 72,
    defaultPhotoWidth: 'inset',
    headingSerif: false,
    dropCap: false,
    blockGap: 3,
    captionAlign: 'left',
    captionCaps: false,
    scaffold: () => [
      prose(),
      heading('Where I stayed'),
      prose(),
      heading('What I would do again'),
      createBlock('list'),
      heading('What I would skip'),
      prose(),
      heading('What it cost'),
      createBlock('cost'),
    ],
  },

  postcard: {
    key: 'postcard',
    label: 'Postcard',
    description: 'Short. A cover, a handful of photos, a line each. Quickest to finish.',
    measure: 60,
    defaultPhotoWidth: 'wide',
    headingSerif: true,
    dropCap: false,
    blockGap: 2.5,
    captionAlign: 'center',
    captionCaps: false,
    scaffold: () => [prose(), createBlock('photo'), prose()],
  },
};

export const TEMPLATE_ORDER: StoryTemplate[] = ['journal', 'photoEssay', 'guide', 'postcard'];

export function templateStyle(key: string | null | undefined): StoryTemplateStyle {
  return STORY_TEMPLATES[(key ?? 'journal') as StoryTemplate] ?? STORY_TEMPLATES.journal;
}

/**
 * The headings a template expects that the story does not already have.
 *
 * Compared case-insensitively against existing heading text, so switching to
 * Guide twice does not stack a second "Where I stayed". Returns an empty array
 * when there is nothing to add, which is the caller's signal not to prompt.
 */
export function missingScaffold(template: StoryTemplate, blocks: StoryBlock[]): StoryBlock[] {
  const existing = new Set(
    blocks
      .filter((b): b is Extract<StoryBlock, { type: 'heading' }> => b.type === 'heading')
      .map((b) => b.text.trim().toLowerCase()),
  );

  return STORY_TEMPLATES[template]
    .scaffold()
    .filter((b) => b.type === 'heading' && !existing.has(b.text.trim().toLowerCase()));
}
