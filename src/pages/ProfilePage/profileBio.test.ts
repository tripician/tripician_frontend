import { describe, expect, it } from 'vitest';
import { readHighlights, readIntro } from './profileBio';

const profile = {
  bio: {
    highlights: [
      { key: 'intro', value: '  Slow travel, long trains.  ' },
      { key: 'type', label: "I'm a/an", value: 'Photographer', icon: 'heart' },
      { key: 'dream', label: 'My dream place is', value: 'Not Available' },
      { key: 'from', label: "I'm from", value: 'Kolkata', icon: 'map-pin' },
    ],
  },
};

describe('profileBio', () => {
  it('reads the intro as prose', () => {
    expect(readIntro(profile)).toBe('Slow travel, long trains.');
    expect(readIntro({})).toBe('');
  });

  it('keeps the other highlights, dropping placeholders and the intro', () => {
    expect(readHighlights(profile)).toEqual([
      { icon: 'heart', label: "I'm a/an", value: 'Photographer' },
      { icon: 'map-pin', label: "I'm from", value: 'Kolkata' },
    ]);
  });
});
