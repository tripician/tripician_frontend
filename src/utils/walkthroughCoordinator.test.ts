import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  walkthroughShownThisSession,
  markWalkthroughShown,
  walkthroughOwner,
  hasSeenPlannerTour,
  markPlannerTourSeen,
  shouldAutoStartPlannerTour,
} from './walkthroughCoordinator';

/** Minimal Storage stand-in - the suite runs in node, with no DOM. */
class FakeStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

describe('walkthroughCoordinator', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.stubGlobal('sessionStorage', new FakeStorage());
  });

  it('starts with no walkthrough claiming the session', () => {
    expect(walkthroughShownThisSession()).toBe(false);
    expect(walkthroughOwner()).toBeNull();
  });

  it('lets the first walkthrough claim the session and locks out the second', () => {
    markWalkthroughShown('appCarousel');
    expect(walkthroughShownThisSession()).toBe(true);
    expect(walkthroughOwner()).toBe('appCarousel');
  });

  /**
   * The whole point of the module: a brand-new user must not get the dashboard
   * carousel and then the planner tour back to back.
   */
  it('stops the planner tour auto-starting once another guide has run', () => {
    expect(shouldAutoStartPlannerTour()).toBe(true);
    markWalkthroughShown('appCarousel');
    expect(shouldAutoStartPlannerTour()).toBe(false);
  });

  it('stops the planner tour auto-starting once it has been seen', () => {
    expect(hasSeenPlannerTour()).toBe(false);
    markPlannerTourSeen();
    expect(hasSeenPlannerTour()).toBe(true);
    expect(shouldAutoStartPlannerTour()).toBe(false);
  });

  it('keeps the seen flag separate from the session slot', () => {
    // Claiming the session must not burn the once-ever flag: the guide that stood
    // down this session still needs to run on a later visit.
    markWalkthroughShown('plannerTour');
    expect(hasSeenPlannerTour()).toBe(false);
  });
});
