import { storyPath } from '../../../afterstory/storySlug';
import type { AfterStorySummaryDto } from '../../../afterstory/types';
import type { TravelerPost } from '../../../posts/types';
import { tripPath } from '../../../utils/tripSlug';
import type { TripVM } from '../tripViewModel';

/**
 * The Travel Journal: a traveller's plans, stories and text posts, newest
 * first. The same rules as the app's (`features/profile/content/journal.ts`),
 * so one person's journal reads the same on both.
 *
 * Photographs are not entries here: they live in the Photobook, so a post that
 * carries photos is left to it. Dates are the server's and never mixed: a
 * published plan by when it was published, a plan still being made by when it
 * was made, a story by when it went out, a post by when it was posted. An entry
 * with no usable date sorts last and shows no time.
 */

export type JournalFilter = 'all' | 'plans' | 'stories' | 'posts';

export const JOURNAL_FILTERS: readonly { value: JournalFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'plans', label: 'Plans' },
  { value: 'stories', label: 'Stories' },
  { value: 'posts', label: 'Posts' },
];

/** How many entries the profile shows before "View all activity". */
export const JOURNAL_PREVIEW = 5;
/** Entries added each time the open journal asks for more. */
export const JOURNAL_PAGE = 10;
/** Posts fetched per page. Photo posts are skipped, so a page may yield fewer entries. */
export const JOURNAL_POSTS_PAGE = 20;

export type PlanAction = 'published' | 'created' | 'crew';

export type JournalEntry =
  | { kind: 'plan'; key: string; date: string | null; trip: TripVM; action: PlanAction; onlyYou: boolean }
  | { kind: 'story'; key: string; date: string | null; story: AfterStorySummaryDto }
  | { kind: 'question'; key: string; date: string | null; post: TravelerPost }
  | { kind: 'note'; key: string; date: string | null; post: TravelerPost };

export interface JournalInput {
  /** Whose profile this is. */
  profileUserId: number;
  /** The owner sees their own drafts and the trips they are crew on; a visitor sees published plans only. */
  isOwner: boolean;
  trips: readonly TripVM[];
  /** Published stories only: a draft is not shared yet. */
  stories: readonly AfterStorySummaryDto[];
  /** Their posts, as loaded so far. */
  posts: readonly TravelerPost[];
  /** More posts exist beyond those loaded. */
  postsHasMore: boolean;
  filter: JournalFilter;
}

function time(date: string | null | undefined): number {
  const t = date ? Date.parse(date) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function planEntry(trip: TripVM, input: JournalInput): JournalEntry | null {
  // An unknown owner is treated as theirs, as the trip mapper does.
  const owned = !trip.ownerId || trip.ownerId === String(input.profileUserId);
  // A visitor sees published plans only: theirs, and the ones they were crew on.
  if (!input.isOwner && !trip.isPublished) return null;
  if (!owned) {
    return { kind: 'plan', key: `plan:${trip.id}`, date: trip.createdAt, trip, action: 'crew', onlyYou: false };
  }
  if (trip.isPublished) {
    return { kind: 'plan', key: `plan:${trip.id}`, date: trip.publishedAt ?? trip.createdAt, trip, action: 'published', onlyYou: false };
  }
  return { kind: 'plan', key: `plan:${trip.id}`, date: trip.createdAt, trip, action: 'created', onlyYou: true };
}

function postEntry(post: TravelerPost, shown: { plans: Set<string>; stories: Set<string> }): JournalEntry | null {
  // Replies belong to their thread, and photographs to the Photobook.
  if (post.parentPostId || (Array.isArray(post.media) && post.media.length > 0)) return null;
  if (post.kind === 'question') {
    return { kind: 'question', key: `post:${post.id}`, date: post.createdAt ?? null, post };
  }
  // The server posts a caption-less card for every plan and story published.
  // The plan or story is its own entry already, so the bare card would only repeat it.
  const attached = post.attachment;
  if (attached && !post.body?.trim()) {
    const repeat = attached.kind === 'plan' ? shown.plans.has(attached.id) : shown.stories.has(attached.id);
    if (repeat) return null;
  }
  return { kind: 'note', key: `post:${post.id}`, date: post.createdAt ?? null, post };
}

function byNewest(a: JournalEntry, b: JournalEntry): number {
  return time(b.date) - time(a.date) || a.key.localeCompare(b.key);
}

/**
 * The journal for one filter, newest first.
 *
 * Posts page in, while plans and stories arrive whole. Showing a plan older
 * than the oldest post loaded so far would let the next page of posts land
 * above it, moving rows the reader has already passed. So while more posts
 * exist, plans and stories older than that line wait for them: the list only
 * ever grows at the bottom.
 */
export function buildJournal(input: JournalInput): JournalEntry[] {
  const { filter } = input;
  const readsPosts = filter === 'all' || filter === 'posts';
  const plans =
    filter === 'all' || filter === 'plans'
      ? input.trips.map((trip) => planEntry(trip, input)).filter((e): e is JournalEntry => e !== null)
      : [];
  const stories: JournalEntry[] =
    filter === 'all' || filter === 'stories'
      ? input.stories.map((story) => ({ kind: 'story', key: `story:${story.id}`, date: story.publishedAt ?? null, story }))
      : [];

  const shown = {
    plans: new Set(input.trips.map((trip) => trip.id)),
    stories: new Set(input.stories.map((story) => story.id)),
  };
  const seen = new Set<string>();
  const posts: JournalEntry[] = [];
  if (readsPosts) {
    for (const post of input.posts) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      const entry = postEntry(post, shown);
      if (entry) posts.push(entry);
    }
  }

  let others = [...plans, ...stories];
  if (input.postsHasMore && readsPosts) {
    const oldestPost = input.posts.reduce((oldest, post) => Math.min(oldest, time(post.createdAt) || oldest), Infinity);
    const line = Number.isFinite(oldestPost) ? oldestPost : Infinity;
    others = others.filter((entry) => time(entry.date) >= line);
  }

  return [...posts, ...others].sort(byNewest);
}

