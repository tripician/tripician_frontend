// Pure matching for Groups & Stories, kept free of React and the network so every rule here is unit tested.
import type { AfterStorySummaryDto } from '../../afterstory/types';
import { normaliseCountries, tripNights } from '../../utils/tripMeta';
import { isJoinable, verifiedRank } from '../../utils/tripRanking';
import { countryCodeFromName } from '../../utils/countryFlags';
import { foldText, textMatches } from '../../utils/searchText';
import { VIBES } from '../CommunityPage/vibes';

export type Kind = 'all' | 'join' | 'groups' | 'plans' | 'stories';
export type LengthKey = 'weekend' | 'week' | 'fortnight' | 'long';

export interface LengthOption {
  key: LengthKey;
  label: string;
  range: string;
  min: number;
  max: number;
}

// Inclusive night ranges with no gaps between them, so every trip of known length lands in exactly one.
export const LENGTHS: LengthOption[] = [
  { key: 'weekend', label: 'A long weekend', range: '1 to 3 nights', min: 1, max: 3 },
  { key: 'week', label: 'About a week', range: '4 to 8 nights', min: 4, max: 8 },
  { key: 'fortnight', label: 'Two weeks', range: '9 to 15 nights', min: 9, max: 15 },
  { key: 'long', label: 'Longer', range: '16 nights or more', min: 16, max: Number.POSITIVE_INFINITY },
];

export interface BrowseFilters {
  kind: Kind;
  q: string;
  /** One destination picked from the list, matched exactly rather than as free text. */
  place: string | null;
  vibe: string | null;
  length: LengthKey | null;
  /** Looking for people, with room left, and not already over. */
  open: boolean;
  verified: boolean;
}

export const EMPTY_FILTERS: BrowseFilters = {
  kind: 'all', q: '', place: null, vibe: null, length: null, open: false, verified: false,
};

const KINDS: Kind[] = ['all', 'join', 'groups', 'plans', 'stories'];

/** Anything unrecognised in the URL falls back to "no filter" rather than an empty result nobody asked for. */
export function filtersFromParams(params: URLSearchParams): BrowseFilters {
  const kind = params.get('kind');
  const vibe = params.get('vibe')?.toLowerCase() ?? null;
  const length = params.get('length');
  return {
    kind: KINDS.includes(kind as Kind) ? (kind as Kind) : 'all',
    q: params.get('q') ?? '',
    place: params.get('place')?.trim() || null,
    vibe: vibe && VIBES[vibe] ? vibe : null,
    length: LENGTHS.some((l) => l.key === length) ? (length as LengthKey) : null,
    open: params.get('open') === '1',
    verified: params.get('verified') === '1',
  };
}

/** Defaults are left out, so a plain Browse link stays a plain URL. */
export function filtersToParams(f: BrowseFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.kind !== 'all') p.set('kind', f.kind);
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.place) p.set('place', f.place);
  if (f.vibe) p.set('vibe', f.vibe);
  if (f.length) p.set('length', f.length);
  if (f.open) p.set('open', '1');
  if (f.verified) p.set('verified', '1');
  return p;
}

/** Length, spots and verified are facts about a plan. A story carries none of them, so any of these narrows to plans. */
export function plansOnly(f: BrowseFilters): boolean {
  return f.length !== null || f.open || f.verified;
}

export function hasActiveFilters(f: BrowseFilters): boolean {
  return f.q.trim().length > 0 || f.place !== null || f.vibe !== null || plansOnly(f);
}

const lower = (s: unknown): string => (typeof s === 'string' ? s.toLowerCase() : '');

/** Compared by country code where both sides resolve, so "Viet Nam" finds "Vietnam"; exact folded text otherwise. */
export function samePlace(countries: string[] | null | undefined, place: string): boolean {
  const wantedCode = countryCodeFromName(place);
  const wanted = foldText(place);
  return normaliseCountries(countries).some((c) => {
    const code = countryCodeFromName(c);
    return wantedCode && code ? code === wantedCode : foldText(c) === wanted;
  });
}

export function matchTrip(trip: any, f: BrowseFilters, now: number = Date.now()): boolean {
  if (f.kind === 'stories' || f.kind === 'groups') return false;
  if (f.vibe && lower(trip?.vibe) !== f.vibe) return false;
  if (f.place && !samePlace(trip?.countries, f.place)) return false;
  if ((f.open || f.kind === 'join') && !isJoinable(trip, now)) return false;
  if (f.verified && verifiedRank(trip) !== 1) return false;

  if (f.length) {
    const bucket = LENGTHS.find((l) => l.key === f.length)!;
    const nights = tripNights(trip);
    // Unknown length is excluded, not guessed: a trip with no dates is not "a long weekend".
    if (nights === null || nights < bucket.min || nights > bucket.max) return false;
  }

  // Never the owner's or members' names: a private profile must not become findable through a trip it is on.
  if (f.q.trim() && !textMatches(f.q, trip?.name, trip?.description, Array.isArray(trip?.countries) ? trip.countries : [])) {
    return false;
  }
  return true;
}

export function matchStory(story: AfterStorySummaryDto, f: BrowseFilters): boolean {
  if (f.kind === 'plans' || f.kind === 'join' || f.kind === 'groups') return false;
  if (plansOnly(f)) return false;
  if (f.vibe && lower(story.vibe) !== f.vibe) return false;
  if (f.place && !samePlace(story.countries, f.place)) return false;

  if (f.q.trim() && !textMatches(f.q, story.title, story.summary, story.destination, story.countries ?? [])) return false;
  return true;
}

/** The known vibe keys at least one plan or story carries, so a vibe tab always has something behind it. */
export function vibesIn(trips: any[], stories: AfterStorySummaryDto[]): Set<string> {
  const found = new Set<string>();
  for (const vibe of [...trips.map((t) => t?.vibe), ...stories.map((s) => s.vibe)]) {
    const key = lower(vibe);
    if (VIBES[key]) found.add(key);
  }
  return found;
}

export type FeedItem =
  | { kind: 'trip'; key: string; data: any }
  | { kind: 'story'; key: string; data: AfterStorySummaryDto };

/** Stories spread through the plans at a derived interval so one lands in the first row whatever the ratio; leftovers go last. */
export function mixFeed(trips: any[], stories: AfterStorySummaryDto[]): FeedItem[] {
  const out: FeedItem[] = [];
  const step = stories.length === 0
    ? Number.POSITIVE_INFINITY
    : Math.max(2, Math.floor(trips.length / (stories.length + 1)));

  let s = 0;
  trips.forEach((t, i) => {
    out.push({ kind: 'trip', key: `trip-${t?.id || t?.Id || i}`, data: t });
    if ((i + 1) % step === 0 && s < stories.length) {
      out.push({ kind: 'story', key: `story-${stories[s].id}`, data: stories[s] });
      s += 1;
    }
  });
  for (; s < stories.length; s += 1) {
    out.push({ kind: 'story', key: `story-${stories[s].id}`, data: stories[s] });
  }
  return out;
}
