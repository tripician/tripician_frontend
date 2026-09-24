import { describe, expect, it } from 'vitest';
import { toPickedPlace, typedPlace } from './pickedPlace';

const at = (lat: number, lng: number) => ({ location: { lat: () => lat, lng: () => lng } });

describe('toPickedPlace', () => {
  it('reads the name, coordinates and country from a details result', () => {
    const picked = toPickedPlace({
      name: 'Kyoto',
      types: ['locality', 'political'],
      geometry: at(35.01, 135.77),
      address_components: [
        { long_name: 'Kyoto', short_name: 'Kyoto', types: ['locality'] },
        { long_name: 'Nihon', short_name: 'JP', types: ['country', 'political'] },
      ],
    }, { placeId: 'p-kyoto', name: 'Kyoto', detail: 'Japan' });
    expect(picked).toEqual({
      placeId: 'p-kyoto', name: 'Kyoto', detail: 'Japan', lat: 35.01, lng: 135.77, country: 'Japan', countryCode: 'JP', kind: 'place',
    });
  });

  it('uses the app\'s English country name, not the browser language', () => {
    const picked = toPickedPlace({ address_components: [{ long_name: 'Deutschland', short_name: 'DE', types: ['country'] }] }, { placeId: 'x', name: 'Berlin' });
    expect(picked.country).toBe('Germany');
  });

  it('marks a whole country so TripicianAI can pick the cities inside it', () => {
    const picked = toPickedPlace({ name: 'Vietnam', types: ['country', 'political'], address_components: [{ long_name: 'Vietnam', short_name: 'VN', types: ['country'] }] }, { placeId: 'p-vn', name: 'Vietnam' });
    expect(picked.kind).toBe('country');
    expect(picked.country).toBe('Vietnam');
  });

  it('falls back to what the prediction said when the details lookup failed', () => {
    expect(toPickedPlace(null, { placeId: 'p1', name: 'Hanoi', detail: 'Vietnam', types: ['locality'] }))
      .toEqual({ placeId: 'p1', name: 'Hanoi', detail: 'Vietnam', kind: 'place' });
    expect(toPickedPlace(undefined, { placeId: 'p2', name: 'Japan', types: ['country'] }).kind).toBe('country');
  });

  it('drops coordinates that are broken, half there or at (0,0)', () => {
    expect(toPickedPlace({ geometry: at(0, 0) }, { placeId: 'a', name: 'A' }).lat).toBeUndefined();
    expect(toPickedPlace({ geometry: at(120, 10) }, { placeId: 'a', name: 'A' }).lng).toBeUndefined();
    expect(toPickedPlace({ geometry: { location: { lat: () => { throw new Error('x'); }, lng: () => 1 } } }, { placeId: 'a', name: 'A' }).lat).toBeUndefined();
  });
});

describe('typedPlace', () => {
  it('keeps only the name when Google is not there to resolve it', () => {
    expect(typedPlace('  Spiti Valley ')).toEqual({ placeId: 'typed:spiti valley', name: 'Spiti Valley', kind: 'place' });
  });
});
