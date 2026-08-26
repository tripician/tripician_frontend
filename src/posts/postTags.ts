/**
 * Tag helpers.
 *
 * The vocabulary itself is NOT duplicated here. `GET /api/posts/tags` returns
 * every topic, with a live count, whether or not anything carries it yet, so the
 * filter row and the composer's picker both read the real list rather than a
 * copy that can drift from it. What lives here is only the shape of a place tag,
 * which the picker has to be able to build from the country list locally.
 */

/** Namespaced so a topic and a country can share one column without colliding. */
export const PLACE_PREFIX = 'place:';

export function placeTag(countryName: string): string {
  return PLACE_PREFIX + countryName.trim().toLowerCase();
}

export function isPlaceTag(id: string): boolean {
  return id.startsWith(PLACE_PREFIX) && id.length > PLACE_PREFIX.length;
}

/** Turns a slug back into something readable, including one we no longer know. */
export function tagLabel(id: string): string {
  if (!isPlaceTag(id)) return id;
  const name = id.slice(PLACE_PREFIX.length);
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : id;
}
