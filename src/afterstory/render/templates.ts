/**
 * Story templates.
 *
 * A template is presentation plus the skeleton the story starts from. It is
 * chosen once, at creation, and never changes: restyling a finished story into a
 * different shape made a mess of it, and the scaffold offer that used to sit in
 * the editor was unreachable anyway. To use a different shape, start a new story.
 *
 * Headings are real content the author keeps or edits. Prose prompts are not:
 * each is an empty text block carrying a `prompt`, shown grey until the author
 * types and never shown to a reader. They used to be inserted as real text, which
 * had to be deleted by hand and was sometimes published by mistake.
 */

import { createBlock } from '../blockSchema';
import { PROMPTS } from '../storyPrompts';
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
  /** Headings carry voice in the display face (the display cut of the one family since 2026-11). */
  headingSerif: boolean;
  /** Oversized opening letter on the first prose block. */
  dropCap: boolean;
  /** Vertical rhythm multiplier against the base spacing unit. */
  blockGap: number;
  captionAlign: 'left' | 'center';
  captionCaps: boolean;
  /** The starting skeleton, inserted once when the story is created. */
  scaffold: () => StoryBlock[];
}

function heading(text: string): StoryBlock {
  const block = createBlock('heading');
  return { ...block, type: 'heading', text, level: 2 };
}

function prose(prompt: string): StoryBlock {
  const block = createBlock('text');
  return { ...block, type: 'text', html: '', prompt };
}

/** An empty slot the author drops a picture into. Renders as nothing if never filled. */
function photo(width: PhotoWidth): StoryBlock {
  const block = createBlock('photo');
  return { ...block, type: 'photo', url: '', width };
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
    scaffold: () => [
      prose(PROMPTS.intro),
      heading('Day one'),
      photo('inset'),
      prose(PROMPTS.journalFirst),
      heading('The days in the middle'),
      photo('inset'),
      prose(PROMPTS.journalMiddle),
      heading('The way home'),
      prose(PROMPTS.journalHome),
    ],
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
    scaffold: () => [
      prose(PROMPTS.intro),
      photo('full'),
      prose(PROMPTS.essayOpening),
      createBlock('gallery'),
      heading('The rest of the roll'),
      photo('full'),
      prose(PROMPTS.essayRest),
    ],
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
      prose(PROMPTS.intro),
      heading('Where I stayed'),
      photo('inset'),
      prose(PROMPTS.guideStay),
      heading('What I would do again'),
      createBlock('list'),
      heading('What I would skip'),
      prose(PROMPTS.guideSkip),
      heading('What it cost'),
      createBlock('cost'),
      prose(PROMPTS.guideCost),
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
    scaffold: () => [
      prose(PROMPTS.intro),
      photo('wide'),
      prose(PROMPTS.postcardFirst),
      photo('wide'),
      prose(PROMPTS.postcardSecond),
    ],
  },
};

export const TEMPLATE_ORDER: StoryTemplate[] = ['journal', 'photoEssay', 'guide', 'postcard'];

export function templateStyle(key: string | null | undefined): StoryTemplateStyle {
  return STORY_TEMPLATES[(key ?? 'journal') as StoryTemplate] ?? STORY_TEMPLATES.journal;
}

/** The starting skeleton for a brand-new story. Applied once, at creation. */
export function templateScaffold(key: string | null | undefined): StoryBlock[] {
  return templateStyle(key).scaffold();
}
