import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearSessionData, decodeTokenClaims, isTokenUsable, tokenExpiresAtMs, tokenSubject } from './authSession';

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
    local.setItem('tripician:plannerTourSeen', '1');
    local.setItem('unsplash_v1_japan|landscape', 'https://images.unsplash.com/x');

    clearSessionData();

    expect(local.getItem('tripician:onboardingSeen')).toBe('1');
    expect(local.getItem('tripician:feedbackPromptShown')).toBe('1');
    expect(local.getItem('tripician:mobilePlannerNoticeAck')).toBe('1');
    expect(local.getItem('tripician:plannerTourSeen')).toBe('1');
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

  /*
   * The Auth0 SDK's cache holds the refresh token. Sign-out must destroy it, and
   * exactly one caller (the /callback page, wiping the PREVIOUS account right after
   * the SDK cached the NEW session) must not. Getting this backwards either leaves a
   * live refresh token behind after sign-out, or breaks silent refresh on the
   * browsers that cannot fall back to an iframe.
   */
  describe('the Auth0 SDK cache', () => {
    const cacheKey = '@@auth0spajs@@::abc123::https://tripician-api::openid profile email offline_access';

    it('is destroyed by default, because it holds the refresh token', () => {
      local.setItem(cacheKey, '{"body":{"refresh_token":"secret"}}');
      clearSessionData();
      expect(local.getItem(cacheKey)).toBeNull();
    });

    it('survives only when the caller explicitly asks', () => {
      local.setItem(cacheKey, '{"body":{"refresh_token":"secret"}}');
      local.setItem('accessToken', 'a');
      local.setItem('userProfile', '{"sub":"auth0|A"}');

      clearSessionData({ preserveAuth0Cache: true });

      expect(local.getItem(cacheKey)).toBe('{"body":{"refresh_token":"secret"}}');
      // Everything else still goes, including the previous account's identity.
      expect(local.getItem('accessToken')).toBeNull();
      expect(local.getItem('userProfile')).toBeNull();
    });

    it('is not treated as a device preference', () => {
      // A regression guard: adding this prefix to DEVICE_PREFERENCE_PREFIXES would
      // make sign-out leave a usable refresh token on a shared computer.
      local.setItem(cacheKey, 'x');
      clearSessionData({ preserveAuth0Cache: false });
      expect(local.getItem(cacheKey)).toBeNull();
    });
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

describe('isTokenUsable - the check that replaces "a token string exists"', () => {
  const nowSec = () => Math.floor(Date.now() / 1000);

  it('accepts a token with comfortable life left', () => {
    expect(isTokenUsable(makeToken({ exp: nowSec() + 3600 }))).toBe(true);
  });

  it('rejects an expired token', () => {
    expect(isTokenUsable(makeToken({ exp: nowSec() - 10 }))).toBe(false);
  });

  /*
   * The skew defaults to the server's own ClockSkew (2 minutes). A token inside
   * that window is refused deliberately: the server would accept it now, but might
   * not by the time the request lands, and a 401 mid-flight is worse than a refresh.
   */
  it('rejects a token that expires inside the skew window', () => {
    expect(isTokenUsable(makeToken({ exp: nowSec() + 30 }))).toBe(false);
    expect(isTokenUsable(makeToken({ exp: nowSec() + 30 }), 5)).toBe(true);
  });

  /*
   * Unreadable means "refresh", never "sign out". A decoder bug should cost one
   * wasted round-trip, not log out every user at once.
   */
  it('treats anything unreadable as not usable', () => {
    expect(isTokenUsable(null)).toBe(false);
    expect(isTokenUsable(undefined)).toBe(false);
    expect(isTokenUsable('')).toBe(false);
    expect(isTokenUsable('not-a-jwt')).toBe(false);
    expect(isTokenUsable('a.!!!not-base64!!!.c')).toBe(false);
    expect(isTokenUsable(makeToken({ sub: 'auth0|a' }))).toBe(false);       // no exp at all
    expect(isTokenUsable(makeToken({ exp: 'soon' }))).toBe(false);          // non-numeric exp
    expect(isTokenUsable(makeToken({ exp: Number.NaN }))).toBe(false);
  });
});

describe('tokenExpiresAtMs', () => {
  it('converts exp seconds to milliseconds', () => {
    expect(tokenExpiresAtMs(makeToken({ exp: 1_700_000_000 }))).toBe(1_700_000_000_000);
  });

  it('returns null when the token says nothing about expiry', () => {
    expect(tokenExpiresAtMs(makeToken({ sub: 'x' }))).toBeNull();
    expect(tokenExpiresAtMs('garbage')).toBeNull();
  });
});

describe('decodeTokenClaims', () => {
  it('returns the payload object', () => {
    expect(decodeTokenClaims(makeToken({ sub: 'auth0|a', exp: 1, aud: 'x' })))
      .toEqual({ sub: 'auth0|a', exp: 1, aud: 'x' });
  });

  it('returns null instead of throwing for junk', () => {
    expect(decodeTokenClaims('a.!!!.c')).toBeNull();
    expect(decodeTokenClaims('onlyonepart')).toBeNull();
    expect(decodeTokenClaims(null)).toBeNull();
  });
});
