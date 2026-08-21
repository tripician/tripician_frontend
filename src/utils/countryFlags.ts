/**
 * Country name/code resolution, and the flag helpers built on it.
 *
 * The lookup used to be a hand-kept 53-country object read by exact, case
 * sensitive key match. Two things went wrong with that in production: countries
 * simply missing from it (Greenland rendered a generic pin, Afghanistan fell
 * through to raw text in a traveller's passport, sitting next to real flags),
 * and any casing or spelling drift in the data missing entirely. The table now
 * lives in `countryData.ts` and covers ISO 3166-1, and every lookup here
 * normalises before matching.
 *
 * On flags specifically, see `flagPngUrl`: **emoji flags do not render on
 * Windows**, so the image URL is the primary path and the emoji is the fallback,
 * not the other way round.
 */

import { COUNTRIES, COUNTRY_ALIASES } from './countryData';

const NAME_TO_CODE: Record<string, string> = {};
const CODE_TO_NAME: Record<string, string> = {};
const ISO2_TO_ISO3: Record<string, string> = {};
const ISO3_TO_ISO2: Record<string, string> = {};

/**
 * Lower case, unaccented, punctuation and extra whitespace removed.
 *
 * This is what lets "vietnam", "Viet Nam", "VIETNAM" and "Côte d'Ivoire" all
 * find their row. Applied identically when building the index and when reading
 * it, so the two can never disagree.
 */
function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const [alpha2, alpha3, name] of COUNTRIES) {
  NAME_TO_CODE[normalise(name)] = alpha2;
  CODE_TO_NAME[alpha2] = name;
  ISO2_TO_ISO3[alpha2] = alpha3;
  ISO3_TO_ISO2[alpha3] = alpha2;
}

for (const [alias, alpha2] of Object.entries(COUNTRY_ALIASES)) {
  // Aliases never overwrite a canonical name, so a country cannot be shadowed by
  // another country's alternate spelling.
  const key = normalise(alias);
  if (!NAME_TO_CODE[key]) NAME_TO_CODE[key] = alpha2;
}

/** Canonical names, for pickers and autocomplete. Alphabetical, no aliases. */
export const COUNTRY_NAMES: string[] = COUNTRIES.map(([, , name]) => name).sort((a, b) =>
  a.localeCompare(b),
);

/**
 * Alpha-2 for a country name, an alias, or a string that is already a code.
 *
 * The code passthrough matters because several payloads on this site carry
 * alpha-2 or alpha-3 in a field named "country", and callers cannot tell which
 * they were handed.
 */
export function countryCodeFromName(name?: string | null): string | undefined {
  if (!name) return undefined;
  const raw = name.trim();
  if (!raw) return undefined;

  const key = normalise(raw);
  if (NAME_TO_CODE[key]) return NAME_TO_CODE[key];

  const upper = raw.toUpperCase();
  if (upper.length === 2 && ISO2_TO_ISO3[upper]) return upper;
  if (upper.length === 3 && ISO3_TO_ISO2[upper]) return ISO3_TO_ISO2[upper];

  return undefined;
}

export function countryAlpha3FromCode(code?: string): string | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  if (upper.length === 3) return ISO3_TO_ISO2[upper] ? upper : undefined;
  if (upper.length === 2) return ISO2_TO_ISO3[upper];
  return undefined;
}

export function countryAlpha3FromName(name: string): string | undefined {
  const iso2 = countryCodeFromName(name);
  return iso2 ? ISO2_TO_ISO3[iso2] : undefined;
}

export function countryNameFromCode(code?: string): string | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  if (upper.length === 2) return CODE_TO_NAME[upper];
  if (upper.length === 3) {
    const iso2 = ISO3_TO_ISO2[upper];
    return iso2 ? CODE_TO_NAME[iso2] : undefined;
  }
  return undefined;
}

/**
 * Regional-indicator pair for an alpha-2 code.
 *
 * **This renders as two letters on Windows**, which has no flag emoji font, so
 * Chrome draws 🇲🇽 as "MX". Treat it as a fallback for platforms that do have
 * the font, never as the primary way to show a flag. Use `<CountryFlag>`
 * (components/ui/CountryFlag.tsx) rather than calling this directly.
 */
export function flagEmojiFromCode(code?: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6; // Regional indicator offset
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(base + (c.charCodeAt(0) - 65)))
    .join('');
}

export function flagEmojiFromName(name: string): string {
  return flagEmojiFromCode(countryCodeFromName(name));
}

/**
 * A real flag image from flagcdn.com. The primary rendering path, because it
 * looks identical on every platform.
 */
export function flagPngUrl(code?: string, size: number = 24): string | undefined {
  if (!code) return undefined;
  const normalized = code.toLowerCase();
  // Available common sizes: 16x12, 20x15, 24x18, 32x24
  const h = Math.round(size * 0.75); // approximate aspect 4:3
  return `https://flagcdn.com/${size}x${h}/${normalized}.png`;
}

export default {
  countryCodeFromName,
  countryAlpha3FromCode,
  countryAlpha3FromName,
  countryNameFromCode,
  flagEmojiFromCode,
  flagEmojiFromName,
  flagPngUrl,
  COUNTRY_NAMES,
};
