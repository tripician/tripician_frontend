import { describe, it, expect } from 'vitest';
import { TAB_IDS, isTabId, pickDefaultTab } from './profileTabs';

describe('profile tab order', () => {
  it('leads with the road', () => {
    expect(TAB_IDS[0]).toBe('road');
  });

  it('rejects anything not a tab', () => {
    expect(isTabId('road')).toBe(true);
    expect(isTabId('nonsense')).toBe(false);
    expect(isTabId(null)).toBe(false);
    expect(isTabId('')).toBe(false);
  });
});

describe('pickDefaultTab', () => {
  it('honours an explicit ?tab= over everything, even before posts are known', () => {
    expect(pickDefaultTab({ requested: 'saved', postsResolved: false, hasPosts: false })).toBe('saved');
    expect(pickDefaultTab({ requested: 'trips', postsResolved: true, hasPosts: true })).toBe('trips');
  });

  it('ignores a ?tab= that is not a tab', () => {
    expect(pickDefaultTab({ requested: 'bogus', postsResolved: true, hasPosts: false })).toBe('trips');
  });

  it('withholds an answer until the posts request settles', () => {
    expect(pickDefaultTab({ requested: null, postsResolved: false, hasPosts: false })).toBeNull();
    // Even with posts already in hand: resolved is what makes the count trustworthy.
    expect(pickDefaultTab({ requested: null, postsResolved: false, hasPosts: true })).toBeNull();
  });

  it('opens the road only when there is something in it', () => {
    expect(pickDefaultTab({ requested: null, postsResolved: true, hasPosts: true })).toBe('road');
    expect(pickDefaultTab({ requested: null, postsResolved: true, hasPosts: false })).toBe('trips');
  });
});
