/**
 * Deterministic plan checks.
 *
 * Every function here is pure and does no network or model calls, so a finding is
 * either true of the plan or it is not produced at all. This replaces asking the
 * model to review its own output - a model that cannot tell a venue has closed
 * cannot detect that on review either, it just phrases the guess confidently.
 *
 * The checks encode what experienced travellers object to:
 *   - "You do need to get between destinations" - transit is not free
 *   - "I wouldn't visit Lumpini park in a three day trip" - short trips can't
 *     absorb the full must-see list
 *   - a place that is shut for the entire window you are in the city
 *   - days that are physically impossible once travel time is counted
 */

import type { PlannerSpot } from '../../store/plannerSlice';
import { peekPlaceDetails, type PlaceOpeningHours } from '../../services/placeVerification';

export type FindingSeverity = 'high' | 'medium' | 'low';
// 'variety' was declared here and labelled in the dialog but never emitted by any
// check - a category that could only ever render as dead code. Removed rather than
// left as a promise the engine does not keep.
export type FindingCategory = 'pacing' | 'routing' | 'logistics' | 'gaps';

export interface Finding {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  detail: string;
  suggestion: string;
  /** Stop this finding is about, when it is stop-specific. */
  stopName?: string;
}

export interface FeasibilityStop {
  id: string;
  name: string;
  nights: number;
  lat?: number;
  lng?: number;
  spots: PlannerSpot[];
  startDate?: string;
  stays?: unknown[];
}

export interface FeasibilityInput {
  stops: FeasibilityStop[];
  tripStartDate?: string | null;
  tripEndDate?: string | null;
}

export interface FeasibilityReport {
  findings: Finding[];
  strengths: string[];
  /** 0-100. Starts at 100 and is reduced by what the checks actually found. */
  score: number;
  verdict: string;
  /** Total estimated hours lost to travel between stops. */
  transitHours: number;
  /**
   * How many findings are `high` severity - the ones that would actually bite on
   * the ground. Exported (rather than left as a local, as it was) so the planner
   * toolbar can say "2 to fix" without re-deriving it or opening the dialog.
   */
  highCount: number;
}

/* ------------------------------------------------------------------ */
/* Geometry + transit                                                  */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat?: number; lng?: number },
  b: { lat?: number; lng?: number },
): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface TransitEstimate {
  km: number;
  hours: number;
  mode: 'local' | 'road' | 'rail' | 'air';
}

/**
 * Door-to-door travel time between two stops.
 *
 * Great-circle distance with a mode heuristic, deliberately not a routing API:
 * it is free, offline, and good enough to catch the failure that matters - a leg
 * that quietly eats a day. Real roads are longer than straight lines, so a
 * detour factor is applied. Air includes airport overhead, which is the part
 * naive estimates always miss.
 */
export function transitEstimate(
  a: { lat?: number; lng?: number },
  b: { lat?: number; lng?: number },
): TransitEstimate | null {
  const straight = haversineKm(a, b);
  if (straight == null) return null;

  if (straight < 25) {
    return { km: straight, hours: Math.max(0.25, straight / 25), mode: 'local' };
  }
  if (straight < 300) {
    const km = straight * 1.3; // roads are not straight lines
    return { km, hours: km / 60 + 0.5, mode: 'road' };
  }
  if (straight < 700) {
    const km = straight * 1.2;
    return { km, hours: km / 90 + 1, mode: 'rail' };
  }
  // Flying: ~800km/h in the air, plus roughly 4h of transfers, security and waiting.
  return { km: straight, hours: straight / 800 + 4, mode: 'air' };
}

/* ------------------------------------------------------------------ */
/* Dwell time                                                          */
/* ------------------------------------------------------------------ */

/** Hours a visit realistically takes, by Places type. Ordered most to least specific. */
const DWELL_BY_TYPE: Array<[string, number]> = [
  ['amusement_park', 5],
  ['zoo', 3.5],
  ['aquarium', 2.5],
  ['museum', 2.5],
  ['art_gallery', 2],
  ['national_park', 4],
  ['hindu_temple', 1],
  ['church', 1],
  ['mosque', 1],
  ['synagogue', 1],
  ['place_of_worship', 1],
  ['shopping_mall', 2],
  ['market', 1.5],
  ['restaurant', 1.5],
  ['cafe', 1],
  ['bar', 2],
  ['night_club', 3],
  ['spa', 2],
  ['park', 1.5],
  ['beach', 3],
  ['natural_feature', 2],
  ['tourist_attraction', 1.5],
  ['point_of_interest', 1.5],
];

