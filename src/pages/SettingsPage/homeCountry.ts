import { COUNTRY_SEARCH_KEYS, countryCodeFromName, countryNameFromCode, normaliseCountryText } from '../../utils/countryFlags';

/**
 * "I'm from" is asked once, as the home country (an ISO code), and the bio's
 * "I'm from" line is written to match it on save. The app does the same
 * (`tripician_mobile/src/features/settings/profileBio.ts`), so a profile saved
 * on either reads the same on both.
 */

const BY_NAME = new Map(COUNTRY_SEARCH_KEYS);

/** A country's name or alias, never a bare code: "Los Angeles, CA" is not Canada. */
function codeForName(text: string): string | undefined {
  const key = normaliseCountryText(text);
  return key ? BY_NAME.get(key) : undefined;
}

/**
 * The country an "I'm from" line names, as an ISO code: the whole line
 * ("India", "USA") or its last part ("Kolkata, India"). Undefined when it
 * names no country.
 */
export function countryFromBio(from: string): string | undefined {
  const parts = from.split(',');
  return codeForName(from) ?? codeForName(parts[parts.length - 1]);
}

/**
 * The bio's "I'm from" line for a home country: the line already stored when
 * it names that same country (a city in it, "Kolkata, India", is kept),
 * otherwise the country's name. With no country chosen, the stored line stays.
 */
export function fromForCountry(code: string, stored: string): string {
  const name = countryNameFromCode(code);
  if (!name) return stored;
  return countryFromBio(stored) === code.toUpperCase() ? stored : name;
}

/**
 * The home country to show: the saved one when it is a real code, otherwise
 * the country an older "I'm from" line names, otherwise none. An older
 * free-text value is not a country to keep.
 */
export function initialHomeCountry(saved: string, from: string): string {
  if (countryNameFromCode(saved)) return countryCodeFromName(saved) ?? '';
  return countryFromBio(from) ?? '';
}
