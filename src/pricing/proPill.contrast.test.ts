/**
 * The Pro pill's two faces, measured in both colour modes.
 *
 * ## Why this exists beside the theme's own contrast guard
 *
 * `theme/contrast.guard.test.ts` measures thirty named PALETTE pairs and never
 * reads component source, which is the right scope for it. The consequence is
 * that what a component actually pairs together is unguarded: this pill shipped
 * for months with its label at 3.12:1 on its own tint and nothing failed.
 *
 * ## Why this control in particular
 *
 * Two reasons. It is the only place in the shell that says Pro exists, so if it
 * stops being legible the product stops mentioning its own paid tier. And there
 * is no way to switch the app into dark mode from the UI - `themeSlice` starts
 * light and nothing dispatches the toggle - so the dark face cannot be checked
 * by looking at it. This is the only thing standing between the dark pill and
 * nobody ever noticing it broke.
 *
 * The pairs below are exactly what `ProPill.tsx` sets. If that component changes
 * which tokens it reads, change them here too, or this proves nothing.
 */

import { describe, it, expect } from 'vitest';
import { createAppTheme } from '../theme';

function channels(colour: string): [number, number, number] {
  const rgba = colour.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];

  const h = colour.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a colour this test can read: ${colour}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(colour: string): number {
  const [r, g, b] = channels(colour).map((c) => toLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe.each(['light', 'dark'] as const)('Pro pill in %s', (mode) => {
  const theme = createAppTheme(mode);
  const { palette, custom } = theme;

  /*
   * The free face is a solid ink fill. It has to be readable AS A SHAPE against
   * the header, not only readable as text, because the complaint that produced
   * it was that nobody could see the control at all. The tinted version it
   * replaced measured 1.13:1 here.
   */
  it('the invitation reads as a shape against the header', () => {
    const fill = palette.text.primary;
    const header = palette.background.default;
    expect(ratio(fill, header)).toBeGreaterThanOrEqual(12);
  });

  it('the invitation label clears AA on its own fill by a wide margin', () => {
    expect(ratio(palette.background.paper, palette.text.primary)).toBeGreaterThanOrEqual(12);
  });

  /*
   * The subscribed face is quiet on purpose: it confirms rather than sells. That
   * is not licence for it to be faint, and coral type is exactly where this
   * product has historically slipped below the bar.
   */
  it('the confirmation label clears AA on paper', () => {
    const ink = mode === 'light' ? custom.brand.onLight : custom.brand.onDark;
    expect(ratio(ink, palette.background.paper)).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * The tone the pill must NOT use. `primary.main` is a fill, and at label sizes
   * it does not clear AA on a light surface - which is why custom.brand.onLight
   * exists. Asserting the failure keeps the reason visible: if someone "tidies"
   * the pill back to primary.main, the number they are choosing is this one.
   */
  it('records why the brand fill is not the label colour', () => {
    const naive = ratio(palette.primary.main, palette.background.paper);
    if (mode === 'light') expect(naive).toBeLessThan(4.5);
  });
});
