/**
 * One trip DTO to one view model.
 *
 * The backend is inconsistent about JSON casing on trip reads, so every field
 * here reads several spellings. That is not defensiveness for its own sake:
 * `TripView.tsx` already works around the same thing, and the Profile page used
 * to read raw DTO fields directly, which is how its Archived tab ended up
 * permanently empty (it looked for `archived`, and the API sends `isArchived`).
 *
 * Lifted out of Dashboard.tsx when Profile absorbed it, so the ownership,
 * published and archived rules that every tab filters on live in one tested
 * place rather than being re-derived per page.
 */

import { tripCoverPhoto } from '../../utils/tripCover';
import { formatRelativeTime } from '../../utils/relativeTime';
import { tripNights } from '../../utils/tripMeta';

// Re-exported from its new home in utils, where the shared trip card can reach it
// without a components/ui file importing from a page.
export { formatRelativeTime };

export interface TripMemberVM {
  id: string;
  name: string;
  profilePic: string;
}

export interface TripOwnerVM extends TripMemberVM {
  /** Identity-verified traveller. Distinct from a Tripician Verified trip. */
  identityVerified: boolean;
}

export interface TripVM {
  id: string;
  title: string;
  description: string;
  visibility: string;
  location: string;
  /** Travel personality key, e.g. "luxury". Drives the same cover pill Community shows. */
  vibe: string;
  countries: string[];
  image: string;
  progress: number;
  /** ISO, both. The card shows the age and, once they diverge, the last edit. */
  createdAt: string | null;
  updatedAt: string | null;
  commentsCount: number;
  owner: TripOwnerVM;
  members: TripMemberVM[];
  startDate: string | null;
  endDate: string | null;
  /** Length of the plan, read off the raw payload by the same rule Community uses. */
  nights: number | null;
  isOwner: boolean;
  isPublished: boolean;
  isArchived: boolean;
  tripStatus: number;
  verified: boolean;
  verifiedAt: string | null;
  ownerId: string;
}

/** The signed-in user, as much of it as this mapper needs. */
export interface ViewerProfile {
  id?: string | number | null;
  fname?: string | null;
  lname?: string | null;
  email?: string | null;
  profilepicture?: string | null;
}

function pick(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  return '';
}

function ownerIdOf(t: any): string {
  const o = t.owner || t.Owner;
  return String(
    t.OwnerUserId || t.ownerUserId || t.ownerId || t.OwnerId ||
    o?.id || o?.Id || o?.userId || o?.UserId || '',
  );
}

function normaliseMember(m: any, viewer?: ViewerProfile | null): TripMemberVM {
  const u = m.user || m.User || m;

  const firstName = pick(u.fname, u.Fname, u.firstName, u.FirstName, m.fname, m.firstName);
  const lastName = pick(u.lname, u.Lname, u.lastName, u.LastName, m.lname, m.lastName);

  const name =
    pick(
      u.name, u.Name, u.fullName, u.displayName,
      m.name, m.Name, m.fullName, m.displayName,
      [firstName, lastName].filter(Boolean).join(' ').trim(),
      typeof u.email === 'string' ? u.email.split('@')[0] : '',
      typeof m.email === 'string' ? m.email.split('@')[0] : '',
    ) || 'Member';

  const profilePic = pick(
    u.profilePic, u.ProfilePic, u.profilePicture, u.ProfilePicture, u.profilepicture,
    u.avatar, u.Avatar, u.photoUrl, u.PhotoUrl,
    m.profilePic, m.ProfilePic, m.profilePicture, m.ProfilePicture, m.profilepicture,
    m.avatar, m.Avatar, m.photoUrl,
  );

  const id = String(m.id || m.userId || m.Id || m.UserId || u.id || u.Id || '');

  // A member row for the viewer themselves often arrives without an avatar,
  // because the trip payload does not join the profile table. Fill it in from
  // the session so people are not the only faceless person in their own crew.
  const viewerId = String(viewer?.id ?? '');
  if (!profilePic && viewerId && id === viewerId) {
    return { id, name, profilePic: viewer?.profilepicture ?? '' };
  }

  return { id, name, profilePic };
}

/**
 * The trip's owner as a person, not just an id.
 *
 * The card puts the owner's portrait on the cover on every surface now, so
 * Profile needs the same {name, avatar} shape Community reads straight off
 * `TripUserDto`. Falls back to the viewer because on your own Profile the
 * unnamed owner is always you.
 */
