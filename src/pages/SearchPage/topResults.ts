// Ranking for Search results, and which sections lead the Top tab.
import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { OrganizationDirectoryEntry } from '../../organization/types';
import type { PostTagCount } from '../../posts/types';
import { compareTripsForFeed } from '../../utils/tripRanking';
import { foldText, textMatches, textScore } from '../../utils/searchText';
import type { PlaceEntry } from './placeIndex';

export interface PersonResult {
  userId: number;
  name: string;
  avatar: string | null;
  destinations: string[];
  vibe: string | null;
  tripCount: number;
}

export type TopSection = 'posts' | 'people' | 'places' | 'plans' | 'groups' | 'stories' | 'tags';

export const TOP_CAPS: Record<TopSection, number> = { posts: 4, people: 4, places: 3, plans: 4, groups: 3, stories: 4, tags: 4 };

// Posts lead, as in the app: for a word like a place, what people posted about it is the richest match.
const DEFAULT_ORDER: TopSection[] = ['posts', 'places', 'people', 'plans', 'groups', 'stories', 'tags'];

/** The words of a search, as the server splits them (PostSearch.Words): lowercased, at most six. */
export function searchWords(q: string): string[] {
  return Array.from(new Set(
    foldText(q).split(/[\s,]+/).map((w) => w.replace(/^[#.!?"']+|[#.!?"']+$/g, '')).filter(Boolean),
  )).slice(0, 6);
}

/**
 * Whether a post really matches: every word somewhere in its description,
 * title, place or tags, the server's own rule. A server from before post search
 * ignores the query and sends the latest posts, so this keeps those out.
 */
export function postMatches(
  post: { body: string; title: string | null; placeName: string | null; tags?: { id: string; label: string }[] },
  q: string,
): boolean {
  const words = searchWords(q);
  if (!words.length) return false;
  const haystack = foldText([post.body, post.title ?? '', post.placeName ?? '', ...(post.tags ?? []).flatMap((t) => [t.id, t.label])].join('\n'));
  return words.every((w) => haystack.includes(w));
}

/** Best title match first; the feed's own order (verified, then joinable, then engagement) settles ties. */
export function rankPlans(trips: any[], q: string): any[] {
  return trips
    .map((t) => ({ t, score: textScore(q, t?.name) }))
    .sort((a, b) => b.score - a.score || compareTripsForFeed(a.t, b.t))
    .map((x) => x.t);
}

export function rankStories(stories: AfterStorySummaryDto[], q: string): AfterStorySummaryDto[] {
  const at = (s: AfterStorySummaryDto) => Date.parse(s.publishedAt ?? '') || 0;
  return stories
    .map((s) => ({ s, score: Math.max(textScore(q, s.title), textScore(q, s.destination)) }))
    .sort((a, b) => b.score - a.score || Number(Boolean(b.s.editorsPickAt)) - Number(Boolean(a.s.editorsPickAt)) || at(b.s) - at(a.s))
    .map((x) => x.s);
}

export function matchGroups(groups: OrganizationDirectoryEntry[], q: string): OrganizationDirectoryEntry[] {
  return groups
    .filter((g) => textMatches(q, g.name, g.description))
    .map((g) => ({ g, score: textScore(q, g.name) }))
    .sort((a, b) => b.score - a.score || Number(b.g.verified) - Number(a.g.verified) || b.g.publishedTripCount - a.g.publishedTripCount)
    .map((x) => x.g);
}

/** Tags somebody has actually used; a vocabulary word with nothing under it is a dead end. */
export function matchTags(tags: PostTagCount[], q: string): PostTagCount[] {
  return tags
    .filter((t) => t.count > 0 && textMatches(q, t.label, t.id.replace(/^place:/, '')))
    .sort((a, b) => textScore(q, b.label) - textScore(q, a.label) || b.count - a.count);
}

export function rankPeople(people: PersonResult[], q: string): PersonResult[] {
  return people
    .map((p) => ({ p, score: textScore(q, p.name) }))
    .sort((a, b) => b.score - a.score || b.p.tripCount - a.p.tripCount)
    .map((x) => x.p);
}

export interface TopInput {
  q: string;
  /** Only their number matters here. */
  posts?: unknown[];
  people: PersonResult[];
  places: PlaceEntry[];
  plans: any[];
  groups: OrganizationDirectoryEntry[];
  stories: AfterStorySummaryDto[];
  tags: PostTagCount[];
}

/** Section order for Top: whatever the query names outright leads, otherwise places, then people. Empty sections drop out. */
export function topOrder({ q, posts = [], people, places, plans, groups, stories, tags }: TopInput): TopSection[] {
  const needle = foldText(q);
  const lead: TopSection[] = [];
  if (people.some((p) => foldText(p.name) === needle)) lead.push('people');
  if (groups.some((g) => foldText(g.name) === needle)) lead.push('groups');
  if (places.some((p) => foldText(p.name) === needle)) lead.unshift('places');
  const counts: Record<TopSection, number> = {
    posts: posts.length, people: people.length, places: places.length, plans: plans.length, groups: groups.length, stories: stories.length, tags: tags.length,
  };
  return [...lead, ...DEFAULT_ORDER.filter((s) => !lead.includes(s))].filter((s) => counts[s] > 0);
}
