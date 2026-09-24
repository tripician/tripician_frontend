import { describe, it, expect } from 'vitest';
import { PACE_USABLE_HOURS, companyForTripType, parseTripPreferences } from './tripPreferences';

// These values travel from the new trip flow to a JSON column and back into two AI prompts, so the parser is where a bad payload is cleaned up.
describe('parseTripPreferences', () => {
  it('reads a full, valid payload back unchanged', () => {
    const full = {
      pace: 'packed',
      company: 'couple',
      interests: ['food', 'markets'],
      dietary: 'vegetarian',
      tripType: 'honeymoon',
      origin: { name: 'Delhi', lat: 28.61, lng: 77.2, placeId: 'ChIJ-delhi', country: 'India' },
    };
    expect(parseTripPreferences(full)).toEqual(full);
  });

  it('invents nothing for questions that were skipped', () => {
    expect(parseTripPreferences({ dietary: 'vegan' })).toEqual({ interests: [], dietary: 'vegan' });
    expect(parseTripPreferences({ tripType: 'group' })).toEqual({ interests: [], tripType: 'group' });
  });

  it('keeps the origin and trip type, which autosave would otherwise erase', () => {
    const parsed = parseTripPreferences({ origin: { name: '  Kolkata ' }, tripType: 'friends' });
    expect(parsed).toEqual({ interests: [], origin: { name: 'Kolkata' }, tripType: 'friends' });
  });

  it('drops a coordinate pair that is out of range or half there', () => {
    expect(parseTripPreferences({ origin: { name: 'X', lat: 200, lng: 10 } })?.origin).toEqual({ name: 'X' });
    expect(parseTripPreferences({ origin: { name: 'X', lat: 10 } })?.origin).toEqual({ name: 'X' });
    expect(parseTripPreferences({ origin: { name: '', lat: 10, lng: 10 } })).toBeNull();
  });

  it('drops values outside the vocabulary rather than passing them to a prompt', () => {
    expect(parseTripPreferences({
      pace: 'sprinting', company: 'entourage', dietary: 'carnivore', tripType: 'cruise', interests: ['food'],
    })).toEqual({ interests: ['food'] });
  });

  it('keeps only string interests, and no more than eight', () => {
    expect(parseTripPreferences({ interests: ['food', 42, null, 'hiking', '', '   ', 'markets'] })?.interests)
      .toEqual(['food', 'hiking', 'markets']);
    expect(parseTripPreferences({ interests: Array.from({ length: 20 }, (_, i) => `i${i}`) })?.interests).toHaveLength(8);
  });

  it('returns null when there is nothing recognisable to read', () => {
    expect(parseTripPreferences(null)).toBeNull();
    expect(parseTripPreferences(undefined)).toBeNull();
    expect(parseTripPreferences('slow')).toBeNull();
    expect(parseTripPreferences({})).toBeNull();
    expect(parseTripPreferences({ pace: 'nope', interests: 'not-an-array' })).toBeNull();
  });
});

describe('companyForTripType', () => {
  it('treats a honeymoon as two people and passes the rest through', () => {
    expect(companyForTripType('honeymoon')).toBe('couple');
    expect(companyForTripType('group')).toBe('group');
    expect(companyForTripType('solo')).toBe('solo');
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
