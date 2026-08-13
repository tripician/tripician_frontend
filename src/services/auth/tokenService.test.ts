import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * The rules encoded here are the ones whose failure modes are worst:
 *
 *  - ten callers must cause ONE refresh, or a page mount spends the refresh token
 *    a dozen times and rotation revokes the family
 *  - the rotated refresh token must be stored BEFORE the access token, for the
 *    same reason
 *  - a network failure must NOT sign anyone out
 *  - a rejected credential must sign out exactly ONCE, however many requests failed
 *
 * Treat a failure here as "this will sign users out for no reason", not as a broken
 * unit test.
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

function makeToken(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${b64}.signature`;
}

const nowSec = () => Math.floor(Date.now() / 1000);
const freshToken = () => makeToken({ sub: 'auth0|abc', exp: nowSec() + 3600 });
const deadToken = () => makeToken({ sub: 'auth0|abc', exp: nowSec() - 60 });

/** The `/auth/refresh` stub, swapped per test. */
let refreshImpl: (rt: string) => Promise<unknown>;
let refreshCalls: string[];

vi.mock('../APIs/Auth/auth', () => ({
  authAPI: {
    refresh: (rt: string) => {
      refreshCalls.push(rt);
      return refreshImpl(rt);
    },
  },
}));

let silentTokenImpl: (() => Promise<string>) | null = null;
vi.mock('./auth0Bridge', () => ({
  getSilentTokenFn: () => silentTokenImpl,
  getLogoutFn: () => null,
  isAuth0Wired: () => silentTokenImpl !== null,
  wireAuth0: () => {},
}));

let local: FakeStorage;
let assignedUrls: string[];

/**
 * The store and the service both hold module state, so each test re-imports them
 * fresh. `resetModules` before the import is what makes the synchronous
 * initialisation in sessionStatus read THIS test's storage.
 */
async function loadModules(seed?: { accessToken?: string; refreshToken?: string; kind?: string }) {
  vi.resetModules();
  local = new FakeStorage();
  if (seed?.accessToken) local.setItem('accessToken', seed.accessToken);
  if (seed?.refreshToken) local.setItem('refreshToken', seed.refreshToken);
  if (seed?.kind) local.setItem('authSessionKind', seed.kind);

  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('atob', (s: string) => Buffer.from(s, 'base64').toString('binary'));
  assignedUrls = [];
  vi.stubGlobal('window', {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    location: { assign: (url: string) => { assignedUrls.push(url); } },
  });
  // No Web Locks in node; the service must fall through to running directly.
  vi.stubGlobal('navigator', {});

  const sessionStatus = await import('./sessionStatus');
  const tokenService = await import('./tokenService');
  return { sessionStatus, tokenService };
}

beforeEach(() => {
  refreshCalls = [];
  refreshImpl = async () => { throw new Error('not configured'); };
  silentTokenImpl = null;
  vi.stubGlobal('import.meta.env', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getFreshToken - a guest', () => {
  it('returns null without any network call', async () => {
    const { tokenService } = await loadModules();
    expect(await tokenService.getFreshToken()).toBeNull();
    expect(refreshCalls).toHaveLength(0);
  });
});

describe('getFreshToken - a valid token', () => {
  it('is returned as-is, with no refresh', async () => {
    const token = freshToken();
    const { tokenService } = await loadModules({ accessToken: token });
    expect(await tokenService.getFreshToken()).toBe(token);
    expect(refreshCalls).toHaveLength(0);
  });
});

describe('getFreshToken - password sessions', () => {
  it('refreshes an expired token through /auth/refresh', async () => {
    const next = freshToken();
    refreshImpl = async () => ({ data: { accessToken: next, refreshToken: 'rotated-1' } });

    const { tokenService, sessionStatus } = await loadModules({
      accessToken: deadToken(), refreshToken: 'original', kind: 'password',
    });

    expect(await tokenService.getFreshToken()).toBe(next);
    expect(refreshCalls).toEqual(['original']);
    expect(sessionStatus.getSnapshot().status).toBe('valid');
  });

  /*
   * Rotation makes refresh tokens single-use. If the replacement is not persisted
   * before anything can act on the new access token, a later refresh redeems a spent
   * token, Auth0 treats it as reuse, and the whole family is revoked.
   */
  it('stores the rotated refresh token BEFORE the access token', async () => {
    const next = freshToken();
    const writeOrder: string[] = [];
    refreshImpl = async () => ({ data: { accessToken: next, refreshToken: 'rotated-1' } });

    const { tokenService } = await loadModules({
      accessToken: deadToken(), refreshToken: 'original', kind: 'password',
    });
    const realSetItem = local.setItem.bind(local);
    local.setItem = (k: string, v: string) => { writeOrder.push(k); realSetItem(k, v); };

    await tokenService.getFreshToken();

    expect(writeOrder.indexOf('refreshToken')).toBeGreaterThanOrEqual(0);
    expect(writeOrder.indexOf('refreshToken')).toBeLessThan(writeOrder.indexOf('accessToken'));
  });

  it('collapses ten concurrent callers into one refresh', async () => {
    const next = freshToken();
    // Deferred built eagerly. Resolving it from inside the stub's own executor does
    // not work here: `refreshViaBackend` reaches the stub only after a dynamic
    // `import()`, so the executor has not run yet when the callers are fired.
    let resolveRefresh!: (v: unknown) => void;
    const pending = new Promise((res) => { resolveRefresh = res; });
    refreshImpl = () => pending;

    const { tokenService } = await loadModules({
      accessToken: deadToken(), refreshToken: 'original', kind: 'password',
    });

    // Fired synchronously, which is the case that matters: `getFreshToken` sets its
    // in-flight promise before its first await, so nine of these must find it there.
    const callers = Array.from({ length: 10 }, () => tokenService.getFreshToken());
    resolveRefresh({ data: { accessToken: next, refreshToken: 'rotated-1' } });
    const results = await Promise.all(callers);

    expect(refreshCalls).toHaveLength(1);
    expect(results.every((r) => r === next)).toBe(true);
  });
});

describe('getFreshToken - social sessions', () => {
  it('refreshes through the Auth0 SDK, not the backend', async () => {
    const next = freshToken();
    silentTokenImpl = async () => next;

    const { tokenService } = await loadModules({ accessToken: deadToken(), kind: 'social' });

    expect(await tokenService.getFreshToken()).toBe(next);
    expect(refreshCalls).toHaveLength(0);
  });

  /*
   * A session created before the kind was recorded must not be signed out just
   * because the first guess was wrong. This is what migrates today's live sessions
   * invisibly. Safe under rotation because the two strategies use different
   * credentials, so it is not a retry of a possibly-spent token.
   */
  it('falls back to the other strategy for an unmarked session', async () => {
    const next = freshToken();
    refreshImpl = async () => { const e: any = new Error('nope'); e.response = { status: 401 }; throw e; };
    silentTokenImpl = async () => next;

    const { tokenService } = await loadModules({ accessToken: deadToken(), refreshToken: 'original' });

    expect(await tokenService.getFreshToken()).toBe(next);
    expect(refreshCalls).toEqual(['original']); // tried, rejected, then fell back
  });
});

describe('getFreshToken - failures', () => {
  /*
   * The most important negative case. A 500 or a dropped connection says nothing
   * about the credential, and signing out over one is both wrong and infuriating.
   * A blind retry is also what trips reuse detection, so we do neither.
   */
  it('does NOT sign out on a server error or a network failure', async () => {
    refreshImpl = async () => { const e: any = new Error('boom'); e.response = { status: 503 }; throw e; };

    const { tokenService, sessionStatus } = await loadModules({
      accessToken: deadToken(), refreshToken: 'original', kind: 'password',
    });

    expect(await tokenService.getFreshToken()).toBeNull();
    expect(assignedUrls).toHaveLength(0);
    expect(local.getItem('accessToken')).not.toBeNull();   // token left in place
    expect(local.getItem('refreshToken')).toBe('original'); // and so is the credential
    expect(sessionStatus.getSnapshot().status).toBe('expired');
  });

  it('signs out when the credential itself is rejected', async () => {
    refreshImpl = async () => { const e: any = new Error('nope'); e.response = { status: 401 }; throw e; };

    const { tokenService } = await loadModules({
      accessToken: deadToken(), refreshToken: 'original', kind: 'password',
    });

    expect(await tokenService.getFreshToken()).toBeNull();
    expect(assignedUrls).toEqual(['/signin?expired=1']);
    expect(local.getItem('accessToken')).toBeNull();
  });

  it('signs out ONCE for forty failures', async () => {
    const { tokenService } = await loadModules({ accessToken: deadToken() });
    for (let i = 0; i < 40; i++) tokenService.forceSignOut('token_expired');
    expect(assignedUrls).toHaveLength(1);
  });

  /*
   * A social session's only strategy is the Auth0 SDK. If a refresh fires before the
   * bridge has been wired (SDK still mounting, or it failed to initialise), that must
   * read as "cannot renew right now", never as "the credential is bad". Treating it
   * as a rejection would let a startup race sign out every Google user at once.
   */
  it('does NOT sign out when the Auth0 bridge is not wired yet', async () => {
    silentTokenImpl = null; // bridge unavailable
    const { tokenService } = await loadModules({ accessToken: deadToken(), kind: 'social' });

    expect(await tokenService.getFreshToken()).toBeNull();
    expect(assignedUrls).toHaveLength(0);
    expect(local.getItem('accessToken')).not.toBeNull();
  });
});
