import type { TravelerPost } from '../../../posts/types';

/**
 * A traveller's Photobook: the photographs on their own notes, newest first
 * (`GET /api/posts/by-author/{id}/photos`). Pure rules only, the same as the
 * app's: reading a page, merging pages, and the profile's preview with its
 * "+N" tile.
 */

export interface AuthorPhoto {
  /** The photo's own id: what Featured stores. */
  id: string;
  /** The post it was shared in: what opens it. */
  postId: string;
  url: string;
  position: number;
  caption: string | null;
  placeName: string | null;
  /** Only while that trip is published. */
  tripId: string | null;
  tripName: string | null;
  createdAt: string;
}

export interface PhotosPage {
  items: AuthorPhoto[];
  /** Every photo in the Photobook, not this page. */
  total: number;
  hasMore: boolean;
}

/** The profile shows this many tiles at most: the latest photos, or the latest less one plus "+N". */
export const PHOTOBOOK_PREVIEW = 9;
/** Posts per page when the full Photobook pages in. Each post carries one or more photos. */
export const PHOTOBOOK_PAGE = 18;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeAuthorPhoto(raw: unknown): AuthorPhoto | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const postId = text(row.postId);
  const url = text(row.url);
  const createdAt = text(row.createdAt);
  if (!id || !postId || !url || !createdAt) return null;
  return {
    id,
    postId,
    url,
    position: typeof row.position === 'number' ? row.position : 0,
    caption: text(row.caption),
    placeName: text(row.placeName),
    tripId: text(row.tripId),
    tripName: text(row.tripName),
    createdAt,
  };
}

export function normalizeAuthorPhotosPage(data: unknown): PhotosPage {
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const items = (Array.isArray(row.items) ? row.items : [])
    .map(normalizeAuthorPhoto)
    .filter((photo): photo is AuthorPhoto => photo !== null);
  const total = typeof row.total === 'number' && row.total >= 0 ? row.total : items.length;
  return { items, total: Math.max(total, items.length), hasMore: Boolean(row.hasMore) };
}

/** Appends a page, keeping the first copy of any photo seen twice across a page boundary. */
export function mergePhotos(current: readonly AuthorPhoto[], incoming: readonly AuthorPhoto[]): AuthorPhoto[] {
  const seen = new Set(current.map((photo) => photo.id));
  const added: AuthorPhoto[] = [];
  for (const photo of incoming) {
    if (seen.has(photo.id)) continue;
    seen.add(photo.id);
    added.push(photo);
  }
  return [...current, ...added];
}

/** The cursor for the next page: the last loaded post's time. */
export function nextPhotosCursor(photos: readonly AuthorPhoto[]): string | undefined {
  return photos.length ? photos[photos.length - 1].createdAt : undefined;
}

/**
 * What the profile's grid shows. With more photos than fit, the last place
 * goes to a "+N" tile, so the grid shows one photo fewer and N counts every
 * photo not shown: 24 photos is 8 tiles and "+16", never 9 and "+15".
 */
export function photobookPreview(
  photos: readonly AuthorPhoto[],
  total: number,
  limit = PHOTOBOOK_PREVIEW,
): { tiles: AuthorPhoto[]; remaining: number } {
  const count = Math.max(total, photos.length);
  if (count <= limit) return { tiles: photos.slice(0, limit), remaining: 0 };
  const tiles = photos.slice(0, limit - 1);
  return { tiles, remaining: count - tiles.length };
}

/**
 * The Photobook read from someone's posts instead of the photos endpoint, for
 * a server that does not have it yet: the photos on their own top-level notes,
 * newest post first and each post's photos in order, the same rule the server
 * applies. A photo here has no id of its own, so it is named by its post and
 * position.
 */
export function photosFromPosts(posts: readonly TravelerPost[]): AuthorPhoto[] {
  const photos: AuthorPhoto[] = [];
  for (const post of posts) {
    if (post.kind !== 'note' || post.parentPostId || !Array.isArray(post.media) || post.media.length === 0) continue;
    for (const media of [...post.media].sort((a, b) => a.position - b.position)) {
      photos.push({
        id: `${post.id}:${media.position}`,
        postId: post.id,
        url: media.url,
        position: media.position,
        caption: post.body?.trim() || null,
        placeName: post.placeName?.trim() || null,
        tripId: post.tripId ?? null,
        tripName: post.tripName ?? null,
        createdAt: post.createdAt,
      });
    }
  }
  return photos;
}

/** "1 photo", "124 photos". */
export function photoCountLabel(total: number): string {
  return `${total} ${total === 1 ? 'photo' : 'photos'}`;
}
