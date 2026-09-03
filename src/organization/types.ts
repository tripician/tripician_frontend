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
}

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
}

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
  coverImage: 'organization_cover_image',
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
  budgetVisibility: 'admins' | 'members';
  checklistVisibility: 'admins' | 'members';
  crewCount: number;
}
