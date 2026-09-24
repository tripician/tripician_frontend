import { describe, it, expect } from 'vitest';
import { buildPlaceIndex, exactPlace, matchPlaces } from './placeIndex';

const open = (t: any) => t.open === true;

const trips = [
  { countries: ['Japan', 'japan'], open: true },
  { countries: ['Viet Nam'] },
  { countries: ['Thailand, Vietnam'], open: true },
  { countries: ['USA'] },
  { countries: ['Atlantis'] },
];
const stories = [{ countries: ['Japan'] }, { countries: ['United States'] }, { countries: null }];

describe('buildPlaceIndex', () => {
  const index = buildPlaceIndex(trips, stories, open);

  it('counts each plan or story once per country, whatever the spelling', () => {
    expect(index.get('JP')).toMatchObject({ name: 'Japan', plans: 1, stories: 1, open: 1 });
    expect(index.get('VN')).toMatchObject({ plans: 2, open: 1 });
    expect(index.get('TH')).toMatchObject({ plans: 1, open: 1 });
    expect(index.get('US')).toMatchObject({ plans: 1, stories: 1 });
  });

  it('ignores names that are not countries', () => {
    expect([...index.values()].some((p) => p.name === 'Atlantis')).toBe(false);
  });
});

describe('matchPlaces', () => {
  const index = buildPlaceIndex(trips, stories, open);

  it('finds a place by the start of its name or of one of its words', () => {
    expect(matchPlaces(index, 'jap').map((p) => p.code)).toEqual(['JP']);
    expect(matchPlaces(index, 'states').map((p) => p.code)).toEqual(['US']);
  });

  it('finds a place by an alias', () => {
    expect(matchPlaces(index, 'usa').map((p) => p.code)).toEqual(['US']);
    expect(matchPlaces(index, 'viet nam').map((p) => p.code)).toEqual(['VN']);
  });

  it('only returns places that have something published', () => {
    expect(matchPlaces(index, 'peru')).toEqual([]);
  });

  it('does not match the middle of a word', () => {
    expect(matchPlaces(index, 'apan')).toEqual([]);
  });

  it('names an exact place, and nothing for a partial one', () => {
    expect(exactPlace(index, 'Japan')?.code).toBe('JP');
    expect(exactPlace(index, 'Jap')).toBeNull();
  });
});
