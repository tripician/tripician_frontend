import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the type system.
 *
 * Since 2026-11 there is one family, Bricolage Grotesque, on web and mobile alike:
 * the closest open-licensed match to the logo's lettering. It replaced Plus Jakarta
 * Sans (UI) and Playfair Display (the editorial serif that used to be fenced off to
 * stories and blogs; that fence went with the serif).
 *
 * What is still worth enforcing is that the face is named in one place and actually
 * fetched. A hardcoded family is how the token gets bypassed, and a face the app
 * does not fetch renders differently on every machine that happens to have it.
 *
 * Source-scanned rather than rendered: the question is which FILES name a face,
 * which no runtime assertion can answer.
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

/**
 * Where faces are named, plus the guards themselves: a guard has to name the thing
 * it forbids, so scanning them for that name only ever finds itself.
 */
const TYPE_SYSTEM = [/^theme\/index\.ts$/, /^index\.css$/, /^theme\/[\w-]+\.guard\.test\.ts$/];

const matches = (f: string, list: RegExp[]) => list.some((r) => r.test(rel(f)));

/** The current face, and the retired ones that must not creep back in by name. */
const NAMED_FACE = /['"]Bricolage Grotesque['"]|['"]Playfair Display['"]|['"]Plus Jakarta Sans['"]|['"]Poppins['"]|['"]Inter['"]/;

describe('typefaces are named only in the type system', () => {
  it('finds the files it is meant to guard', () => {
    // If the scan ever returns nothing, every assertion below passes vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it('names no typeface directly outside theme/index.ts and index.css', () => {
    const offenders = files
      .filter((f) => !matches(f, TYPE_SYSTEM))
      .filter((f) => NAMED_FACE.test(fs.readFileSync(f, 'utf-8')))
      .map(rel);

    expect(
      offenders,
      `Typefaces are named in theme/index.ts and index.css only. Use the theme tokens or var(--font-body).\n` +
        `Offending files:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('the face', () => {
  const theme = fs.readFileSync(path.join(src, 'theme/index.ts'), 'utf-8');
  const css = fs.readFileSync(path.join(src, 'index.css'), 'utf-8');
  const html = fs.readFileSync(path.join(src, '..', 'index.html'), 'utf-8');

  it('is Bricolage Grotesque in the theme and the CSS, and is actually loaded', () => {
    expect(theme).toMatch(/FONT_BODY = "'Bricolage Grotesque'/);
    expect(css).toMatch(/--font-body: 'Bricolage Grotesque'/);
    // A face declared but never fetched falls back silently to system-ui, which
    // looks close enough that nobody notices for weeks.
    expect(html).toContain('family=Bricolage+Grotesque');
  });

  it('is requested as optical-size and weight axes, up to 700', () => {
    // opsz is what gives headings the display cut; the weight ladder stops at 700.
    expect(html).toContain('Bricolage+Grotesque:opsz,wght@12..96,400..700');
  });

  it('no longer fetches the retired faces', () => {
    expect(html).not.toContain('Playfair+Display');
    expect(html).not.toContain('Plus+Jakarta+Sans');
  });

  it('points the display and brand tokens at the same face', () => {
    expect(theme).toMatch(/FONT_DISPLAY = FONT_BODY;/);
    expect(theme).toMatch(/fontBrand: FONT_DISPLAY/);
    expect(css).toMatch(/--font-display: var\(--font-body\);/);
  });
});
