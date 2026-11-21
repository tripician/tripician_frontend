import { describe, it, expect } from 'vitest';
import { badgeErrorMessage, freeSlots, placePhotos } from './countryBadges';

describe('past-country badge photo slots', () => {
  it('fills both slots from one pick of two', () => {
    expect(placePhotos([null, null], ['a', 'b'], 0)).toEqual(['a', 'b']);
  });

  it('starts at the slot that was clicked', () => {
    expect(placePhotos([null, null], ['a'], 1)).toEqual([null, 'a']);
    expect(placePhotos([null, null], ['a', 'b'], 1)).toEqual(['b', 'a']);
  });

  it('never replaces a photo already there, and drops what does not fit', () => {
    expect(placePhotos(['x', null], ['a', 'b'], 1)).toEqual(['x', 'a']);
    expect(placePhotos(['x', 'y'], ['a'], 0)).toEqual(['x', 'y']);
  });

  it('lets a pick bring as many photos as there are empty slots', () => {
    expect(freeSlots([null, null])).toBe(2);
    expect(freeSlots(['x', null])).toBe(1);
    expect(freeSlots(['x', 'y'])).toBe(0);
  });
});

describe('badgeErrorMessage', () => {
  it("shows the server's own words when it gave some", () => {
    const err = { response: { data: { error: { message: "You've already sent photos for this country." } } } };
    expect(badgeErrorMessage(err, 'fallback')).toBe("You've already sent photos for this country.");
  });

  it('shows an upload refusal as it was written', () => {
    const err = Object.assign(new Error('That photo is too small to use.'), { name: 'UploadError' });
    expect(badgeErrorMessage(err, 'fallback')).toBe('That photo is too small to use.');
  });

  it('falls back when there is nothing a person could act on', () => {
    expect(badgeErrorMessage(new Error('Network Error'), 'fallback')).toBe('fallback');
    expect(badgeErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
