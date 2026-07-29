/**
 * One place that decides what photo represents a trip.
 *
 * Why this exists: the trip-view hero and the trip cards both fell back to
 * Unsplash when a trip had no saved banner, but with different query strings -
 * the hero asked for `"{country} landscape travel"` and the cards asked for
 * `"{country}"`. Different query, different cache key, different photo. A trip
 * therefore showed one image on its card and another on its own page.
 *
 * The fix is not just "use the same query": it's to prefer a deterministic
 * source. `assets/covers.json` maps countries to curated Cloudinary covers, so
 * the same country always resolves to the same image everywhere, instantly,
 * with no API call and no rate limit.
 *
 * NOTE: covers.json is only partly filled - 24 of its 82 entries have a URL, the
 * rest are empty-string placeholders. `curatedCover` therefore treats an empty
 * value as absent, and countries without a cover fall through to Unsplash using
 * the one canonical query below. That fallback is still consistent everywhere
 * precisely because every caller goes through this module.
 */

import covers from '../assets/covers.json';
import { fetchUnsplashImage } from '../services/unsplashService';

const COVERS = covers as Record<string, string>;

/** Anything shaped like a trip from any of the list or detail endpoints. */
export interface TripCoverSource {
  bannerPhotoUrl?: string | null;
  BannerPhotoUrl?: string | null;
  photoUrl?: string | null;
  PhotoUrl?: string | null;
  countries?: string[] | null;
  name?: string | null;
  title?: string | null;
}

/** Normalises "Sri Lanka", "SRI-LANKA", "sri lanka " to the covers.json key form. */
function coverKey(country: string): string {
  return country.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The trip's own saved banner, if it has one. Always wins. */
export function savedBanner(trip: TripCoverSource | null | undefined): string | null {
  if (!trip) return null;
  const raw = trip.bannerPhotoUrl || trip.BannerPhotoUrl || trip.photoUrl || trip.PhotoUrl;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/** First country on the trip, if any. */
export function primaryCountry(trip: TripCoverSource | null | undefined): string | null {
  const first = trip?.countries?.[0];
  if (typeof first !== 'string' || !first.trim()) return null;
  // Countries occasionally arrive as "Thailand, Vietnam" in one string.
  return first.split(',')[0].trim();
}

/** covers.json ships empty-string placeholders for countries with no art yet. */
function nonEmpty(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Curated cover for a country. Synchronous and deterministic - this is what
 * makes cards and the hero agree without a network round trip.
 */
export function curatedCover(country: string | null | undefined): string | null {
  if (!country) return null;
  return nonEmpty(COVERS[coverKey(country)]);
}

/** The generic backstop when nothing else resolved. */
export function defaultCover(): string | null {
  return nonEmpty(COVERS.default);
}

/**
 * The photo to show for a trip, resolved synchronously - no network.
 * Saved banner -> curated country cover -> null.
 *
 * Deliberately does NOT fall back to the generic default: a card that instantly
 * shows the placeholder and never upgrades looks worse than one that waits a
 * moment for a real photo of the destination. Callers should render their own
 * skeleton or gradient on null and let `resolveTripCover` fill it in.
 */
export function tripCoverPhoto(trip: TripCoverSource | null | undefined): string | null {
  return savedBanner(trip) ?? curatedCover(primaryCountry(trip));
}

/**
 * The canonical Unsplash query for a trip. Exported so nothing invents its own
 * variant again - that divergence is the bug this module exists to prevent.
 */
export function tripCoverQuery(trip: TripCoverSource | null | undefined): string {
  const country = primaryCountry(trip);
  const subject = country || trip?.name || trip?.title || 'travel';
  return `${subject} landscape travel`;
}

/**
 * Full resolution including the async Unsplash fallback. Use when a real photo
 * matters more than an instant one (the trip-view hero); cards should prefer the
 * synchronous `tripCoverPhoto` so the grid never pops.
 */
export async function resolveTripCover(trip: TripCoverSource | null | undefined): Promise<string | null> {
  const immediate = tripCoverPhoto(trip);
  if (immediate) return immediate;
  const fromUnsplash = await fetchUnsplashImage(tripCoverQuery(trip), 'landscape');
  return fromUnsplash ?? defaultCover();
}
