// Group rules the UI shows, kept free of React so every one is unit tested.
import type { GroupTrip, Organization, OrganizationPublic } from './types';

export type GroupTabId = 'trips' | 'stories' | 'discussion' | 'members' | 'notices' | 'manage' | 'posts' | 'settings';

/** In the order a group is used: people talking, then its word to everyone, then what it is doing, then what it did. */
// Plans led this list before, so a group with nothing planned yet opened on an empty state, which is what a new member saw first.
export function groupTabs(group: Pick<Organization, 'kind' | 'myRole'>): GroupTabId[] {
  const admin = group.myRole === 'admin';
  const business = group.kind === 'business';
  const runsTrips = admin || group.myRole === 'manager';
  return [
    'discussion', 'notices', 'trips', 'stories', 'members',
    ...(business && runsTrips ? ['manage' as const] : []),
    ...(business ? ['posts' as const] : []),
    ...(admin ? ['settings' as const] : []),
  ];
}

/** Where a group opens when the URL asks for no tab. Read from the list itself so the two can never disagree. */
export const groupDefaultTab = (group: Pick<Organization, 'kind' | 'myRole'>): GroupTabId => groupTabs(group)[0];

const DAY_MS = 86_400_000;

/** Over when marked completed, or once its last day has passed. */
export function isPastTrip(trip: Pick<GroupTrip, 'status' | 'endDate'>, now: number = Date.now()): boolean {
  if (trip.status === 2) return true;
  const end = Date.parse(trip.endDate ?? '');
  return !Number.isNaN(end) && end + DAY_MS <= now;
}

const time = (value: string | null | undefined, fallback: number) => {
  const t = Date.parse(value ?? '');
  return Number.isNaN(t) ? fallback : t;
};

/** Plans are what is still ahead, soonest first with undated ones last; trips are what already happened, latest first. */
export function splitGroupTrips(trips: GroupTrip[], now: number = Date.now()): { plans: GroupTrip[]; past: GroupTrip[] } {
  const plans = trips.filter((t) => !isPastTrip(t, now))
    .sort((a, b) => time(a.startDate, Number.POSITIVE_INFINITY) - time(b.startDate, Number.POSITIVE_INFINITY) || a.name.localeCompare(b.name));
  const past = trips.filter((t) => isPastTrip(t, now))
    .sort((a, b) => time(b.endDate ?? b.startDate, 0) - time(a.endDate ?? a.startDate, 0) || a.name.localeCompare(b.name));
  return { plans, past };
}

export type JoinState = 'member' | 'request' | 'pending' | 'declined' | 'invite_only' | 'business' | 'full';

/** True once a capped group holds as many people as its plan allows. No limit is never full. */
export function groupIsFull(memberCount: number, memberLimit: number | null | undefined): boolean {
  return typeof memberLimit === 'number' && memberCount >= memberLimit;
}

/** Which join control a group's public page shows the viewer. */
export function groupJoinState(group: Pick<OrganizationPublic, 'kind' | 'visibility' | 'viewerRole' | 'viewerRequestStatus' | 'memberCount' | 'memberLimit'>): JoinState {
  if (group.viewerRole) return 'member';
  // A business's members are its staff, so a traveller joins its trips, not the business.
  if (group.kind === 'business') return 'business';
  if (group.visibility === 'private') return 'invite_only';
  if (group.viewerRequestStatus === 'pending') return 'pending';
  if (group.viewerRequestStatus === 'declined') return 'declined';
  if (groupIsFull(group.memberCount, group.memberLimit)) return 'full';
  return 'request';
}

/** Groups the viewer may start a plan in. Falls back to the old admin rule for a server that predates canCreatePlans. */
export function groupsForPlanning(groups: Organization[]): Organization[] {
  return groups.filter((g) => (typeof g.canCreatePlans === 'boolean'
    ? g.canCreatePlans
    : g.status === 'approved' && (g.myRole === 'admin' || g.myRole === 'manager')));
}

/**
 * What a refused join request tells us about where the viewer really stands.
 *
 * Returns the patch to apply to the group, or null when the refusal is worth
 * retrying and the dialog should stay open. A full group is the only one of
 * those: somebody may leave. Being already in, already waiting or already
 * turned down are all settled, and offering the button again is a trap.
 */
export function joinRefusalPatch(status: string | undefined): Partial<OrganizationPublic> | null {
  switch (status) {
    case 'member': return { viewerRole: 'member' };
    case 'pending': return { viewerRequestStatus: 'pending' };
    case 'declined': return { viewerRequestStatus: 'declined' };
    default: return null;
  }
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/join/group/${encodeURIComponent(token)}`;
}

export const groupHomePath = (groupId: string, tab?: string) => (tab ? `/groups/${groupId}?tab=${tab}` : `/groups/${groupId}`);

/** A business keeps the words it had; everything else is a group. */
export const groupNoun = (kind: Organization['kind'] | undefined) => (kind === 'business' ? 'business' : 'group');
