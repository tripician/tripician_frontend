import { describe, it, expect } from 'vitest';
import { mapTripVM, formatRelativeTime, rowsFrom } from './tripViewModel';

const viewer = { id: '42', fname: 'Sara', lname: 'Elle', email: 'sara@example.com', profilepicture: 'me.jpg' };

describe('mapTripVM: ownership', () => {
  // Every Profile tab filters on these three flags, so a wrong answer here
  // silently empties or over-fills a tab rather than throwing.
  it('reads the owner from any of the casings the API sends', () => {
    for (const key of ['OwnerUserId', 'ownerUserId', 'ownerId', 'OwnerId']) {
      expect(mapTripVM({ [key]: '42' }, viewer).isOwner).toBe(true);
      expect(mapTripVM({ [key]: '99' }, viewer).isOwner).toBe(false);
    }
  });

  it('reads the owner from a nested owner object', () => {
    expect(mapTripVM({ owner: { id: '42' } }, viewer).isOwner).toBe(true);
    expect(mapTripVM({ Owner: { Id: '99' } }, viewer).isOwner).toBe(false);
  });

  it('compares as strings, so a numeric id still matches', () => {
    expect(mapTripVM({ ownerUserId: 42 }, { id: 42 }).isOwner).toBe(true);
  });

  it('assumes ownership when the trip names no owner', () => {
    expect(mapTripVM({ id: 't1' }, viewer).isOwner).toBe(true);
  });

  it('assumes ownership when there is no viewer, rather than hiding every action', () => {
    expect(mapTripVM({ ownerUserId: '99' }, null).isOwner).toBe(true);
  });
});

describe('mapTripVM: published', () => {
  it.each([
    [{ published: true }, true],
    [{ isPublished: true }, true],
    [{ status: 'PUBLISHED' }, true],
    [{ status: 'published' }, true],
    [{ published: false }, false],
    [{ status: 'DRAFT' }, false],
    [{}, false],
  ])('%o reads as %s', (trip, expected) => {
    expect(mapTripVM(trip, viewer).isPublished).toBe(expected);
  });
});

describe('mapTripVM: archived', () => {
  // This is the field the old Profile page got wrong: it looked for `archived`,
  // the API sends `isArchived`, and the tab was permanently empty as a result.
  it('reads isArchived in both casings', () => {
    expect(mapTripVM({ isArchived: true }, viewer).isArchived).toBe(true);
    expect(mapTripVM({ IsArchived: true }, viewer).isArchived).toBe(true);
  });

  it('does not read the field the old page looked for', () => {
    expect(mapTripVM({ archived: true }, viewer).isArchived).toBe(false);
  });

  it('defaults to not archived', () => {
    expect(mapTripVM({}, viewer).isArchived).toBe(false);
  });
});

describe('mapTripVM: verified', () => {
  it('only accepts a strict true, so an endorsement never renders off a truthy accident', () => {
    expect(mapTripVM({ verified: true }, viewer).verified).toBe(true);
    expect(mapTripVM({ Verified: true }, viewer).verified).toBe(true);
    expect(mapTripVM({ verified: 'yes' }, viewer).verified).toBe(false);
    expect(mapTripVM({ verified: 1 }, viewer).verified).toBe(false);
  });
});

describe('mapTripVM: members', () => {
  it('normalises a member from nested user and split names', () => {
    const vm = mapTripVM({ members: [{ id: '7', user: { fname: 'Ravi', lname: 'Kumar' } }] }, viewer);
    expect(vm.members).toEqual([{ id: '7', name: 'Ravi Kumar', profilePic: '' }]);
  });

  it('fills the viewer own avatar from the session when the payload omits it', () => {
    const vm = mapTripVM({ members: [{ id: '42', name: 'Sara Elle' }] }, viewer);
    expect(vm.members[0].profilePic).toBe('me.jpg');
  });

  it('falls back to the owner when there are no member rows', () => {
    const vm = mapTripVM({ owner: { id: '9', name: 'Ana' } }, viewer);
    expect(vm.members).toHaveLength(1);
    expect(vm.members[0].name).toBe('Ana');
  });

  it('never returns an empty crew', () => {
    expect(mapTripVM({}, viewer).members).toHaveLength(1);
  });
});

describe('mapTripVM: scalars', () => {
  it('defaults a missing title rather than rendering undefined', () => {
    expect(mapTripVM({}, viewer).title).toBe('Untitled trip');
  });

  it('keeps countries an array and derives the location from the first', () => {
    expect(mapTripVM({ countries: ['Japan', 'Korea'] }, viewer).location).toBe('Japan');
    expect(mapTripVM({}, viewer).countries).toEqual([]);
    expect(mapTripVM({}, viewer).location).toBe('Unknown');
  });

  it('reads comment counts in both casings', () => {
    expect(mapTripVM({ commentsCount: 3 }, viewer).commentsCount).toBe(3);
    expect(mapTripVM({ CommentsCount: 4 }, viewer).commentsCount).toBe(4);
    expect(mapTripVM({}, viewer).commentsCount).toBe(0);
  });
});

describe('formatRelativeTime', () => {
  it('returns an empty string rather than "Invalid Date" for junk', () => {
    expect(formatRelativeTime(undefined)).toBe('');
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('not a date')).toBe('');
    expect(formatRelativeTime({})).toBe('');
  });

  it('describes recent times in the right unit', () => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    expect(formatRelativeTime(ago(10 * 1000))).toBe('just now');
    expect(formatRelativeTime(ago(5 * 60 * 1000))).toBe('5m ago');
    expect(formatRelativeTime(ago(3 * 3600 * 1000))).toBe('3h ago');
    expect(formatRelativeTime(ago(2 * 86400 * 1000))).toBe('2d ago');
  });
});

describe('rowsFrom', () => {
  it('accepts both envelope shapes the trips endpoints return', () => {
    expect(rowsFrom([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(rowsFrom({ trips: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });

  it('returns an empty array for anything else', () => {
    expect(rowsFrom(null)).toEqual([]);
    expect(rowsFrom(undefined)).toEqual([]);
    expect(rowsFrom({})).toEqual([]);
    expect(rowsFrom('nope')).toEqual([]);
  });
});