const DEFAULT_DWELL_HOURS = 1.5;

/** Hours to budget for one spot. Deterministic table, never a model guess. */
export function dwellFor(spot: { types?: string[]; placeId?: string }): number {
  const types = spot.types ?? (spot.placeId ? peekPlaceDetails(spot.placeId)?.types : undefined);
  if (types?.length) {
    for (const [type, hours] of DWELL_BY_TYPE) {
      if (types.includes(type)) return hours;
    }
  }
  return DEFAULT_DWELL_HOURS;
}

/** Hours a traveller can realistically sightsee in one day, excluding meals and rest. */
const USABLE_HOURS_PER_DAY = 8;

/* ------------------------------------------------------------------ */
/* Opening hours                                                       */
/* ------------------------------------------------------------------ */

/**
 * Weekdays (0=Sunday, Places convention) a stop is occupied, derived from its
 * start date and night count. Empty when the trip has no dates.
 */
export function daysAtStop(startDate: string | undefined, nights: number): number[] {
  if (!startDate) return [];
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return [];
  const days: number[] = [];
  // A stop of N nights covers N+1 calendar days of daylight.
  for (let i = 0; i <= Math.max(0, nights); i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d.getDay());
  }
  return days;
}

/** True when the place is shut on every single day the traveller is in town. */
export function closedForWholeStay(hours: PlaceOpeningHours | undefined, stayDays: number[]): boolean {
  if (!hours?.periods?.length || stayDays.length === 0) return false;
  const openDays = new Set(hours.periods.map(p => p.open?.day).filter((d): d is number => d != null));
  // A 24/7 place has a single period with no close - never flag those.
  if (openDays.size === 0) return false;
  return stayDays.every(day => !openDays.has(day));
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Transit between consecutive stops, surfaced as time the plan actually spends.
 * This is Joanna's "you do need to get between destinations" - the planner used
 * to allocate nights to stops and silently assume travel was free.
 */
export function checkTransit(stops: FeasibilityStop[]): { findings: Finding[]; totalHours: number } {
  const findings: Finding[] = [];
  let totalHours = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const leg = transitEstimate(from, to);
    if (!leg) continue;
    totalHours += leg.hours;

    if (leg.hours >= 5) {
      findings.push({
        id: `transit-${from.id}-${to.id}`,
        severity: leg.hours >= 8 ? 'high' : 'medium',
        category: 'routing',
        title: `${from.name} to ${to.name} eats most of a day`,
        detail: `About ${Math.round(leg.km)}km by ${leg.mode === 'air' ? 'air' : leg.mode}, roughly ${leg.hours.toFixed(1)}h door to door. That time has to come out of one of these stops.`,
        suggestion: `Add a night to absorb the journey, or drop one of the two stops if the trip is short.`,
        stopName: to.name,
      });
    }
  }

  return { findings, totalHours };
}

/**
 * Does the plan fit the trip?
 *
 * The check that would have kept Lumpini Park out of a three-day Bangkok trip:
 * count what the spots actually take, against the daylight the stop really has
 * once travel is deducted.
 */
