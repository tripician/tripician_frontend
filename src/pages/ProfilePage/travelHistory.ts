import { countryCodeFromName, countryNameFromCode, normaliseCountryText } from '../../utils/countryFlags';
import { continentOfCode, type Continent } from '../../utils/continentData';

/**
 * The travel map as the panel needs it: real countries, merged, in the order a
 * life happened.
 *
 * Trip countries are free text, so what comes back holds Google place ids, cities
 * and two spellings of one country. Everything here is read-time: nothing is
 * written back, and what cannot be read as a country is counted and left out
 * rather than guessed at.
 */

export type TravelTier = 'locked' | 'unlocked' | 'gold';

export interface TravelTrip {
  id: string;
  name: string;
  startDate: string | null;
  published: boolean;
}

/** One country as the server sends it. */
export interface TravelCountry {
  name: string;
  tier: TravelTier;
  firstAt: string | null;
  published?: boolean;
  trips?: TravelTrip[];
}

export interface TravelMap {
  countries: TravelCountry[];
  legs: string[][];
}

export interface TravelNode {
  code: string;
  name: string;
  tier: TravelTier;
  firstAt: string | null;
  year: number | null;
  continent: Continent | null;
  published: boolean;
  trips: TravelTrip[];
}

export interface TravelYearRow {
  year: number | null;
  label: string;
  nodes: TravelNode[];
}

export interface TravelHistoryView {
  nodes: TravelNode[];
  rows: TravelYearRow[];
  legs: Array<[string, string]>;
  countries: number;
  travelled: number;
  confirmed: number;
  planned: number;
  unpublished: number;
  continents: number;
  firstYear: number | null;
  /** Stored values that could not be read as a country. Shown to the owner, never to a stranger. */
  dropped: number;
}

const RANK: Record<TravelTier, number> = { gold: 3, unlocked: 2, locked: 1 };

// 'NA' resolves to Namibia and 'NO' to Norway, so the placeholders this system stores are refused before the table is asked.
const SENTINELS = new Set(['na', 'n a', 'no', 'none', 'null', 'undefined', 'unknown', 'not available', 'tbd']);

const codeOf = (name: string): string | undefined => {
  const cleaned = normaliseCountryText(name);
  if (!cleaned || SENTINELS.has(cleaned)) return undefined;
  return countryCodeFromName(name);
};

// The year is read off the date string, not off a local clock: getFullYear turns the first of January into the year before, west of Greenwich.
const yearOf = (iso: string | null): number | null => {
  if (!iso) return null;
  const written = /^(\d{4})-/.exec(iso);
  if (written) return Number(written[1]);
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : new Date(parsed).getUTCFullYear();
};

const time = (iso: string | null): number => {
  if (!iso) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const EMPTY: TravelHistoryView = {
  nodes: [], rows: [], legs: [],
  countries: 0, travelled: 0, confirmed: 0, planned: 0, unpublished: 0,
  continents: 0, firstYear: null, dropped: 0,
};

export function travelHistoryView(map: TravelMap | null | undefined): TravelHistoryView {
  const countries = map?.countries ?? [];
  if (countries.length === 0) return { ...EMPTY };

  const byCode = new Map<string, TravelNode>();
  let dropped = 0;

  for (const country of countries) {
    const code = codeOf(country.name ?? '');
    if (!code) { dropped += 1; continue; }

    const existing = byCode.get(code);
    const trips = country.trips ?? [];
    if (!existing) {
      byCode.set(code, {
        code,
        // Always relabelled from the code, so "Viet Nam" and "VN" read as Vietnam.
        name: countryNameFromCode(code) ?? country.name,
        tier: country.tier,
        firstAt: country.firstAt ?? null,
        year: yearOf(country.firstAt ?? null),
        continent: continentOfCode(code) ?? null,
        published: country.published !== false,
        trips: [...trips],
      });
      continue;
    }

    if (RANK[country.tier] > RANK[existing.tier]) existing.tier = country.tier;
    if (country.published !== false) existing.published = true;
    if (time(country.firstAt ?? null) < time(existing.firstAt)) {
      existing.firstAt = country.firstAt ?? null;
      existing.year = yearOf(country.firstAt ?? null);
    }
    for (const trip of trips) {
      if (!existing.trips.some((t) => t.id === trip.id)) existing.trips.push(trip);
    }
  }

  for (const node of byCode.values()) {
    node.trips.sort((a, b) => time(a.startDate) - time(b.startDate) || a.name.localeCompare(b.name));
  }

  /*
   * Where the legs earn their keep: every country on one trip shares that trip's
   * start date, so dates alone cannot order them. The leg path is the only record
   * of which came first.
   */
  const pathOrder = new Map<string, number>();
  for (const leg of map?.legs ?? []) {
    for (const end of leg) {
      const code = codeOf(end ?? '');
      if (code && !pathOrder.has(code)) pathOrder.set(code, pathOrder.size);
    }
  }

  const nodes = [...byCode.values()].sort((a, b) => {
    const dated = time(a.firstAt) - time(b.firstAt);
    if (dated !== 0 && Number.isFinite(dated)) return dated;
    if (time(a.firstAt) !== time(b.firstAt)) return time(a.firstAt) - time(b.firstAt);
    const order = (pathOrder.get(a.code) ?? Number.POSITIVE_INFINITY) - (pathOrder.get(b.code) ?? Number.POSITIVE_INFINITY);
    if (order !== 0 && Number.isFinite(order)) return order;
    return a.name.localeCompare(b.name);
  });

  const rows: TravelYearRow[] = [];
  for (const node of nodes) {
    const last = rows[rows.length - 1];
    if (last && last.year === node.year) last.nodes.push(node);
    else rows.push({ year: node.year, label: node.year === null ? 'Year not recorded' : String(node.year), nodes: [node] });
  }

  // Legs onto the merged nodes: an end that is not on the map, and the self legs the merge creates, are not journeys.
  const legs: Array<[string, string]> = [];
  for (const leg of map?.legs ?? []) {
    const from = codeOf(leg?.[0] ?? '');
    const to = codeOf(leg?.[1] ?? '');
    if (!from || !to || from === to) continue;
    if (!byCode.has(from) || !byCode.has(to)) continue;
    const previous = legs[legs.length - 1];
    if (previous && previous[0] === from && previous[1] === to) continue;
    legs.push([from, to]);
  }

  const travelledNodes = nodes.filter((n) => n.tier !== 'locked');
  const years = travelledNodes.map((n) => n.year).filter((y): y is number => y !== null);

  return {
    nodes,
    rows,
    legs,
    countries: nodes.length,
    travelled: travelledNodes.length,
    confirmed: nodes.filter((n) => n.tier === 'gold').length,
    planned: nodes.filter((n) => n.tier === 'locked').length,
    unpublished: nodes.filter((n) => !n.published).length,
    // Counted over travelled countries only: a continent nobody has set foot on is not a continent they have been to.
    continents: new Set(travelledNodes.map((n) => n.continent).filter(Boolean)).size,
    firstYear: years.length > 0 ? Math.min(...years) : null,
    dropped,
  };
}
