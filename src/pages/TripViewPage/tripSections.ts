export type TripSectionId = 'plan' | 'story' | 'news' | 'packing' | 'budget';

export type TripAccessLevel = 'viewer' | 'member' | 'admin' | 'owner';

export const TRIP_SECTION_LABELS: Record<TripSectionId, string> = {
  plan: 'Planning',
  story: 'After story',
  news: 'Announcements',
  packing: 'Packing',
  budget: 'Budget',
};

const RANK: Record<TripAccessLevel, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

export const accessRank = (level: string | null | undefined): number =>
  RANK[(level ?? '').toLowerCase() as TripAccessLevel] ?? 0;

// Mirrors TripAccessRules.CanSee on the server: neither setting is ever public.
export const canSeeFeature = (setting: string | null | undefined, rank: number): boolean =>
  (setting ?? 'members').toLowerCase() === 'admins' ? rank >= RANK.admin : rank >= RANK.member;

export interface TripSectionAccess {
  level: string | null | undefined;
  budgetVisibility?: string | null;
  checklistVisibility?: string | null;
  storyEnabled: boolean;
}

export function visibleTripSections(access: TripSectionAccess): TripSectionId[] {
  const rank = accessRank(access.level);
  const sections: TripSectionId[] = ['plan'];
  if (access.storyEnabled) sections.push('story');
  if (rank >= RANK.member) sections.push('news');
  if (canSeeFeature(access.checklistVisibility, rank)) sections.push('packing');
  if (canSeeFeature(access.budgetVisibility, rank)) sections.push('budget');
  return sections;
}

export const isTripSectionId = (value: string | null): value is TripSectionId =>
  value === 'plan' || value === 'story' || value === 'news' || value === 'packing' || value === 'budget';
