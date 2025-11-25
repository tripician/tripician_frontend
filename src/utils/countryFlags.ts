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

// Export a stable list of supported country names for dropdowns/autocomplete
export const COUNTRY_NAMES: string[] = Object.keys(NAME_TO_CODE);

export function countryCodeFromName(name: string): string | undefined {
  if (!name) return undefined;
  return NAME_TO_CODE[name] || undefined;
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
  flagEmojiFromCode,
  flagEmojiFromName,
  flagPngUrl
};
