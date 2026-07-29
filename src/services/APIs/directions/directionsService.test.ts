import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchLeg, __clearDirectionsCache } from './directionsService';

const AL_AIN = { lat: 24.2075, lng: 55.7447 };
const AL_KHARJ = { lat: 24.1483, lng: 47.3346 };
const TOKEN = 'pk.test';

const okResponse = (coords: number[][], distance = 812345, duration = 28800) => ({
  ok: true,
  json: async () => ({
    code: 'Ok',
    routes: [{ geometry: { type: 'LineString', coordinates: coords }, distance, duration }],
  }),
});

describe('fetchLeg', () => {
  beforeEach(() => {
    __clearDirectionsCache();
    vi.restoreAllMocks();
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns road geometry when the API answers', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okResponse([[55.7, 24.2], [51, 24.1], [47.3, 24.1]]));
    vi.stubGlobal('fetch', fetchSpy);

    const leg = await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);

    expect(leg.kind).toBe('road');
    expect(leg.coords).toHaveLength(3);
    expect(leg.distanceKm).toBeCloseTo(812.345, 2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/driving/');
  });

  it('never calls the API for a flight - it draws an arc instead', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const leg = await fetchLeg(AL_AIN, { lat: 35.68, lng: 139.65 }, 'Flight', TOKEN);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(leg.kind).toBe('arc');
    expect(leg.coords.length).toBeGreaterThan(2);
    // Endpoints are preserved so the arc still joins the two markers.
    expect(leg.coords[0][0]).toBeCloseTo(AL_AIN.lng, 6);
  });

  it('matches transport mode case-insensitively (the store holds both "Car" and "car")', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await fetchLeg(AL_AIN, AL_KHARJ, 'FERRY', TOKEN);
    await fetchLeg(AL_KHARJ, AL_AIN, '  flight  ', TOKEN);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to an arc on NoRoute - which Mapbox returns with HTTP 200', async () => {
    // Intercontinental and over-water routing is unsupported by design, and the
    // failure arrives as a 200 with a code in the body, so status is not enough.
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'NoRoute', message: 'No route found' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const leg = await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);

    expect(leg.kind).toBe('arc');
    expect(leg.coords.length).toBeGreaterThan(2);
    expect(leg.distanceKm).toBeNull();
  });

  it('falls back to an arc on a 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    const leg = await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    expect(leg.kind).toBe('arc');
  });

  it('falls back to an arc when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const leg = await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    expect(leg.kind).toBe('arc');
  });

  it('falls back to an arc with no token, without calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const leg = await fetchLeg(AL_AIN, AL_KHARJ, 'Car', undefined);
    expect(leg.kind).toBe('arc');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('caches by coordinates, so a rename or remount costs nothing', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okResponse([[55.7, 24.2], [47.3, 24.1]]));
    vi.stubGlobal('fetch', fetchSpy);

    await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    await fetchLeg({ ...AL_AIN }, { ...AL_KHARJ }, 'car', TOKEN); // new objects, same coords

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent requests for the same leg', async () => {
    // Two MapPanels can be mounted at once, and StrictMode doubles mounts again.
    let resolve!: (v: unknown) => void;
    const fetchSpy = vi.fn().mockReturnValue(new Promise((r) => { resolve = r; }));
    vi.stubGlobal('fetch', fetchSpy);

    const a = fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    const b = fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    resolve(okResponse([[55.7, 24.2], [47.3, 24.1]]));
    await Promise.all([a, b]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('treats direction as significant - A to B is not B to A', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okResponse([[55.7, 24.2], [47.3, 24.1]]));
    vi.stubGlobal('fetch', fetchSpy);

    await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    await fetchLeg(AL_KHARJ, AL_AIN, 'Car', TOKEN);

    // One-way streets and motorway ramps make the reverse genuinely different;
    // reusing the geometry would be quietly wrong.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('uses the walking and cycling profiles where the mode calls for it', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okResponse([[55.7, 24.2], [47.3, 24.1]]));
    vi.stubGlobal('fetch', fetchSpy);

    await fetchLeg(AL_AIN, AL_KHARJ, 'Walk', TOKEN);
    await fetchLeg(AL_AIN, AL_KHARJ, 'Bike', TOKEN);

    expect(String(fetchSpy.mock.calls[0][0])).toContain('/walking/');
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/cycling/');
  });

  it('falls back to an arc when the API returns a degenerate geometry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse([[55.7, 24.2]])));
    const leg = await fetchLeg(AL_AIN, AL_KHARJ, 'Car', TOKEN);
    expect(leg.kind).toBe('arc');
  });
});
