export type OrganizationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type OrganizationRole = 'admin' | 'manager' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  status: OrganizationStatus;
  reviewNote: string | null;
  acceptsLeads: boolean;
  verified: boolean;
  appliedAt: string;
  /** The role the signed in person holds here. Never sent for a stranger. */
  myRole: OrganizationRole | null;
  plan: string;
  /** What this plan unlocks. Rendered from, never derived by comparing plan ids. */
  features: string[];
  kind: GroupKind;
  visibility: GroupVisibility;
  planCreation: GroupPlanCreation;
  /** Decided by the server from role, group state and the plan-creation setting. */
  canCreatePlans: boolean;
  memberCount: number;
  /** The most people this group may hold on its plan. Absent means no limit. */
  memberLimit?: number | null;
}

/** A community group is self-serve; a business is reviewed, can be verified and can take enquiries. */
export type GroupKind = 'community' | 'business';
/** Public groups are listed and take join requests; private ones are invite only. */
export type GroupVisibility = 'public' | 'private';
export type GroupPlanCreation = 'members' | 'admins';

export interface OrganizationMember {
  userId: number;
  role: OrganizationRole;
  name: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

/**
 * The public face. Narrower than Organization on purpose: no contact email
 * unless the organisation takes enquiries, and never a member list.
 */
/** One entry of the public directory: approved, with a public page and at least one published trip. */
export interface OrganizationDirectoryEntry {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverUrl: string | null;
  description: string | null;
  verified: boolean;
  publishedTripCount: number;
  kind?: GroupKind;
  memberCount?: number;
}

export interface OrganizationPublic {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  description: string | null;
  website: string | null;
  verified: boolean;
  acceptsLeads: boolean;
  memberSince: string | null;
  kind: GroupKind;
  visibility: GroupVisibility;
  memberCount: number;
  /** The viewer's role when they belong; absent otherwise. */
  viewerRole?: OrganizationRole | null;
  /** The viewer's request, when they asked to join. */
  viewerRequestStatus?: 'pending' | 'approved' | 'declined' | 'cancelled' | null;
  /** Absent means no limit. */
  memberLimit?: number | null;
}

/** A post in a group's own discussion. Only members read it; replies go one level deep. */
export interface GroupDiscussionPost {
  id: string;
  authorUserId: number;
  authorName: string | null;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  canRemove: boolean;
  replies: GroupDiscussionPost[];
}

/** The group's shared TripicianAI wallet. A group trip draws on it when its own credits run out. */
export interface GroupCredits {
  balance: number;
  monthlyCredits: number;
  planId: string;
}

/** A wallet only when the response really is one, so a surprise body hides the line instead of breaking the page. */
export const asGroupCredits = (data: unknown): GroupCredits | null => {
  const c = data as Partial<GroupCredits> | null | undefined;
  return typeof c?.balance === 'number' && typeof c.monthlyCredits === 'number' ? c as GroupCredits : null;
};

export interface OrganizationWrite {
  name?: string;
  slug?: string;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  registrationNumber?: string;
  acceptsLeads?: boolean;
  kind?: GroupKind;
  visibility?: GroupVisibility;
  planCreation?: GroupPlanCreation;
}

/** One trip of a group, as the group's list shows it. Members see drafts; visitors see published ones. */
export interface GroupTrip {
  tripId: string;
  name: string;
  coverUrl: string | null;
  countries: string[];
  startDate: string | null;
  endDate: string | null;
  /** 0 planning, 1 live, 2 completed. */
  status: number;
  published: boolean;
  joinPolicy: string;
  spotsLeft?: number | null;
  goingCount: number;
  ownerUserId: number;
  ownerName: string | null;
  viewerOnTrip: boolean;
  viewerCanEdit: boolean;
  /** You belong to the group, you are not on this trip, and it can still take you. */
  viewerCanAskToJoin?: boolean;
  /** Where you stand when you are not on it: requested, declined, invited, left. */
  viewerRequestStatus?: string | null;
  /** People waiting on a decision. Zero unless you are the one who makes it. */
  interestedCount?: number;
}

export interface GroupJoinRequest {
  userId: number;
  name: string | null;
  avatarUrl: string | null;
  message: string | null;
  createdAt: string;
}

export interface GroupInvite {
  token?: string | null;
  createdAt?: string | null;
}

export interface GroupInvitePreview {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  kind: GroupKind;
  memberCount: number;
  alreadyMember: boolean;
}

export interface GroupSuggestion {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  verified: boolean;
  memberCount: number;
  openTripCount: number;
  reason: string;
  requestable: boolean;
}

export const isOrganizationAdmin = (organization: Organization | null | undefined): boolean =>
  organization?.myRole === 'admin';

/** Admins and managers both run the organisation's trips. */
export const runsOrganizationTrips = (organization: Organization | null | undefined): boolean =>
  organization?.myRole === 'admin' || organization?.myRole === 'manager';

export const PLAN_FEATURES = {
  posts: 'organization_posts',
  staffing: 'organization_staffing',
  managerRole: 'organization_manager_role',
} as const;

export const hasFeature = (organization: Organization | null | undefined, feature: string): boolean =>
  Array.isArray(organization?.features) && organization.features.includes(feature);

/**
 * A notice on the organisation's internal staff board.
 *
 * Not an OrganizationPost: that one is public and goes to the community feed.
 * This is read only by people in the organisation's member list.
 */
export interface OrganizationAnnouncement {
  id: string;
  organizationId: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorUserId: number;
  authorName: string | null;
  authorAvatarUrl: string | null;
}

export interface OrganizationPost {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string | null;
  organizationLogoUrl: string | null;
  organizationVerified: boolean;
  body: string;
  imageUrl: string | null;
  tripId: string | null;
  createdAt: string;
}

/** One row of the organisation control panel. */
export interface OrganizationTrip {
  tripId: string;
  name: string;
  coverUrl: string | null;
  startDate: string | null;
  published: boolean;
  checklistVisibility: 'admins' | 'members';
  crewCount: number;
}
