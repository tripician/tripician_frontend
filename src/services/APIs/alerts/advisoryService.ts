// Official travel advisory service
// Pulls aggregated government travel advisories (US State Dept, FCDO, DFAT, etc.)
// from travel-advisory.info - a free, keyless, CORS-enabled JSON API.
// The score is 0..5 (0 = no risk data, 5 = extreme). We ground the Risk Monitor's
// baseline in this live signal instead of hardcoded per-country guesses.

export interface AdvisoryData {
  /** Official aggregate advisory score, 0..5 */
  score: number;
  /** Human-readable advisory summary, e.g. "Exercise increased caution" */
  message: string;
  /** Number of official government sources currently reporting */
  sourcesActive: number;
  /** ISO date the aggregate was last refreshed */
  updated: string;
  /** Link to the full advisory page with per-source details */
  sourceUrl: string;
}

interface CacheEntry { data: AdvisoryData | null; expires: number; }
const CACHE: Record<string, CacheEntry> = {};
// Advisories change slowly; the upstream refreshes a few times per day.
const TTL_MS = 6 * 60 * 60 * 1000;

const API_BASE = 'https://www.travel-advisory.info/api';

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

  try {
    const res = await fetch(`${API_BASE}?countrycode=${code}`);
    if (!res.ok) throw new Error(`advisory ${res.status}`);
    const json = await res.json();
    const advisory = json?.data?.[code]?.advisory;

    let data: AdvisoryData | null = null;
    if (advisory && typeof advisory.score === 'number' && advisory.score > 0) {
      data = {
        score: advisory.score,
        message: typeof advisory.message === 'string'
          ? advisory.message.replace(/<[^>]*>/g, '').trim()
          : '',
        sourcesActive: Number(advisory.sources_active) || 0,
        updated: typeof advisory.updated === 'string' ? advisory.updated : '',
        sourceUrl: typeof advisory.source === 'string' ? advisory.source : '',
      };
    }

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
