// Destination alert service
// Fetches travel news for a destination name and classifies relevant alerts.
// Queries the Guardian API directly with the destination name for accurate results.

export type AlertType = 'Severe Weather' | 'Travel Advisory' | 'Security Risk' | 'Health Alert' | 'Transport Update';

export interface DestinationAlert {
  id: string;
  type: AlertType;
  title: string;
  summary?: string;
  url: string;
  timestamp: string;
}

export interface DestinationAlerts {
  destinationId: string;
  alerts: DestinationAlert[];
  fetchedAt: number;
}

const ALERT_META: Record<AlertType, { color: string; emoji: string }> = {
  'Severe Weather':   { color: '#ef4444', emoji: '🌪️' },
  'Travel Advisory':  { color: '#f59e0b', emoji: '🛂' },
  'Security Risk':    { color: '#f97316', emoji: '🔒' },
  'Health Alert':     { color: '#22c55e', emoji: '🏥' },
  'Transport Update': { color: '#60a5fa', emoji: '✈️' },
};

export { ALERT_META };

export function classifyAlert(title: string, body = ''): AlertType | null {
  const t = (title + ' ' + body).toLowerCase();
  if (/storm|hurricane|typhoon|earthquake|flood|wildfire|tsunami|tornado|cyclone/.test(t)) return 'Severe Weather';
  if (/travel ban|visa|border|restrict|evacuat|advisory level|do not travel|sanction/.test(t)) return 'Travel Advisory';
  if (/attack|shoot|terror|protest|riot|civil unrest|kidnap|war|military|strike|bomb|missile|conflict|invasion/.test(t)) return 'Security Risk';
  if (/outbreak|epidemic|disease|virus|health emergency|quarantine/.test(t)) return 'Health Alert';
  if (/flight cancel|airport clos|train strike|transport shutdown/.test(t)) return 'Transport Update';
  return null;
}

// In-memory cache keyed by destination name (lowercase)
interface CacheEntry { data: DestinationAlerts; expires: number; }
const CACHE: Record<string, CacheEntry> = {};
const TTL_MS = 10 * 60 * 1000; // 10 minutes

const GUARDIAN_BASE = 'https://content.guardianapis.com';

const ALERT_KEYWORDS =
  'war OR conflict OR attack OR bomb OR missile OR protest OR riot OR "civil unrest" OR terror OR ' +
  '"travel ban" OR visa OR border OR sanction OR evacuat OR advisory OR ' +
  'storm OR hurricane OR typhoon OR earthquake OR flood OR wildfire OR tsunami OR ' +
  'outbreak OR epidemic OR disease OR quarantine OR ' +
  '"flight cancel" OR "airport clos" OR strike OR safety OR security';

/**
 * Fetch alerts for a single destination by name.
 * Queries Guardian API directly with destination name + alert keywords.
 */
export async function fetchDestinationAlerts(destinationId: string, destinationName: string): Promise<DestinationAlerts> {
  const key = destinationName.toLowerCase().trim();
  const now = Date.now();
  const cached = CACHE[key];
  if (cached && cached.expires > now && cached.data.destinationId === destinationId) {
    return cached.data;
  }

  try {
    const apiKey = (import.meta.env.VITE_GUARDIAN_API_KEY as string | undefined) || 'test';
    const q = encodeURIComponent(`"${destinationName}" AND (${ALERT_KEYWORDS})`);
    const url = `${GUARDIAN_BASE}/search?q=${q}&api-key=${apiKey}&show-fields=trailText,headline&page-size=15&order-by=newest`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Guardian ${res.status}`);
    const json = await res.json();
    const results: Array<{ id: string; webTitle: string; webUrl: string; webPublicationDate: string; fields?: { headline?: string; trailText?: string } }> = json.response?.results ?? [];

    const alerts: DestinationAlert[] = [];
    for (const article of results) {
      const title = (article.fields?.headline || article.webTitle).replace(/<[^>]*>/g, '');
      const summary = article.fields?.trailText?.replace(/<[^>]*>/g, '') || undefined;
      const type = classifyAlert(title, summary ?? '');
      if (type) {
        alerts.push({
          id: article.id,
          type,
          title,
          summary,
          url: article.webUrl,
          timestamp: article.webPublicationDate,
        });
      }
    }

    const result: DestinationAlerts = { destinationId, alerts, fetchedAt: now };
    CACHE[key] = { data: result, expires: now + TTL_MS };
    return result;
  } catch {
    return { destinationId, alerts: [], fetchedAt: now };
  }
}
