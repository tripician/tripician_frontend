import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Android App Links depend on two files that nothing else in the site reads, so
 * nothing else would notice them breaking:
 *
 * - public/.well-known/assetlinks.json tells Android that com.tripicianapp may
 *   open tripician.com links. Its path rules (Android 15+) must match the
 *   app's manifest in tripician_mobile, which has its own test for the same list.
 * - vercel.json must serve that file as JSON and never redirect it, or Google
 *   Play reports the domain as unverified.
 */

type Rule = { '/': string; exclude?: boolean };

const root = process.cwd();
const statements = JSON.parse(readFileSync(resolve(root, 'public/.well-known/assetlinks.json'), 'utf8'));
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
const statement = statements[0];
const rules: Rule[] = statement.relation_extensions['delegate_permission/common.handle_all_urls'].dynamic_app_link_components;

/** Android's dynamic matcher: "*" is any run of characters, "?" is one character, everything else is literal. */
const opensApp = (path: string): boolean => {
  for (const rule of rules) {
    const pattern = new RegExp(`^${rule['/'].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
    if (pattern.test(path)) return !rule.exclude;
  }
  return false;
};

describe('assetlinks.json', () => {
  it('matches the file Google Play generates: links and saved sign-ins, for every key Play lists', () => {
    expect(statements).toHaveLength(1);
    // get_login_creds is what Play's "Turn on credential sharing" checks for.
    expect(statement.relation).toEqual([
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ]);
    expect(statement.target.namespace).toBe('android_app');
    expect(statement.target.package_name).toBe('com.tripicianapp');
    // Copied from Play Console > Deep links > Turn on credential sharing (2026-11-21).
    // The first is the Play app signing key, which every Play install is signed with.
    expect(statement.target.sha256_cert_fingerprints).toEqual([
      '7A:61:01:E3:76:49:4A:C8:CA:CC:3F:69:4B:83:55:B2:7B:BC:23:F8:7B:A6:09:E6:39:D6:C7:38:87:43:98:4E',
      '83:79:3A:16:CF:9D:00:54:C7:05:37:40:5D:31:01:F2:C0:3E:6E:F7:8D:B0:EB:AB:C9:76:B7:F3:12:D6:85:C4',
      'C9:1E:A1:B3:5A:88:6B:A8:E9:4B:4A:10:87:D7:FF:BF:7A:58:D6:9C:E5:31:51:D1:E3:67:80:1D:22:67:DF:AC',
    ]);
  });

  it('opens a trip in the app only by its bare id, which every app version reads', () => {
    expect(opensApp('/trip/5cb25fc7-5f08-42bb-8178-b3e47ec40673')).toBe(true);
    // App 1.1.5 and earlier pass the whole segment to /api/trips/{guid} and fail, so
    // this site's /trip/{name}-{id} links stay on the website on Android 15+ until
    // those versions are gone. Then this rule can become "/trip/*" (app 1.1.6 reads
    // the id out).
    expect(opensApp('/trip/trip-to-india-5cb25fc7-5f08-42bb-8178-b3e47ec40673')).toBe(false);
  });

  it('opens shared content in the app', () => {
    // Every app version since 1.1.0 opens /join/group/; /groups/invite/ is what older versions shared.
    for (const path of ['/tripplanner/abc', '/traveler/42', '/post/abc', '/story/a-story', '/blog', '/blog/a-post', '/o/a-group', '/join/group/tok', '/groups/invite/tok']) {
      expect(opensApp(path), path).toBe(true);
    }
  });

  it('keeps the home page, sign-in and every other page on the website', () => {
    for (const path of ['/', '/callback', '/signin', '/signup', '/terms-and-conditions', '/privacy-policy', '/child-safety-standards', '/get-help', '/contact-us', '/pricing', '/settings', '/stories', '/join/trip/tok']) {
      expect(opensApp(path), path).toBe(false);
    }
  });

  it('ends by excluding everything it did not list', () => {
    expect(rules.at(-1)).toEqual({ '/': '*', exclude: true });
  });
});

describe('vercel.json for App Links', () => {
  it('serves assetlinks.json as JSON', () => {
    const rule = vercel.headers.find((h: { source: string }) => h.source === '/.well-known/assetlinks.json');
    expect(rule.headers).toContainEqual({ key: 'Content-Type', value: 'application/json' });
  });

  it('never redirects .well-known, so tripician.com can verify while its pages still go to www', () => {
    for (const redirect of vercel.redirects as { source: string }[]) {
      // Vercel turns ":name(regex)" into that regex, ":name*" into any number of segments and ":name" into one.
      const pattern = new RegExp(`^${redirect.source
        .replace(/:\w+\(((?:[^()]|\([^()]*\))*)\)/g, '($1)')
        .replace(/:\w+\*/g, '.*')
        .replace(/:\w+\+/g, '.+')
        .replace(/:\w+/g, '[^/]+')}$`);
      expect(pattern.test('/.well-known/assetlinks.json'), redirect.source).toBe(false);
    }
    const apex = vercel.redirects.find((r: { has?: { type: string; value: string }[] }) => r.has?.some((h) => h.type === 'host'));
    expect(apex.has[0].value).toBe('^tripician\\.com$');
    expect(apex.destination).toBe('https://www.tripician.com/:path*');
  });
});
