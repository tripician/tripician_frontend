// The "Featured" row a traveller sets in the app: up to five of their own
// published plans, stories and photographs, in their order. The server resolves
// each reference on every read (GET /api/users/{id}/featured), so anything
// unpublished or removed has already dropped out by the time it arrives here.
import { storyPath } from '../../afterstory/storySlug';
import { tripPath } from '../../utils/tripSlug';

export type FeaturedType = 'plan' | 'story' | 'photo';

export const FEATURED_MAX = 5;

export interface FeaturedItem {
  type: FeaturedType;
  id: string;
  title: string;
  coverUrl: string | null;
  place: string | null;
  countries: string[];
  slug: string | null;
  /** The post a photo was shared in: what opens it. */
  postId: string | null;
}

const TYPES: readonly FeaturedType[] = ['plan', 'story', 'photo'];

// The app's labels: a photo is named for where it lives on the profile, the Photobook.
export const FEATURED_TYPE_LABEL: Record<FeaturedType, string> = {
  plan: 'Travel plan',
  story: 'Afterstory',
  photo: 'Photobook',
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Reads the server's row: known kinds only, nothing twice, five at most. */
export function normalizeFeaturedItems(data: unknown): FeaturedItem[] {
  const seen = new Set<string>();
  const items: FeaturedItem[] = [];
  for (const raw of Array.isArray(data) ? data : []) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const type = TYPES.find((t) => t === String(row.type ?? '').toLowerCase());
    const id = text(row.id);
    if (!type || !id || seen.has(`${type}:${id}`)) continue;
    seen.add(`${type}:${id}`);
    items.push({
      type,
      id,
      title: text(row.title) ?? (type === 'photo' ? 'A travel moment' : 'Untitled'),
      coverUrl: text(row.coverUrl),
      place: text(row.place),
      countries: Array.isArray(row.countries) ? row.countries.filter((c): c is string => typeof c === 'string') : [],
      slug: text(row.slug),
      postId: text(row.postId),
    });
  }
  return items.slice(0, FEATURED_MAX);
}

/** What an empty Featured row shows instead of disappearing (the app shows the same). */
export const FEATURED_QUOTE = 'Collect moments, not things.';

/** "Travel plan · Italy". */
export function featuredMeta(item: Pick<FeaturedItem, 'type' | 'place'>): string {
  return item.place ? `${FEATURED_TYPE_LABEL[item.type]} · ${item.place}` : FEATURED_TYPE_LABEL[item.type];
}

/** Where a card opens: the plan, the story, or the post a photo was shared in. Null when there is nowhere to go. */
export function featuredHref(item: FeaturedItem): string | null {
  if (item.type === 'plan') return tripPath({ id: item.id, name: item.title });
  if (item.type === 'story') return storyPath({ id: item.id, slug: item.slug });
  return item.postId ? `/post/${item.postId}` : null;
}
