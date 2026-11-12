import { describe, it, expect } from 'vitest';
import { TAB_IDS, isTabId, resolveTab } from './profileTabs';

describe('profile tab order', () => {
  it('leads with the Wall, as the app does', () => {
    expect(TAB_IDS[0]).toBe('wall');
  });

  it('rejects anything not a tab', () => {
    expect(isTabId('wall')).toBe(true);
    expect(isTabId('nonsense')).toBe(false);
    expect(isTabId(null)).toBe(false);
    expect(isTabId('')).toBe(false);
  });
});

describe('resolveTab', () => {
  it('honours an explicit ?tab=', () => {
    expect(resolveTab('saved')).toEqual({ tab: 'saved', archived: false });
    expect(resolveTab('trips')).toEqual({ tab: 'trips', archived: false });
  });

  it('opens the Wall when the URL says nothing, or nothing it knows', () => {
    expect(resolveTab(null)).toEqual({ tab: 'wall', archived: false });
    expect(resolveTab('bogus')).toEqual({ tab: 'wall', archived: false });
  });

  it('keeps old links working', () => {
    expect(resolveTab('road')).toEqual({ tab: 'wall', archived: false });
    expect(resolveTab('archived')).toEqual({ tab: 'trips', archived: true });
  });
});
