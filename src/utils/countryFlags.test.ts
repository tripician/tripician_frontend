import { describe, it, expect } from 'vitest';
import {
  COUNTRY_NAMES,
  countryAlpha3FromName,
  countryCodeFromName,
  countryNameFromCode,
  flagEmojiFromCode,
  flagPngUrl,
} from './countryFlags';

/**
 * These cases are not hypothetical. Every name in "the ones that used to fail"
 * was observed rendering wrong in the running app: Greenland drew a generic pin
 * on a Community card, and Afghanistan fell through to raw text in a traveller's
 * passport, sitting in a row beside real flags.
 */

describe('countryCodeFromName', () => {
  it('resolves the ones that used to fail', () => {
    expect(countryCodeFromName('Afghanistan')).toBe('AF');
    expect(countryCodeFromName('Greenland')).toBe('GL');
    expect(countryCodeFromName('Vietnam')).toBe('VN');
  });

  it('is case and whitespace insensitive', () => {
    expect(countryCodeFromName('vietnam')).toBe('VN');
    expect(countryCodeFromName('  VIETNAM  ')).toBe('VN');
    expect(countryCodeFromName('SoUtH kOrEa')).toBe('KR');
  });

  it('ignores punctuation and accents', () => {
    expect(countryCodeFromName("Cote d'Ivoire")).toBe('CI');
    expect(countryCodeFromName('Côte d’Ivoire')).toBe('CI');
    expect(countryCodeFromName('Curaçao')).toBe('CW');
  });

  it('handles the abbreviations real input carries', () => {
    expect(countryCodeFromName('USA')).toBe('US');
    expect(countryCodeFromName('UK')).toBe('GB');
    expect(countryCodeFromName('UAE')).toBe('AE');
    expect(countryCodeFromName('Czechia')).toBe('CZ');
    expect(countryCodeFromName('Holland')).toBe('NL');
    expect(countryCodeFromName('Viet Nam')).toBe('VN');
  });

  it('passes a code straight through', () => {
    expect(countryCodeFromName('JP')).toBe('JP');
    expect(countryCodeFromName('jp')).toBe('JP');
    expect(countryCodeFromName('JPN')).toBe('JP');
  });

  it('returns undefined rather than a wrong flag for an unknown string', () => {
    // The bad case to protect against is not "no flag", it is a confident wrong
    // one. Two-letter junk must not become a country.
    expect(countryCodeFromName('Narnia')).toBeUndefined();
    expect(countryCodeFromName('ZZ')).toBeUndefined();
    expect(countryCodeFromName('')).toBeUndefined();
    expect(countryCodeFromName(null)).toBeUndefined();
    expect(countryCodeFromName(undefined)).toBeUndefined();
  });

  it('does not let an alias shadow a real country', () => {
    // 'Georgia' is a country; an alias table entry must never displace it.
    expect(countryCodeFromName('Georgia')).toBe('GE');
    expect(countryCodeFromName('India')).toBe('IN');
  });
});

describe('country table', () => {
  it('covers the world, not a shortlist', () => {
    // It was 53 entries, which is what put a pin next to Greenland.
    expect(COUNTRY_NAMES.length).toBeGreaterThan(200);
  });

  it('is sorted and free of duplicates', () => {
    const sorted = [...COUNTRY_NAMES].sort((a, b) => a.localeCompare(b));
    expect(COUNTRY_NAMES).toEqual(sorted);
    expect(new Set(COUNTRY_NAMES).size).toBe(COUNTRY_NAMES.length);
  });

  it('round-trips every name through its code and back', () => {
    for (const name of COUNTRY_NAMES) {
      const code = countryCodeFromName(name);
      expect(code, `no code for ${name}`).toBeTruthy();
      expect(countryNameFromCode(code)).toBe(name);
    }
  });
});

describe('code conversions', () => {
  it('maps names to alpha-3', () => {
    expect(countryAlpha3FromName('Germany')).toBe('DEU');
    expect(countryAlpha3FromName('Greenland')).toBe('GRL');
    expect(countryAlpha3FromName('Narnia')).toBeUndefined();
  });

  it('names a country from either code length', () => {
    expect(countryNameFromCode('DE')).toBe('Germany');
    expect(countryNameFromCode('DEU')).toBe('Germany');
    expect(countryNameFromCode('ZZ')).toBeUndefined();
  });
});

describe('flag rendering helpers', () => {
  it('builds a flagcdn url from a code', () => {
    expect(flagPngUrl('GL', 20)).toBe('https://flagcdn.com/20x15/gl.png');
    expect(flagPngUrl(undefined)).toBeUndefined();
  });

  it('still produces emoji for the fallback path', () => {
    // Correct output, but it renders as the letters "JP" on Windows, which is
    // why CountryFlag treats this as tier two and the image as tier one.
    expect(flagEmojiFromCode('JP')).toBe('🇯🇵');
    expect(flagEmojiFromCode('X')).toBe('');
  });
});
