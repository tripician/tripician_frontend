import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  transitEstimate,
  daysAtStop,
  closedForWholeStay,
  checkTransit,
  checkDayBudget,
  checkCluster,
  checkGaps,
  checkNightsFit,
  runFeasibility,
  type FeasibilityStop,
} from './feasibility';
import type { PlannerSpot } from '../../store/plannerSlice';

/**
 * These tests encode the two complaints that motivated the feasibility engine,
 * from a real reviewer on a public Tripician trip post:
 *
 *   "I wouldn't visit Lumpini park in a three day trip"
 *   "You do need to get between destinations ... we spent a day travelling between the two"
 *
 * Everything here is pure arithmetic - no network, no model, no Places SDK.
 */

const BANGKOK = { lat: 13.7563, lng: 100.5018 };
const SUKHOTHAI = { lat: 17.0078, lng: 99.8237 };
const AYUTTHAYA = { lat: 14.3532, lng: 100.5689 };

function spot(name: string, extra: Partial<PlannerSpot> = {}): PlannerSpot {
  return { id: `spot-${name}`, name, checked: false, known: true, ...extra };
}

function stop(name: string, over: Partial<FeasibilityStop> = {}): FeasibilityStop {
  return { id: `stop-${name}`, name, nights: 2, spots: [], ...over };
}

describe('haversineKm', () => {
  it('returns null when either point lacks coordinates', () => {
    expect(haversineKm({ lat: 1 }, BANGKOK)).toBeNull();
    expect(haversineKm(BANGKOK, {})).toBeNull();
  });

  it('measures a known distance within a sensible tolerance', () => {
    // Bangkok to Sukhothai is roughly 380km as the crow flies.
    const km = haversineKm(BANGKOK, SUKHOTHAI)!;
    expect(km).toBeGreaterThan(340);
    expect(km).toBeLessThan(420);
  });

  it('is zero for the same point', () => {
    expect(haversineKm(BANGKOK, BANGKOK)).toBeCloseTo(0, 5);
  });
});

describe('transitEstimate', () => {
  it('treats a short hop as local', () => {
    const leg = transitEstimate(BANGKOK, { lat: 13.78, lng: 100.52 })!;
    expect(leg.mode).toBe('local');
  });

  it('picks rail for the Bangkok to Sukhothai leg and costs it hours, not minutes', () => {
    const leg = transitEstimate(BANGKOK, SUKHOTHAI)!;
    expect(leg.mode).toBe('rail');
    // The reviewer lost a day to this journey; the estimate must be substantial.
    expect(leg.hours).toBeGreaterThan(4);
  });

  it('adds airport overhead for long legs so flying is never counted as pure air time', () => {
    const leg = transitEstimate(BANGKOK, { lat: 35.6762, lng: 139.6503 })!; // Tokyo
    expect(leg.mode).toBe('air');
    // ~4600km at 800km/h is under 6h in the air; overhead must push it well past that.
    expect(leg.hours).toBeGreaterThan(9);
  });

  it('returns null without coordinates rather than guessing', () => {
    expect(transitEstimate({}, BANGKOK)).toBeNull();
  });
});

describe('checkTransit - "you do need to get between destinations"', () => {
  it('flags a Bangkok to Sukhothai leg as eating most of a day', () => {
    const stops = [
      stop('Bangkok', { ...BANGKOK, nights: 3 }),
      stop('Sukhothai', { ...SUKHOTHAI, nights: 2 }),
    ];
    const { findings, totalHours } = checkTransit(stops);

    expect(totalHours).toBeGreaterThan(4);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('routing');
    expect(findings[0].title).toContain('Bangkok');
    expect(findings[0].title).toContain('Sukhothai');
  });

  it('stays quiet on a short hop between nearby stops', () => {
    const stops = [
      stop('Bangkok', { ...BANGKOK, nights: 2 }),
      stop('Ayutthaya', { ...AYUTTHAYA, nights: 1 }),
    ];
    const { findings } = checkTransit(stops);
    expect(findings).toHaveLength(0);
  });

  it('produces nothing when stops have no coordinates', () => {
    const { findings, totalHours } = checkTransit([stop('A'), stop('B')]);
    expect(findings).toHaveLength(0);
    expect(totalHours).toBe(0);
  });
});

