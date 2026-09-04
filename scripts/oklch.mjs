/**
 * OKLCH <-> sRGB, with gamut mapping. Public-domain maths, zero dependencies.
 *
 * Why this exists: the palette was 293 hand-picked hex literals with no ramp and
 * no contrast check. Generating the tones instead means the steps are
 * perceptually even, and swapping the brand hue later is one number rather than
 * thirty fresh guesses.
 *
 * Why the OUTPUT is hex and never `oklch()`: three consumers in this app parse
 * colour themselves and none of them understands it.
 *   - MUI `alpha()` / `decomposeColor` throws on anything outside
 *     hex / rgb / hsl / color(srgb ...).
 *   - mapbox-gl's paint parser takes hex, rgb, hsl or a named colour.
 *   - canvas-confetti strips a colour with /[^0-9a-f]/gi, which turns any
 *     modern syntax into garbage rather than an error.
 * So OKLCH is the design space and hex is the delivery format.
 */

/* ---------- transfer functions ---------- */

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/* ---------- sRGB -> OKLCH ---------- */

export function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

export function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C: Math.hypot(a, bb), H };
}

/* ---------- OKLCH -> sRGB ---------- */

/** Linear sRGB channels, unclamped, so gamut testing can see the overflow. */
function oklchToLinearRgb(L, C, H) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const inGamut = (rgb) => rgb.every((c) => c >= -0.0001 && c <= 1.0001);

/**
 * Largest in-gamut chroma at this L and H, by bisection.
 *
 * Clipping the RGB channels instead is the usual shortcut and it shifts the hue
 * visibly in the deep tones - a "red" that clips to (1, 0.1, 0.1) is no longer
 * on the hue you asked for. Bisecting on chroma keeps L and H exact and gives up
 * only saturation, which is the one of the three nobody notices.
 */
function clampChroma(L, C, H) {
  if (inGamut(oklchToLinearRgb(L, C, H))) return C;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinearRgb(L, mid, H))) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function oklchToHex(L, C, H) {
  const c = clampChroma(L, C, H);
  const hex = oklchToLinearRgb(L, c, H)
    .map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  return `#${hex.toUpperCase()}`;
}

/* ---------- WCAG 2.1 ---------- */

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** The channel triple, for `rgb(var(--brand-rgb) / a)` in raw CSS. */
export function hexToChannels(hex) {
  return hexToRgb(hex).map((c) => Math.round(c * 255)).join(' ');
}
