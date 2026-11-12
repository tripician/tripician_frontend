import { describe, expect, it } from 'vitest';
import { homeCodeOf, profileFlags } from './stamps';

describe('profileFlags', () => {
  it('puts home first and keeps only confirmed trip countries', () => {
    const flags = profileFlags({
      homeCountry: 'IN',
      countries: [
        { name: 'Japan', tier: 'gold', firstAt: '2025-03-01' },
        { name: 'France', tier: 'unlocked', firstAt: '2024-01-01' },
        { name: 'Italy', tier: 'locked', firstAt: '2023-01-01' },
      ],
    });
    expect(flags.map((f) => [f.code, f.kind])).toEqual([['IN', 'home'], ['JP', 'trip']]);
  });

  it('never stamps a country twice, the strongest claim winning', () => {
    const flags = profileFlags({
      homeCountry: 'India',
      countries: [
        { name: 'India', tier: 'gold', firstAt: '2025-01-01' },
        { name: 'Japan', tier: 'unlocked', firstAt: '2025-01-01' },
        { name: 'Japan', tier: 'gold', firstAt: '2025-02-01' },
      ],
      locationCountries: [{ code: 'jp', firstAt: '2025-06-01' }, { code: 'PT', firstAt: '2024-06-01' }],
    });
    expect(flags.map((f) => `${f.code}:${f.kind}`)).toEqual(['IN:home', 'PT:location', 'JP:trip']);
  });

  it('reads an account country stored as a code or a name', () => {
    expect(homeCodeOf('gb')).toBe('GB');
    expect(homeCodeOf('United Kingdom')).toBe('GB');
    expect(homeCodeOf('')).toBeNull();
  });
});
