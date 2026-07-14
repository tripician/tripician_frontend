const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string;
const BASE_URL = 'https://api.unsplash.com/search/photos';
const LS_PREFIX = 'unsplash_v1_';

// Session-level memory cache (keyed by lowercase query)
const imageCache = new Map<string, string>();
// In-flight deduplication
const inFlight = new Map<string, Promise<string | null>>();

function lsGet(key: string): string | null {
  try { return localStorage.getItem(LS_PREFIX + key); } catch { return null; }
}
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(LS_PREFIX + key, value); } catch { /* quota exceeded ,skip silently */ }
}

export async function fetchUnsplashImage(query: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY || !query) return null;
  const key = query.trim().toLowerCase();

  // 1. Memory cache (fastest ,same session)
  if (imageCache.has(key)) return imageCache.get(key)!;

  // 2. localStorage cache (instant on subsequent page loads)
  const cached = lsGet(key);
  if (cached) { imageCache.set(key, cached); return cached; }

  // 3. Deduplicate concurrent requests for the same key
  if (inFlight.has(key)) return inFlight.get(key)!;

  const request = (async (): Promise<string | null> => {
    try {
      const url = `${BASE_URL}?query=${encodeURIComponent(key)}&per_page=1&orientation=portrait`;
      const resp = await fetch(url, {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      const photoUrl: string | null = data.results?.[0]?.urls?.regular ?? null;
      if (photoUrl) {
        imageCache.set(key, photoUrl);
        lsSet(key, photoUrl);
      }
      return photoUrl;
    } catch {
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}
