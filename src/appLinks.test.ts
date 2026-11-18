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
  it('names the app and the Play app signing key, and nothing else', () => {
    expect(statements).toHaveLength(1);
    expect(statement.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(statement.target.namespace).toBe('android_app');
    expect(statement.target.package_name).toBe('com.tripicianapp');
    expect(statement.target.sha256_cert_fingerprints).toContain(
      '7A:61:01:E3:76:49:4A:C8:CA:CC:3F:69:4B:83:55:B2:7B:BC:23:F8:7B:A6:09:E6:39:D6:C7:38:87:43:98:4E',
    );
    for (const fingerprint of statement.target.sha256_cert_fingerprints) {
      expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
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
