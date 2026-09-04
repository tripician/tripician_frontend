import { describe, it, expect } from 'vitest';
import { normaliseCountries, nightsBetween, tripNights } from './tripMeta';

describe('normaliseCountries', () => {
  // The bug this gate exists to stop: Community printed the country raw and
  // Profile lower-cased everything after the first letter, so one trip was in
  // "New Zealand" on one page and "New zealand" on the other. The flags on the
  // cover now resolve from this list too, so a casing slip would also change
  // which flag renders.
  it('title-cases every word, not just the first', () => {
    expect(normaliseCountries(['new zealand'])).toEqual(['New Zealand']);
    expect(normaliseCountries(['NEW ZEALAND'])).toEqual(['New Zealand']);
    expect(normaliseCountries(['New Zealand'])).toEqual(['New Zealand']);
  });

  it('title-cases across hyphens', () => {
    expect(normaliseCountries(['guinea-bissau'])).toEqual(['Guinea-Bissau']);
  });

  it('keeps order and drops duplicates', () => {
    expect(normaliseCountries(['Japan', 'Japan', 'Korea'])).toEqual(['Japan', 'Korea']);
  });

  it('rejects values that cannot be a country name', () => {
    expect(normaliseCountries(['Trip 2026'])).toEqual([]);
    expect(normaliseCountries(['a6f3c1de9b0447aa'])).toEqual([]);
    expect(normaliseCountries(['x'.repeat(31)])).toEqual([]);
  });

  it('drops the junk but keeps the real places beside it', () => {
    expect(normaliseCountries(['Trip 2026', 'france'])).toEqual(['France']);
  });

  it('is empty rather than null-ish for missing input', () => {
    expect(normaliseCountries([])).toEqual([]);
    expect(normaliseCountries(null)).toEqual([]);
    expect(normaliseCountries(undefined)).toEqual([]);
  });
});

describe('tripNights', () => {
  // Both cards read length through here. If one surface kept its own precedence,
  // the same trip could report two different lengths on two pages.
  it('prefers an explicit total over the date range', () => {
    expect(tripNights({ totalNights: 21, startDate: '2026-11-16', endDate: '2026-11-23' })).toBe(21);
  });

  it('falls back to the planning target, then to the dates', () => {
    expect(tripNights({ targetNights: 9, startDate: '2026-11-16', endDate: '2026-11-23' })).toBe(9);
    expect(tripNights({ startDate: '2026-11-16', endDate: '2026-11-23' })).toBe(7);
  });

  it('reads the date casings the list endpoints actually send', () => {
    expect(tripNights({ StartDate: '2026-11-16', EndDate: '2026-11-23' })).toBe(7);
    expect(tripNights({ start_date: '2026-11-16', end_date: '2026-11-23' })).toBe(7);
  });

  it('ignores a zero or negative count rather than reporting it', () => {
    expect(tripNights({ totalNights: 0, startDate: '2026-11-16', endDate: '2026-11-23' })).toBe(7);
    expect(tripNights({ totalNights: -3 })).toBeNull();
  });

  it('is null when the trip says nothing about its length', () => {
    expect(tripNights({})).toBeNull();
    expect(tripNights(null)).toBeNull();
    expect(tripNights(undefined)).toBeNull();
  });
});

describe('nightsBetween', () => {
  it('counts nights between two dates', () => {
    expect(nightsBetween('2026-11-16', '2026-11-30')).toBe(14);
    expect(nightsBetween('2026-11-16', '2026-11-17')).toBe(1);
  });

  it('is null when a date is missing, junk, or backwards', () => {
    expect(nightsBetween('2026-11-16', null)).toBeNull();
    expect(nightsBetween(null, '2026-11-30')).toBeNull();
    expect(nightsBetween('nope', '2026-11-30')).toBeNull();
    expect(nightsBetween('2026-11-30', '2026-11-16')).toBeNull();
    // A same-day trip has no nights, and "0 nights" is not worth a line.
    expect(nightsBetween('2026-11-16', '2026-11-16')).toBeNull();
  });
});

