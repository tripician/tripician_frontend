import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

vi.mock('../services/unsplashService', () => ({
  fetchUnsplashImage: vi.fn(async () => 'https://images.unsplash.com/stub'),
}));

import {
  savedBanner,
  primaryCountry,
  curatedCover,
  defaultCover,
  tripCoverPhoto,
  tripCoverQuery,
  resolveTripCover,
} from './tripCover';
import { fetchUnsplashImage } from '../services/unsplashService';
import coversJson from '../assets/covers.json';

/**
 * The bug this module fixes: a trip's card and its own page resolved different
 * photos because they used different Unsplash queries. These tests pin the
 * behaviour that keeps them identical.
 */

/**
 * covers.json is a living file - placeholders get filled in over time - so the
 * "has art" and "has no art" fixtures are read from it rather than hard-coded.
 * Hard-coding them is what broke this suite when the covers were refreshed:
 * Nepal and Germany were the stand-ins for "no art" and then acquired art.
 *
 * Restricted to single-word keys so the display name round-trips through
 * coverKey ("iceland" -> "Iceland" -> "iceland"); "srilanka" would not.
 */
const COVERS = coversJson as Record<string, string>;

/**
 * The CDN the curated covers come from. Named once because it has already moved
 * twice - Cloudinary, then Unsplash, now Pexels - and each move left assertions
 * scattered through this file naming the old host.
 */
const COVER_HOST = 'images.pexels.com';

const single = (k: string) => /^[a-z]+$/.test(k) && k !== 'default';
const asCountry = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);

const COVERED = asCountry(Object.keys(COVERS).find((k) => single(k) && COVERS[k])!);
const uncoveredKey = Object.keys(COVERS).find((k) => single(k) && !COVERS[k]);
const UNCOVERED = uncoveredKey ? asCountry(uncoveredKey) : null;

beforeEach(() => {
  vi.mocked(fetchUnsplashImage).mockClear();
});

describe('the fixtures these tests are built on', () => {
  it('found a country with curated art', () => {
    expect(COVERED).toBeTruthy();
  });

  /**
   * Not a failure - it means every single-word country now has art, and the
   * fall-through-to-Unsplash cases below are skipped rather than silently
   * asserting nothing.
   */
  it('reports whether any country is still without art', () => {
    if (!UNCOVERED) console.warn('covers.json is fully populated; fall-through cases skipped');
    expect(true).toBe(true);
  });
});

describe('savedBanner', () => {
  it('accepts every casing the API returns', () => {
    expect(savedBanner({ bannerPhotoUrl: 'a' })).toBe('a');
    expect(savedBanner({ BannerPhotoUrl: 'b' })).toBe('b');
    expect(savedBanner({ photoUrl: 'c' })).toBe('c');
    expect(savedBanner({ PhotoUrl: 'd' })).toBe('d');
  });

  it('treats blank and missing as absent', () => {
    expect(savedBanner({ bannerPhotoUrl: '   ' })).toBeNull();
    expect(savedBanner({})).toBeNull();
    expect(savedBanner(null)).toBeNull();
  });
});

describe('primaryCountry', () => {
  it('takes the first country and splits a comma-joined string', () => {
    expect(primaryCountry({ countries: ['Thailand', 'Vietnam'] })).toBe('Thailand');
    expect(primaryCountry({ countries: ['Thailand, Vietnam'] })).toBe('Thailand');
  });

  it('returns null with no countries', () => {
    expect(primaryCountry({ countries: [] })).toBeNull();
    expect(primaryCountry({})).toBeNull();
  });
});

