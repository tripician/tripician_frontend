// Utility to derive flag emoji (or CDN URL) from country name.
// Uses a minimal mapping name -> ISO 3166-1 alpha-2 code. Fallback returns empty string.
// To keep bundle small, we only map common travel destinations plus names from creation modal list frequently used.
// You can extend this mapping later or replace with a full library.

const NAME_TO_CODE: Record<string, string> = {
  'India': 'IN',
  'United States': 'US',
  'United Kingdom': 'GB',
  'Canada': 'CA',
  'Australia': 'AU',
  'France': 'FR',
  'Germany': 'DE',
  'Spain': 'ES',
  'Italy': 'IT',
  'Japan': 'JP',
  'China': 'CN',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'South Africa': 'ZA',
  'New Zealand': 'NZ',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Turkey': 'TR',
  'United Arab Emirates': 'AE',
  'Singapore': 'SG',
  'Thailand': 'TH',
  'Indonesia': 'ID',
  'Vietnam': 'VN',
  'Philippines': 'PH',
  'South Korea': 'KR',
  'Russia': 'RU',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Peru': 'PE',
  'Colombia': 'CO',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Kenya': 'KE',
  'Tanzania, United Republic of': 'TZ',
  'Israel': 'IL',
  'Saudi Arabia': 'SA',
  'Ireland': 'IE',
  'Iceland': 'IS',
  'Austria': 'AT',
  'Czech Republic': 'CZ',
  'Poland': 'PL',
  'Hungary': 'HU',
  'Finland': 'FI',
  'Croatia': 'HR',
  'Botswana': 'BW',
  'Zimbabwe': 'ZW'
};

const ISO2_TO_ISO3: Record<string, string> = {
  IN: 'IND',
  US: 'USA',
  GB: 'GBR',
  CA: 'CAN',
  AU: 'AUS',
  FR: 'FRA',
  DE: 'DEU',
  ES: 'ESP',
  IT: 'ITA',
  JP: 'JPN',
  CN: 'CHN',
  BR: 'BRA',
  MX: 'MEX',
  ZA: 'ZAF',
  NZ: 'NZL',
  CH: 'CHE',
  SE: 'SWE',
  NO: 'NOR',
  DK: 'DNK',
  NL: 'NLD',
  BE: 'BEL',
  PT: 'PRT',
  GR: 'GRC',
  TR: 'TUR',
  AE: 'ARE',
  SG: 'SGP',
  TH: 'THA',
  ID: 'IDN',
  VN: 'VNM',
  PH: 'PHL',
  KR: 'KOR',
  RU: 'RUS',
  AR: 'ARG',
  CL: 'CHL',
  PE: 'PER',
  CO: 'COL',
  EG: 'EGY',
  MA: 'MAR',
  KE: 'KEN',
  TZ: 'TZA',
  IL: 'ISR',
  SA: 'SAU',
  IE: 'IRL',
  IS: 'ISL',
  AT: 'AUT',
  CZ: 'CZE',
  PL: 'POL',
  HU: 'HUN',
  FI: 'FIN',
  HR: 'HRV',
  BW: 'BWA',
  ZW: 'ZWE',
};

const ISO3_TO_ISO2: Record<string, string> = Object.entries(ISO2_TO_ISO3).reduce((acc, [iso2, iso3]) => {
  acc[iso3] = iso2;
  return acc;
}, {} as Record<string, string>);

const CODE_TO_NAME: Record<string, string> = Object.entries(NAME_TO_CODE).reduce((acc, [name, iso2]) => {
  acc[iso2] = name;
  return acc;
}, {} as Record<string, string>);

const ISO3_TO_NAME: Record<string, string> = Object.entries(ISO2_TO_ISO3).reduce((acc, [iso2, iso3]) => {
  const name = CODE_TO_NAME[iso2];
  if (name) acc[iso3] = name;
  return acc;
}, {} as Record<string, string>);

// Export a stable list of supported country names for dropdowns/autocomplete
export const COUNTRY_NAMES: string[] = Object.keys(NAME_TO_CODE);

export function countryCodeFromName(name: string): string | undefined {
  if (!name) return undefined;
  return NAME_TO_CODE[name] || undefined;
}

export function countryAlpha3FromCode(code?: string): string | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  if (!upper) return undefined;
  if (upper.length === 3) {
    return ISO3_TO_ISO2[upper] ? upper : upper;
  }
  if (upper.length === 2) {
    return ISO2_TO_ISO3[upper];
  }
  return undefined;
}

export function countryAlpha3FromName(name: string): string | undefined {
  const iso2 = countryCodeFromName(name);
  if (!iso2) return undefined;
  return ISO2_TO_ISO3[iso2];
}

export function countryNameFromCode(code: string): string | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  if (!upper) return undefined;
  if (upper.length === 2) {
    return CODE_TO_NAME[upper];
  }
  if (upper.length === 3) {
    const iso2 = ISO3_TO_ISO2[upper];
    if (iso2) return CODE_TO_NAME[iso2];
    return ISO3_TO_NAME[upper];
  }
  return undefined;
}

export function flagEmojiFromCode(code?: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6; // Regional indicator offset
  const chars = code.toUpperCase().split('').map(c => String.fromCodePoint(base + (c.charCodeAt(0) - 65))).join('');
  return chars; // e.g. 'IN' -> 🇮🇳
}

export function flagEmojiFromName(name: string): string {
  return flagEmojiFromCode(countryCodeFromName(name));
}

// Optional helper for CDN flag images (e.g., flagcdn.com). Returns PNG URL or undefined.
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
  flagPngUrl
};
