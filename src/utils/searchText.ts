// Text matching shared by Search and Groups & Stories, so one query cannot give two answers on two pages.

/** Below this a query matches most of the site, so it is not yet a search. */
export const MIN_QUERY = 2;

/** Lower case, unaccented, single-spaced: "Côte  d'Ivoire" and "cote d'ivoire" fold to the same text. */
export function foldText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the folded needle appears anywhere in any of the fields. */
export function textMatches(needle: string, ...fields: unknown[]): boolean {
  const q = foldText(needle);
  if (!q) return true;
  return fields.some((f) => (Array.isArray(f) ? f.some((x) => foldText(x).includes(q)) : foldText(f).includes(q)));
}

/** 4 exact, 3 when the text starts with the needle, 2 when a later word does, 1 anywhere else, 0 no match. */
export function textScore(needle: string, field: unknown): number {
  const q = foldText(needle);
  const text = foldText(field);
  if (!q || !text) return 0;
  if (text === q) return 4;
  if (text.startsWith(q)) return 3;
  if (text.includes(` ${q}`)) return 2;
  return text.includes(q) ? 1 : 0;
}
