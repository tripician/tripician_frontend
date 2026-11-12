import { describe, expect, it } from 'vitest';

import { countryFromBio, fromForCountry, initialHomeCountry } from './homeCountry';

describe('"I\'m from" as the home country', () => {
  it('reads the country an older line names, and never a bare code', () => {
    expect(countryFromBio('India')).toBe('IN');
    expect(countryFromBio('Kolkata, India')).toBe('IN');
    expect(countryFromBio('New York, USA')).toBe('US');
    expect(countryFromBio('Los Angeles, CA')).toBeUndefined();
    expect(countryFromBio('Somewhere nice')).toBeUndefined();
    expect(countryFromBio('')).toBeUndefined();
  });

  it('writes the line to match the country, keeping a city in the same country', () => {
    expect(fromForCountry('IN', 'Kolkata, India')).toBe('Kolkata, India');
    expect(fromForCountry('US', 'New York, USA')).toBe('New York, USA');
    expect(fromForCountry('AL', 'India')).toBe('Albania');
    expect(fromForCountry('IN', '')).toBe('India');
    expect(fromForCountry('', 'Kolkata')).toBe('Kolkata');
  });

  it('starts from the saved code, else the country the line names', () => {
    expect(initialHomeCountry('AL', 'India')).toBe('AL');
    expect(initialHomeCountry('IND', '')).toBe('IN');
    expect(initialHomeCountry('', 'Kolkata, India')).toBe('IN');
    expect(initialHomeCountry('somewhere', 'Kolkata')).toBe('');
  });
});
