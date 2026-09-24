// Suggestions somebody dismissed on the Wall, kept in this browser only; storage is injected so the rules run in a unit test.

export interface HiddenSuggestions {
  people: number[];
  groups: string[];
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const HIDDEN_KEY = 'tripician:hiddenSuggestions';
export const HIDDEN_CAP = 200;

const EMPTY: HiddenSuggestions = { people: [], groups: [] };

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readHidden(storage: StorageLike | null = defaultStorage()): HiddenSuggestions {
  if (!storage) return EMPTY;
  try {
    const parsed = JSON.parse(storage.getItem(HIDDEN_KEY) ?? 'null');
    return {
      people: Array.isArray(parsed?.people) ? parsed.people.filter((n: unknown) => Number.isInteger(n)) : [],
      groups: Array.isArray(parsed?.groups) ? parsed.groups.filter((g: unknown) => typeof g === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

/** Newest first, capped, so a long-lived browser does not grow the list for ever. */
export function hide(kind: 'people' | 'groups', id: number | string, storage: StorageLike | null = defaultStorage()): HiddenSuggestions {
  const current = readHidden(storage);
  const next: HiddenSuggestions = kind === 'people'
    ? { ...current, people: [Number(id), ...current.people.filter((p) => p !== Number(id))].slice(0, HIDDEN_CAP) }
    : { ...current, groups: [String(id), ...current.groups.filter((g) => g !== String(id))].slice(0, HIDDEN_CAP) };
  try {
    storage?.setItem(HIDDEN_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: the dismissal still holds for this visit.
  }
  return next;
}