export function checkDayBudget(stops: FeasibilityStop[]): Finding[] {
  const findings: Finding[] = [];

  for (const stop of stops) {
    const spots = stop.spots ?? [];
    if (spots.length === 0) continue;

    const spotHours = spots.reduce((sum, s) => sum + dwellFor(s), 0);
    // N nights gives N+1 days on the ground, but arrival and departure days are
    // part days - treat the stay as N usable days rather than N+1.
    const usableDays = Math.max(1, stop.nights);
    const capacity = usableDays * USABLE_HOURS_PER_DAY;
    // Getting between spots inside a city is not free either.
    const localHops = Math.max(0, spots.length - 1) * 0.4;
    const needed = spotHours + localHops;

    // No slack factor here on purpose. USABLE_HOURS_PER_DAY is already the generous
    // reading - it assumes a traveller is out sightseeing for eight hours with meals
    // and rest taken outside that budget. Once the arithmetic exceeds it, the day
    // genuinely does not fit, and padding the threshold would just reproduce the
    // over-stuffed itineraries this check exists to catch.
    if (needed > capacity) {
      const perDay = (needed / usableDays).toFixed(1);
      findings.push({
        id: `budget-${stop.id}`,
        severity: needed > capacity * 1.35 ? 'high' : 'medium',
        category: 'pacing',
        title: `${stop.name} is overloaded for ${usableDays} day${usableDays === 1 ? '' : 's'}`,
        detail: `${spots.length} places works out at about ${perDay}h of activity per day before meals, rest or getting lost. Around ${USABLE_HOURS_PER_DAY}h is a full day.`,
        suggestion: `Cut to about ${Math.max(1, Math.floor(capacity / DEFAULT_DWELL_HOURS))} places, or add a night here.`,
        stopName: stop.name,
      });
    }
  }

  return findings;
}

/** Places that are shut for the entire time the traveller is in that city. */
export function checkClosedForStay(stops: FeasibilityStop[]): Finding[] {
  const findings: Finding[] = [];

  for (const stop of stops) {
    const stayDays = daysAtStop(stop.startDate, stop.nights);
    if (stayDays.length === 0) continue;

    for (const spot of stop.spots ?? []) {
      if (!spot.placeId) continue;
      const details = peekPlaceDetails(spot.placeId);
      if (!details?.openingHours) continue;
      if (closedForWholeStay(details.openingHours, stayDays)) {
        findings.push({
          id: `closed-${spot.id}`,
          severity: 'high',
          category: 'logistics',
          title: `${spot.name} is closed while you're in ${stop.name}`,
          detail: `It isn't open on any of the days you're there.`,
          suggestion: `Shift your dates, or swap it for somewhere open.`,
          stopName: stop.name,
        });
      }
    }
  }

  return findings;
}

/** Spots at one stop that are scattered far apart - a day lost to crossing town. */
export function checkCluster(stops: FeasibilityStop[]): Finding[] {
  const findings: Finding[] = [];

  for (const stop of stops) {
    const located = (stop.spots ?? []).filter(s => s.lat != null && s.lng != null);
    if (located.length < 3) continue;

    let maxKm = 0;
    let farthest: [string, string] = ['', ''];
    for (let i = 0; i < located.length; i++) {
      for (let j = i + 1; j < located.length; j++) {
        const km = haversineKm(located[i], located[j]);
        if (km != null && km > maxKm) {
          maxKm = km;
          farthest = [located[i].name, located[j].name];
        }
      }
    }

    if (maxKm > 40) {
      findings.push({
        id: `cluster-${stop.id}`,
        severity: maxKm > 90 ? 'high' : 'medium',
        category: 'routing',
        title: `${stop.name} is spread over ${Math.round(maxKm)}km`,
        detail: `${farthest[0]} and ${farthest[1]} are far enough apart that visiting both means a serious trip across the area.`,
        suggestion: `Group nearby places on the same day, or treat the far one as its own day out.`,
        stopName: stop.name,
      });
    }
  }

  return findings;
}

/** Stops with nothing planned, and unverifiable places worth a second look. */
export function checkGaps(stops: FeasibilityStop[]): Finding[] {
  const findings: Finding[] = [];

  const empty = stops.filter(s => (s.spots ?? []).length === 0);
  if (empty.length > 0) {
    findings.push({
      id: 'gaps-empty-stops',
      severity: empty.length > stops.length / 2 ? 'medium' : 'low',
      category: 'gaps',
      title: `${empty.length} stop${empty.length === 1 ? ' has' : 's have'} nothing planned`,
      detail: `${empty.map(s => s.name).join(', ')}: no places added yet.`,
      suggestion: `Plan the stop, or drop it if it was a placeholder.`,
    });
  }

  const unchecked = stops.flatMap(s => (s.spots ?? []).filter(sp => sp.provenance === 'unchecked'));
  if (unchecked.length > 0) {
    findings.push({
      id: 'gaps-unchecked',
      severity: 'low',
      category: 'gaps',
      title: `${unchecked.length} place${unchecked.length === 1 ? '' : 's'} we couldn't confirm`,
      detail: `${unchecked.slice(0, 3).map(s => s.name).join(', ')}${unchecked.length > 3 ? ` and ${unchecked.length - 3} more` : ''} had no listing to check. Small local spots often don't - it doesn't mean they aren't real.`,
      suggestion: `Worth a quick search before you rely on opening times.`,
    });
  }

  return findings;
}

