import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TRIP_PREFERENCES,
  PACE_USABLE_HOURS,
  parseTripPreferences,
} from './tripPreferences';

/**
 * These values travel from the create dialog to a JSON column and back out into
 * two AI prompts, so the parser is the seam where a bad payload either gets
 * cleaned up or quietly poisons a prompt. Everything here is pure.
 */
describe('parseTripPreferences', () => {
  it('reads a full, valid payload back unchanged', () => {
    expect(parseTripPreferences({
      pace: 'packed',
      company: 'family',
      interests: ['food', 'markets'],
      dietary: 'vegetarian',
    })).toEqual({
      pace: 'packed',
      company: 'family',
      interests: ['food', 'markets'],
      dietary: 'vegetarian',
    });
  });

  it('fills the gaps with the defaults when only some answers are present', () => {
    expect(parseTripPreferences({ pace: 'slow' })).toEqual({
      ...DEFAULT_TRIP_PREFERENCES,
      pace: 'slow',
    });
  });

  it('drops values outside the vocabulary rather than passing them to a prompt', () => {
    const parsed = parseTripPreferences({
      pace: 'sprinting',
      company: 'entourage',
      dietary: 'carnivore',
      interests: ['food'],
    });
    expect(parsed).toEqual({ ...DEFAULT_TRIP_PREFERENCES, interests: ['food'] });
  });

  it('keeps only string interests, and no more than eight', () => {
    const parsed = parseTripPreferences({
      pace: 'balanced',
      interests: ['food', 42, null, 'hiking', '', '   ', 'markets'],
    });
    expect(parsed?.interests).toEqual(['food', 'hiking', 'markets']);

    const many = parseTripPreferences({
      pace: 'balanced',
      interests: Array.from({ length: 20 }, (_, i) => `interest-${i}`),
    });
    expect(many?.interests).toHaveLength(8);
  });

  /*
   * Null rather than the defaults, on purpose. "We never asked" and "they answered
   * with the defaults" are different facts, and only the second one should make
   * Reality check and the prompts behave as though a choice was made.
   */
  it('returns null when there is nothing recognisable to read', () => {
    expect(parseTripPreferences(null)).toBeNull();
    expect(parseTripPreferences(undefined)).toBeNull();
    expect(parseTripPreferences('slow')).toBeNull();
    expect(parseTripPreferences({})).toBeNull();
    expect(parseTripPreferences({ pace: 'nope', interests: 'not-an-array' })).toBeNull();
  });
});

describe('PACE_USABLE_HOURS', () => {
  it('keeps balanced at the 8 hours every trip was judged against before pace existed', () => {
    expect(PACE_USABLE_HOURS.balanced).toBe(8);
  });

  it('orders the day length the way the labels promise', () => {
    expect(PACE_USABLE_HOURS.slow).toBeLessThan(PACE_USABLE_HOURS.balanced);
    expect(PACE_USABLE_HOURS.packed).toBeGreaterThan(PACE_USABLE_HOURS.balanced);
  });
});
