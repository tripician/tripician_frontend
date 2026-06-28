// Travel news service using The Guardian Open Platform API
// The 'test' API key is officially provided by The Guardian for development use.
// For production register at https://bonobo.capi.gutools.co.uk/register/developer for a free key (4000 req/day).
// Optional: set VITE_GUARDIAN_API_KEY in .env for production.

export interface TwinglyImage { url: string; caption?: string; }
export interface TwinglyDocument {
  article_id: number;
  url: string;
  title: string;
  text?: string;
  summary?: string;
  author?: string;
  timestamp: string;
  location_code?: string;
  language_code?: string;
  site_id?: number;
  site_name?: string;
  section_name?: string;
  site_url?: string;
  section_url?: string;
  images?: TwinglyImage[];
  article_is_paywalled?: boolean;
  article_has_full_text?: boolean;
  readership?: {
    site_number_of_monthly_visits?: number | null;
    site_average_number_of_potential_readers?: number | null;
    number_of_potential_readers?: number | null;
  };
}

export interface TwinglySearchResponse {
  number_of_documents: number;
  number_of_documents_estimated_total: number;
  documents: TwinglyDocument[];
}

// ─ Guardian implementation ─

const GUARDIAN_BASE = 'https://content.guardianapis.com';

const COUNTRY_NAMES: Record<string, string> = {
  us: 'United States', gb: 'United Kingdom', fr: 'France', de: 'Germany',
  es: 'Spain', it: 'Italy', jp: 'Japan', cn: 'China', in: 'India', ca: 'Canada',
  au: 'Australia', nz: 'New Zealand', sg: 'Singapore', ae: 'United Arab Emirates',
  br: 'Brazil', mx: 'Mexico', za: 'South Africa', th: 'Thailand'
};

const TRAVEL_KEYWORDS =
  'travel OR tourism OR "travel ban" OR visa OR hurricane OR cyclone OR typhoon OR ' +
  'earthquake OR flood OR wildfire OR storm OR tsunami OR "travel warning" OR ' +
  'safety OR security OR protest OR strike OR "health alert" OR outbreak OR ' +
  'airport OR airline OR "border closure" OR curfew OR advisory';

interface GuardianField { headline?: string; trailText?: string; thumbnail?: string; byline?: string; }
interface GuardianResult {
  id: string; webTitle: string; webUrl: string;
  webPublicationDate: string; sectionName: string; fields?: GuardianField;
}

function detectLocationCode(title: string, trail: string, candidates: string[]): string {
  const hay = `${title} ${trail}`.toLowerCase();
  for (const code of candidates) {
    if (hay.includes((COUNTRY_NAMES[code] || code).toLowerCase())) return code;
  }
  return candidates[0];
}

function toDocument(r: GuardianResult, idx: number, locationCode: string): TwinglyDocument {
  return {
    article_id: Date.now() + idx,
    url: r.webUrl,
    title: (r.fields?.headline || r.webTitle).replace(/<[^>]*>/g, ''),
    summary: r.fields?.trailText?.replace(/<[^>]*>/g, '') || undefined,
    author: r.fields?.byline || undefined,
    timestamp: r.webPublicationDate,
    location_code: locationCode,
    language_code: 'en',
    site_name: 'The Guardian',
    site_url: 'https://www.theguardian.com',
    section_name: r.sectionName,
    images: r.fields?.thumbnail ? [{ url: r.fields.thumbnail }] : [],
    article_is_paywalled: false,
    readership: { number_of_potential_readers: 12_500_000 }
  };
}

interface CacheEntry { data: TwinglySearchResponse; expires: number; }
const CACHE: Record<string, CacheEntry> = {};
const TTL_MS = 10 * 60 * 1000;

export interface FetchNewsParams {
  locations?: string[]; // list of country codes e.g. ['us','jp']
  location?: string; // legacy single country input
  queryAll?: string[];
  size?: number;
  sinceIso?: string;
}

export async function fetchNews(params: FetchNewsParams, _apiKey?: string): Promise<TwinglySearchResponse> {
  const apiKey = (import.meta.env.VITE_GUARDIAN_API_KEY as string | undefined) || 'test';

  const normalizedLocations = (() => {
    const list = params.locations?.length ? params.locations : params.location ? [params.location] : [];
    return Array.from(new Set(list.map(l => l.trim().toLowerCase()).filter(Boolean)));
  })();

  if (!normalizedLocations.length) {
    return { number_of_documents: 0, number_of_documents_estimated_total: 0, documents: [] };
  }

  const cacheKey = normalizedLocations.slice().sort().join(',');
  const now = Date.now();
  const cached = CACHE[cacheKey];
  if (cached && cached.expires > now) return cached.data;

  // Batch in groups of 4 to minimise API calls (test key: 50 req/day, production: 4000/day)
  const BATCH = 4;
  const batches: string[][] = [];
  for (let i = 0; i < normalizedLocations.length; i += BATCH) {
    batches.push(normalizedLocations.slice(i, i + BATCH));
  }

  const pageSize = Math.min(params.size ?? 30, 50);
  const allDocs: TwinglyDocument[] = [];
  const seen = new Set<string>();

  await Promise.all(batches.map(async (batch) => {
    const countryPart = batch.map(c => `"${COUNTRY_NAMES[c] || c}"`).join(' OR ');
    const q = encodeURIComponent(`(${countryPart}) AND (${TRAVEL_KEYWORDS})`);
    const url = `${GUARDIAN_BASE}/search?q=${q}&api-key=${apiKey}&show-fields=thumbnail,trailText,headline,byline&page-size=${pageSize}&order-by=newest`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Guardian ${res.status}`);
      const json = await res.json();
      (json.response?.results as GuardianResult[] || []).forEach((r, idx) => {
        if (seen.has(r.webUrl)) return;
        seen.add(r.webUrl);
        allDocs.push(toDocument(r, allDocs.length + idx, detectLocationCode(r.webTitle, r.fields?.trailText || '', batch)));
      });
    } catch (err) {
      console.warn('[newsService] Guardian batch failed', batch, err);
    }
  }));

  const result: TwinglySearchResponse = {
    number_of_documents: allDocs.length,
    number_of_documents_estimated_total: allDocs.length,
    documents: allDocs
  };
  CACHE[cacheKey] = { data: result, expires: now + TTL_MS };
  return result;
}
