export type TripSectionId = 'plan' | 'story' | 'news';

export type TripAccessLevel = 'viewer' | 'member' | 'admin' | 'owner';

export const TRIP_SECTION_LABELS: Record<TripSectionId, string> = {
  plan: 'Planning',
  story: 'After story',
  news: 'Announcements',
};

const RANK: Record<TripAccessLevel, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

export const accessRank = (level: string | null | undefined): number =>
  RANK[(level ?? '').toLowerCase() as TripAccessLevel] ?? 0;

export interface TripSectionAccess {
  level: string | null | undefined;
  storyEnabled: boolean;
}

// Plan and story are public; announcements are for the people going.
export function visibleTripSections(access: TripSectionAccess): TripSectionId[] {
  const sections: TripSectionId[] = ['plan'];
  if (access.storyEnabled) sections.push('story');
  if (accessRank(access.level) >= RANK.member) sections.push('news');
  return sections;
}

export const isTripSectionId = (value: string | null): value is TripSectionId =>
  value === 'plan' || value === 'story' || value === 'news';
