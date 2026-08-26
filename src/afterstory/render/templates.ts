/**
 * Story templates.
 *
 * A template is presentation plus the skeleton the story starts from. It is
 * chosen once, at creation, and never changes: restyling a finished story into a
 * different shape made a mess of it, and the scaffold offer that used to sit in
 * the editor was unreachable anyway. To use a different shape, start a new story.
 *
 * The skeleton is REAL content. Every prompt paragraph is a normal text block the
 * author types over or deletes, and every heading is a normal heading. Nothing
 * here is special-cased on the way in or out.
 */

import { createBlock, plainTextToHtml } from '../blockSchema';
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
  /** The starting skeleton, inserted once when the story is created. */
  scaffold: () => StoryBlock[];
}

function heading(text: string): StoryBlock {
  const block = createBlock('heading');
  return { ...block, type: 'heading', text, level: 2 };
}

function prose(text: string): StoryBlock {
  const block = createBlock('text');
  return { ...block, type: 'text', html: plainTextToHtml(text) };
}

/** An empty slot the author drops a picture into. Renders as nothing if never filled. */
function photo(width: PhotoWidth): StoryBlock {
  const block = createBlock('photo');
  return { ...block, type: 'photo', url: '', width };
}

/**
 * The opening prompt, in the owner's own words. Every shape starts here, because
 * the blank first paragraph is the one that stops people writing at all.
 */
const INTRO =
  'This place is for introduction, maybe you can mention the overall motive of the trip, but like a summary. Where you went, who you went with, and why this one rather than anywhere else.';

const CLOSING_HINT =
  'Guidance stops here. Everything above is an ordinary block: type over it, move it, or delete it and lay the rest out however you like.';

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
      prose(INTRO),
      heading('Day one'),
      photo('inset'),
      prose('Start with the thing you actually remember, not with the airport. What did the first hour look like, and what surprised you?'),
      heading('The days in the middle'),
      photo('inset'),
      prose('The part most people skip. One meal, one wrong turn, one conversation is worth more here than a list of everywhere you walked.'),
      heading('The way home'),
      prose(`What you were carrying back that you did not arrive with. ${CLOSING_HINT}`),
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
      prose(INTRO),
      photo('full'),
      prose('One or two lines under the opening picture. In a photo essay the words are the caption, not the article, so keep them short and let the next image do the talking.'),
      createBlock('gallery'),
      heading('The rest of the roll'),
      photo('full'),
      prose(`Add the pictures that did not fit above, and say what was happening just outside the frame. ${CLOSING_HINT}`),
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
      prose(INTRO),
      heading('Where I stayed'),
      photo('inset'),
      prose('Name the places and say plainly whether you would book them again. A guide earns its keep on the details a listing page will not tell you: the walk from the station, the noise, the breakfast.'),
      heading('What I would do again'),
      createBlock('list'),
      heading('What I would skip'),
      prose('The honest half. Something you queued for and regretted is more useful to the next person than another recommendation.'),
      heading('What it cost'),
      createBlock('cost'),
      prose(`Round numbers are fine. Say what is included and what is not. ${CLOSING_HINT}`),
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
      prose(INTRO),
      photo('wide'),
      prose('A line about that picture.'),
      photo('wide'),
      prose(`And one about this one. A postcard is meant to be finished in ten minutes, so stop when you run out of things worth saying. ${CLOSING_HINT}`),
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