function ownerPersonOf(t: any, ownerId: string, viewer?: ViewerProfile | null): TripOwnerVM {
  const o = t.owner || t.Owner || null;
  const firstName = pick(o?.fname, o?.Fname, o?.firstName, o?.FirstName, viewer?.fname);
  const lastName = pick(o?.lname, o?.Lname, o?.lastName, o?.LastName, viewer?.lname);

  const name =
    pick(
      o?.name, o?.Name, o?.displayName,
      [firstName, lastName].filter(Boolean).join(' ').trim(),
      typeof o?.email === 'string' ? o.email.split('@')[0] : '',
      typeof viewer?.email === 'string' ? viewer.email.split('@')[0] : '',
    ) || 'Me';

  const profilePic = pick(
    o?.profilePic, o?.profilePicture, o?.profilepicture, o?.avatar, o?.Avatar, o?.photoUrl,
    viewer?.profilepicture,
  );

  return {
    id: ownerId || String(o?.id || o?.Id || viewer?.id || ''),
    name,
    profilePic,
    identityVerified: o?.identityVerified === true || o?.IdentityVerified === true,
  };
}

export function mapTripVM(t: any, viewer?: ViewerProfile | null): TripVM {
  const viewerId = String(viewer?.id ?? '');
  const ownerId = ownerIdOf(t);
  const owner = ownerPersonOf(t, ownerId, viewer);

  const rawMembers: any[] = t.members || t.invitedUsers || [];
  let members = rawMembers.map((m) => normaliseMember(m, viewer));

  // A trip with no member rows is still somebody's trip. Fall back to the owner
  // so the avatar group is never empty. The card dedupes by id, so a solo trip
  // renders one portrait rather than the same face as both host and crew.
  if (members.length === 0) {
    members = [{ id: owner.id, name: owner.name, profilePic: owner.profilePic }];
  }

  return {
    id: t.id || t.Id,
    title: t.name || t.title || 'Untitled trip',
    description: typeof t.description === 'string' ? t.description.trim() : '',
    visibility: t.visibility || t.Visibility || t.privacy || t.Privacy || 'PRIVATE',
    location: Array.isArray(t.countries) && t.countries.length ? t.countries[0] : 'Unknown',
    vibe: typeof t.vibe === 'string' ? t.vibe : typeof t.Vibe === 'string' ? t.Vibe : '',
    countries: Array.isArray(t.countries) ? t.countries : [],
    // Saved banner, else the curated country cover. Resolved synchronously so
    // the grid never pops, and shared with the community cards and the hero.
    image: tripCoverPhoto(t) ?? '',
    progress: typeof t.progress === 'number' ? t.progress : 0,
    // Raw ISO, not a pre-formatted "3d ago": the card renders the age itself so
    // that Community and Profile cannot phrase the same timestamp differently.
    createdAt: t.createdDate ?? t.CreatedDate ?? null,
    updatedAt: t.updatedDate ?? t.UpdatedDate ?? null,
    commentsCount:
      typeof t.commentsCount === 'number' ? t.commentsCount
        : typeof t.CommentsCount === 'number' ? t.CommentsCount : 0,
    owner,
    members,
    startDate: t.startDate || t.start_date || null,
    endDate: t.endDate || t.end_date || null,
    nights: tripNights(t),
    // No viewer id means we cannot prove otherwise, and treating your own trips
    // as someone else's would hide every action on them.
    isOwner: viewerId ? (ownerId ? ownerId === viewerId : true) : true,
    isPublished:
      t.published === true || t.isPublished === true ||
      (typeof t.status === 'string' && t.status.toUpperCase() === 'PUBLISHED'),
    // TripResponseDto.IsArchived serialises to `isArchived`. Profile's old
    // Archived tab looked for `archived`/`status`, neither of which exists, so
    // it was permanently empty.
    isArchived: t.isArchived === true || t.IsArchived === true,
    tripStatus: typeof t.tripStatus === 'number' ? t.tripStatus : 0,
    // Strict === true: an endorsement claim must never render off a truthy accident.
    verified: t.verified === true || t.Verified === true,
    verifiedAt: t.verifiedAt ?? t.VerifiedAt ?? null,
    ownerId,
  };
}

/** Tolerates both `data` and `data.trips` envelopes from the trips endpoints. */
export function rowsFrom(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  const withTrips = payload as { trips?: unknown } | null;
  return Array.isArray(withTrips?.trips) ? (withTrips.trips as any[]) : [];
}
