/**
 * Generates src/theme/brand.generated.ts.
 *
 *   node scripts/generate-brand.mjs
 *
 * The palette used to be 293 hand-picked hex literals with no ramp and no
 * contrast check. Four things were measurably wrong with it:
 *
 *   1. Brand coral sits at hue 17.1 and error at 23.0 - SIX degrees apart. The
 *      colour meaning "do this" and the colour meaning "this broke" were the
 *      same hue, so neither could be read without its icon.
 *   2. White on coral is 3.52:1. Every filled primary button label failed AA.
 *   3. White on warning is 2.15:1, the worst pair in the app. Dark mode already
 *      solved this with dark text on amber; light mode never got the fix.
 *   4. Light backgrounds sat at hue ~90-106 (warm) while light text sat at ~286
 *      (cool violet), so the neutrals were two unrelated families.
 *
 * The brand hue itself is NOT a free variable: it has to match the logo mark, so
 * BRAND_SEED stays exactly #FF385C. What changes is everything around it.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hexToOklch, oklchToHex, contrastRatio, hexToChannels } from './oklch.mjs';

/** The logo mark. Changing this is the ONLY way the brand hue should ever move. */
const BRAND_SEED = '#FF385C';

/** Perceptual lightness stops, darkest to lightest. Even steps by construction. */
const STOPS = [12, 22, 32, 42, 52, 62, 72, 82, 90, 96, 98];

/**
 * Chroma follows lightness on a shallow arch: colour is weakest at the extremes,
 * where a near-black or near-white with real saturation reads as a colour cast
 * rather than as a neutral of that family.
 */
const archChroma = (Lpct, peak) => {
  const t = Lpct / 100;
  return peak * (1 - Math.abs(t - 0.55) / 0.55) ** 0.55;
};

function ramp(hue, peakChroma) {
  const out = {};
  for (const L of STOPS) out[L * 10] = oklchToHex(L / 100, archChroma(L, peakChroma), hue);
  return out;
}

/**
 * The tone NEAREST the seed in lightness that still clears `ratio`.
 *
 * Not the darkest that passes: on a light canvas that lands on near-black,
 * which technically passes and is no longer recognisably the brand. The useful
 * answer is the most brand-like tone that is still legible, so this searches for
 * the minimum lightness DISTANCE from the seed rather than maximum contrast.
 * Same formulation works for a dark canvas, where the nearest passing tone is
 * lighter instead of darker.
 */
function toneForContrast(hue, chroma, against, ratio, seedL) {
  let best = null;
  let bestGap = Infinity;
  for (let L = 8; L <= 99; L += 0.5) {
    const hex = oklchToHex(L / 100, Math.min(chroma, archChroma(L, chroma)), hue);
    if (contrastRatio(hex, against) < ratio) continue;
    const gap = Math.abs(L / 100 - seedL);
    if (gap < bestGap) { bestGap = gap; best = hex; }
  }
  return best;
}

const seed = hexToOklch(BRAND_SEED);

/*
 * Hues. Brand is fixed by the logo; the rest are placed to be TELLABLE APART
 * from it and from each other, which is the job a semantic palette actually has.
 *
 * Error moves 17.1 -> 32: as far from the brand as a colour can go and still
 * read as danger rather than as a warning. Info moves off 237 so it stops being
 * byte-identical to the Verified badge (#0EA5E9), which is a deliberate platform
 * mark and keeps its exact value.
 */
const HUES = {
  brand: seed.H,
  error: 32,
  warning: 70,
  success: 152,
  info: 250,
  /* One neutral family for everything, warm, because this product is a reading
     surface and a warm near-black reads as ink where a cool one reads as UI.
     Chroma stays under 0.01 so it is felt rather than seen. */
  neutral: 85,
};

/* The ramp carries tones; BRAND_SEED stays the authoritative brand value and is
   exported separately, so no rounding can ever move the logo colour. */
const brand = ramp(HUES.brand, seed.C);

const palette = {
  brand,
  neutral: ramp(HUES.neutral, 0.008),
  error: ramp(HUES.error, 0.19),
  warning: ramp(HUES.warning, 0.165),
  success: ramp(HUES.success, 0.15),
  info: ramp(HUES.info, 0.15),
};