describe('checkDayBudget - "I wouldn\'t visit Lumpini park in a three day trip"', () => {
  it('flags a short Bangkok stay padded with the full must-see list', () => {
    const bangkok = stop('Bangkok', {
      ...BANGKOK,
      nights: 3,
      spots: [
        spot('Grand Palace'), spot('Wat Arun'), spot('Wat Pho'),
        spot('Lumpini Park'), spot('Chatuchak Market'), spot('Jim Thompson House'),
        spot('Wat Saket'), spot('Asiatique'), spot('Chinatown'),
        spot('Museum Siam'), spot('Bangkok National Museum'), spot('Erawan Shrine'),
        spot('Khao San Road'), spot('Lumphini Night Market'),
      ],
    });

    const findings = checkDayBudget([bangkok]);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('pacing');
    expect(findings[0].stopName).toBe('Bangkok');
    expect(findings[0].suggestion).toMatch(/Cut to about \d+ places/);
  });

  it('accepts a realistic list for the same stay', () => {
    const bangkok = stop('Bangkok', {
      ...BANGKOK,
      nights: 3,
      spots: [spot('Grand Palace'), spot('Wat Arun'), spot('Wat Pho'), spot('Chatuchak Market')],
    });
    expect(checkDayBudget([bangkok])).toHaveLength(0);
  });

  it('ignores stops with nothing planned (checkGaps owns that case)', () => {
    expect(checkDayBudget([stop('Bangkok', { nights: 1 })])).toHaveLength(0);
  });

  it('scales the allowance with the length of the stay', () => {
    const spots = Array.from({ length: 12 }, (_, i) => spot(`Place ${i}`));
    expect(checkDayBudget([stop('Bangkok', { nights: 2, spots })])).toHaveLength(1);
    expect(checkDayBudget([stop('Bangkok', { nights: 10, spots })])).toHaveLength(0);
  });

  /*
   * The day used to be a flat 8 hours for everyone, so the check enforced one
   * stranger's stamina on every trip. It now comes from the pace the traveller
   * asked for when they created the trip.
   */
  it('measures the same plan against the pace the traveller asked for', () => {
    const spots = Array.from({ length: 6 }, (_, i) => spot(`Place ${i}`));
    const bangkok = stop('Bangkok', { ...BANGKOK, nights: 2, spots });

    // 6 places at 2h plus 5 local hops at 0.4h is 14h over 2 days, so 7h a day.
    expect(checkDayBudget([bangkok], 'slow')).toHaveLength(1);   // 5h days: too much
    expect(checkDayBudget([bangkok], 'balanced')).toHaveLength(0); // 8h days: fits
    expect(checkDayBudget([bangkok], 'packed')).toHaveLength(0);   // 11h days: fits easily
  });

  it('treats an unanswered pace as balanced, so older trips report the same as before', () => {
    const spots = Array.from({ length: 12 }, (_, i) => spot(`Place ${i}`));
    const bangkok = stop('Bangkok', { nights: 2, spots });
    expect(checkDayBudget([bangkok])).toEqual(checkDayBudget([bangkok], 'balanced'));
    expect(checkDayBudget([bangkok], null)).toEqual(checkDayBudget([bangkok], 'balanced'));
  });

  it('names the hours it is judging against, so the finding is checkable', () => {
    const spots = Array.from({ length: 12 }, (_, i) => spot(`Place ${i}`));
    const [finding] = checkDayBudget([stop('Bangkok', { nights: 2, spots })], 'slow');
    expect(finding.detail).toContain('5h');
  });
});

