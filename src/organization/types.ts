export type OrganizationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type OrganizationRole = 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
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
  description?: string;
  website?: string;
  contactEmail?: string;
  registrationNumber?: string;
  acceptsLeads?: boolean;
}

export const isOrganizationAdmin = (organization: Organization | null | undefined): boolean =>
  organization?.myRole === 'admin';

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
