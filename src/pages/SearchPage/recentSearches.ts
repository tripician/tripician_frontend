// Recent searches, kept in this browser only; storage is injected so every rule here runs in a unit test.
import { foldText } from '../../utils/searchText';

export type RecentKind = 'query' | 'person' | 'place' | 'group' | 'tag' | 'plan' | 'story';

export interface RecentSearch {
  kind: RecentKind;
  label: string;
  /** In-app path only; anything else read back from storage is dropped. */
  href: string;
  image?: string | null;
  sub?: string | null;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export const RECENT_KEY = 'tripician:recentSearches';
export const RECENT_CAP = 12;

const KINDS: RecentKind[] = ['query', 'person', 'place', 'group', 'tag', 'plan', 'story'];

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

// A tampered entry must not become a javascript: link, so only same-site paths survive.
function isRecent(value: any): value is RecentSearch {
  return value
    && KINDS.includes(value.kind)
    && typeof value.label === 'string' && value.label.trim().length > 0
    && typeof value.href === 'string' && value.href.startsWith('/') && !value.href.startsWith('//');
}

const keyOf = (r: RecentSearch) => (r.kind === 'query' ? `query:${foldText(r.label)}` : `${r.kind}:${r.href}`);

export function readRecents(storage: StorageLike | null = defaultStorage()): RecentSearch[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isRecent).slice(0, RECENT_CAP) : [];
  } catch {
    return [];
  }
}

function write(list: RecentSearch[], storage: StorageLike | null): RecentSearch[] {
  if (!storage) return list;
  try {
    if (list.length === 0) storage.removeItem(RECENT_KEY);
    else storage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private mode or a full quota: the list still works for this visit.
  }
  return list;
}

/** Newest first; searching the same thing again moves it to the front rather than listing it twice. */
export function addRecent(entry: RecentSearch, storage: StorageLike | null = defaultStorage()): RecentSearch[] {
  if (!isRecent(entry)) return readRecents(storage);
  const clean: RecentSearch = { ...entry, label: entry.label.trim() };
  const rest = readRecents(storage).filter((r) => keyOf(r) !== keyOf(clean));
  return write([clean, ...rest].slice(0, RECENT_CAP), storage);
}

export function removeRecent(entry: RecentSearch, storage: StorageLike | null = defaultStorage()): RecentSearch[] {
  return write(readRecents(storage).filter((r) => keyOf(r) !== keyOf(entry)), storage);
}

export function clearRecents(storage: StorageLike | null = defaultStorage()): RecentSearch[] {
  return write([], storage);
}
