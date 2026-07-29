/**
 * Photography for the landing page.
 *
 * Real Unsplash photos, downloaded once and committed under `public/img/landing`
 * rather than fetched at runtime. Self-hosting matters here for three reasons:
 *  - the Unsplash API allows 50 requests/hour in demo mode, which a marketing
 *    page would exhaust in minutes
 *  - `fetchUnsplashImage` requests portrait crops, wrong for every wide slot
 *  - a runtime fetch pops the layout as each photo resolves, and the hero would
 *    arrive after the fold has already painted
 *
 * Photographer attribution lives in `photoCredits.json` and is rendered in the
 * footer. Re-run the fetch script in the scratchpad to refresh the set.
 */

import credits from './photoCredits.json';

export interface PhotoCredit {
  slug: string;
  file: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
}

export const PHOTO_CREDITS = credits as PhotoCredit[];

const BY_SLUG = new Map(PHOTO_CREDITS.map(c => [c.slug, c]));

/** Photo path for a slug, or undefined when that photo isn't in the set. */
export function photo(slug: string): string | undefined {
  return BY_SLUG.get(slug)?.file;
}

/** The photographer's own description, so alt text isn't invented. */
export function photoAlt(slug: string, fallback: string): string {
  return BY_SLUG.get(slug)?.alt || fallback;
}

/**
 * The hero photo. The env var still wins so it can be swapped without a deploy -
 * it was previously the only source, and being unset in every environment is why
 * the hero rendered as a bare gradient.
 */
export const HERO_IMAGE =
  (import.meta.env.VITE_LANDING_HERO_IMAGE_URL as string) || photo('hero');

/** Destination tiles for the photo band that breaks up the long text run. */
export const DESTINATION_TILES: { name: string; url?: string; alt: string }[] = [
  { name: 'Japan',    url: photo('japan'),    alt: photoAlt('japan', 'Japan') },
  { name: 'Vietnam',  url: photo('vietnam'),  alt: photoAlt('vietnam', 'Vietnam') },
  { name: 'Thailand', url: photo('thailand'), alt: photoAlt('thailand', 'Thailand') },
  { name: 'Greece',   url: photo('greece'),   alt: photoAlt('greece', 'Greece') },
  { name: 'Italy',    url: photo('italy'),    alt: photoAlt('italy', 'Italy') },
  { name: 'Peru',     url: photo('peru'),     alt: photoAlt('peru', 'Peru') },
  { name: 'Iceland',  url: photo('iceland'),  alt: photoAlt('iceland', 'Iceland') },
  { name: 'India',    url: photo('india'),    alt: photoAlt('india', 'India') },
].filter(d => !!d.url);

/**
 * The scrolling ticker: label + thumbnail, derived from the photo set.
 *
 * This was two hand-maintained lists - a `TICKER_ITEMS` array of 15 place names
 * in LandingPage.tsx and a `TICKER_THUMBS` map keyed on 8 different ones. They
 * shared exactly one entry (Iceland), so 14 of the 15 rows rendered as bare
 * text beside a single lonely photo. Deriving the labels from the photos we
 * actually have makes that class of drift impossible: add a photo, get a row;
 * no photo, no row.
 */
export const TICKER: { name: string; url: string; alt: string }[] = [
  'japan', 'vietnam', 'thailand', 'greece', 'italy', 'india', 'peru', 'iceland',
]
  .map((slug) => {
    const url = photo(slug);
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);
    return url ? { name, url, alt: photoAlt(slug, name) } : null;
  })
  .filter((x): x is { name: string; url: string; alt: string } => x !== null);

/**
 * Social preview image - the real 1200x630 file in public/, which previously
 * did not exist. Absolute, because crawlers have no base to resolve against.
 */
export const OG_IMAGE =
  (import.meta.env.VITE_OG_COVER_URL as string) || 'https://www.tripician.com/og-cover.jpg';
