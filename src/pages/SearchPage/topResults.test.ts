import { describe, it, expect } from 'vitest';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { OrganizationDirectoryEntry } from '../../organization/types';
import { matchGroups, matchTags, rankPlans, rankStories, topOrder, type TopInput } from './topResults';
import { searchHref, searchStateFromParams, searchStateToParams } from './searchParams';

const empty: TopInput = { q: '', people: [], places: [], plans: [], groups: [], stories: [], tags: [] };
const place = (name: string) => ({ code: name.slice(0, 2).toUpperCase(), name, plans: 1, stories: 0, open: 0 });
const person = (name: string) => ({ userId: 1, name, avatar: null, destinations: [], vibe: null, tripCount: 0 });
const group = (name: string, patch: Partial<OrganizationDirectoryEntry> = {}): OrganizationDirectoryEntry => ({
  id: name, name, slug: name.toLowerCase(), logoUrl: null, coverUrl: null, description: null, verified: false, publishedTripCount: 1, ...patch,
});

describe('topOrder', () => {
  it('leads with places, then people, and drops empty sections', () => {
    expect(topOrder({ ...empty, q: 'ja', places: [place('Japan')], people: [person('Jan')], plans: [{}] }))
      .toEqual(['places', 'people', 'plans']);
  });

  it('puts whatever the query names outright first', () => {
    expect(topOrder({ ...empty, q: 'jan', places: [place('Japan')], people: [person('Jan')] })[0]).toBe('people');
    expect(topOrder({ ...empty, q: 'japan', places: [place('Japan')], people: [person('Japan Fan')] })[0]).toBe('places');
    expect(topOrder({ ...empty, q: 'trekkers', groups: [group('Trekkers')], places: [place('Tr')] })[0]).toBe('groups');
  });
});

describe('ranking', () => {
  it('puts the best title match first and lets the feed order settle ties', () => {
    const plans = [
      { name: 'Slow Japan', verified: false },
      { name: 'Japan in spring', verified: false },
      { name: 'Japan in autumn', verified: true },
    ];
    expect(rankPlans(plans, 'japan').map((p) => p.name)).toEqual(['Japan in autumn', 'Japan in spring', 'Slow Japan']);
  });

  it('prefers an editor pick among equally good story matches', () => {
    const s = (title: string, pick: string | null, at: string) => ({ title, destination: '', editorsPickAt: pick, publishedAt: at } as AfterStorySummaryDto);
    const ranked = rankStories([s('Kyoto rain', null, '2026-05-01'), s('Kyoto snow', '2026-01-01', '2026-01-01')], 'kyoto');
    expect(ranked[0].title).toBe('Kyoto snow');
  });

  it('matches groups on name or description, verified first among equals', () => {
    const groups = [group('Alps Club', { description: 'Hiking in the Alps' }), group('Alpine Guides', { verified: true })];
    expect(matchGroups(groups, 'alp').map((g) => g.name)).toEqual(['Alpine Guides', 'Alps Club']);
    expect(matchGroups(groups, 'hiking').map((g) => g.name)).toEqual(['Alps Club']);
  });

  it('hides tags nobody has used, and finds a place tag by its place', () => {
    const tags = [
      { id: 'visas', label: 'Visas', group: 'topic' as const, count: 4 },
      { id: 'scams', label: 'Scams', group: 'topic' as const, count: 0 },
      { id: 'place:japan', label: 'Japan', group: 'place' as const, count: 2 },
    ];
    expect(matchTags(tags, 'sca')).toEqual([]);
    expect(matchTags(tags, 'japan').map((t) => t.id)).toEqual(['place:japan']);
  });
});

describe('searchParams', () => {
  it('falls back to Top for a tab it does not know, and round-trips', () => {
    expect(searchStateFromParams(new URLSearchParams('tab=nope')).tab).toBe('top');
    const state = { q: 'kyoto', tab: 'stories' as const, place: null };
    expect(searchStateFromParams(searchStateToParams(state))).toEqual(state);
  });

  it('keeps a plain search link plain', () => {
    expect(searchHref({})).toBe('/search');
    expect(searchHref({ place: 'Japan' })).toBe('/search?place=Japan');
  });
});
