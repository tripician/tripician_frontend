/* AUTO-GENERATED - DO NOT EDIT.
 * Run: node scripts/generate-brand.mjs
 *
 * Tones are OKLCH-derived with even perceptual lightness steps, then gamut
 * mapped by bisecting chroma (never by clipping channels, which shifts hue).
 * Emitted as hex because MUI's alpha(), mapbox-gl and canvas-confetti all parse
 * colour themselves and none of them understands oklch().
 *
 * Key numbers at generation time:
 *   brand seed      #FF385C  L=65.8% C=0.231 H=17.1deg  (matches the logo mark)
 *   brand on white  3.52:1 - a FILL, never body text
 *   brandOnLight    4.52:1 - use this for coloured type
 *   error hue       32deg, 14.9deg off the brand (was 6deg)
 */

export const BRAND_SEED = '#FF385C';

/** Channel triple for `rgb(var(--brand-rgb) / a)` in raw CSS. */
export const BRAND_CHANNELS = '255 56 92';

/** Brand coral at body-text weight. 4.52:1 on white. */
export const BRAND_ON_LIGHT = '#DE0F46';

/** Brand coral readable on the dark canvas. 4.86:1. */
export const BRAND_ON_DARK = '#F54C63';

export const RAMPS = {
  "brand": {
    "120": "#140002",
    "220": "#3A000B",
    "320": "#640019",
    "420": "#93002A",
    "520": "#C4003B",
    "620": "#EA3655",
    "720": "#FF6F7C",
    "820": "#FFA9AC",
    "900": "#FFD1D2",
    "960": "#FFEDED",
    "980": "#FFF6F6"
  },
  "neutral": {
    "120": "#060605",
    "220": "#1C1A18",
    "320": "#34332F",
    "420": "#4F4D49",
    "520": "#6B6964",
    "620": "#888681",
    "720": "#A6A4A0",
    "820": "#C6C4C0",
    "900": "#DFDEDB",
    "960": "#F3F2EF",
    "980": "#F9F8F6"
  },
  "error": {
    "120": "#140000",
    "220": "#390300",
    "320": "#630A00",
    "420": "#901500",
    "520": "#BB2B12",
    "620": "#DC533B",
    "720": "#F67B64",
    "820": "#FFAC9B",
    "900": "#FFD2C9",
    "960": "#FFEDE9",
    "980": "#FFF6F4"
  },
  "warning": {
    "120": "#0C0400",
    "220": "#291600",
    "320": "#492B00",
    "420": "#6C4300",
    "520": "#915B00",
    "620": "#B97500",
    "720": "#DA9436",
    "820": "#F3B76F",
    "900": "#FFD6A8",
    "960": "#FFEFDD",
    "980": "#FFF7EE"
  },
  "success": {
    "120": "#000902",
    "220": "#00220C",
    "320": "#003E1C",
    "420": "#005D2D",
    "520": "#007E3F",
    "620": "#339D5A",
    "720": "#64BA7E",
    "820": "#90D8A3",
    "900": "#B4EFC2",
    "960": "#D3FFDD",
    "980": "#EAFFEE"
  },
  "info": {
    "120": "#000613",
    "220": "#001B36",
    "320": "#00345F",
    "420": "#004F8B",
    "520": "#046BB8",
    "620": "#398AD6",
    "720": "#65AAEE",
    "820": "#95C9FF",
    "900": "#C6E1FF",
    "960": "#E8F3FF",
    "980": "#F4F9FF"
  }
} as const;

export type RampName = keyof typeof RAMPS;
