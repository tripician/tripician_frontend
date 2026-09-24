// The photo grid Search shows before you type: real plan banners, story covers and road photos, newest first.
import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { TravelerPost } from '../../posts/types';
import { resolveStoryCover } from '../../afterstory/storyFormat';
import { storyPath } from '../../afterstory/storySlug';
import { curatedCover, primaryCountry, savedBanner } from '../../utils/tripCover';
import { tripNights } from '../../utils/tripMeta';
import { tripPath } from '../../utils/tripSlug';

export type ExploreKind = 'plan' | 'story' | 'post';

export interface ExploreTile {
  key: string;
  kind: ExploreKind;
  image: string;
  title: string;
  href: string;
  /** Milliseconds; what the grid is ordered by. */
  date: number;
  isVideo?: boolean;
  /** One line under the title: nights and country for a plan, who wrote a story, who posted a photo. */
  meta?: string;
  /** A plan wearing its country's stock photo rather than a photo anyone took. */
  stock?: boolean;
  trip?: any;
}

/** Below this many real photos the grid is padded with plans on their country cover, so it never looks broken. */
export const MIN_REAL_TILES = 9;

const toTime = (value: unknown): number => {
  const t = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

function planMeta(trip: any): string | undefined {
  const nights = tripNights(trip);
  const parts = [nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null, primaryCountry(trip)].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export function tripTile(trip: any, allowStock = false): ExploreTile | null {
  const id = trip?.id ?? trip?.Id;
  if (!id) return null;
  const banner = savedBanner(trip);
  const image = banner ?? (allowStock ? curatedCover(primaryCountry(trip)) : null);
  if (!image) return null;
  return {
    key: `plan-${id}`,
    kind: 'plan',
    image,
    title: trip?.name || 'A plan',
    meta: planMeta(trip),
    href: tripPath({ id, name: trip?.name }),
    date: toTime(trip?.publishedAt) || toTime(trip?.createdDate) || toTime(trip?.CreatedDate),
    stock: !banner,
    trip,
  };
}

export function storyTile(story: AfterStorySummaryDto): ExploreTile | null {
  const image = resolveStoryCover(story);
  if (!story?.id || !image) return null;
  return {
    key: `story-${story.id}`,
    kind: 'story',
    image,
    title: story.title || 'An after story',
    meta: [story.author?.displayName ? `By ${story.author.displayName}` : null, story.destination?.trim() || null].filter(Boolean).join(' · ') || undefined,
    href: storyPath(story),
    date: toTime(story.publishedAt) || toTime(story.updatedAt),
    isVideo: story.coverKind === 'Video',
  };
}

/** A note with its own photo. Postcards carry a plan or story and are left to those sources, so nothing appears twice. */
export function postTile(post: TravelerPost): ExploreTile | null {
  if (post?.kind !== 'note' || post.tripId || post.storyId || post.attachment) return null;
  const first = [...(post.media ?? [])].sort((a, b) => a.position - b.position)[0];
  if (!first?.url) return null;
  return {
    key: `post-${post.id}`,
    kind: 'post',
    image: first.url,
    title: post.placeName ? `From the road, ${post.placeName}` : 'Photo from the road',
    meta: post.authorName ? `By ${post.authorName}` : undefined,
    href: `/post/${post.id}`,
    date: toTime(post.createdAt),
  };
}

// The same photo can arrive through two sources or two sizes; compare without query strings.
const imageKey = (url: string) => url.trim().toLowerCase().split(/[?#]/)[0];

/** No more than two tiles of one kind in a row; the third waits for the next different one rather than being dropped. */
export function capRuns(tiles: ExploreTile[]): ExploreTile[] {
  const remaining = [...tiles];
  const out: ExploreTile[] = [];
  while (remaining.length) {
    const n = out.length;
    const blocked = n >= 2 && out[n - 1].kind === out[n - 2].kind ? out[n - 1].kind : null;
    let i = blocked ? remaining.findIndex((t) => t.kind !== blocked) : 0;
    if (i < 0) i = 0;
    out.push(remaining.splice(i, 1)[0]);
  }
  return out;
}

export interface ExploreInput {
  trips: any[];
  stories: AfterStorySummaryDto[];
  posts: TravelerPost[];
  /** True once the last page of posts has been read. */
  postsExhausted: boolean;
}

export function buildExploreFeed({ trips, stories, posts, postsExhausted }: ExploreInput): ExploreTile[] {
  const postTiles = posts.map(postTile).filter((t): t is ExploreTile => t !== null);
  const other = [
    ...trips.map((t) => tripTile(t)),
    ...stories.map(storyTile),
  ].filter((t): t is ExploreTile => t !== null);

  // Posts arrive a page at a time, so nothing older than the oldest loaded post is shown until that page is read.
  const cutoff = postsExhausted || posts.length === 0
    ? Number.NEGATIVE_INFINITY
    : Math.min(...posts.map((p) => toTime(p.createdAt)));
  const eligible = [...postTiles, ...other.filter((t) => t.date >= cutoff)]
    .sort((a, b) => b.date - a.date || a.key.localeCompare(b.key));

  const seen = new Set<string>();
  const unique = eligible.filter((t) => {
    const k = imageKey(t.image);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (postsExhausted && unique.length < MIN_REAL_TILES) {
    const stock = trips
      .map((t) => tripTile(t, true))
      .filter((t): t is ExploreTile => t !== null && t.stock === true)
      .sort((a, b) => b.date - a.date || a.key.localeCompare(b.key));
    for (const t of stock) {
      if (unique.length >= MIN_REAL_TILES) break;
      const k = imageKey(t.image);
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(t);
    }
  }

  return capRuns(unique);
}
