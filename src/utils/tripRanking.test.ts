import { describe, it, expect } from 'vitest';
import { compareTripsForFeed, engagementScore, verifiedRank, recruitingRank } from './tripRanking';

/**
 * "Tripician Verified trips rank first" is a product promise the badge makes visible,
 * so a regression here is a broken promise rather than a cosmetic reordering. It is
 * enforced in two places that must agree: an OrderByDescending in the backend queries
 * and this comparator. Only this half is testable, so test it properly.
 */

const trip = (over: Record<string, unknown> = {}) => ({
  name: 'Trip', likesCount: 0, cloneCount: 0, commentsCount: 0, verified: false, ...over,
});

describe('engagementScore', () => {
  it('weighs a comment above a clone above a like', () => {
    expect(engagementScore(trip({ likesCount: 1 }))).toBe(1);
    expect(engagementScore(trip({ cloneCount: 1 }))).toBe(2);
    expect(engagementScore(trip({ commentsCount: 1 }))).toBe(3);
  });

  it('reads both casings the API has served', () => {
    expect(engagementScore({ likes: 5, CommentsCount: 2 })).toBe(5 + 6);
  });

  it('treats missing and unparseable counters as zero', () => {
    expect(engagementScore({})).toBe(0);
    expect(engagementScore({ likesCount: 'lots', cloneCount: null })).toBe(0);
  });
});

describe('verifiedRank', () => {
  it('accepts an explicit true in either casing', () => {
    expect(verifiedRank({ verified: true })).toBe(1);
    expect(verifiedRank({ Verified: true })).toBe(1);
  });

  /*
   * The strictness is the point. This drives a public trust claim, so anything short
   * of the server explicitly saying yes has to rank as unverified.
   */
  it('refuses to promote on a truthy value that is not true', () => {
    expect(verifiedRank({ verified: 'yes' })).toBe(0);
    expect(verifiedRank({ verified: 1 })).toBe(0);
    expect(verifiedRank({ verified: {} })).toBe(0);
    expect(verifiedRank({})).toBe(0);
    expect(verifiedRank(undefined)).toBe(0);
  });
});

describe('compareTripsForFeed', () => {
  /*
   * The defining case, and the deliberate cost of choosing a hard tier over a score
   * boost: a barely-engaged verified trip beats a wildly popular unverified one.
   */
  it('puts a verified trip above an unverified one no matter the engagement gap', () => {
    const quietButVerified = trip({ name: 'Lisbon', verified: true, likesCount: 1 });
    const wildlyPopular = trip({ name: 'Bali', likesCount: 900, commentsCount: 200 });

    expect([wildlyPopular, quietButVerified].sort(compareTripsForFeed).map(t => t.name))
      .toEqual(['Lisbon', 'Bali']);
  });

  it('ranks by engagement inside the verified tier', () => {
    const a = trip({ name: 'A', verified: true, likesCount: 10 });
    const b = trip({ name: 'B', verified: true, commentsCount: 10 });
    expect([a, b].sort(compareTripsForFeed).map(t => t.name)).toEqual(['B', 'A']);
  });

  it('ranks by engagement inside the unverified tier', () => {
    const a = trip({ name: 'A', likesCount: 3 });
    const b = trip({ name: 'B', likesCount: 9 });
    expect([a, b].sort(compareTripsForFeed).map(t => t.name)).toEqual(['B', 'A']);
  });

  it('keeps both tiers contiguous across a mixed list', () => {
    const list = [
      trip({ name: 'u-high', likesCount: 500 }),
      trip({ name: 'v-low', verified: true, likesCount: 1 }),
      trip({ name: 'u-low', likesCount: 2 }),
      trip({ name: 'v-high', verified: true, likesCount: 50 }),
    ];
    expect(list.sort(compareTripsForFeed).map(t => t.name))
      .toEqual(['v-high', 'v-low', 'u-high', 'u-low']);
  });

  it('is a valid comparator: equal trips compare as equal', () => {
    const a = trip({ verified: true, likesCount: 4 });
    const b = trip({ verified: true, likesCount: 4 });
    expect(compareTripsForFeed(a, b)).toBe(0);
    expect(compareTripsForFeed(b, a)).toBe(0);
  });

  it('puts a recruiting trip above a more popular one that is not recruiting', () => {
    const recruiting = trip({ name: 'Ladakh', joinPolicy: 'OpenToRequests', spotsLeft: 2 });
    const popular = trip({ name: 'Bali', likesCount: 400 });
    expect([popular, recruiting].sort(compareTripsForFeed).map(t => t.name))
      .toEqual(['Ladakh', 'Bali']);
  });

  it('keeps Verified above recruiting', () => {
    const recruiting = trip({ name: 'Ladakh', joinPolicy: 'OpenToRequests', spotsLeft: 2 });
    const verified = trip({ name: 'Lisbon', verified: true });
    expect([recruiting, verified].sort(compareTripsForFeed).map(t => t.name))
      .toEqual(['Lisbon', 'Ladakh']);
  });

  it('ranks by engagement inside the recruiting tier', () => {
    const a = trip({ name: 'A', joinPolicy: 'OpenToRequests', spotsLeft: 1, likesCount: 2 });
    const b = trip({ name: 'B', joinPolicy: 'OpenToRequests', spotsLeft: 1, likesCount: 8 });
    expect([a, b].sort(compareTripsForFeed).map(t => t.name)).toEqual(['B', 'A']);
  });
});

describe('recruitingRank', () => {
  it('counts an open trip with room', () => {
    expect(recruitingRank({ joinPolicy: 'OpenToRequests', spotsLeft: 3 })).toBe(1);
  });

  // "The organiser did not say" is not "full", so it still counts.
  it('counts an open trip with no stated capacity', () => {
    expect(recruitingRank({ joinPolicy: 'OpenToRequests', spotsLeft: null })).toBe(1);
    expect(recruitingRank({ joinPolicy: 'OpenToRequests' })).toBe(1);
  });

  it('does not count a full trip', () => {
    expect(recruitingRank({ joinPolicy: 'OpenToRequests', spotsLeft: 0 })).toBe(0);
  });

  it('does not count closed or invite-only trips', () => {
    expect(recruitingRank({ joinPolicy: 'Closed', spotsLeft: 5 })).toBe(0);
    expect(recruitingRank({ joinPolicy: 'InviteOnly', spotsLeft: 5 })).toBe(0);
    expect(recruitingRank({})).toBe(0);
    expect(recruitingRank(undefined)).toBe(0);
  });
});