/*
 * The accessible brand text tone. Brand coral is a FILL, not a text colour: at
 * 3.36:1 on the light canvas it fails AA for anything at body size, and this
 * codebase sets `color: '#FF385C'` on 10-12px text in dozens of places.
 */
/*
 * Solved against the WORST surface each tone has to survive, not against pure
 * white and pure black. Light surfaces run default #FAFAF8 / paper #FFFFFF /
 * sidebar #F6F5F2, and dark type has the least contrast on the DARKEST of
 * those, so sidebar is the binding constraint. Dark surfaces run default
 * #0F0F13 up to elevated #1D1D24, and light type has the least contrast on the
 * LIGHTEST, so elevated binds. Solving against white/black instead produced a
 * tone that measured 4.51:1 in the generator and 4.31:1 on the real canvas.
 */
const LIGHTEST_DARK_SURFACE = '#1D1D24';
const DARKEST_LIGHT_SURFACE = '#F6F5F2';

const brandOnLight = toneForContrast(HUES.brand, seed.C, DARKEST_LIGHT_SURFACE, 4.5, seed.L);
const brandOnDark = toneForContrast(HUES.brand, seed.C, LIGHTEST_DARK_SURFACE, 4.5, seed.L);

const out = `/* AUTO-GENERATED - DO NOT EDIT.
 * Run: node scripts/generate-brand.mjs
 *
 * Tones are OKLCH-derived with even perceptual lightness steps, then gamut
 * mapped by bisecting chroma (never by clipping channels, which shifts hue).
 * Emitted as hex because MUI's alpha(), mapbox-gl and canvas-confetti all parse
 * colour themselves and none of them understands oklch().
 *
 * Key numbers at generation time:
 *   brand seed      ${BRAND_SEED}  L=${(seed.L * 100).toFixed(1)}% C=${seed.C.toFixed(3)} H=${seed.H.toFixed(1)}deg  (matches the logo mark)
 *   brand on white  ${contrastRatio(BRAND_SEED, '#FFFFFF').toFixed(2)}:1 - a FILL, never body text
 *   brandOnLight    ${contrastRatio(brandOnLight, DARKEST_LIGHT_SURFACE).toFixed(2)}:1 - use this for coloured type
 *   error hue       ${HUES.error}deg, ${(HUES.error - seed.H).toFixed(1)}deg off the brand (was 6deg)
 */

export const BRAND_SEED = '${BRAND_SEED}';

/** Channel triple for \`rgb(var(--brand-rgb) / a)\` in raw CSS. */
export const BRAND_CHANNELS = '${hexToChannels(BRAND_SEED)}';

/** Brand coral at body-text weight. ${contrastRatio(brandOnLight, DARKEST_LIGHT_SURFACE).toFixed(2)}:1 on white. */
export const BRAND_ON_LIGHT = '${brandOnLight}';

/** Brand coral readable on the dark canvas. ${contrastRatio(brandOnDark, LIGHTEST_DARK_SURFACE).toFixed(2)}:1. */
export const BRAND_ON_DARK = '${brandOnDark}';

export const RAMPS = ${JSON.stringify(palette, null, 2)} as const;

export type RampName = keyof typeof RAMPS;
`;

const here = path.dirname(fileURLToPath(import.meta.url));
writeFileSync(path.join(here, '..', 'src', 'theme', 'brand.generated.ts'), out, 'utf8');

console.log('wrote src/theme/brand.generated.ts');
console.log(`  brand seed     ${BRAND_SEED}  (logo-locked)`);
console.log(`  brandOnLight   ${brandOnLight}  ${contrastRatio(brandOnLight, DARKEST_LIGHT_SURFACE).toFixed(2)}:1 on white`);
console.log(`  brandOnDark    ${brandOnDark}  ${contrastRatio(brandOnDark, LIGHTEST_DARK_SURFACE).toFixed(2)}:1 on dark canvas`);
for (const [name, r] of Object.entries(palette)) {
  console.log(`  ${name.padEnd(8)} ${Object.values(r).join(' ')}`);
}
