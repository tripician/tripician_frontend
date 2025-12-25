// Lightweight client for Twingly News Search API
// Never store API key in repo; use VITE_TWINGLY_API_KEY at runtime.

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

const DIRECT_API_URL = "https://data.twingly.net/news/b/search/v1/search";
// When running dev with VITE_NEWS_PROXY=1, vite proxy rewrites /twingly-news/news/b/search/v1/search
const PROXY_API_URL = "/twingly-news/news/b/search/v1/search";

export interface FetchNewsParams {
  locations?: string[]; // list of country codes e.g. ['us','jp']
  location?: string; // legacy single country input
  queryAll?: string[]; // optional additional terms
  size?: number;
  sinceIso?: string; // ISO timestamp since param
}

export async function fetchNews(params: FetchNewsParams, apiKey?: string): Promise<TwinglySearchResponse> {
  const key = apiKey || import.meta.env.VITE_TWINGLY_API_KEY;
  if(!key) throw new Error("Missing Twingly API key (VITE_TWINGLY_API_KEY)");
  // Twingly requires at least one query dimension (all/any/url/domains/authors/site_id/select_articles_by_ids)
  // Provide a safe default list of broad travel-related keywords if none supplied.
  const envDefault = (import.meta.env.VITE_NEWS_DEFAULT_TERMS as string | undefined)?.split(',').map(s=> s.trim()).filter(Boolean);
  const fallbackAll = envDefault && envDefault.length ? envDefault : [
    'weather','storm','hurricane','flood','earthquake','wildfire','eruption','tsunami',
    'restriction','travel ban','visa','law change','regulation','strike','protest','safety','alert'
  ];
  const allTerms = params.queryAll && params.queryAll.length ? params.queryAll : fallbackAll;
  const broad = import.meta.env.VITE_NEWS_BROAD === '1';
  const queryMode = (import.meta.env.VITE_NEWS_QUERY_MODE as string | undefined)?.toLowerCase() === 'any' ? 'any' : 'all';
  const normalizedLocations = (() => {
    const list = params.locations && params.locations.length ? params.locations : (params.location ? [params.location] : []);
    const sanitized = list
      .map(loc => String(loc).trim().toLowerCase())
      .filter(Boolean);
    if(sanitized.length) return Array.from(new Set(sanitized));
    return [];
  })();
  if(!normalizedLocations.length) {
    return { number_of_documents: 0, number_of_documents_estimated_total: 0, documents: [] };
  }
  const body: Record<string, any> = {
    locations: normalizedLocations,
    size: params.size ?? 20,
    timestamp: params.sinceIso ? { since: params.sinceIso } : undefined
  };
  if(!broad) {
    if(queryMode === 'any') body.any = allTerms; else body.all = allTerms;
  } else {
    // Broad mode: attempt minimal query with only location; if API rejects (missing query), caller's error path will surface.
  }
  const useProxy = import.meta.env.VITE_NEWS_PROXY === '1' && location.hostname === 'localhost';
  const url = useProxy ? PROXY_API_URL : DIRECT_API_URL;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${key}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(body)
    });
    if(!res.ok){
      const text = await res.text();
      const diagnostic = useProxy && res.status === 404
        ? ' (Dev proxy 404: ensure VITE_NEWS_PROXY=1 is in .env.local and dev server restarted)'
        : '';
      throw new Error(`Twingly error ${res.status}: ${text}${diagnostic}`);
    }
    return res.json();
  } catch(err){
    return { number_of_documents:0, number_of_documents_estimated_total:0, documents:[] };
  }
}
