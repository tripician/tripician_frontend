/**
 * Source-scan guards for the three rules that separated this UI from the
 * reference product, all of which are cheap to assert and expensive to
 * re-litigate in review three months from now.
 *
 * These scan text rather than rendered output on purpose: the offences they
 * catch live in `sx` props and in raw `.css`, and ESLint cannot see the latter
 * at all.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');
const CODE = /\.(tsx?|css)$/;
const SELF = 'brand-shadow.guard.test.ts';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (CODE.test(name) && !name.endsWith(SELF)) out.push(p);
  }
  return out;
}

function rel(file: string): string {
  return relative(SRC, file).replace(/\\/g, '/');
}

/**
 * A box-shadow layer coloured with brand coral. Groups 1-3 are offset-x,
 * offset-y and BLUR; the optional fourth length is spread.
 *
 * Anchored on three whitespace-separated lengths immediately before the
 * `rgba()`, which is what distinguishes a shadow layer from a gradient colour
 * stop (`linear-gradient(135deg, rgba(255,56,92,...) 0%`) or a plain
 * background colour.
 */
const CORAL_SHADOW_LAYER =
  /(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?(?:\s+-?[\d.]+(?:px)?)?\s+rgba\(\s*255\s*,\s*56\s*,\s*92\s*,/g;

describe('brand shadow guard', () => {
  /**
   * The rule in one sentence: coral may draw a RING and may never draw a GLOW.
   *
   * A ring has zero blur and sits exactly on the control's edge - that is the
   * focus/selection idiom, and it is the look this design system is built on. A
   * blurred coral shadow behind a button is the loudest "generated UI" tell
   * there is, and removing ~60 of them is what this whole change was for.
   */
  it('has no coral box-shadow with a non-zero blur radius', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        for (const m of line.matchAll(CORAL_SHADOW_LAYER)) {
          if (parseFloat(m[3]) !== 0) offenders.push(`${rel(file)}:${i + 1}  ->  ${m[0].trim()}...`);
        }
      });
    }

    expect(
      offenders,
      'Coral GLOW found. A brand-tinted shadow may only ever be a ring:\n'
      + '  ok:  0 0 0 2px rgba(255,56,92,1)      (blur 0)\n'
      + '  no:  0 4px 14px rgba(255,56,92,0.32)  (blur 14px)\n'
      + `Offenders:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  /**
   * Buttons take a flat fill. The gradient survives only where it is genuinely
   * decorative - the Navia orb IS a gradient, and the landing page uses washes
   * and scrims behind photography.
   */
  const DECORATIVE_GRADIENT_ALLOWLIST = [
    'theme/index.ts',              // defines custom.gradients.*
    'navia/NaviaOrb.tsx',          // the orb is a gradient
    'assets/css/LandingPage.css',  // hero scrims + section washes
    // Add a file here only with a comment naming the decorative element.
    'pages/BlogsPage/BlogPost.tsx',            // reading-progress bar, pull-quote rule, hero wash
    'pages/InfoPages/AboutPage.tsx',           // icon tile + closing panel
    'pages/InfoPages/ContactPage.tsx',         // icon tile
    'pages/InfoPages/HelpPage.tsx',            // icon tile + closing panel
    'pages/InfoPages/PrivacyPage.tsx',         // icon tile
    'pages/InfoPages/TermsPage.tsx',           // icon tile
    'pages/CreateTripPage/MapDrawer.tsx',      // header icon tile + route line
    'pages/CreateTripPage/TripPlanner.tsx',    // timeline borderImage
    'pages/CreateTripPage/TripSettingsDialog.tsx', // per-vibe activeBg swatches
    'pages/CreateTripPage/DestinationCardsPanel.tsx', // gradient-clipped % text, progress bar, header icon tile
  ];

  it('has no hardcoded brand gradient outside the decorative allowlist', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const r = rel(file);
      if (DECORATIVE_GRADIENT_ALLOWLIST.some((a) => r.endsWith(a))) continue;
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (/linear-gradient\([^)]*#(?:FF385C|ff385c|E31C5F|e31c5f|D91A50|d91a50)/.test(line)) {
          offenders.push(`${r}:${i + 1}`);
        }
      });
    }

    expect(
      offenders,
      'A button takes the flat brand fill. For genuine decoration use '
      + `theme.custom.gradients.brand and add the file to the allowlist with a reason:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  /**
   * One source of truth per context for the display face, so changing it stays a
   * one-line edit rather than a 29-site sweep like the Playfair -> Poppins move.
   */
  it('has no hardcoded display-font literal', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const r = rel(file);
      if (r === 'theme/index.ts' || r === 'index.css') continue;
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (/Playfair|['"]Poppins['"]/.test(line)) offenders.push(`${r}:${i + 1}`);
      });
    }

    expect(
      offenders,
      `Use theme.custom.fontDisplay (TSX) or var(--font-display) (CSS):\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
