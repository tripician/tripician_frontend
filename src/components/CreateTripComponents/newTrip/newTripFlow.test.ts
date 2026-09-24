import { describe, expect, it } from 'vitest';
import {
  buildCreatePayload, canContinue, derivedCountries, endDateFor, initialNewTripState, newTripReducer,
  placesLine, splitNights, suggestTripName, tripNameFor, type NewTripAction, type NewTripState,
} from './newTripFlow';
import type { PickedPlace } from '../../places/pickedPlace';

const delhi: PickedPlace = { placeId: 'p-del', name: 'Delhi', lat: 28.61, lng: 77.2, country: 'India', countryCode: 'IN', kind: 'place' };
const kyoto: PickedPlace = { placeId: 'p-kyo', name: 'Kyoto', lat: 35.01, lng: 135.77, country: 'Japan', kind: 'place' };
const osaka: PickedPlace = { placeId: 'p-osa', name: 'Osaka', lat: 34.69, lng: 135.5, country: 'Japan', kind: 'place' };
const japan: PickedPlace = { placeId: 'p-jp', name: 'Japan', country: 'Japan', kind: 'country' };

const run = (actions: NewTripAction[], from: NewTripState = initialNewTripState()) => actions.reduce(newTripReducer, from);

const guided = () => run([
  { type: 'setOrigin', place: delhi }, { type: 'next' },
  { type: 'addPlace', place: kyoto }, { type: 'addPlace', place: osaka }, { type: 'next' },
  { type: 'setStart', date: '2026-10-12' }, { type: 'setNights', nights: 7 }, { type: 'next' },
  { type: 'setTripType', value: 'honeymoon' }, { type: 'next' },
  { type: 'setDietary', value: 'vegetarian' }, { type: 'next' },
]);

describe('the step machine', () => {
  it('asks one thing at a time and will not move on without the answer', () => {
    let s = initialNewTripState();
    expect(s.step).toBe('origin');
    s = newTripReducer(s, { type: 'next' });
    expect(s.step).toBe('origin');
    s = run([{ type: 'setOrigin', place: delhi }, { type: 'next' }], s);
    expect(s.step).toBe('places');
    expect(canContinue(s)).toBe(false);
  });

  it('lets trip type and food be skipped', () => {
    const s = run([
      { type: 'setOrigin', place: delhi }, { type: 'next' },
      { type: 'addPlace', place: kyoto }, { type: 'next' },
      { type: 'setStart', date: '2026-10-12' }, { type: 'next' },
      { type: 'next' }, { type: 'next' },
    ]);
    expect(s.step).toBe('finish');
    expect(s.tripType).toBeNull();
  });

  it('goes back one screen at a time', () => {
    expect(newTripReducer(guided(), { type: 'back' }).step).toBe('food');
  });

  it('jumps to dates for "I\'ll plan everything myself" and Back returns where it came from', () => {
    const s = run([{ type: 'setOrigin', place: delhi }, { type: 'next' }, { type: 'goBlank' }]);
    expect(s).toMatchObject({ blank: true, step: 'dates', blankFrom: 'places' });
    expect(newTripReducer(s, { type: 'back' })).toMatchObject({ blank: false, step: 'places' });
  });

  it('ignores a place picked twice and caps the list', () => {
    const s = run([{ type: 'addPlace', place: kyoto }, { type: 'addPlace', place: kyoto }]);
    expect(s.places).toHaveLength(1);
    const many = run(Array.from({ length: 12 }, (_, i) => ({ type: 'addPlace', place: { ...kyoto, placeId: `k${i}` } } as NewTripAction)));
    expect(many.places).toHaveLength(8);
  });

  it('keeps nights between 1 and 60', () => {
    expect(run([{ type: 'setNights', nights: 0 }]).nights).toBe(1);
    expect(run([{ type: 'setNights', nights: 400 }]).nights).toBe(60);
  });
});

describe('initialNewTripState', () => {
  it('reads a prefill: countries become picks, a name is kept, the group is carried', () => {
    const s = initialNewTripState({ name: 'Japan with Mum', countries: ['Japan'], organizationId: 'g-1', vibe: 'culture' });
    expect(s.places).toEqual([{ placeId: 'country:japan', name: 'Japan', country: 'Japan', kind: 'country' }]);
    expect(s).toMatchObject({ name: 'Japan with Mum', nameEdited: true, organizationId: 'g-1', vibe: 'culture' });
  });

  it('treats a click event handed over as a prefill as no prefill at all', () => {
    const s = initialNewTripState({ nativeEvent: {}, target: {}, name: 'click' });
    expect(s).toMatchObject({ name: '', nameEdited: false, places: [], organizationId: null });
  });
});

