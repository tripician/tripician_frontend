import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearSessionData, tokenSubject } from './authSession';

/**
 * These tests exist because of a real incident: a user deleted an account,
 * signed in with a different one, and saw the DELETED account's name, email and
 * avatar in the header. The cached profile had outlived the session that owned
 * it, and nothing tied it to an account.
 *
 * The two guarantees below are what make that impossible. Treat a failure here
 * as a privacy regression, not a broken unit test.
 */

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

/** Builds an unsigned JWT with the given payload - only the payload is ever read. */
function makeToken(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${b64}.signature`;
}

let local: FakeStorage;
let session: FakeStorage;

beforeEach(() => {
  local = new FakeStorage();
  session = new FakeStorage();
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('atob', (s: string) => Buffer.from(s, 'base64').toString('binary'));
});

describe('clearSessionData - what a session leaves behind', () => {
  it('removes credentials and the cached identity', () => {
    local.setItem('accessToken', 'a');
    local.setItem('refreshToken', 'r');
    local.setItem('userProfile', '{"sub":"auth0|A","profile":{}}');

    clearSessionData();

    expect(local.getItem('accessToken')).toBeNull();
    expect(local.getItem('refreshToken')).toBeNull();
    expect(local.getItem('userProfile')).toBeNull();
  });

  it('removes per-account app data, not just the auth keys', () => {
    // Every one of these is content belonging to the signed-in account.
    local.setItem('tripician_docs', '{"docs":[{"content":"base64..."}]}');
    local.setItem('rm_recent', '["Ukraine"]');
    local.setItem('tripPacking:trip-1', '{"x":1}');
    local.setItem('tripPackingView:trip-1', '{"y":2}');
    local.setItem('tripician:lastDraftTripId', 'trip-1');
    local.setItem('tripician:naviaGroupHint:trip-1', '1');
    local.setItem('tripCommentsScrollV1', '120');
    local.setItem('tripician.activitySessionId', 'sess-1');

    clearSessionData();

    for (const key of [
      'tripician_docs', 'rm_recent', 'tripPacking:trip-1', 'tripPackingView:trip-1',
      'tripician:lastDraftTripId', 'tripician:naviaGroupHint:trip-1',
      'tripCommentsScrollV1', 'tripician.activitySessionId',
    ]) {
      expect(local.getItem(key), key).toBeNull();
    }
  });

  it('clears Navia chat transcripts from sessionStorage', () => {
    session.setItem('navia-chat-general', '[{"content":"my private plans"}]');
    session.setItem('navia-chat-trip-1', '[]');

    clearSessionData();

    expect(session.length).toBe(0);
  });

  /**
   * The one sessionStorage exception. Both sign-in paths call clearSessionData()
   * immediately BEFORE storing the new token, so without the allowlist the
   * landing-hero prompt is destroyed one line ahead of the redirect meant to
   * carry it - a deterministic failure, not a race. The transcript beside it
   * must still die: that is another account's conversation, the prompt is this
   * visitor's own unauthenticated intent.
   */
  it('keeps the pre-account landing prompt, which sign-in is about to consume', () => {
    session.setItem('navia-chat-general', '[{"content":"my private plans"}]');
    session.setItem('tripician:pendingNaviaPrompt', '{"prompt":"10 days in Japan","ts":1}');

    clearSessionData();

    expect(session.getItem('navia-chat-general')).toBeNull();
    expect(session.getItem('tripician:pendingNaviaPrompt')).toBe('{"prompt":"10 days in Japan","ts":1}');
  });

  /**
   * Default-deny: anything not explicitly allowlisted is treated as user data.
   * This is what stops a newly-added key from leaking until someone remembers it.
   */
  it('removes unknown keys it has never heard of', () => {
    local.setItem('someFutureFeature:userSecret', 'sensitive');
    clearSessionData();
    expect(local.getItem('someFutureFeature:userSecret')).toBeNull();
  });

  it('keeps non-personal device preferences', () => {
    local.setItem('tripician:onboardingSeen', '1');
    local.setItem('tripician:feedbackPromptShown', '1');
    local.setItem('tripician:mobilePlannerNoticeAck', '1');
    local.setItem('unsplash_v1_japan|landscape', 'https://images.unsplash.com/x');

    clearSessionData();

    expect(local.getItem('tripician:onboardingSeen')).toBe('1');
    expect(local.getItem('tripician:feedbackPromptShown')).toBe('1');
    expect(local.getItem('tripician:mobilePlannerNoticeAck')).toBe('1');
    expect(local.getItem('unsplash_v1_japan|landscape')).toBeTruthy();
  });

  it('removes every matching key, not every other one', () => {
    // Guards the classic bug of mutating a store while iterating its indices.
    for (let i = 0; i < 10; i++) local.setItem(`userData${i}`, 'x');
    clearSessionData();
    expect(local.length).toBe(0);
  });

  it('is safe to call twice', () => {
    local.setItem('accessToken', 'a');
    clearSessionData();
    expect(() => clearSessionData()).not.toThrow();
  });
});

describe('tokenSubject - which account a cache belongs to', () => {
  it('reads the sub claim', () => {
    expect(tokenSubject(makeToken({ sub: 'auth0|abc123' }))).toBe('auth0|abc123');
  });

  it('tells two accounts apart', () => {
    const a = tokenSubject(makeToken({ sub: 'auth0|accountA' }));
    const b = tokenSubject(makeToken({ sub: 'auth0|accountB' }));
    expect(a).not.toBe(b);
  });

  it('falls back to .NET-remapped identifier claims', () => {
    expect(tokenSubject(makeToken({ nameid: 'user-42' }))).toBe('user-42');
    expect(tokenSubject(makeToken({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'user-99',
    }))).toBe('user-99');
  });

  /**
   * Null must mean "no usable cache". Returning a constant here would make every
   * account share one cache bucket - the original bug, reintroduced.
   */
  it('returns null rather than a shared value for unusable tokens', () => {
    expect(tokenSubject(null)).toBeNull();
    expect(tokenSubject(undefined)).toBeNull();
    expect(tokenSubject('')).toBeNull();
    expect(tokenSubject('not-a-jwt')).toBeNull();
    expect(tokenSubject('a.!!!not-base64!!!.c')).toBeNull();
    expect(tokenSubject(makeToken({ email: 'x@y.com' }))).toBeNull();
    expect(tokenSubject(makeToken({ sub: '   ' }))).toBeNull();
  });
});