/** Nights allocated versus the trip's actual date range. */
export function checkNightsFit(input: FeasibilityInput): Finding[] {
  const { stops, tripStartDate, tripEndDate } = input;
  if (!tripStartDate || !tripEndDate) return [];

  const start = new Date(tripStartDate);
  const end = new Date(tripEndDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const tripNights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const planned = stops.reduce((sum, s) => sum + (s.nights || 0), 0);
  if (planned === tripNights) return [];

  const diff = Math.abs(planned - tripNights);
  return [{
    id: 'nights-fit',
    severity: diff > 2 ? 'high' : 'medium',
    category: 'logistics',
    title: planned > tripNights
      ? `${diff} more night${diff === 1 ? '' : 's'} planned than the trip has`
      : `${diff} night${diff === 1 ? '' : 's'} still unplaced`,
    detail: `Your dates cover ${tripNights} night${tripNights === 1 ? '' : 's'}; the stops add up to ${planned}.`,
    suggestion: planned > tripNights ? `Trim a stop or shorten one.` : `Add a stop, or give an existing one more nights.`,
  }];
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const SEVERITY_COST: Record<FindingSeverity, number> = { high: 18, medium: 9, low: 3 };

function buildStrengths(input: FeasibilityInput, findings: Finding[]): string[] {
  const { stops } = input;
  const strengths: string[] = [];

  const allSpots = stops.flatMap(s => s.spots ?? []);
  const verified = allSpots.filter(s => s.provenance === 'verified').length;
  if (verified > 0 && verified === allSpots.length) {
    strengths.push(`All ${verified} places confirmed as real and open.`);
  } else if (verified > 0) {
    strengths.push(`${verified} of ${allSpots.length} places confirmed against live listings.`);
  }

  if (stops.length > 1 && !findings.some(f => f.category === 'routing')) {
    strengths.push(`The route flows without any leg that swallows a day.`);
  }
  if (!findings.some(f => f.category === 'pacing') && allSpots.length > 0) {
    strengths.push(`Every stop has a workable number of places for the nights you have.`);
  }
  const withStays = stops.filter(s => (s.stays ?? []).length > 0).length;
  if (withStays === stops.length && stops.length > 0) {
    strengths.push(`Somewhere to sleep at every stop.`);
  }

  return strengths;
}

/** Runs every check and rolls the result into a single report. */
export function runFeasibility(input: FeasibilityInput): FeasibilityReport {
  const stops = input.stops ?? [];

  const transit = checkTransit(stops);
  const findings: Finding[] = [
    ...transit.findings,
    ...checkNightsFit(input),
    ...checkClosedForStay(stops),
    ...checkDayBudget(stops),
    ...checkCluster(stops),
    ...checkGaps(stops),
  ];

  const order: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  const penalty = findings.reduce((sum, f) => sum + SEVERITY_COST[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const highs = findings.filter(f => f.severity === 'high').length;
  let verdict: string;
  if (stops.length === 0) {
    verdict = `Add a stop or two and we'll check the plan against real places and travel times.`;
  } else if (highs > 0) {
    verdict = `${highs} thing${highs === 1 ? '' : 's'} here would bite you on the ground. Worth fixing before you book.`;
  } else if (findings.length > 0) {
    verdict = `The shape of this trip works. A few details would make it smoother.`;
  } else {
    verdict = `This one holds up: real places, sensible pacing, and travel time accounted for.`;
  }

  return {
    findings,
    strengths: buildStrengths(input, findings),
    score,
    verdict,
    transitHours: transit.totalHours,
    highCount: highs,
  };
}
