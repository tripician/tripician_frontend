import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { APP_NAV_ITEMS, navItemFromPath } from './navConfig';

/**
 * These guard an information-architecture change, not a component.
 *
 * The bottom bar picks items out of APP_NAV_ITEMS by string id. Renaming or
 * removing an entry there does not fail a build: it silently ships a mobile nav
 * with a missing tab, which is exactly what nearly happened when "trips" became
 * "crew", and again when "crew" became "road".
 */

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf-8');

/** Pulls a `const NAME = ['a', 'b'] as const;` array out of a source file. */
function idsFrom(source: string, constName: string): string[] {
  const match = source.match(new RegExp(`${constName}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!match) throw new Error(`${constName} not found; the nav wiring moved`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const appSource = read('../../App.tsx');
const bottomNavSource = read('./CommonLayouts/AppBottomNav.tsx');

describe('APP_NAV_ITEMS', () => {
  it('has unique ids and paths', () => {
    const ids = APP_NAV_ITEMS.map((i) => i.id);
    const paths = APP_NAV_ITEMS.map((i) => i.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('stays within the five-item ceiling a bottom bar can hold', () => {
    expect(APP_NAV_ITEMS.length).toBeLessThanOrEqual(5);
  });

  it('gives every item a label, a short label and an icon', () => {
    for (const item of APP_NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.shortLabel.length).toBeGreaterThan(0);
      expect(item.Icon).toBeTruthy();
    }
  });

  it('points every item at a route registered in App.tsx', () => {
    for (const item of APP_NAV_ITEMS) {
      expect(appSource).toContain(`path="${item.path}"`);
    }
  });

  it('no longer points anything at the retired trips page', () => {
    expect(APP_NAV_ITEMS.some((i) => i.path === '/dashboard')).toBe(false);
    expect(APP_NAV_ITEMS.some((i) => i.id === 'trips')).toBe(false);
  });

  it('keeps /dashboard resolvable, because it is in people history', () => {
    // Removed from the nav, but redirected rather than deleted.
    expect(appSource).toContain('path="/dashboard"');
    expect(appSource).toContain('/profile?tab=trips');
  });
});

describe('navItemFromPath', () => {
  it('resolves every registered path', () => {
    for (const item of APP_NAV_ITEMS) {
      expect(navItemFromPath(item.path)?.id).toBe(item.id);
    }
  });

  it('returns undefined for an unregistered path rather than throwing', () => {
    expect(navItemFromPath('/nowhere')).toBeUndefined();
    expect(navItemFromPath('/dashboard')).toBeUndefined();
  });
});

describe('mobile nav wiring', () => {
  const left = idsFrom(bottomNavSource, 'MOBILE_NAV_LEFT');
  const right = idsFrom(bottomNavSource, 'MOBILE_NAV_RIGHT');

  it.each([...left, ...right])('references an id that exists: %s', (id) => {
    expect(APP_NAV_ITEMS.some((i) => i.id === id)).toBe(true);
  });

  it('puts every nav item in the bar itself, one tap on every breakpoint', () => {
    // The More drawer is gone, so the bar is the whole mobile nav. An item that
    // is in neither list is reachable only by typing the URL.
    const reachable = new Set([...left, ...right]);
    for (const item of APP_NAV_ITEMS) {
      expect(reachable.has(item.id)).toBe(true);
    }
  });

  it('does not put the same item in two places', () => {
    const all = [...left, ...right];
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps Profile in the bar itself, since it now holds every trip', () => {
    expect([...left, ...right]).toContain('profile');
  });

  it('keeps the bar to six slots, which is what fits at 360px', () => {
    // Two sides plus the centre FAB. A seventh slot starts wrapping labels.
    expect(left.length + right.length + 1).toBeLessThanOrEqual(6);
  });

  it('keeps short labels short enough not to wrap under an icon', () => {
    // "Plan a trip" is the widest thing the bar already renders without
    // wrapping, so it is the budget every tab label has to live inside.
    for (const item of APP_NAV_ITEMS) {
      expect(item.shortLabel.length).toBeLessThanOrEqual('Plan a trip'.length);
    }
  });

  it('no longer routes the mobile nav through a More drawer', () => {
    expect(bottomNavSource).not.toContain('onMoreMenu');
  });
});
