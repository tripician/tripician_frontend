import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * These guard the one thing the sign-in dialog promises: that what somebody
 * typed is still there when they come back.
 *
 * The suite runs in node, where there is no sessionStorage, so it brings its
 * own. An in-memory map is what the browser gives us anyway, and adding a DOM
 * environment for four functions that only read and write strings would be a
 * dependency in exchange for nothing.
 */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  },
  configurable: true,
});

// Imported after the stub: the module reads sessionStorage lazily, but keeping
// the order explicit means this file cannot break if that ever changes.
const {
  stashDraft, takeDraft, peekDraftReturnTo, clearDraft,
  stashReturnTo, takeReturnTo, PENDING_DRAFT_KEY,
} = await import('./pendingDraft');

beforeEach(() => store.clear());
afterEach(() => vi.useRealTimers());

describe('stashDraft / takeDraft', () => {
  it('gives the draft back to the composer it came from', () => {
    stashDraft('post:new', 'Any issue with VietJet?', '/posts');
    expect(takeDraft('post:new')).toBe('Any issue with VietJet?');
  });

  it('is destructive, so a StrictMode double-mount cannot restore twice', () => {
    stashDraft('post:new', 'once', '/posts');
    expect(takeDraft('post:new')).toBe('once');
    expect(takeDraft('post:new')).toBeNull();
  });

  it('will not hand a draft to a different composer', () => {
    stashDraft('story-question:abc', 'meant for the story', '/story/abc');
    expect(takeDraft('post:new')).toBeNull();
    // And the real owner can still collect it.
    expect(takeDraft('story-question:abc')).toBe('meant for the story');
  });

  it('trims, and ignores whitespace-only text', () => {
    stashDraft('post:new', '   ', '/posts');
    expect(takeDraft('post:new')).toBeNull();

    stashDraft('post:new', '  hello  ', '/posts');
    expect(takeDraft('post:new')).toBe('hello');
  });

  it('forgets a draft older than the freshness window', () => {
    vi.useFakeTimers();
    stashDraft('post:new', 'stale', '/posts');
    // A restored tab the next morning is not an intent to post.
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(takeDraft('post:new')).toBeNull();
  });

  it('survives a garbage value rather than throwing', () => {
    sessionStorage.setItem(PENDING_DRAFT_KEY, 'not json');
    expect(takeDraft('post:new')).toBeNull();
  });

  it('reports where to return without consuming the draft', () => {
    stashDraft('post:new', 'text', '/post/abc');
    expect(peekDraftReturnTo()).toBe('/post/abc');
    expect(takeDraft('post:new')).toBe('text');
  });

  it('clears on request', () => {
    stashDraft('post:new', 'text', '/posts');
    clearDraft();
    expect(takeDraft('post:new')).toBeNull();
  });
});

describe('stashReturnTo / takeReturnTo', () => {
  it('round trips a path', () => {
    stashReturnTo('/post/abc?tab=answers');
    expect(takeReturnTo()).toBe('/post/abc?tab=answers');
  });

  it('is destructive', () => {
    stashReturnTo('/posts');
    expect(takeReturnTo()).toBe('/posts');
    expect(takeReturnTo()).toBeNull();
  });

  it('refuses anything that could redirect off-site', () => {
    // Same bar as safeNext: a stored value is no more trustworthy than a query
    // parameter, and this one is read after a round trip through a third party.
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'evil.com']) {
      sessionStorage.clear();
      stashReturnTo(bad);
      expect(takeReturnTo()).toBeNull();
    }
  });

  it('forgets a stale destination', () => {
    vi.useFakeTimers();
    stashReturnTo('/posts');
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(takeReturnTo()).toBeNull();
  });
});
