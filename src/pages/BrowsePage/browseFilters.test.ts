import { describe, it, expect } from 'vitest';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import {
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  matchStory,
  matchTrip,
  plansOnly,
  samePlace,
  vibesIn,
  type BrowseFilters,
} from './browseFilters';

const f = (patch: Partial<BrowseFilters>): BrowseFilters => ({ ...EMPTY_FILTERS, ...patch });

// Before the fixture trips end, so "can still be joined" is decided by seats alone unless a test says otherwise.
const NOW = Date.parse('2026-02-01T12:00:00Z');

// A trip spanning `nights` nights, from a fixed start so the arithmetic is obvious.
const trip = (patch: Record<string, unknown> = {}, nights = 5) => ({
  name: 'Trains through Vietnam',
  description: 'North to south',
  countries: ['Vietnam'],
  vibe: 'adventure',
  startDate: '2026-03-01',
  endDate: `2026-03-${String(1 + nights).padStart(2, '0')}`,
  ...patch,
});

const story = (patch: Partial<AfterStorySummaryDto> = {}): AfterStorySummaryDto => ({
  id: 's1',
  title: 'Kyoto in the rain',
  summary: 'Temples',
  destination: 'Kyoto',
  countries: ['Japan'],
  vibe: 'culture',
  coverKind: 'None',
  template: 'journal',
  status: 'Published',
  updatedAt: '2026-01-01',
  readCount: 0,
  photoCount: 0,
  likeCount: 0,
  questionCount: 0,
  ...patch,
} as AfterStorySummaryDto);