describe('helpers', () => {
  it('shares nights with the remainder up front and never leaves a stop without one', () => {
    expect(splitNights(7, 2)).toEqual([4, 3]);
    expect(splitNights(9, 3)).toEqual([3, 3, 3]);
    expect(splitNights(2, 3)).toEqual([1, 1, 1]);
    expect(splitNights(5, 0)).toEqual([]);
  });

  it('names a trip from its places, and never leaves it empty', () => {
    expect(suggestTripName([kyoto])).toBe('Trip to Kyoto');
    expect(suggestTripName([kyoto, osaka])).toBe('Kyoto & Osaka');
    expect(suggestTripName([kyoto, osaka, japan])).toBe('Kyoto, Osaka & more');
    expect(suggestTripName([])).toBe('');
    expect(tripNameFor(initialNewTripState())).toBe('Untitled trip');
  });

  it('lists countries once each, in the order picked', () => {
    expect(derivedCountries([kyoto, delhi, osaka])).toEqual(['Japan', 'India']);
  });

  it('works out the return date', () => {
    expect(endDateFor('2026-10-12', 7)).toBe('2026-10-19');
    expect(endDateFor(null, 7)).toBeNull();
  });

  it('keeps the summary line short', () => {
    expect(placesLine([kyoto, osaka])).toBe('Kyoto, Osaka');
    expect(placesLine([kyoto, osaka, japan, delhi])).toBe('Kyoto, Osaka and 2 more');
  });
});

describe('buildCreatePayload', () => {
  it('sends the answers, the countries and one stop per place', () => {
    expect(buildCreatePayload(guided(), 'self')).toEqual({
      name: 'Kyoto & Osaka',
      description: '',
      countries: ['Japan'],
      startDate: '2026-10-12',
      endDate: '2026-10-19',
      visibility: 0,
      currencyCode: 'USD',
      vibe: 'romantic',
      invites: [],
      preferences: {
        interests: [],
        origin: { name: 'Delhi', lat: 28.61, lng: 77.2, placeId: 'p-del', country: 'India' },
        tripType: 'honeymoon',
        company: 'couple',
        dietary: 'vegetarian',
      },
      stops: [
        { name: 'Kyoto', lat: 35.01, lng: 135.77, placeId: 'p-kyo', nights: 4 },
        { name: 'Osaka', lat: 34.69, lng: 135.5, placeId: 'p-osa', nights: 3 },
      ],
    });
  });

  it('puts nothing in preferences for a question that was skipped', () => {
    const s = run([
      { type: 'setOrigin', place: delhi }, { type: 'next' },
      { type: 'addPlace', place: kyoto }, { type: 'next' },
      { type: 'setStart', date: '2026-10-12' },
    ]);
    const payload = buildCreatePayload(s, 'self');
    expect(payload.preferences).toEqual({ interests: [], origin: { name: 'Delhi', lat: 28.61, lng: 77.2, placeId: 'p-del', country: 'India' } });
    expect(payload.vibe).toBeNull();
  });

  it('lets TripicianAI pick the cities when only whole countries were picked', () => {
    const s = run([{ type: 'addPlace', place: japan }, { type: 'setStart', date: '2026-10-12' }]);
    expect(buildCreatePayload(s, 'ai').stops).toBeUndefined();
    expect(buildCreatePayload(s, 'ai').countries).toEqual(['Japan']);
    expect(buildCreatePayload(s, 'self').stops).toEqual([{ name: 'Japan', lat: null, lng: null, placeId: 'p-jp', nights: 5 }]);
  });

  it('stretches the trip when there are more places than nights', () => {
    const s = run([{ type: 'addPlace', place: kyoto }, { type: 'addPlace', place: osaka }, { type: 'addPlace', place: delhi }, { type: 'setStart', date: '2026-10-12' }, { type: 'setNights', nights: 2 }]);
    const payload = buildCreatePayload(s, 'self');
    expect(payload.stops?.map((x) => x.nights)).toEqual([1, 1, 1]);
    expect(payload.endDate).toBe('2026-10-15');
  });

  it('makes an untitled trip with no places and no preferences for dates only', () => {
    const s = run([{ type: 'goBlank' }, { type: 'setStart', date: '2026-11-01' }, { type: 'setNights', nights: 3 }]);
    expect(buildCreatePayload(s, 'blank')).toEqual({
      name: 'Untitled trip', description: '', countries: [], startDate: '2026-11-01', endDate: '2026-11-04',
      visibility: 0, currencyCode: 'USD', vibe: null, invites: [],
    });
  });

  it('carries the group it was started from', () => {
    const s = run([{ type: 'goBlank' }, { type: 'setStart', date: '2026-11-01' }], initialNewTripState({ organizationId: 'g-1' }));
    expect(buildCreatePayload(s, 'blank').organizationId).toBe('g-1');
  });

  it('never sends a typed place id to the server', () => {
    const typed: PickedPlace = { placeId: 'typed:spiti', name: 'Spiti', kind: 'place' };
    const s = run([{ type: 'setOrigin', place: typed }, { type: 'addPlace', place: typed }, { type: 'setStart', date: '2026-11-01' }]);
    const payload = buildCreatePayload(s, 'self');
    expect(payload.stops?.[0].placeId).toBeNull();
    expect(payload.preferences?.origin).toEqual({ name: 'Spiti' });
  });
});
