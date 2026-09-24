import { describe, expect, it } from 'vitest';
import { ideasToAdd, isEmptyStop } from './stopIdeas';

describe('isEmptyStop', () => {
  it('is empty only with no notes, places or food', () => {
    expect(isEmptyStop({ notes: '', spots: [], foods: [] })).toBe(true);
    expect(isEmptyStop({ notes: '   ' })).toBe(true);
    expect(isEmptyStop({ notes: 'Book the ferry' })).toBe(false);
    expect(isEmptyStop({ spots: [{ id: 's', name: 'Fushimi Inari' }] })).toBe(false);
    expect(isEmptyStop({ foods: [{ id: 'f', name: 'Ramen' }] })).toBe(false);
  });
});

describe('ideasToAdd', () => {
  const mine = [{ name: 'Fushimi Inari', placeId: 'p1' }, { name: 'Nishiki Market' }];

  it('keeps what the traveller added and only brings in new ideas', () => {
    const suggested = [
      { name: 'fushimi inari' },
      { name: 'Inari shrine', placeId: 'p1' },
      { name: 'Kinkaku-ji', placeId: 'p2' },
      { name: 'Kinkaku-ji' },
      { name: '  ' },
      { name: 'Gion' },
    ];
    expect(ideasToAdd(mine, suggested)).toEqual([{ name: 'Kinkaku-ji', placeId: 'p2' }, { name: 'Gion' }]);
  });

  it('adds everything to a stop with nothing on it', () => {
    expect(ideasToAdd([], [{ name: 'Ramen' }, { name: 'Yudofu' }])).toHaveLength(2);
  });
});