describe('filtersFromParams', () => {
  it('gives plain defaults for an empty URL', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it('falls back to no filter for values it does not recognise', () => {
    const parsed = filtersFromParams(new URLSearchParams('kind=boats&vibe=nope&length=forever&open=yes'));
    expect(parsed).toEqual(EMPTY_FILTERS);
  });

  it('round-trips through the URL', () => {
    const original = f({ kind: 'join', q: 'hanoi', place: 'Vietnam', vibe: 'culture', length: 'week', open: true, verified: true });
    expect(filtersFromParams(filtersToParams(original))).toEqual(original);
  });

  it('leaves defaults out of the URL', () => {
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe('');
  });

  it('treats the retired travellers mode as All, since the page redirects it before parsing', () => {
    expect(filtersFromParams(new URLSearchParams('kind=travellers')).kind).toBe('all');
    expect(filtersFromParams(new URLSearchParams('kind=groups')).kind).toBe('groups');
  });
});

describe('matchTrip', () => {
  it('buckets length at the boundaries, inclusively', () => {
    expect(matchTrip(trip({}, 3), f({ length: 'weekend' }))).toBe(true);
    expect(matchTrip(trip({}, 4), f({ length: 'weekend' }))).toBe(false);
    expect(matchTrip(trip({}, 4), f({ length: 'week' }))).toBe(true);
    expect(matchTrip(trip({}, 16), f({ length: 'long' }))).toBe(true);
  });

  it('excludes a trip of unknown length when a length is chosen, rather than guessing', () => {
    expect(matchTrip(trip({ startDate: null, endDate: null }), f({ length: 'weekend' }))).toBe(false);
  });

  it('treats a full trip as not looking for people, and reads either casing', () => {
    expect(matchTrip(trip({ joinPolicy: 'OpenToRequests', spotsLeft: 2 }), f({ open: true }), NOW)).toBe(true);
    expect(matchTrip(trip({ JoinPolicy: 'OpenToRequests', spotsLeft: null }), f({ open: true }), NOW)).toBe(true);
    expect(matchTrip(trip({ joinPolicy: 'OpenToRequests', spotsLeft: 0 }), f({ open: true }), NOW)).toBe(false);
    expect(matchTrip(trip({ joinPolicy: 'Closed' }), f({ open: true }), NOW)).toBe(false);
  });

  it('keeps only trips that can still be joined on the Join tab', () => {
    const open = trip({ joinPolicy: 'OpenToRequests', spotsLeft: 3 });
    expect(matchTrip(open, f({ kind: 'join' }), NOW)).toBe(true);
    expect(matchTrip(trip(), f({ kind: 'join' }), NOW)).toBe(false);
    // Over by the end date, or marked completed, however many seats it still lists.
    expect(matchTrip(open, f({ kind: 'join' }), Date.parse('2026-04-01'))).toBe(false);
    expect(matchTrip({ ...open, tripStatus: 2 }, f({ kind: 'join' }), NOW)).toBe(false);
    // Still joinable on its last day.
    expect(matchTrip(open, f({ kind: 'join' }), Date.parse('2026-03-06T20:00:00Z'))).toBe(true);
  });

  it('only counts strictly true as verified', () => {
    expect(matchTrip(trip({ Verified: true }), f({ verified: true }))).toBe(true);
    expect(matchTrip(trip({ verified: 'true' }), f({ verified: true }))).toBe(false);
  });

  it('matches a picked place exactly and case-insensitively, not as a substring', () => {
    expect(matchTrip(trip({ countries: ['vietnam'] }), f({ place: 'Vietnam' }))).toBe(true);
    expect(matchTrip(trip({ countries: ['India'] }), f({ place: 'Indi' }))).toBe(false);
  });

  it('matches a place by country, whatever spelling either side used', () => {
    expect(samePlace(['Viet Nam'], 'Vietnam')).toBe(true);
    expect(samePlace(['USA'], 'United States')).toBe(true);
    expect(samePlace(['Côte d’Ivoire'], "Cote d'Ivoire")).toBe(true);
    expect(samePlace(['Niger'], 'Nigeria')).toBe(false);
  });

  it('searches name, description and countries', () => {
    expect(matchTrip(trip(), f({ q: 'trains' }))).toBe(true);
    expect(matchTrip(trip(), f({ q: 'south' }))).toBe(true);
    expect(matchTrip(trip(), f({ q: 'viet' }))).toBe(true);
    expect(matchTrip(trip(), f({ q: 'peru' }))).toBe(false);
  });

  it('folds accents in the search box', () => {
    expect(matchTrip(trip({ name: 'Crêpes in Brittany' }), f({ q: 'crepes' }))).toBe(true);
  });

  it('never matches a plan by the people on it', () => {
    const withPeople = trip({ owner: { name: 'Priya Rao' }, members: [{ name: 'Sam Holt' }] });
    expect(matchTrip(withPeople, f({ q: 'priya' }))).toBe(false);
    expect(matchTrip(withPeople, f({ q: 'holt' }))).toBe(false);
  });

  it('shows no plans in the stories and groups modes', () => {
    expect(matchTrip(trip(), f({ kind: 'stories' }))).toBe(false);
    expect(matchTrip(trip(), f({ kind: 'groups' }))).toBe(false);
  });
});

describe('matchStory', () => {
  it('drops every story once a plan-only filter is on', () => {
    expect(plansOnly(f({ length: 'week' }))).toBe(true);
    expect(matchStory(story(), f({ length: 'week' }))).toBe(false);
    expect(matchStory(story(), f({ open: true }))).toBe(false);
    expect(matchStory(story(), f({ verified: true }))).toBe(false);
  });

  it('filters by vibe, place and text', () => {
    expect(matchStory(story(), f({ vibe: 'culture' }))).toBe(true);
    expect(matchStory(story(), f({ vibe: 'party' }))).toBe(false);
    expect(matchStory(story(), f({ place: 'Japan' }))).toBe(true);
    expect(matchStory(story(), f({ q: 'kyoto' }))).toBe(true);
  });

  it('shows no stories in the plans, join and groups modes', () => {
    expect(matchStory(story(), f({ kind: 'plans' }))).toBe(false);
    expect(matchStory(story(), f({ kind: 'join' }))).toBe(false);
    expect(matchStory(story(), f({ kind: 'groups' }))).toBe(false);
  });
});

describe('hasActiveFilters', () => {
  it('ignores the kind switch, which is a mode rather than a filter', () => {
    expect(hasActiveFilters(f({ kind: 'plans' }))).toBe(false);
    expect(hasActiveFilters(f({ kind: 'join' }))).toBe(false);
    expect(hasActiveFilters(f({ q: '  ' }))).toBe(false);
    expect(hasActiveFilters(f({ vibe: 'culture' }))).toBe(true);
  });
});

describe('vibesIn', () => {
  it('collects the vibes plans and stories carry, case-insensitively', () => {
    const result = vibesIn([{ vibe: 'Culture' }, { vibe: 'scenic' }], [story({ vibe: 'LUXURY' })]);
    expect([...result].sort()).toEqual(['culture', 'luxury', 'scenic']);
  });

  it('ignores missing and unknown vibes, so no tab can lead nowhere', () => {
    expect([...vibesIn([{ vibe: null }, {}, { vibe: 'beach' }, { vibe: 42 }], [story({ vibe: '' })])]).toEqual([]);
  });
});
