import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the boundary between the two typefaces.
 *
 * Plus Jakarta Sans is the product voice: cards, page headers, buttons, labels.
 * Playfair Display is the AUTHORED voice, and it is now allowed on almost
 * nothing - story titles, the story reading page, blog posts. That narrowing was
 * a deliberate call: a trip listing is a commercial object, and dressing it in
 * editorial type made it pretend to be an essay.
 *
 * This is exactly the kind of rule that dies one component at a time - someone
 * adds a serif to a dialog title because it looks nice there, and eighteen
 * months later the distinction means nothing. So it is enforced rather than
 * documented.
 *
 * Source-scanned rather than rendered: the question is which FILES may reference
 * the token, which no runtime assertion can answer.
 */

const src = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(src, f).replace(/\\/g, '/');
const files = walk(src);

/** Authored long-form. The serif belongs here and nowhere else in the app. */
/*
 * NOTE (2026-08-18): headings changed hands.
 *
 * Every h1-h6 now carries the serif from the typography scale in theme/index.ts,
 * which is inside TYPE_SYSTEM below and therefore already allowed. So these
 * assertions are unchanged and still pass - but their MEANING narrowed. They no
 * longer keep the serif off product chrome; they keep the `custom.fontDisplay`
 * TOKEN from spreading, so that opting a non-heading into the serif stays a
 * deliberate, reviewable act rather than something sprinkled anywhere.
 */

/*
 * ProfileIntro (2026-08-19) is the third entry, and it belongs to the same
 * category as the first two rather than being an exception to them: it renders
 * the paragraph a traveller wrote about themselves. Everything else on a profile
 * is derived from the database, so this is the only authored voice on the page,
 * which is the exact thing the serif is reserved for.
 */
const EDITORIAL = [
  /^afterstory\//,
  /^pages\/BlogsPage\//,
  /^pages\/ProfilePage\/ProfileIntro\.tsx$/,
];

/**
 * Where the token is defined, plus the guards themselves: a guard has to name
 * the thing it forbids, so scanning them for that name only ever finds itself.
 */
const TYPE_SYSTEM = [/^theme\/index\.ts$/, /^index\.css$/, /^theme\/[\w-]+\.guard\.test\.ts$/];

/**
 * Marketing and auth are brand surfaces, not product chrome, and they are raw
 * CSS outside the MUI theme. Left on the serif on purpose: the front door is
 * allowed more personality than the app behind it.
 */
const BRAND_CSS = [/^assets\/css\/LandingPage\.css$/, /^assets\/css\/Signin\.css$/];

const matches = (f: string, list: RegExp[]) => list.some((r) => r.test(rel(f)));

describe('the editorial serif stays on editorial surfaces', () => {
  it('finds the files it is meant to guard', () => {
    // If the scan ever returns nothing, every assertion below passes vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it('is referenced via custom.fontDisplay only from stories and blogs', () => {
    const offenders = files
      .filter((f) => !matches(f, EDITORIAL) && !matches(f, TYPE_SYSTEM))
      .filter((f) => /custom\.fontDisplay/.test(fs.readFileSync(f, 'utf-8')))
      .map(rel);

    expect(
      offenders,
      `custom.fontDisplay is the AUTHORED voice and may only be used in stories or blogs.\n` +
        `For the Tripician wordmark use custom.fontBrand; for anything else use the default UI face.\n` +
        `Offending files:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('is referenced via the CSS variable only from brand surfaces', () => {
    const offenders = files
      .filter((f) => f.endsWith('.css'))
      .filter((f) => !matches(f, TYPE_SYSTEM) && !matches(f, BRAND_CSS))
      .filter((f) => /var\(--font-display\)/.test(fs.readFileSync(f, 'utf-8')))
      .map(rel);

    expect(
      offenders,
      `--font-display is reserved for the landing page and auth. In-app CSS inherits the UI face.\n` +
        `Offending files:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('names no typeface directly outside the type system', () => {
    // A hardcoded family is how the token gets bypassed rather than broken. Inter is on this list even though nothing uses it any more - it is RETIRED, and ~300 declarations of it outlived the rename precisely because no test named it. A face the app does not fetch renders differently on every machine that happens to have it installed.
    const offenders = files
      .filter((f) => !matches(f, TYPE_SYSTEM))
      .filter((f) => /['"]Playfair Display['"]|['"]Plus Jakarta Sans['"]|['"]Poppins['"]|['"]Inter['"]/.test(
        fs.readFileSync(f, 'utf-8'),
      ))
      .map(rel);

    expect(
      offenders,
      `Typefaces are named in theme/index.ts and index.css only. Use the tokens.\n` +
        `Offending files:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('the UI face', () => {
  const theme = fs.readFileSync(path.join(src, 'theme/index.ts'), 'utf-8');
  const html = fs.readFileSync(path.join(src, '..', 'index.html'), 'utf-8');

  it('is Plus Jakarta Sans in the theme and is actually loaded', () => {
    expect(theme).toMatch(/FONT_BODY = "'Plus Jakarta Sans'/);
    // A face declared but never fetched falls back silently to system-ui, which
    // looks close enough that nobody notices for weeks.
    expect(html).toContain('Plus+Jakarta+Sans');
  });

  it('requests both faces as one variable axis each', () => {
    expect(html).toMatch(/Plus\+Jakarta\+Sans:wght@400\.\.700/);
    expect(html).toContain('Playfair+Display:ital,wght@0,600;0,700;1,600');
  });

  it('keeps fontBrand pointing at a serif', () => {
    // The wordmark is italic, and `font-synthesis: none` means a face without a
    // real italic cut renders upright. Playfair's italic 600 is requested above.
    expect(theme).toMatch(/fontBrand: FONT_DISPLAY/);
  });
});
