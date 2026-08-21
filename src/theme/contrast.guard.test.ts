/**
 * WCAG contrast, asserted on the real theme.
 *
 * `createAppTheme` touches no DOM, so this imports it directly rather than
 * scanning source the way the other two guards must.
 *
 * ## Why this is a ratchet and not a wall
 *
 * Several pairs fail today, and they were found by measuring rather than by
 * anyone reporting them:
 *
 *   white on primary   3.52:1  every filled brand button label
 *   white on warning   2.15:1  the worst pair in the app
 *   white on info      2.77:1
 *   white on success   3.05:1
 *   text.disabled      2.39:1 light / 2.89:1 dark
 *
 * Failing the build on all of those would mean either reverting the guard or
 * changing five palette entries blind, so each is recorded below with the ratio
 * measured at the time. The assertions allow the recorded value and nothing
 * worse, which means these can only ever improve. Delete a line when the pair is
 * fixed; never raise a number to make a test pass.
 */

import { describe, it, expect } from 'vitest';
import { createAppTheme } from './index';

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Accepts #rgb, #rrggbb, and the rgba() strings the theme stores for surfaces. */
function channels(colour: string): [number, number, number] {
  const rgba = colour.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];

  const h = colour.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a colour this test can read: ${colour}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(colour: string): number {
  const [r, g, b] = channels(colour).map((c) => toLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * Measured debt. Each entry is a pair that does not clear its bar today, with
 * the ratio at the time of writing. Assertions below allow `recorded - 0.01`
 * and no less, so a regression fails and a fix passes.
 */
const KNOWN_BELOW_BAR: Record<string, number> = {
  // Brand coral is a fill, not a text colour, and it cannot move: it is the
  // logo. `custom.brand.onLight` (4.52:1) is the tone for coloured type. This
  // one is the filled-button label and is accepted debt.
  'light primary.contrastText on primary.main': 3.52,
  'dark primary.contrastText on primary.main': 3.52,
  // Disabled text is exempt from WCAG. Was 2.39:1 before the neutral ramp.
  'light text.disabled on background.default': 3.43,
  'dark text.disabled on background.default': 2.89,
  // PAID OFF by adopting the ramps (2026-08-18) - kept as a record of what the
  // numbers were, because the point of a ratchet is that it cannot slip back:
  //   warning 2.15 -> 6.84   (bright fill, dark text)
  //   info    2.77 -> 5.53
  //   success 3.05 -> 5.18
  //   error   3.91 -> 6.06
};

function check(label: string, fg: string, bg: string, bar: number) {
  const r = ratio(fg, bg);
  const recorded = KNOWN_BELOW_BAR[label];
  if (recorded !== undefined) {
    expect(
      r,
      `${label} is recorded as known debt at ${recorded}:1 and measured ${r.toFixed(2)}:1. ` +
        'It may improve, never regress. If you fixed it, delete its line from KNOWN_BELOW_BAR.',
    ).toBeGreaterThanOrEqual(recorded - 0.01);
    return;
  }
  expect(
    r,
    `${label} is ${r.toFixed(2)}:1, below the ${bar}:1 bar. ` +
      'Either fix the colour, or record it in KNOWN_BELOW_BAR with the measured value and a reason.',
  ).toBeGreaterThanOrEqual(bar);
}

describe.each(['light', 'dark'] as const)('%s theme contrast', (mode) => {
  const t = createAppTheme(mode);
  const { palette } = t;
  const surfaces = ['default', 'paper', 'sidebar', 'elevated'] as const;

  it('reads its own palette', () => {
    // A positive control: if the theme shape moves, every other assertion here
    // would pass vacuously against undefined.
    expect(palette.primary.main).toMatch(/^#[0-9A-F]{6}$/i);
    expect(palette.background.default).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it.each(surfaces)('body text clears AA on background.%s', (surface) => {
    check(`${mode} text.primary on background.${surface}`, palette.text.primary, palette.background[surface], 4.5);
  });

  it.each(surfaces)('secondary text clears AA on background.%s', (surface) => {
    check(`${mode} text.secondary on background.${surface}`, palette.text.secondary, palette.background[surface], 4.5);
  });

  it('disabled text stays legible on the canvas', () => {
    check(`${mode} text.disabled on background.default`, palette.text.disabled, palette.background.default, 4.5);
  });

  it.each(['primary', 'error', 'warning', 'info', 'success'] as const)(
    '%s.contrastText clears AA on its own fill',
    (key) => {
      check(`${mode} ${key}.contrastText on ${key}.main`, palette[key].contrastText, palette[key].main, 4.5);
    },
  );

  it('the brand text tone clears AA where it is meant to be used', () => {
    const onSurface = mode === 'light' ? palette.background.default : palette.background.default;
    const tone = mode === 'light' ? t.custom.brand.onLight : t.custom.brand.onDark;
    check(`${mode} custom.brand.on* on background.default`, tone, onSurface, 4.5);
  });
});

describe('the brand colour has one source', () => {
  it('theme channels match the seed', () => {
    const t = createAppTheme('light');
    const [r, g, b] = channels(t.custom.brand.fill);
    expect(t.custom.brand.channels).toBe(`${r} ${g} ${b}`);
  });

  it('the brand fill is still the logo colour', () => {
    // The logo mark is coral. If this changes, the logo asset changes with it.
    expect(createAppTheme('light').custom.brand.fill).toBe('#FF385C');
  });
});
