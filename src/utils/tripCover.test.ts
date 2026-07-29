import { describe, it, expect, vi, beforeEach } from 'vitest';

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

/**
 * The bug this module fixes: a trip's card and its own page resolved different
 * photos because they used different Unsplash queries. These tests pin the
 * behaviour that keeps them identical.
 */

beforeEach(() => {
  vi.mocked(fetchUnsplashImage).mockClear();
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
    const direct = curatedCover('Thailand');
    expect(direct).toContain('cloudinary');
    expect(curatedCover('  thailand ')).toBe(direct);
  });

  it('normalises punctuation and spaces to the key form', () => {
    // covers.json keys are squashed: "Sri Lanka" -> "srilanka"
    expect(curatedCover('Sri Lanka')).toContain('cloudinary');
  });

  /**
   * covers.json ships 58 empty-string placeholders. Returning '' from here would
   * satisfy every `??` in the chain and render a broken <img> forever, so an
   * empty value must read as absent.
   */
  it('treats an empty placeholder value as no cover', () => {
    expect(curatedCover('Nepal')).toBeNull();
    expect(curatedCover('Germany')).toBeNull();
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
    expect(tripCoverPhoto({ countries: ['Thailand'] })).toContain('cloudinary');
  });

  it('returns null rather than the generic default, so callers can show a skeleton', () => {
    expect(tripCoverPhoto({ countries: ['Nepal'] })).toBeNull();
    expect(tripCoverPhoto({})).toBeNull();
  });

  it('never returns an empty string', () => {
    for (const trip of [{}, { countries: ['Nepal'] }, { bannerPhotoUrl: '  ' }]) {
      expect(tripCoverPhoto(trip)).not.toBe('');
    }
  });
});

describe('tripCoverQuery — the actual regression', () => {
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
 */
describe('covers.json parity with the backend copy', () => {
  it('is byte-for-byte the same data the server renders from', async () => {
    const [frontend, backend] = await Promise.all([
      import('../assets/covers.json'),
      import('../../../../backend/src/tripician.WebApi.BusinessServices/ShareCardServices/Photos/Assets/country-covers.json'),
    ]);
    expect(backend.default).toEqual(frontend.default);
  });
});

describe('resolveTripCover', () => {
  it('does not hit the network when a banner exists', async () => {
    await expect(resolveTripCover({ bannerPhotoUrl: 'https://saved/x.jpg' }))
      .resolves.toBe('https://saved/x.jpg');
    expect(fetchUnsplashImage).not.toHaveBeenCalled();
  });

  it('does not hit the network when a curated cover exists', async () => {
    await expect(resolveTripCover({ countries: ['Thailand'] })).resolves.toContain('cloudinary');
    expect(fetchUnsplashImage).not.toHaveBeenCalled();
  });

  it('asks Unsplash in landscape for countries with no curated art', async () => {
    await expect(resolveTripCover({ countries: ['Nepal'] })).resolves.toBe('https://images.unsplash.com/stub');
    expect(fetchUnsplashImage).toHaveBeenCalledWith('Nepal landscape travel', 'landscape');
  });

  it('falls back to the generic default when Unsplash returns nothing', async () => {
    vi.mocked(fetchUnsplashImage).mockResolvedValueOnce(null);
    await expect(resolveTripCover({ countries: ['Nepal'] })).resolves.toBe(defaultCover());
  });
});
