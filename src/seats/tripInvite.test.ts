import { describe, it, expect } from 'vitest';
import { inviteDates, tripInviteUrl } from './tripInvite';

describe('tripInviteUrl', () => {
  it('builds the join link from the origin and escapes the token', () => {
    expect(tripInviteUrl('https://tripician.com/', 'a+b')).toBe('https://tripician.com/join/trip/a%2Bb');
  });
});

describe('inviteDates', () => {
  it('reads a range inside one year with the year once', () => {
    expect(inviteDates('2026-10-03', '2026-10-06')).toBe('3 Oct to 6 Oct 2026');
  });

  it('keeps both years when the trip crosses new year', () => {
    expect(inviteDates('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 to 2 Jan 2027');
  });

  it('shows one day once, and nothing without dates', () => {
    expect(inviteDates('2026-10-03', '2026-10-03')).toBe('3 Oct 2026');
    expect(inviteDates('2026-10-03', null)).toBe('3 Oct 2026');
    expect(inviteDates(null, null)).toBeNull();
  });
});
