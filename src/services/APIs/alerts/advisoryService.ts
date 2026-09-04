// Official travel advisory service
//
// Source: the UK Foreign, Commonwealth and Development Office, through the
// gov.uk content API. Free, keyless, and it sends Access-Control-Allow-Origin: *
// so the browser can read it directly.
//
// It replaced travel-advisory.info, which had been returning
// net::ERR_CERT_COMMON_NAME_INVALID: its TLS certificate stopped matching its
// hostname, so every browser refused the connection and this service had been
// silently returning null. The Risk Monitor kept working on its static baseline
// and labelled it "Baseline estimate", so nothing lied, but no user had seen a
// real government advisory in some time.
//
// One government rather than an aggregate, and the UI says so. A single named
// source a reader can go and check beats an aggregate score from a host that
// might stop resolving again.

export interface AdvisoryData {
  /** The UK FCDO advisory score, 0..5 */
  score: number;
  /** Human-readable advisory summary, e.g. "Exercise increased caution" */
  message: string;
  /** ISO date the FCDO last updated its advice */
  updated: string;
  /** Link to the full advisory page with per-source details */
  sourceUrl: string;
}

interface CacheEntry { data: AdvisoryData | null; expires: number; }
const CACHE: Record<string, CacheEntry> = {};
// Advisories change slowly; the upstream refreshes a few times per day.
const TTL_MS = 6 * 60 * 60 * 1000;

import { countryNameFromCode } from '../../../utils/countryFlags';

const API_BASE = 'https://www.gov.uk/api/content/foreign-travel-advice';

/**
 * FCDO alert levels, mapped onto the 0..5 scale the Risk Monitor already reads.
 *
 * The API returns an array because a country can carry more than one, so the
 * strongest wins. An empty array is a real answer: no blanket warning, which is
 * most of the world and scores 1 rather than 0.
 */
const ALERT_SCORE: Record<string, number> = {
  avoid_all_travel_to_whole_country: 5,
  avoid_all_but_essential_travel_to_whole_country: 4.5,
  avoid_all_travel_to_parts: 4,
  avoid_all_but_essential_travel_to_parts: 3,
};

const ALERT_TEXT: Record<string, string> = {
  avoid_all_travel_to_whole_country: 'Advises against all travel to the whole country',
  avoid_all_but_essential_travel_to_whole_country: 'Advises against all but essential travel to the whole country',
  avoid_all_travel_to_parts: 'Advises against all travel to parts of the country',
  avoid_all_but_essential_travel_to_parts: 'Advises against all but essential travel to parts of the country',
};

/*
 * Where gov.uk's page name differs from ours.
 *
 * Slugifying the country name gets most of the world right, and a miss is not
 * silent damage: the request 404s, the service returns null, and the Risk
 * Monitor falls back to its baseline and labels it as one. These are the ones
 * worth correcting rather than leaving on the baseline.
 *
 * GB is deliberately absent. The FCDO does not publish travel advice for the
 * United Kingdom, so there is no page to find and a baseline is the honest
 * answer rather than a bug.
 */
const SLUG_OVERRIDES: Record<string, string> = {
  US: 'usa',
};

/** gov.uk keys its advice pages by country name, not ISO code. */
function slugFor(code: string): string | null {
  const override = SLUG_OVERRIDES[code];
  if (override) return override;

  const name = countryNameFromCode(code);
  if (!name) return null;
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Fetch the official advisory for an ISO alpha-2 country code (e.g. "jp").
 * Returns null when the API is unreachable or has no data - callers fall back
 * to their static baseline so the Risk Monitor never breaks.
 */
export async function fetchAdvisory(countryCode: string): Promise<AdvisoryData | null> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;

  const now = Date.now();
  const cached = CACHE[code];
  if (cached && cached.expires > now) return cached.data;

  const slug = slugFor(code);
  if (!slug) return null;

  try {
    const res = await fetch(`${API_BASE}/${slug}`);
    if (!res.ok) throw new Error(`advisory ${res.status}`);
    const json = await res.json();

    const alerts: string[] = Array.isArray(json?.details?.alert_status)
      ? json.details.alert_status.filter((a: unknown) => typeof a === 'string')
      : [];

    // The strongest warning decides, and no warning is still an answer.
    const score = alerts.reduce((worst, a) => Math.max(worst, ALERT_SCORE[a] ?? 0), 0) || 1;
    const message = alerts.length > 0
      ? alerts.map((a) => ALERT_TEXT[a]).filter(Boolean).join('. ')
      : 'No blanket warning against travel here.';

    const data: AdvisoryData = {
      score,
      message,
      updated: typeof json?.public_updated_at === 'string' ? json.public_updated_at : '',
      sourceUrl: `https://www.gov.uk/foreign-travel-advice/${slug}`,
    };

    CACHE[code] = { data, expires: now + TTL_MS };
    return data;
  } catch {
    // Cache the miss briefly so a dead API isn't hammered on every click.
    CACHE[code] = { data: null, expires: now + 5 * 60 * 1000 };
    return null;
  }
}

/**
 * Map the official 0..5 advisory scale onto the Risk Monitor's 0..100 baseline.
 * The upstream floor for peaceful countries is ~1.0, so we stretch 1..5 → 2..87:
 * Singapore (~1.0) → ~2 Low · Japan (~2.7) → ~36 Watch · Russia (~5.0) → ~85 High.
 */
export function advisoryScoreToBaseRisk(score: number): number {
  const clamped = Math.min(5, Math.max(1, score));
  return Math.min(90, Math.max(2, Math.round(((clamped - 1) / 4) * 85)));
}
