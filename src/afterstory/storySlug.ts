/**
 * Story URL identity.
 *
 * Trips derive their slug from the current name on every read and rely on a
 * trailing GUID to stay resolvable. That is fine for a URL shared inside a
 * group. A story is meant to be indexed and linked to from elsewhere, so its URL
 * has to survive the author renaming it: the slug is minted once at first
 * publish, stored, and never regenerated.
 *
 * Mirrors backend AfterStoryServices/StorySlug.cs.
 */

const MAX_TITLE_PART = 72;
const SUFFIX_LENGTH = 8;
const GUID_LENGTH = 36;

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugifyStoryTitle(title: string | null | undefined): string {
  if (!title || !title.trim()) return '';

  const slug = title
    .normalize('NFKD')
    // Combining marks are dropped rather than turned into separators, so
    // "Café" and "Cafe" produce the same slug.
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > MAX_TITLE_PART ? slug.slice(0, MAX_TITLE_PART).replace(/-+$/, '') : slug;
}

/**
 * Stable, unique and readable. Uniqueness comes from an id suffix rather than a
 * collision retry, so this stays a pure function and two people publishing the
 * same title at the same moment cannot contend.
 *
 * The client only needs this to predict a URL before the server responds; the
 * stored slug is always whatever the server minted.
 */
export function mintStorySlug(title: string | null | undefined, storyId: string): string {
  const suffix = storyId.replace(/-/g, '').slice(0, SUFFIX_LENGTH);
  const titlePart = slugifyStoryTitle(title);
  return titlePart.length === 0 ? suffix : `${titlePart}-${suffix}`;
}

/**
 * Pulls a story id out of a URL segment when one is present. Accepts a bare GUID
 * and a slug that ends in one, so links minted before the story was published
 * keep resolving. Returns null for a real slug, which the caller then resolves
 * server side.
 */
export function extractStoryId(slugOrId: string | null | undefined): string | null {
  if (!slugOrId || !slugOrId.trim()) return null;

  const value = slugOrId.trim();
  if (GUID_RE.test(value)) return value;

  if (value.length >= GUID_LENGTH) {
    const tail = value.slice(-GUID_LENGTH);
    if (GUID_RE.test(tail)) return tail;
  }

  return null;
}

/** Canonical reading path. Falls back to the id when a draft has no slug yet. */
export function storyPath(story: { id: string; slug?: string | null }): string {
  return `/story/${story.slug && story.slug.length > 0 ? story.slug : story.id}`;
}

/** Editor path. Always keyed by id, since a title edit must not move the editor. */
export function storyEditPath(storyId: string): string {
  return `/story/${storyId}/edit`;
}
