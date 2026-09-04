import { describe, it, expect } from 'vitest';
import { resolveStoryCover, formatTravelWindow, type StoryCoverFields } from './storyFormat';

const imageStory: StoryCoverFields = {
  coverKind: 'Image',
  coverImageUrl: 'https://res.cloudinary.com/x/a.jpg',
};

const youtubeStory: StoryCoverFields = {
  coverKind: 'Video',
  coverVideoProvider: 'YouTube',
  coverVideoId: 'dQw4w9WgXcQ',
  coverVideoThumbUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
};

const vimeoStory: StoryCoverFields = {
  coverKind: 'Video',
  coverVideoProvider: 'Vimeo',
  coverVideoId: '123456789',
  coverVideoThumbUrl: 'https://i.vimeocdn.com/video/123.jpg',
};

describe('resolveStoryCover', () => {
  it('returns the image for an image cover', () => {
    expect(resolveStoryCover(imageStory)).toBe('https://res.cloudinary.com/x/a.jpg');
  });

  it('returns null for an image that failed to load', () => {
    // No second guess for an uploaded photo: there is nothing to fall back to.
    expect(resolveStoryCover(imageStory, true)).toBeNull();
  });

  it('prefers the stored poster for a video cover', () => {
    expect(resolveStoryCover(youtubeStory)).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });

  it('derives a YouTube poster when none is stored', () => {
    expect(resolveStoryCover({ ...youtubeStory, coverVideoThumbUrl: null })).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    );
  });

  // The regression this helper exists for. Only the card used to step down to
  // hqdefault, so a video without a max-res thumbnail rendered a broken cover on
  // the story page and a correct one on the card.
  it('steps down to hqdefault when the YouTube poster fails', () => {
    expect(resolveStoryCover(youtubeStory, true)).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('has no fallback for Vimeo, which has no derivable poster path', () => {
    expect(resolveStoryCover(vimeoStory)).toBe('https://i.vimeocdn.com/video/123.jpg');
    expect(resolveStoryCover(vimeoStory, true)).toBeNull();
  });

  it('returns null for a story with no cover', () => {
    expect(resolveStoryCover({ coverKind: 'None' })).toBeNull();
  });

  it('returns null when a video cover is missing its id or provider', () => {
    expect(resolveStoryCover({ coverKind: 'Video', coverVideoId: 'dQw4w9WgXcQ' })).toBeNull();
    expect(resolveStoryCover({ coverKind: 'Video', coverVideoProvider: 'YouTube' })).toBeNull();
  });
});

describe('formatTravelWindow', () => {
  it('gives month and year for a single date', () => {
    expect(formatTravelWindow('2026-03-14')).toBe('March 2026');
  });

  it('collapses a range inside one month to that month', () => {
    // A story is read long after the fact, where "March 2026" ages better than
    // exact days and reads less like a booking confirmation.
    expect(formatTravelWindow('2026-03-03', '2026-03-11')).toBe('March 2026');
  });

  it('spans two months when the trip crosses one', () => {
    expect(formatTravelWindow('2026-03-28', '2026-04-06')).toBe('Mar to Apr 2026');
  });

  it('returns null without a start date', () => {
    expect(formatTravelWindow(null)).toBeNull();
    expect(formatTravelWindow(undefined)).toBeNull();
    expect(formatTravelWindow('')).toBeNull();
  });

  it('falls back to the start alone when either date is unparseable', () => {
    expect(formatTravelWindow('not a date')).toBeNull();
    expect(formatTravelWindow('2026-03-14', 'not a date')).toBe('March 2026');
  });
});
