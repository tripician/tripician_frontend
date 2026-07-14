/**
 * SEO-friendly trip URLs: /trip/{name-slug}-{guid}
 *
 * The GUID always terminates the path segment, so any slug prefix is purely
 * decorative ,routing extracts the trailing GUID and old /trip/{guid} links
 * keep working forever. Keep the slug logic in sync with
 * scripts/generate-sitemap.js so canonicals match sitemap URLs.
 */

const GUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Lowercase, de-accent, hyphenate; capped so URLs stay shareable. */
export function slugifyTripName(name?: string | null): string {
  if (!name) return '';
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Canonical app path for a trip; falls back to the bare id when unnamed. */
export function tripPath(trip: { id: string | number; name?: string | null }): string {
  const id = String(trip.id);
  const slug = slugifyTripName(trip.name);
  return slug && slug !== 'untitled-trip' ? `/trip/${slug}-${id}` : `/trip/${id}`;
}

/** Recover the trip id from a route param that may carry a slug prefix. */
export function extractTripId(param?: string | null): string {
  if (!param) return '';
  const match = param.match(GUID_RE);
  return match ? match[0] : param;
}
