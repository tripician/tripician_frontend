import { describe, it, expect } from 'vitest';
import { travelHistoryView, type TravelCountry, type TravelMap } from './travelHistory';

/*
 * Trip countries are free text. This is the one place that decides what counts as
 * a country, so every rule that keeps the panel honest is pinned here.
 */

const country = (over: Partial<TravelCountry> & { name: string }): TravelCountry => ({
  tier: 'unlocked',
  firstAt: null,
  published: true,
  trips: [],
  ...over,
});

const map = (countries: TravelCountry[], legs: string[][] = []): TravelMap => ({ countries, legs });

describe('travelHistoryView', () => {
  it('merges every spelling that resolves to one country', () => {
    const view = travelHistoryView(map([
      country({ name: 'Vietnam' }), country({ name: 'Viet Nam' }), country({ name: 'VN' }),
    ]));
    expect(view.nodes).toHaveLength(1);
    expect(view.nodes[0].code).toBe('VN');
    expect(view.countries).toBe(1);
  });

  it('relabels from the code, never from the stored string', () => {
    const view = travelHistoryView(map([
      country({ name: 'viet nam' }), country({ name: 'USA' }), country({ name: 'UK' }),
    ]));
    expect(view.nodes.map((n) => n.name).sort()).toEqual(['United Kingdom', 'United States', 'Vietnam']);
  });

  it('keeps the highest tier and the earliest date a merge saw, whichever order they arrive in', () => {
    const later = country({ name: 'Viet Nam', tier: 'gold', firstAt: '2024-03-01T00:00:00Z' });
    const earlier = country({ name: 'Vietnam', tier: 'locked', firstAt: '2019-05-02T00:00:00Z' });
    for (const order of [[later, earlier], [earlier, later]]) {
      const view = travelHistoryView(map(order));
      expect(view.nodes[0].tier).toBe('gold');
      expect(view.nodes[0].year).toBe(2019);
    }
  });

  it('drops stored values that are not countries, and counts them', () => {
    const view = travelHistoryView(map([
      country({ name: 'ChIJTN9T-p4bLz4RcpMSw0Vxvg4' }),
      country({ name: 'Trip 2026' }),
      country({ name: 'Narnia' }),
      country({ name: '' }),
      country({ name: '   ' }),
      country({ name: 'Japan' }),
    ]));
    expect(view.nodes.map((n) => n.name)).toEqual(['Japan']);
    expect(view.dropped).toBe(5);
  });

  // The five ISO names over thirty characters: a length based filter silently deletes these.
  it('keeps the country names that are longer than thirty characters', () => {
    const long = [
      'Democratic Republic of the Congo',
      'Saint Vincent and the Grenadines',
      'Heard Island and McDonald Islands',
      'United States Minor Outlying Islands',
      'South Georgia and the South Sandwich Islands',
    ];
    const view = travelHistoryView(map(long.map((name) => country({ name }))));
    expect(view.nodes).toHaveLength(long.length);
    expect(view.dropped).toBe(0);
  });

  it('refuses the placeholders that would otherwise resolve to a real country', () => {
    const view = travelHistoryView(map([
      country({ name: 'NA' }), country({ name: 'No' }), country({ name: 'Unknown' }),
      country({ name: 'null' }), country({ name: 'Not available' }),
    ]));
    expect(view.nodes).toEqual([]);
    expect(view.dropped).toBe(5);
  });

  it('groups rows by year, earliest first, undated last', () => {
    const view = travelHistoryView(map([
      country({ name: 'Japan', firstAt: '2022-04-01T00:00:00Z' }),
      country({ name: 'Peru', firstAt: '2019-08-01T00:00:00Z' }),
      country({ name: 'Laos', firstAt: '2022-11-01T00:00:00Z' }),
      country({ name: 'Chile', firstAt: null }),
    ]));
    expect(view.rows.map((r) => r.label)).toEqual(['2019', '2022', 'Year not recorded']);
    expect(view.rows[1].nodes.map((n) => n.name)).toEqual(['Japan', 'Laos']);
  });

  it('orders a year row by the sequence actually travelled, not alphabetically', () => {
    const same = '2024-02-01T00:00:00Z';
    const view = travelHistoryView(map(
      [country({ name: 'Cambodia', firstAt: same }), country({ name: 'Laos', firstAt: same })],
      [['Laos', 'Cambodia']],
    ));
    expect(view.rows[0].nodes.map((n) => n.name)).toEqual(['Laos', 'Cambodia']);
  });

  it('remaps legs onto the merged nodes and drops the self legs the merge creates', () => {
    const view = travelHistoryView(map(
      [country({ name: 'Vietnam' }), country({ name: 'Viet Nam' }), country({ name: 'Laos' })],
      [['Vietnam', 'Viet Nam'], ['Viet Nam', 'Laos']],
    ));
    expect(view.legs).toEqual([['VN', 'LA']]);
  });

  it('drops a leg with an end that is not on the map', () => {
    const view = travelHistoryView(map(
      [country({ name: 'Vietnam' })],
      [['Vietnam', 'ChIJTN9T-p4bLz4RcpMSw0Vxvg4'], ['Vietnam', 'Laos']],
    ));
    expect(view.legs).toEqual([]);
  });

  it('counts continents and the first year over travelled countries only', () => {
    const view = travelHistoryView(map([
      country({ name: 'Japan', tier: 'unlocked', firstAt: '2019-01-05T00:00:00Z' }),
      country({ name: 'France', tier: 'gold', firstAt: '2021-01-05T00:00:00Z' }),
      country({ name: 'Peru', tier: 'locked', firstAt: '2030-01-05T00:00:00Z' }),
    ]));
    expect(view.travelled).toBe(2);
    expect(view.planned).toBe(1);
    expect(view.continents).toBe(2);
    expect(view.firstYear).toBe(2019);
  });

  it('has no first year and no continents when nothing has been travelled', () => {
    const view = travelHistoryView(map([
      country({ name: 'Japan', tier: 'locked', firstAt: '2030-01-05T00:00:00Z' }),
    ]));
    expect(view.travelled).toBe(0);
    expect(view.continents).toBe(0);
    expect(view.firstYear).toBeNull();
    expect(view.countries).toBe(1);
  });

  it('counts confirmed and unpublished separately', () => {
    const view = travelHistoryView(map([
      country({ name: 'Japan', tier: 'gold' }),
      country({ name: 'France', tier: 'unlocked' }),
      country({ name: 'Peru', tier: 'locked', published: true }),
      country({ name: 'Chile', tier: 'locked', published: false }),
    ]));
    expect(view.confirmed).toBe(1);
    expect(view.travelled).toBe(2);
    expect(view.planned).toBe(2);
    expect(view.unpublished).toBe(1);
  });

  it('merges the trips behind a country, keeps them in date order and never twice', () => {
    const t1 = { id: 'T1', name: 'Hanoi street food', startDate: '2019-05-02T00:00:00Z', published: true };
    const t2 = { id: 'T2', name: 'Back to Vietnam', startDate: '2024-03-01T00:00:00Z', published: true };
    const view = travelHistoryView(map([
      country({ name: 'Vietnam', firstAt: t1.startDate, trips: [t1] }),
      country({ name: 'Viet Nam', firstAt: t2.startDate, trips: [t2, t1] }),
    ]));
    expect(view.nodes[0].trips.map((t) => t.id)).toEqual(['T1', 'T2']);
  });

  // getFullYear on a UTC midnight reports the year before, west of Greenwich.
  it('reads the year off the date rather than off the local clock', () => {
    const view = travelHistoryView(map([country({ name: 'Japan', firstAt: '2020-01-01T00:00:00Z' })]));
    expect(view.nodes[0].year).toBe(2020);
  });

  it('is empty rather than broken for a missing map', () => {
    for (const input of [null, undefined, { countries: [], legs: [] }]) {
      const view = travelHistoryView(input as TravelMap | null);
      expect(view.countries).toBe(0);
      expect(view.nodes).toEqual([]);
      expect(view.rows).toEqual([]);
      expect(view.legs).toEqual([]);
      expect(view.dropped).toBe(0);
    }
  });
});
