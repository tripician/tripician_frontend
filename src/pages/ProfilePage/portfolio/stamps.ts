import { countryCodeFromName, countryNameFromCode } from '../../../utils/countryFlags';
import type { TravelCountry, TravelTier } from '../travelHistory';

/**
 * A profile's flags, verified countries only, by the app's rules
 * (`features/profile/TravelStamps.tsx`):
 *
 *  - home: the account's own country (Settings), always first.
 *  - trip: a trip country somebody other than the traveller can attest to (a
 *    co-traveller was on it, a story was published, or Tripician reviewed it:
 *    the travel map's `gold` tier).
 *  - photo: a past visit the Tripician team approved from two photos of the
 *    traveller there (the app's Add past, 2026-11-13).
 *  - location: a country the person's phone placed them in, added in the app.
 *    The web never adds these: a browser location is three clicks to fake.
 *
 * A country the traveller took off their stamps in the app (the travel map's
 * hiddenCountries) shows no flag of any kind but Home.
 *
 * Planned and travelled-but-unconfirmed countries are not stamps: anyone can
 * type those into a plan. One flag per country, the strongest claim winning.
 */

export type FlagKind = 'home' | 'trip' | 'photo' | 'location';

export interface ProfileFlag {
  /** ISO alpha-2, when the country is one the table knows. */
  code: string | null;
  name: string;
  kind: FlagKind;
  firstAt: string | null;
}

/** A country the app synced from the phone's location. */
export interface LocationCountry {
  code: string;
  firstAt: string | null;
}

const RANK: Record<TravelTier, number> = { gold: 3, unlocked: 2, locked: 1 };

/** One entry per country, keeping its best tier and earliest date. */
function mergeCountries(countries: readonly TravelCountry[]): TravelCountry[] {
  const byName = new Map<string, TravelCountry>();
  for (const raw of countries) {
    const name = raw.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...raw, name });
      continue;
    }
    if (RANK[raw.tier] > RANK[existing.tier]) existing.tier = raw.tier;
    if (raw.firstAt && (!existing.firstAt || raw.firstAt < existing.firstAt)) existing.firstAt = raw.firstAt;
  }
  return [...byName.values()];
}

/** An account country may be stored as a code or a name; this returns the code either way. */
export function homeCodeOf(country: string | null | undefined): string | null {
  const value = country?.trim();
  if (!value) return null;
  if (/^[A-Za-z]{2}$/.test(value) && countryNameFromCode(value.toUpperCase())) return value.toUpperCase();
  return countryCodeFromName(value)?.toUpperCase() ?? null;
}

/** The flags to show: home first, the rest in the order they were reached. */
export function profileFlags({
  homeCountry,
  countries,
  locationCountries = [],
  photoCountries = [],
  hiddenCodes = [],
}: {
  homeCountry?: string | null;
  countries: readonly TravelCountry[];
  locationCountries?: readonly LocationCountry[];
  photoCountries?: readonly LocationCountry[];
  hiddenCodes?: readonly string[];
}): ProfileFlag[] {
  const seen = new Set<string>();
  const hidden = new Set(hiddenCodes.map((code) => code.trim().toUpperCase()));
  const keyOf = (code: string | null, name: string) => code ?? `name:${name.toLowerCase()}`;

  const homeCode = homeCodeOf(homeCountry);
  const homeName = homeCode ? countryNameFromCode(homeCode) : undefined;
  const home: ProfileFlag | null = homeCode && homeName ? { code: homeCode, name: homeName, kind: 'home', firstAt: null } : null;
  if (home) seen.add(keyOf(home.code, home.name));

  const flags: ProfileFlag[] = [];
  for (const country of mergeCountries(countries)) {
    if (country.tier !== 'gold') continue;
    const code = countryCodeFromName(country.name)?.toUpperCase() ?? null;
    const key = keyOf(code, country.name);
    if (seen.has(key) || (code && hidden.has(code))) continue;
    seen.add(key);
    flags.push({ code, name: code ? (countryNameFromCode(code) ?? country.name) : country.name, kind: 'trip', firstAt: country.firstAt });
  }

  const addCoded = (list: readonly LocationCountry[], kind: FlagKind) => {
    for (const item of list) {
      const code = item.code?.trim().toUpperCase();
      const name = code ? countryNameFromCode(code) : undefined;
      if (!code || !name || seen.has(code) || hidden.has(code)) continue;
      seen.add(code);
      flags.push({ code, name, kind, firstAt: item.firstAt });
    }
  };
  addCoded(photoCountries, 'photo');
  addCoded(locationCountries, 'location');

  flags.sort((a, b) => (a.firstAt ?? '').localeCompare(b.firstAt ?? '') || a.name.localeCompare(b.name));
  return home ? [home, ...flags] : flags;
}
