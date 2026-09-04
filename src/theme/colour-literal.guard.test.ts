/**
 * The brand colour has one definition. This is what keeps that true.
 *
 * A sweep on 2026-08-18 replaced 497 hardcoded brand literals across 45 files
 * with tokens. Without a guard, the 498th is one hurried `sx` away, and nothing
 * in the toolchain would notice: a hex is valid CSS, so `tsc`, ESLint, the tests
 * and the build all pass on it.
 *
 * ## Scope: the brand set only, deliberately
 *
 * There are ~290 distinct hex values in `src/` and roughly 250 of them are
 * legitimate - neutral greys, white ink on photo scrims, third-party marks, the
 * nine vibe washes in `afterstory/cards/StoryCard.tsx`. A guard whose allowlist
 * is longer than the guard is a guard someone deletes in six months. If you want
 * a wider rule later, write a SECOND test with its own allowlist rather than
 * widening this one.
 *
 * Two non-offences worth naming, because the next person will ask:
 *   - `#0EA5E9` in `components/CommonComponents/VerifiedTripBadge.tsx` is the
 *     platform trust mark, deliberately NOT the brand colour.
 *   - `VIBE_WASH` in `afterstory/cards/StoryCard.tsx` is nine neutral-dark
 *     gradients, deliberately not brand-tinted.
 * Neither carries a brand literal, so neither trips this guard.
 *
 * ## Patterns are written with character classes, not escapes
 *
 * `[(]` not an escaped paren, `[0-9.]` not the shorthand digit class. Every
 * backslash in this file's patterns was eaten in transit twice while the
 * migration was being written, silently turning a working pattern into one that
 * matched nothing. Character classes cannot be eaten.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = path.join(here, '..');

/** The brand, in every form it has ever been written in this codebase. */
const BRAND_HEX = /#(?:FF385C|E31C5F|D91A50|B01550|FF8A9F)/i;
const BRAND_RGB = /rgba?[(][ ]*255[ ]*,[ ]*56[ ]*,[ ]*92/;

/**
 * The type system. These files DEFINE the brand, so naming it is their job.
 * A guard must also be allowed to name what it forbids.
 */
const TYPE_SYSTEM = [/^theme\/index\.ts$/, /^theme\/brand\.generated\.ts$/, /^theme\/[\w-]+\.guard\.test\.ts$/, /^index\.css$/];

/**
 * Intended steady state: empty, and it currently is. This is NOT the permanent
 * kind of allowlist that `brand-shadow.guard.test.ts` keeps for decorative
 * gradients - anything added here is debt with a name on it.
 */
const PENDING: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((f) => ({
  rel: path.relative(SRC, f).split(path.sep).join('/'),
  text: fs.readFileSync(f, 'utf-8'),
}));

/** Comments legitimately name the colour, and this codebase is comment-dense. */
const isComment = (line: string) => {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
};

describe('the brand colour has one definition', () => {
  it('finds the files it is meant to guard', () => {
    // Without this, a broken walk makes every assertion below pass vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it('matches the canonical definition, so the patterns are known to work', () => {
    // A positive control. A typo'd pattern that matches nothing would otherwise
    // let this whole file pass forever while enforcing absolutely nothing.
    const theme = files.find((f) => f.rel === 'theme/index.ts');
    expect(theme, 'theme/index.ts moved').toBeTruthy();
    expect(BRAND_HEX.test(theme!.text)).toBe(true);
    const css = files.find((f) => f.rel === 'index.css');
    expect(BRAND_RGB.test('rgba(255, 56, 92, 0.5)')).toBe(true);
    expect(css!.text).toContain('--brand-rgb');
  });

  it('names the brand nowhere outside the type system', () => {
    const offenders = files
      .filter((f) => !TYPE_SYSTEM.some((re) => re.test(f.rel)))
      .filter((f) => !PENDING.includes(f.rel))
      .filter((f) =>
        f.text.split('\n').some((line) => !isComment(line) && (BRAND_HEX.test(line) || BRAND_RGB.test(line))),
      )
      .map((f) => f.rel);

    expect(
      offenders,
      'The brand colour is defined once, in theme/index.ts. Use a token:\n' +
        "  sx={{ color: 'primary.main' }}        palette-aware props\n" +
        '  sx={{ background: BRAND.coral }}      background is NOT palette-aware\n' +
        '  alpha(BRAND.coral, 0.08)              any tinted brand fill\n' +
        '  rgb(var(--brand-rgb) / 0.08)          raw .css\n' +
        'Offending files:\n  ' +
        offenders.join('\n  '),
    ).toEqual([]);
  });

  it('keeps the CSS channels in step with the theme', () => {
    // Two sources of the same colour, so something has to compare them. The CSS
    // var exists because raw stylesheets cannot read the theme.
    const theme = files.find((f) => f.rel === 'theme/index.ts')!.text;
    const css = files.find((f) => f.rel === 'index.css')!.text;
    const hex = theme.match(/coral: '#([0-9A-F]{6})'/i);
    const channels = css.match(/--brand-rgb: *([0-9]+) +([0-9]+) +([0-9]+)/);
    expect(hex, 'BRAND.coral moved').toBeTruthy();
    expect(channels, '--brand-rgb moved').toBeTruthy();
    const fromHex = [0, 2, 4].map((i) => parseInt(hex![1].slice(i, i + 2), 16)).join(' ');
    expect(
      `${channels![1]} ${channels![2]} ${channels![3]}`,
      'index.css --brand-rgb and theme BRAND.coral describe different colours.',
    ).toBe(fromHex);
  });
});
