/**
 * Shared presentation helpers for After Story.
 *
 * These existed three times over between the card, the hero and the story page,
 * and the copies had already drifted: only the card fell back from YouTube's
 * maxresdefault to hqdefault, so a video without a max-res thumbnail rendered a
 * broken cover on the story page and a correct one on the card two clicks away.
 * One implementation is the fix, not tidiness.
 */

import { defaultThumbUrl, fallbackThumbUrl, toProviderKey } from './videoEmbed';
import dayjs from 'dayjs';

/** The cover fields, shared by the full DTO and the list summary. */
export interface StoryCoverFields {
  coverKind: 'None' | 'Image' | 'Video';
  coverImageUrl?: string | null;
  coverVideoProvider?: 'YouTube' | 'Vimeo' | null;
  coverVideoId?: string | null;
  coverVideoThumbUrl?: string | null;
}

/**
 * The still image for a story, wherever it is shown.
 *
 * `failed` is what the caller sets after an onError, which steps the video case
 * down to the lower-resolution thumbnail. YouTube only generates maxresdefault
 * for uploads above a certain size, so that step is the common path rather than
 * an edge case, and skipping it is what made the story page look broken.
 */
export function resolveStoryCover(story: StoryCoverFields, failed = false): string | null {
  if (story.coverKind === 'Image') {
    return failed ? null : story.coverImageUrl ?? null;
  }

  if (story.coverKind === 'Video') {
    const provider = toProviderKey(story.coverVideoProvider);
    if (!provider || !story.coverVideoId) return null;

    if (!failed) return story.coverVideoThumbUrl ?? defaultThumbUrl(provider, story.coverVideoId);

    // A stored poster that 404s is usually the derived YouTube one, so retrying
    // it would fail again. Vimeo has no derivable fallback and returns null.
    return fallbackThumbUrl(provider, story.coverVideoId);
  }

  return null;
}

/**
 * When the trip happened, at the coarseness a reader actually wants.
 *
 * Month and year, not exact days: a story is read months or years after the
 * fact, where "March 2026" ages better than "March 3 to March 11" and reads
 * less like a booking confirmation.
 */
export function formatTravelWindow(start?: string | null, end?: string | null): string | null {
  if (!start) return null;

  const from = dayjs(start);
  if (!from.isValid()) return null;
  if (!end) return from.format('MMMM YYYY');

  const to = dayjs(end);
  if (!to.isValid()) return from.format('MMMM YYYY');

  return from.isSame(to, 'month')
    ? from.format('MMMM YYYY')
    : `${from.format('MMM')} to ${to.format('MMM YYYY')}`;
}

/**
 * The rounded input shape used across every story form.
 *
 * MUI multiplies numeric sx borderRadius by the theme unit, so this is stated in
 * px on purpose: the surrounding cards are 16px and these sit inside them.
 */
export const STORY_FIELD_SX = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px' },
} as const;
