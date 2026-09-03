/**
 * Every country in the table has a vendored circular flag on disk.
 *
 * Flags come from `public/flags/circle`, which is a vendored copy rather than a
 * package, so nothing else would notice a country added to `countryData.ts`
 * without its flag. It would ship, resolve to a 404, and fall back silently to
 * the flagcdn raster on a surface designed around circles. Cheaper to fail here.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { COUNTRIES } from './countryData';

const FLAGS = join(process.cwd(), 'public', 'flags', 'circle');

describe('circular flag coverage', () => {
  it('has a flag for every country in the table', () => {
    const missing = COUNTRIES
      .map(([alpha2]) => alpha2.toLowerCase())
      .filter((code) => !existsSync(join(FLAGS, `${code}.svg`)));

    expect(missing, `no circular flag vendored for: ${missing.join(', ')}`).toEqual([]);
  });

  it('vendors no flag for a code the table does not know', () => {
    const known = new Set(COUNTRIES.map(([alpha2]) => alpha2.toLowerCase()));
    const orphans = readdirSync(FLAGS)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace(/\.svg$/, ''))
      .filter((code) => !known.has(code));

    expect(orphans, `vendored but unreachable: ${orphans.join(', ')}`).toEqual([]);
  });
});
