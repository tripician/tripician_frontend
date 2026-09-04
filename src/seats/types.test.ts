import { describe, it, expect } from 'vitest';
import { canRequestToJoin, describeSpots, type TripSeats } from './types';

const seats = (over: Partial<TripSeats> = {}): TripSeats => ({
  tripId: 't1',
  joinPolicy: 'OpenToRequests',
  capacity: 4,
  takenSeats: 2,
  spotsLeft: 2,
  pricePerPerson: null,
  priceCurrency: null,
  listingBlurb: null,
  confirmed: false,
  pendingRequests: 0,
  viewerStatus: null,
  operatorName: null,
  ...over,
});

describe('describeSpots', () => {
  it('counts down, and says Full at zero', () => {
    expect(describeSpots({ spotsLeft: 3 })).toBe('3 spots left');
    expect(describeSpots({ spotsLeft: 1 })).toBe('1 spot left');
    expect(describeSpots({ spotsLeft: 0 })).toBe('Full');
  });

  it('says nothing when capacity is unknown', () => {
    // Null is "the organiser did not say", NOT "unlimited". Rendering a number
    // here would invent a fact about someone else's trip.
    expect(describeSpots({ spotsLeft: null })).toBeNull();
  });
});

describe('canRequestToJoin', () => {
  it('allows a stranger onto an open trip with room', () => {
    expect(canRequestToJoin(seats(), false)).toBe(true);
  });

  it('never offers the owner a way to join their own trip', () => {
    // The server refuses this too, but a button guaranteed to fail is worse
    // than no button.
    expect(canRequestToJoin(seats(), true)).toBe(false);
  });

  it('respects the join policy', () => {
    expect(canRequestToJoin(seats({ joinPolicy: 'Closed' }), false)).toBe(false);
    expect(canRequestToJoin(seats({ joinPolicy: 'InviteOnly' }), false)).toBe(false);
  });

  it('stops at a full trip', () => {
    expect(canRequestToJoin(seats({ spotsLeft: 0, takenSeats: 4 }), false)).toBe(false);
  });

  it('allows asking when capacity was never set', () => {
    expect(canRequestToJoin(seats({ capacity: null, spotsLeft: null }), false)).toBe(true);
  });

  it('offers nothing to anyone already involved', () => {
    // Including declined: the row is kept precisely so the same person cannot
    // re-apply in a loop.
    for (const status of ['requested', 'invited', 'active', 'declined', 'left'] as const) {
      expect(canRequestToJoin(seats({ viewerStatus: status }), false), status).toBe(false);
    }
  });
});