describe('daysAtStop / closedForWholeStay', () => {
  it('covers arrival through departure day', () => {
    // 2026-07-27 is a Monday (day 1 in the Places convention where Sunday is 0).
    const days = daysAtStop('2026-07-27', 2);
    expect(days).toEqual([1, 2, 3]);
  });

  it('returns nothing when the trip has no dates', () => {
    expect(daysAtStop(undefined, 3)).toEqual([]);
    expect(daysAtStop('not-a-date', 3)).toEqual([]);
  });

  it('flags the classic Monday-only visit to a place shut on Mondays', () => {
    const closedMondays = {
      periods: [
        { open: { day: 2, time: '0900' } },
        { open: { day: 3, time: '0900' } },
        { open: { day: 4, time: '0900' } },
      ],
    };
    expect(closedForWholeStay(closedMondays, [1])).toBe(true);
  });

  it('does not flag a place open on any day of the stay', () => {
    const closedMondays = { periods: [{ open: { day: 2, time: '0900' } }] };
    expect(closedForWholeStay(closedMondays, [1, 2, 3])).toBe(false);
  });

  it('never flags when hours are unknown - absence of data is not evidence of closure', () => {
    expect(closedForWholeStay(undefined, [1, 2])).toBe(false);
    expect(closedForWholeStay({ periods: [] }, [1, 2])).toBe(false);
  });
});

describe('checkCluster', () => {
  it('flags spots scattered across a wide area', () => {
    const stops = [stop('Bangkok', {
      ...BANGKOK,
      spots: [
        spot('Grand Palace', { lat: 13.75, lng: 100.49 }),
        spot('Wat Arun', { lat: 13.7437, lng: 100.4889 }),
        spot('Ayutthaya day trip', { lat: 14.3532, lng: 100.5689 }),
      ],
    })];
    const findings = checkCluster(stops);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe('routing');
  });

  it('stays quiet for spots in the same neighbourhood', () => {
    const stops = [stop('Bangkok', {
      ...BANGKOK,
      spots: [
        spot('Grand Palace', { lat: 13.75, lng: 100.49 }),
        spot('Wat Pho', { lat: 13.7465, lng: 100.4927 }),
        spot('Wat Arun', { lat: 13.7437, lng: 100.4889 }),
      ],
    })];
    expect(checkCluster(stops)).toHaveLength(0);
  });

  it('needs at least three located spots before judging spread', () => {
    const stops = [stop('Bangkok', {
      spots: [spot('A', { lat: 13.7, lng: 100.5 }), spot('B', { lat: 17.0, lng: 99.8 })],
    })];
    expect(checkCluster(stops)).toHaveLength(0);
  });
});

describe('checkGaps', () => {
  it('reports stops with nothing planned', () => {
    const findings = checkGaps([stop('Bangkok', { spots: [spot('Wat Arun')] }), stop('Sukhothai')]);
    const empty = findings.find(f => f.id === 'gaps-empty-stops');
    expect(empty).toBeDefined();
    expect(empty!.detail).toContain('Sukhothai');
  });

  it('surfaces unchecked places without treating them as errors', () => {
    const findings = checkGaps([stop('Bangkok', {
      spots: [
        spot('Wat Arun', { provenance: 'verified' }),
        spot('Som Tam stall, Soi 38', { provenance: 'unchecked' }),
      ],
    })]);
    const unchecked = findings.find(f => f.id === 'gaps-unchecked');
    expect(unchecked).toBeDefined();
    expect(unchecked!.severity).toBe('low');
    expect(unchecked!.detail).toContain("doesn't mean they aren't real");
  });
});

