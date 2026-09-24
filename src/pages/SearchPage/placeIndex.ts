// Places for Search: only countries that have something published, each with real counts.
import { COUNTRY_SEARCH_KEYS, countryCodeFromName, countryNameFromCode, normaliseCountryText } from '../../utils/countryFlags';

export interface PlaceEntry {
  code: string;
  name: string;
  plans: number;
  stories: number;
  /** Plans a traveller can still ask to join. */
  open: number;
}

interface HasCountries {
  countries?: string[] | null;
}

// Countries sometimes arrive as "Thailand, Vietnam" in one string.
function codesOf(countries: string[] | null | undefined): Set<string> {
  const codes = new Set<string>();
  for (const raw of Array.isArray(countries) ? countries : []) {
    for (const part of String(raw ?? '').split(',')) {
      const code = countryCodeFromName(part);
      if (code) codes.add(code);
    }
  }
  return codes;
}

/** One count per plan or story per country, however many times it lists the place. */
export function buildPlaceIndex(trips: any[], stories: HasCountries[], isOpen: (trip: any) => boolean): Map<string, PlaceEntry> {
  const index = new Map<string, PlaceEntry>();
  const entry = (code: string): PlaceEntry => {
    let e = index.get(code);
    if (!e) {
      e = { code, name: countryNameFromCode(code) ?? code, plans: 0, stories: 0, open: 0 };
      index.set(code, e);
    }
    return e;
  };
  for (const t of trips) {
    const open = isOpen(t);
    for (const code of codesOf(t?.countries)) {
      const e = entry(code);
      e.plans += 1;
      if (open) e.open += 1;
    }
  }
  for (const s of stories) {
    for (const code of codesOf(s?.countries)) entry(code).stories += 1;
  }
  return index;
}

export const placeTotal = (p: PlaceEntry): number => p.plans + p.stories;

/** Countries whose name, or an alias, starts with the query or has a word that does: "jap" finds Japan, "states" the US. */
export function matchPlaces(index: Map<string, PlaceEntry>, query: string, limit = 20): PlaceEntry[] {
  const q = normaliseCountryText(query);
  if (!q) return [];
  const best = new Map<string, number>();
  for (const [key, code] of COUNTRY_SEARCH_KEYS) {
    if (!index.has(code)) continue;
    const score = key === q ? 3 : key.startsWith(q) ? 2 : key.includes(` ${q}`) ? 1 : 0;
    if (score > (best.get(code) ?? 0)) best.set(code, score);
  }
  return [...best.entries()]
    .map(([code, score]) => ({ place: index.get(code)!, score }))
    .sort((a, b) => b.score - a.score || placeTotal(b.place) - placeTotal(a.place) || a.place.name.localeCompare(b.place.name))
    .slice(0, limit)
    .map((x) => x.place);
}

/** The place a query names outright, if any: typing "Japan" in full should put Japan first. */
export function exactPlace(index: Map<string, PlaceEntry>, query: string): PlaceEntry | null {
  const code = countryCodeFromName(query);
  return code ? index.get(code) ?? null : null;
}