const MINUTE_MS = 60_000;

function ago(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

/**
 * "2 days ago", "1 week ago", "3 months ago": a journal reads in the units a
 * person would say out loud, never a bare date. Empty when there is no date.
 */
export function journalWhen(date: string | null | undefined, now: number = Date.now()): string {
  const at = time(date);
  if (!at) return '';
  const minutes = Math.floor((now - at) / MINUTE_MS);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return ago(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ago(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return ago(days, 'day');
  if (days < 30) return ago(Math.floor(days / 7), 'week');
  if (days < 365) return ago(Math.floor(days / 30), 'month');
  return ago(Math.floor(days / 365), 'year');
}

function firstLine(value: string | null | undefined): string | null {
  return value?.split('\n').map((line) => line.trim()).find(Boolean) ?? null;
}

/** An entry's bold line: the thing itself, by its own name. */
export function journalTitle(entry: JournalEntry): string {
  switch (entry.kind) {
    case 'plan':
      return entry.trip.title;
    case 'story':
      return entry.story.title?.trim() || 'Untitled story';
    case 'question':
      return firstLine(entry.post.title) ?? firstLine(entry.post.body) ?? 'A question for the community';
    case 'note':
      return firstLine(entry.post.body) ?? entry.post.attachment?.title ?? 'A note from the road';
  }
}

/** What the traveller did, in a few words: the line under the title, before the time. */
export function journalAction(entry: JournalEntry): string {
  switch (entry.kind) {
    case 'plan':
      if (entry.action === 'crew') {
        const owner = entry.trip.owner?.name?.trim();
        return owner ? `Travel plan by ${owner}` : 'Travel plan with friends';
      }
      return entry.action === 'published' ? 'Published a travel plan' : 'Created a travel plan';
    case 'story':
      return 'Published an Afterstory';
    case 'question':
      return 'Asked the community';
    case 'note': {
      const attached = entry.post.attachment?.kind;
      return attached === 'plan' ? 'Shared a travel plan' : attached === 'story' ? 'Shared an Afterstory' : 'Posted a note';
    }
  }
}

/** "Published a travel plan · 2 days ago". */
export function journalMeta(entry: JournalEntry, now: number = Date.now()): string {
  const when = journalWhen(entry.date, now);
  return when ? `${journalAction(entry)} · ${when}` : journalAction(entry);
}

/**
 * The likes and comments behind an entry, the same numbers its own page shows:
 * a plan's likes and comments, a story's likes and readers' questions, a post's
 * likes and replies.
 */
export function journalCounts(entry: JournalEntry): { likes: number; comments: number } {
  switch (entry.kind) {
    case 'plan':
      return { likes: entry.trip.likesCount ?? 0, comments: entry.trip.commentsCount ?? 0 };
    case 'story':
      return { likes: entry.story.likeCount ?? 0, comments: entry.story.questionCount ?? 0 };
    default:
      return { likes: entry.post.likeCount ?? 0, comments: entry.post.replyCount ?? 0 };
  }
}

/** Where an entry opens: its plan, its story, or the post itself (where its comments are). */
export function journalHref(entry: JournalEntry): string {
  switch (entry.kind) {
    case 'plan':
      return tripPath({ id: entry.trip.id, name: entry.trip.title });
    case 'story':
      return storyPath({ id: entry.story.id, slug: entry.story.slug });
    default:
      return `/post/${entry.post.id}`;
  }
}

/**
 * The quote an empty section shows, so a profile with nothing in it yet still
 * reads as a profile rather than as missing pieces. The app shows the same three.
 */
export const SECTION_QUOTES = {
  featured: 'Collect moments, not things.',
  photobook: 'Take only memories, leave only footprints.',
  journal: 'The world is a book, and those who do not travel read only one page.',
} as const;

/** "Your latest …" on your own profile, "Asha's latest …" on someone else's. */
export function journalDescription(name: string | null | undefined, isOwner: boolean): string {
  if (isOwner) return 'Your latest plans, stories and posts';
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `${firstName}’s latest plans, stories and posts` : 'Their latest plans, stories and posts';
}
