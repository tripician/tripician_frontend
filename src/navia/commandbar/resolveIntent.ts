import { COUNTRIES } from '../../utils/countries';
import { CATEGORIES } from '../../pages/CommunityPage/communityConstants';
import type { CommandMode } from './commandModes';

export type ResolvedMode = Exclude<CommandMode, 'auto'>;

export interface IntentResolution {
  mode: ResolvedMode;
  /** False when nothing in the text matched and the mode is only a best guess. */
  confident: boolean;
}

/** Words that open a question. A sentence starting here is asking, not planning. */
const QUESTION_OPENERS = [
  'how', 'what', 'where', 'when', 'which', 'why', 'who',
  'is', 'are', 'was', 'were', 'do', 'does', 'did',
  'can', 'could', 'should', 'would', 'will', 'shall',
  'any', 'anyone', 'tell', 'explain',
];

/** First person and past tense together: this trip already happened. */
const STORY_OPENERS = [
  'i went', 'we went', 'i visited', 'we visited', 'i stayed', 'we stayed',
  'i spent', 'we spent', 'i travelled', 'we travelled', 'i traveled', 'we traveled',
  'i just got back', 'we just got back', 'just got back', 'just came back',
  'i came back', 'we came back', 'our trip', 'my trip',
  'write up', 'write about', 'story about',
];

// Spelled-out counts matter: the placeholder people copy reads "Three days in Lisbon".
const COUNT_WORDS = 'a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple of|few';
const SPANS = 'day|days|night|nights|week|weeks|month|months';
const DURATION = new RegExp(`\\b(\\d+|${COUNT_WORDS})\\s+(${SPANS})\\b|\\b(weekend|long weekend|fortnight)\\b`);

const VIBE_IDS = CATEGORIES.map((c) => c.id).filter((id) => id !== 'all');

const LOWER_COUNTRIES = COUNTRIES.map((c) => c.toLowerCase());

function mentionsPlace(lower: string): boolean {
  return LOWER_COUNTRIES.some((c) => c.length > 3 && lower.includes(c));
}

function mentionsVibe(lower: string): boolean {
  return VIBE_IDS.some((v) => lower.includes(v));
}

/**
 * Says "I am going somewhere" without naming a country or a length.
 *
 * The country list is countries only, so "Tokyo trip" and "visit Bali" carry no
 * place signal at all and would otherwise be answered rather than planned.
 */
const TRAVEL_MARKERS = [
  'trip', 'travel', 'itinerary', 'holiday', 'vacation', 'honeymoon', 'getaway',
  'backpack', 'road trip', 'go to', 'fly to', 'visit', 'tour ', 'explore',
  'stay in', 'plan ', 'take me',
];

function mentionsTravel(lower: string): boolean {
  return TRAVEL_MARKERS.some((m) => lower.includes(m));
}

/**
 * Which mode a sentence wants. Pure, and never runs a model.
 *
 * Planning must be EARNED by a signal in the text. Answering is what happens when
 * there is no signal, because a wrong answer costs a reply and a wrong plan costs a
 * trip in the database that nobody asked for.
 */
export function resolveIntent(text: string, hasImages: boolean, storyEnabled = true): IntentResolution {
  // Screenshots are a plan somebody already wrote. This one is never wrong.
  if (hasImages) return { mode: 'plan', confident: true };

  const trimmed = text.trim();
  if (!trimmed) return { mode: 'ask', confident: false };

  const lower = trimmed.toLowerCase();
  const firstWord = lower.split(/\s+/)[0]?.replace(/[^a-z']/g, '') ?? '';

  // What the sentence LEADS with is what it is about, so openers are read first.
  if (lower.startsWith('?') || QUESTION_OPENERS.includes(firstWord)) {
    return { mode: 'ask', confident: true };
  }

  if (storyEnabled && STORY_OPENERS.some((s) => lower.startsWith(s))) {
    return { mode: 'story', confident: true };
  }

  if (DURATION.test(lower)) return { mode: 'plan', confident: true };

  // A trailing question mark still counts, just less than an opener.
  if (trimmed.endsWith('?')) return { mode: 'ask', confident: true };

  if (mentionsPlace(lower) || mentionsVibe(lower) || mentionsTravel(lower)) {
    return { mode: 'plan', confident: false };
  }

  // No travel signal at all: "hey", "thanks", "ok". Answer it.
  //
  // This used to fall through to plan on the assumption that draft-trip refuses a
  // vague prompt. It does not: its prompt says "NEVER ask a question and never
  // return an empty result because the request is vague", so "hey" came back with an
  // invented country and a real trip was created.
  return { mode: 'ask', confident: false };
}
