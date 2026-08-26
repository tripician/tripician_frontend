import { describe, it, expect } from 'vitest';
import { VIBES } from './vibes';
import { CATEGORIES } from './communityConstants';

/**
 * These guard an information-architecture contract, not a component.
 *
 * VIBES is the vocabulary: its keys are stored on `Trips.Vibe` and read by the
 * AI prompts, so they are frozen. CATEGORIES is the chip row that filters on
 * those keys. The two drifted apart once already and it was invisible: the fix
 * landed in vibes.ts, CATEGORIES kept the old mapping, and a trip saved as
 * `party` matched no chip on any browse surface while a `romantic` one appeared
 * under a chip labelled "Party".
 *
 * Nothing type-checks a string id against another file's object keys, so this
 * does.
 */

const FILTERABLE = CATEGORIES.filter((c) => c.id !== 'all');

describe('vibe taxonomy', () => {
  it('only offers chips for vibes that actually exist', () => {
    for (const category of FILTERABLE) {
      expect(VIBES[category.id], `chip "${category.label}" filters on unknown vibe "${category.id}"`)
        .toBeTruthy();
    }
  });

  it('labels every chip the way the vocabulary labels it', () => {
    // A chip saying "Party" must filter for party. This is the exact assertion
    // that would have caught the original bug.
    for (const category of FILTERABLE) {
      expect(category.label, `chip id "${category.id}" is labelled "${category.label}"`)
        .toBe(VIBES[category.id].label);
    }
  });

  it('offers a chip for every vibe somebody can save', () => {
    // The create dialog builds its options from Object.keys(VIBES), so any vibe
    // missing here is a trip that cannot be found by filter.
    for (const key of Object.keys(VIBES)) {
      expect(FILTERABLE.some((c) => c.id === key), `no chip filters for vibe "${key}"`)
        .toBe(true);
    }
  });

  it('keeps "all" first, since it is the default', () => {
    expect(CATEGORIES[0].id).toBe('all');
  });

  it('has no duplicate ids', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
