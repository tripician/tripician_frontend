/**
 * What a traveller wrote about themselves, read from `bio.highlights`.
 *
 * The intro is the entry keyed `intro`: prose, shown under the name. Every
 * other entry ("I'm a/an …", "My dream place is …", "I'm from …") is a short
 * highlight, shown as a quiet chip. Stored this way, there is no migration
 * behind either.
 */

/** The one key that renders as prose rather than as a chip. */
export const INTRO_KEY = 'intro';

/**
 * Placeholder strings the backend stores when a field was never filled in.
 * "Not Available" on a profile draws the eye to an absence and looks broken.
 */
const PLACEHOLDERS = new Set(['not available', 'n/a', 'na', 'none', 'null', 'undefined', '-']);

function presentable(value: unknown): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  return v && !PLACEHOLDERS.has(v.toLowerCase()) ? v : null;
}

export function readIntro(profile: any): string {
  const highlights = Array.isArray(profile?.bio?.highlights) ? profile.bio.highlights : [];
  const found = highlights.find((h: any) => h?.key === INTRO_KEY);
  return presentable(found?.value) ?? '';
}

export interface BioHighlight {
  /** A feather-style icon name ("heart", "map-pin") or an emoji, as the settings page stores it. */
  icon: string | null;
  label: string | null;
  value: string;
}

/** The short highlights, intro excluded, placeholders dropped. */
export function readHighlights(profile: any): BioHighlight[] {
  const highlights = Array.isArray(profile?.bio?.highlights) ? profile.bio.highlights : [];
  return highlights.flatMap((h: any) => {
    const value = presentable(h?.value);
    if (!value || h?.key === INTRO_KEY) return [];
    return [{ icon: typeof h?.icon === 'string' ? h.icon : null, label: presentable(h?.label), value }];
  });
}
