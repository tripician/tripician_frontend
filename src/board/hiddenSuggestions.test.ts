import { describe, it, expect } from 'vitest';
import { hide, readHidden, HIDDEN_CAP, HIDDEN_KEY, type StorageLike } from './hiddenSuggestions';

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
};

describe('hidden suggestions', () => {
  it('remembers dismissed people and groups separately, without duplicates', () => {
    const s = memory();
    hide('people', 7, s);
    hide('groups', 'g1', s);
    hide('people', 7, s);
    expect(readHidden(s)).toEqual({ people: [7], groups: ['g1'] });
  });

  it('keeps at most the cap, newest first', () => {
    const s = memory();
    for (let i = 0; i < HIDDEN_CAP + 10; i += 1) hide('people', i, s);
    const { people } = readHidden(s);
    expect(people).toHaveLength(HIDDEN_CAP);
    expect(people[0]).toBe(HIDDEN_CAP + 9);
  });

  it('ignores corrupt or mistyped storage', () => {
    const s = memory();
    s.setItem(HIDDEN_KEY, '{not json');
    expect(readHidden(s)).toEqual({ people: [], groups: [] });
    s.setItem(HIDDEN_KEY, JSON.stringify({ people: [1, 'x', 2.5], groups: ['a', 3] }));
    expect(readHidden(s)).toEqual({ people: [1], groups: ['a'] });
  });

  it('still works with no storage, or storage that throws', () => {
    expect(hide('groups', 'g', null)).toEqual({ people: [], groups: ['g'] });
    const broken: StorageLike = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(() => hide('people', 1, broken)).not.toThrow();
  });
});
