import { describe, it, expect } from 'vitest';
import { COUNTRIES } from './countryData';
import { CONTINENT_BY_ALPHA2, continentOfCode } from './continentData';

/*
 * A country added to countryData.ts with no continent here would quietly stop
 * being counted on a profile, which is the kind of gap nobody notices for months.
 * Same reasoning as flagCoverage.guard.test.ts.
 */
describe('continent coverage', () => {
  it('has a continent for every country in the table', () => {
    const missing = COUNTRIES.map(([code]) => code).filter((code) => !CONTINENT_BY_ALPHA2[code]);
    expect(missing, `no continent for: ${missing.join(', ')}`).toEqual([]);
  });

  it('carries no code the country table does not know', () => {
    const known = new Set(COUNTRIES.map(([code]) => code));
    const orphans = Object.keys(CONTINENT_BY_ALPHA2).filter((code) => !known.has(code));
    expect(orphans, `not a country: ${orphans.join(', ')}`).toEqual([]);
  });

  it('has one entry per country and no more', () => {
    expect(Object.keys(CONTINENT_BY_ALPHA2)).toHaveLength(COUNTRIES.length);
  });

  // Catches a transcription slip: the totals are what a wrong paste changes first.
  it('splits the world the way the file says it does', () => {
    const counts: Record<string, number> = {};
    for (const continent of Object.values(CONTINENT_BY_ALPHA2)) {
      counts[continent] = (counts[continent] ?? 0) + 1;
    }
    expect(counts).toEqual({
      Africa: 58,
      Antarctica: 5,
      Asia: 52,
      Europe: 51,
      'North America': 41,
      Oceania: 28,
      'South America': 14,
    });
  });

  it('puts the arguable ones where the comment says', () => {
    expect(continentOfCode('RU')).toBe('Europe');
    expect(continentOfCode('TR')).toBe('Asia');
    expect(continentOfCode('CY')).toBe('Asia');
    expect(continentOfCode('MX')).toBe('North America');
    expect(continentOfCode('AQ')).toBe('Antarctica');
    expect(continentOfCode('CX')).toBe('Oceania');
    expect(continentOfCode('AU')).toBe('Oceania');
  });

  it('reads a code in any case, and says nothing for one it does not know', () => {
    expect(continentOfCode('jp')).toBe('Asia');
    expect(continentOfCode(' fr ')).toBe('Europe');
    expect(continentOfCode('ZZ')).toBeUndefined();
    expect(continentOfCode('')).toBeUndefined();
    expect(continentOfCode(null)).toBeUndefined();
    expect(continentOfCode(undefined)).toBeUndefined();
  });
});