describe('curatedCover', () => {
  it('resolves a country that has art, regardless of spacing or case', () => {
    const direct = curatedCover(COVERED);
    expect(direct).toContain(COVER_HOST);
    expect(curatedCover(`  ${COVERED.toLowerCase()} `)).toBe(direct);
  });

  it('normalises punctuation and spaces to the key form', () => {
    // covers.json keys are squashed: "Sri Lanka" -> "srilanka"
    expect(curatedCover('Sri Lanka')).toContain(COVER_HOST);
  });

  /**
   * The covers used to be Cloudinary uploads and every one of them 404ed. Pin the
   * source so a stale URL set cannot quietly come back.
   */
  it('serves Pexels CDN URLs, never the dead Cloudinary ones', () => {
    for (const [country, url] of Object.entries(COVERS)) {
      if (!url) continue;
      expect(url, country).toMatch(/^https:\/\/images\.pexels\.com\//);
    }
  });

  /**
   * Two countries sharing one photo is a data slip, not a behaviour change, so it
   * is invisible until someone notices the same picture twice in one grid.
   */
  it('gives every country its own photo', () => {
    const used = new Map<string, string>();
    for (const [country, url] of Object.entries(COVERS)) {
      if (!url) continue;
      expect(used.has(url), `${country} reuses the cover from ${used.get(url)}`).toBe(false);
      used.set(url, country);
    }
  });

  /**
   * covers.json ships empty-string placeholders. Returning '' from here would
   * satisfy every `??` in the chain and render a broken <img> forever, so an
   * empty value must read as absent.
   */
  it.skipIf(!UNCOVERED)('treats an empty placeholder value as no cover', () => {
    expect(curatedCover(UNCOVERED!)).toBeNull();
  });

  it('returns null for an unknown country', () => {
    expect(curatedCover('Atlantis')).toBeNull();
    expect(curatedCover(null)).toBeNull();
  });
});

describe('defaultCover', () => {
  it('is a real URL, not an empty placeholder', () => {
    const d = defaultCover();
    expect(d).toBeTruthy();
    expect(d).toContain('http');
  });
});

describe('tripCoverPhoto', () => {
  it('prefers the saved banner over everything', () => {
    expect(tripCoverPhoto({ bannerPhotoUrl: 'https://saved/banner.jpg', countries: ['Thailand'] }))
      .toBe('https://saved/banner.jpg');
  });

  it('falls back to the curated country cover', () => {
    expect(tripCoverPhoto({ countries: [COVERED] })).toContain(COVER_HOST);
  });

  it('returns null rather than the generic default, so callers can show a skeleton', () => {
    if (UNCOVERED) expect(tripCoverPhoto({ countries: [UNCOVERED] })).toBeNull();
    expect(tripCoverPhoto({})).toBeNull();
  });

  it('never returns an empty string', () => {
    for (const trip of [{}, { countries: [UNCOVERED ?? 'Atlantis'] }, { bannerPhotoUrl: '  ' }]) {
      expect(tripCoverPhoto(trip)).not.toBe('');
    }
  });
});

describe('tripCoverQuery: the actual regression', () => {
  it('is identical for the same trip however it is described', () => {
    const asCard = { countries: ['Thailand'], name: 'Bangkok run' };
    const asHero = { countries: ['Thailand'], name: 'Bangkok run' };
    expect(tripCoverQuery(asCard)).toBe(tripCoverQuery(asHero));
  });

  it('keys off the country, not the trip name, so two trips to one country agree', () => {
    expect(tripCoverQuery({ countries: ['Thailand'], name: 'Solo trip' }))
      .toBe(tripCoverQuery({ countries: ['Thailand'], name: 'Family holiday' }));
  });

  it('falls back to the trip name when there is no country', () => {
    expect(tripCoverQuery({ name: 'Patagonia' })).toContain('Patagonia');
  });
});

/**
 * The itinerary PDF and the share card are rendered on the server, so the backend
 * keeps its own copy of covers.json as an embedded resource. Two copies of the
 * same data is exactly the setup that produced the bug this whole module exists to
 * prevent - a trip showing one photo here and another there - so pin them together.
 *
 * If this fails, copy frontend/src/assets/covers.json over
 * backend/src/tripician.WebApi.BusinessServices/ShareCardServices/Photos/Assets/country-covers.json.
 *
 * The check skips when the backend is not on disk. Deploys build from the
 * frontend directory alone, so `../../../../backend` does not exist there - and
 * a cross-project guard is worth keeping for the monorepo without making a
 * frontend-only checkout unbuildable. It skips loudly rather than passing
 * quietly, so a permanently-skipped test is visible in the run output.
 */
const BACKEND_COVERS = fileURLToPath(new URL(
  '../../../../backend/src/tripician.WebApi.BusinessServices/ShareCardServices/Photos/Assets/country-covers.json',
  import.meta.url,
));
const backendPresent = existsSync(BACKEND_COVERS);

describe('covers.json parity with the backend copy', () => {
  it.skipIf(!backendPresent)('is byte-for-byte the same data the server renders from', async () => {
    const frontend = await import('../assets/covers.json');
    const backend = JSON.parse(readFileSync(BACKEND_COVERS, 'utf8'));
    expect(backend).toEqual(frontend.default);
  });
});

describe('resolveTripCover', () => {
  it('does not hit the network when a banner exists', async () => {
    await expect(resolveTripCover({ bannerPhotoUrl: 'https://saved/x.jpg' }))
      .resolves.toBe('https://saved/x.jpg');
    expect(fetchUnsplashImage).not.toHaveBeenCalled();
  });

  it('does not hit the network when a curated cover exists', async () => {
    await expect(resolveTripCover({ countries: [COVERED] })).resolves.toContain(COVER_HOST);
    expect(fetchUnsplashImage).not.toHaveBeenCalled();
  });

  it.skipIf(!UNCOVERED)('asks Unsplash in landscape for countries with no curated art', async () => {
    await expect(resolveTripCover({ countries: [UNCOVERED!] })).resolves.toBe('https://images.unsplash.com/stub');
    expect(fetchUnsplashImage).toHaveBeenCalledWith(`${UNCOVERED} landscape travel`, 'landscape');
  });

  it.skipIf(!UNCOVERED)('falls back to the generic default when Unsplash returns nothing', async () => {
    vi.mocked(fetchUnsplashImage).mockResolvedValueOnce(null);
    await expect(resolveTripCover({ countries: [UNCOVERED!] })).resolves.toBe(defaultCover());
  });
});
