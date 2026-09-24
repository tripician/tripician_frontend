import { describe, it, expect } from 'vitest';
import { addRecent, clearRecents, readRecents, removeRecent, RECENT_CAP, RECENT_KEY, type RecentSearch, type StorageLike } from './recentSearches';

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { data.delete(k); },
  };
};

const q = (label: string): RecentSearch => ({ kind: 'query', label, href: `/search?q=${encodeURIComponent(label)}` });
const person = (id: number, label = `Person ${id}`): RecentSearch => ({ kind: 'person', label, href: `/traveler/${id}` });

describe('recent searches', () => {
  it('puts the newest first and moves a repeat to the front instead of listing it twice', () => {
    const s = memory();
    addRecent(q('Japan'), s);
    addRecent(person(1), s);
    addRecent(q('  japan '), s);
    expect(readRecents(s).map((r) => r.label)).toEqual(['japan', 'Person 1']);
  });

  it('treats the same person under a new name as one entry', () => {
    const s = memory();
    addRecent(person(7, 'Old name'), s);
    addRecent(person(7, 'New name'), s);
    expect(readRecents(s)).toHaveLength(1);
    expect(readRecents(s)[0].label).toBe('New name');
  });

  it('keeps at most the cap', () => {
    const s = memory();
    for (let i = 0; i < RECENT_CAP + 5; i += 1) addRecent(person(i), s);
    expect(readRecents(s)).toHaveLength(RECENT_CAP);
    expect(readRecents(s)[0].label).toBe(`Person ${RECENT_CAP + 4}`);
  });

  it('removes one and clears all', () => {
    const s = memory();
    addRecent(q('Peru'), s);
    addRecent(person(2), s);
    expect(removeRecent(q('peru'), s).map((r) => r.kind)).toEqual(['person']);
    expect(clearRecents(s)).toEqual([]);
    expect(s.data.has(RECENT_KEY)).toBe(false);
  });

  it('survives corrupt storage, and drops entries that are not safe links', () => {
    const s = memory();
    s.setItem(RECENT_KEY, '{not json');
    expect(readRecents(s)).toEqual([]);
    s.setItem(RECENT_KEY, JSON.stringify([
      { kind: 'person', label: 'Ok', href: '/traveler/1' },
      { kind: 'person', label: 'Bad', href: 'javascript:alert(1)' },
      { kind: 'person', label: 'Offsite', href: '//evil.example' },
      { kind: 'wizard', label: 'Unknown kind', href: '/x' },
      { kind: 'query', label: '   ', href: '/search' },
      null,
    ]));
    expect(readRecents(s).map((r) => r.label)).toEqual(['Ok']);
  });

  it('does not throw when storage itself throws', () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    };
    expect(readRecents(broken)).toEqual([]);
    expect(addRecent(q('Chile'), broken).map((r) => r.label)).toEqual(['Chile']);
    expect(() => clearRecents(broken)).not.toThrow();
  });

  it('works with no storage at all', () => {
    expect(readRecents(null)).toEqual([]);
    expect(addRecent(q('Oman'), null)).toHaveLength(1);
  });
});
