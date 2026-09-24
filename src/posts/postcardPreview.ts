import dayjs from 'dayjs';
import type { PlanPreview, PlanStop, PostLiker } from './types';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function listOf(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** "Liked by Aditi and 12 others". Real names only, the reader is "you", and no likes says nothing. */
export function likedByLine(faces: PostLiker[] | null | undefined, likeCount: number, viewerLiked: boolean): string | null {
  if (likeCount <= 0) return null;
  const named = faces && faces.length > 0 ? faces[0].name : null;
  const parts: string[] = [];
  if (viewerLiked) parts.push('you');
  if (named) parts.push(named);
  // Nobody we may name: private profiles still count, they are just not named.
  if (parts.length === 0) return plural(likeCount, 'like');
  const others = Math.max(0, likeCount - parts.length);
  if (others > 0) parts.push(plural(others, 'other'));
  return `Liked by ${listOf(parts)}`;
}

/** The stops that fit, and how many are left over for a "+N" at the end of the line. */
export function visibleStops(stops: PlanStop[], stopCount: number, max: number): { shown: PlanStop[]; more: number } {
  const shown = stops.slice(0, Math.max(1, max));
  return { shown, more: Math.max(0, Math.max(stopCount, stops.length) - shown.length) };
}

/** "2 nights", or nothing for a stop the plan gave no dates. */
export function stopNights(stop: PlanStop): string | null {
  return stop.nights > 0 ? plural(stop.nights, 'night') : null;
}

/** "Ilulissat Icefjord, Nuuk Cathedral and 9 more". */
export function highlightsLine(highlights: string[], placeCount: number): string | null {
  const names = highlights.filter((h) => h && h.trim()).map((h) => h.trim());
  if (names.length === 0) return null;
  const rest = Math.max(0, placeCount - names.length);
  return rest > 0 ? `${names.join(', ')} and ${rest} more` : listOf(names);
}

/** "12 to 19 Oct 2026", widening only as far as the range needs. */
export function planDates(start: string | null | undefined, end: string | null | undefined): string | null {
  if (!start) return null;
  const a = dayjs(start);
  if (!a.isValid()) return null;
  const b = end ? dayjs(end) : null;
  if (!b || !b.isValid()) return `From ${a.format('D MMM YYYY')}`;
  if (a.isSame(b, 'month')) return `${a.format('D')} to ${b.format('D MMM YYYY')}`;
  if (a.isSame(b, 'year')) return `${a.format('D MMM')} to ${b.format('D MMM YYYY')}`;
  return `${a.format('D MMM YYYY')} to ${b.format('D MMM YYYY')}`;
}

/** "7 nights · 12 to 19 Oct 2026". Either half drops out when the plan does not say. */
export function planSummaryLine(plan: Pick<PlanPreview, 'nights' | 'startDate' | 'endDate'>): string | null {
  const parts = [
    plan.nights > 0 ? plural(plan.nights, 'night') : null,
    planDates(plan.startDate, plan.endDate),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}
