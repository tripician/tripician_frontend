/**
 * The derived facts on a trip card: where it goes, and how long for.
 *
 * Shared so the same trip reads identically on Community and on Profile. The two
 * surfaces get their length from different fields - a published trip carries
 * `totalNights`, your own carries an end date - so both funnel through here and
 * the card itself does the phrasing. The place list had drifted further still:
 * one surface printed the country raw and the other lower-cased everything after
 * the first letter, so the same trip was in "New Zealand" on one page and
 * "New zealand" on the other.
 */

import dayjs from 'dayjs';

/**
 * Country values are user-entered and arrive in every casing. Title-case each
 * word rather than just the first, or two-word countries come out wrong.
 */
function titleCase(country: string): string {
  return country
    .split(/(\s+|-)/)
    .map((part) => (/^[\s-]+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join('');
}

/**
 * Rejects values that cannot be a country name. The field is free text on some
 * import paths, and a card is not the place to discover that.
 */
function looksLikeCountry(c: string): boolean {
  if (!c || c.length > 30) return false;
  if (/[0-9]/.test(c)) return false;
  // A long unbroken token is an id or a slug, not a place someone typed.
  if (c.length > 15 && !/\s/.test(c)) return false;
  return true;
}

/**
 * The trip's countries, de-duplicated, title-cased and stripped of junk.
 *
 * The one gate every surface passes country data through, so a flag row and a
 * text label can never disagree about how many places a trip visits.
 */
export function normaliseCountries(countries: string[] | null | undefined): string[] {
  if (!Array.isArray(countries)) return [];
  return countries
    .filter((c, i, arr) => c && arr.indexOf(c) === i && looksLikeCountry(c))
    .map(titleCase);
}


/** Anything shaped like a trip from any of the list or detail endpoints. */
export interface TripLengthSource {
  totalNights?: unknown;
  targetNights?: unknown;
  startDate?: unknown;
  start_date?: unknown;
  StartDate?: unknown;
  endDate?: unknown;
  end_date?: unknown;
  EndDate?: unknown;
}

/**
 * How many nights a trip runs, from whichever field the payload happens to carry.
 *
 * The precedence matters and must not be duplicated. `TotalNights` lives on the
 * full-plan DTO, not on the `TripResponseDto` every card list returns, so on the
 * list endpoints this always falls through to the date range - but a card that
 * hard-coded only one of those two routes would quietly show a different length
 * from the identical trip on another page the day that changes.
 */
export function tripNights(trip: TripLengthSource | null | undefined): number | null {
  if (!trip) return null;
  if (typeof trip.totalNights === 'number' && trip.totalNights > 0) return trip.totalNights;
  if (typeof trip.targetNights === 'number' && trip.targetNights > 0) return trip.targetNights;

  const start = trip.startDate ?? trip.start_date ?? trip.StartDate ?? null;
  const end = trip.endDate ?? trip.end_date ?? trip.EndDate ?? null;
  return nightsBetween(start, end);
}

/** Nights between two dates. Null when either is missing, unparseable, or backwards. */
export function nightsBetween(start: unknown, end: unknown): number | null {
  if (!start || !end) return null;
  const a = dayjs(start as string);
  const b = dayjs(end as string);
  if (!a.isValid() || !b.isValid()) return null;
  const nights = b.startOf('day').diff(a.startOf('day'), 'day');
  return nights > 0 ? nights : null;
}
