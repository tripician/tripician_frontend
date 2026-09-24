import { describe, expect, it } from 'vitest';
import { highlightsLine, likedByLine, planDates, planSummaryLine, stopNights, visibleStops } from './postcardPreview';

const aditi = { userId: 2, name: 'Aditi Rao', avatarUrl: null };

describe('likedByLine', () => {
  it('says nothing at zero, because a zero is not social proof', () => {
    expect(likedByLine([], 0, false)).toBeNull();
    expect(likedByLine([aditi], 0, false)).toBeNull();
  });

  it('names one liker and counts the rest', () => {
    expect(likedByLine([aditi], 1, false)).toBe('Liked by Aditi Rao');
    expect(likedByLine([aditi], 2, false)).toBe('Liked by Aditi Rao and 1 other');
    expect(likedByLine([aditi], 13, false)).toBe('Liked by Aditi Rao and 12 others');
  });

  it('calls the reader "you" and never counts them twice', () => {
    expect(likedByLine([], 1, true)).toBe('Liked by you');
    expect(likedByLine([aditi], 2, true)).toBe('Liked by you and Aditi Rao');
    expect(likedByLine([aditi], 13, true)).toBe('Liked by you, Aditi Rao and 11 others');
    expect(likedByLine([], 4, true)).toBe('Liked by you and 3 others');
  });

  it('falls back to a plain count when every liker is private', () => {
    expect(likedByLine(null, 3, false)).toBe('3 likes');
    expect(likedByLine([], 1, false)).toBe('1 like');
  });

  it('never goes negative when the faces are staler than the count', () => {
    expect(likedByLine([aditi], 1, true)).toBe('Liked by you and Aditi Rao');
  });
});

describe('visibleStops', () => {
  const stops = ['Nuuk', 'Ilulissat', 'Disko', 'Uummannaq', 'Sisimiut', 'Kangerlussuaq'].map((name) => ({ name, nights: 1 }));

  it('caps the line and says how many more', () => {
    expect(visibleStops(stops, 9, 4)).toEqual({ shown: stops.slice(0, 4), more: 5 });
  });

  it('adds no "+N" when everything fits', () => {
    expect(visibleStops(stops.slice(0, 3), 3, 4)).toEqual({ shown: stops.slice(0, 3), more: 0 });
  });

  it('trusts the list when the count is short of it', () => {
    expect(visibleStops(stops, 0, 4).more).toBe(2);
  });
});

describe('stopNights', () => {
  it('drops the label for a stop with no dates', () => {
    expect(stopNights({ name: 'Nuuk', nights: 0 })).toBeNull();
    expect(stopNights({ name: 'Nuuk', nights: 1 })).toBe('1 night');
    expect(stopNights({ name: 'Nuuk', nights: 3 })).toBe('3 nights');
  });
});

describe('highlightsLine', () => {
  it('lists the highlights and counts the other places', () => {
    expect(highlightsLine(['Icefjord', 'Cathedral'], 11)).toBe('Icefjord, Cathedral and 9 more');
  });

  it('reads as a sentence when there is nothing more', () => {
    expect(highlightsLine(['Icefjord'], 1)).toBe('Icefjord');
    expect(highlightsLine(['Icefjord', 'Cathedral', 'Harbour'], 3)).toBe('Icefjord, Cathedral and Harbour');
  });

  it('says nothing without a single named place', () => {
    expect(highlightsLine([], 4)).toBeNull();
    expect(highlightsLine(['  '], 1)).toBeNull();
  });
});

describe('planDates and planSummaryLine', () => {
  it('widens the range only as far as it needs', () => {
    expect(planDates('2026-10-12T00:00:00', '2026-10-19T00:00:00')).toBe('12 to 19 Oct 2026');
    expect(planDates('2026-09-28T00:00:00', '2026-10-05T00:00:00')).toBe('28 Sep to 5 Oct 2026');
    expect(planDates('2026-12-28T00:00:00', '2027-01-04T00:00:00')).toBe('28 Dec 2026 to 4 Jan 2027');
    expect(planDates('2026-10-12T00:00:00', null)).toBe('From 12 Oct 2026');
    expect(planDates(null, '2026-10-19')).toBeNull();
  });

  it('drops whichever half the plan does not state', () => {
    expect(planSummaryLine({ nights: 7, startDate: '2026-10-12', endDate: '2026-10-19' })).toBe('7 nights · 12 to 19 Oct 2026');
    expect(planSummaryLine({ nights: 5, startDate: null, endDate: null })).toBe('5 nights');
    expect(planSummaryLine({ nights: 0, startDate: null, endDate: null })).toBeNull();
  });
});