describe('checkNightsFit', () => {
  it('flags nights that do not add up to the trip dates', () => {
    const findings = checkNightsFit({
      stops: [stop('Bangkok', { nights: 3 })],
      tripStartDate: '2026-07-27',
      tripEndDate: '2026-08-03', // 7 nights
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain('unplaced');
  });

  it('is silent when the allocation matches', () => {
    const findings = checkNightsFit({
      stops: [stop('Bangkok', { nights: 4 }), stop('Sukhothai', { nights: 3 })],
      tripStartDate: '2026-07-27',
      tripEndDate: '2026-08-03',
    });
    expect(findings).toHaveLength(0);
  });

  it('skips the check entirely when dates are unset', () => {
    expect(checkNightsFit({ stops: [stop('Bangkok', { nights: 3 })] })).toHaveLength(0);
  });
});

describe('runFeasibility', () => {
  it('orders findings by severity and never scores below zero', () => {
    const report = runFeasibility({
      stops: [
        stop('Bangkok', {
          ...BANGKOK,
          nights: 1,
          spots: Array.from({ length: 20 }, (_, i) => spot(`Place ${i}`)),
        }),
        stop('Sukhothai', { ...SUKHOTHAI, nights: 1 }),
      ],
      tripStartDate: '2026-07-27',
      tripEndDate: '2026-08-10',
    });

    expect(report.score).toBeGreaterThanOrEqual(0);
    const severities = report.findings.map(f => f.severity);
    const rank = { high: 0, medium: 1, low: 2 } as const;
    for (let i = 1; i < severities.length; i++) {
      expect(rank[severities[i]]).toBeGreaterThanOrEqual(rank[severities[i - 1]]);
    }
  });

  // highCount drives the planner toolbar's "N to fix" label, so it has to agree
  // with the findings it claims to summarise.
  it('reports how many findings are high severity', () => {
    const report = runFeasibility({
      stops: [
        stop('Bangkok', {
          ...BANGKOK,
          nights: 1,
          spots: Array.from({ length: 20 }, (_, i) => spot(`Place ${i}`)),
        }),
        stop('Sukhothai', { ...SUKHOTHAI, nights: 1 }),
      ],
      tripStartDate: '2026-07-27',
      tripEndDate: '2026-08-10',
    });

    expect(report.highCount).toBe(report.findings.filter(f => f.severity === 'high').length);
    expect(report.highCount).toBeGreaterThan(0);
  });

  it('reports zero high-severity findings for a clean plan', () => {
    const report = runFeasibility({ stops: [stop('Bangkok', { ...BANGKOK, nights: 3 })] });
    expect(report.highCount).toBe(0);
  });

  it('gives a clean plan a high score and credits verified places', () => {
    const report = runFeasibility({
      stops: [stop('Bangkok', {
        ...BANGKOK,
        nights: 4,
        stays: [{}],
        startDate: '2026-07-27',
        spots: [
          spot('Grand Palace', { provenance: 'verified', lat: 13.75, lng: 100.49 }),
          spot('Wat Arun', { provenance: 'verified', lat: 13.7437, lng: 100.4889 }),
          spot('Wat Pho', { provenance: 'verified', lat: 13.7465, lng: 100.4927 }),
        ],
      })],
      tripStartDate: '2026-07-27',
      tripEndDate: '2026-07-31',
    });

    expect(report.findings).toHaveLength(0);
    expect(report.score).toBe(100);
    expect(report.strengths.some(s => s.includes('All 3 places confirmed'))).toBe(true);
  });

  it('invites the user to add stops rather than scoring an empty plan', () => {
    const report = runFeasibility({ stops: [] });
    expect(report.findings).toHaveLength(0);
    expect(report.verdict).toContain('Add a stop');
  });

  it('reports total transit hours so a day lost to travel is visible', () => {
    const report = runFeasibility({
      stops: [
        stop('Bangkok', { ...BANGKOK, nights: 3 }),
        stop('Sukhothai', { ...SUKHOTHAI, nights: 3 }),
      ],
    });
    expect(report.transitHours).toBeGreaterThan(4);
  });
});
