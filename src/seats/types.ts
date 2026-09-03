/**
 * Seats: the wire shapes for recruiting travellers onto a trip.
 *
 * Mirrors `Models/TripCoreDtos/TripSeatDtos.cs`. Kept in its own feature folder
 * rather than folded into the trip types, for the same reason After Story is:
 * this is a self-contained capability, and a boundary you can see is a boundary
 * that survives.
 *
 * No payment shape appears anywhere here on purpose. `pricePerPerson` is a
 * figure the organiser states and the group settles between themselves;
 * Tripician processing it would make the platform an intermediary in a linked
 * travel arrangement.
 */

export type JoinPolicy = 'Closed' | 'InviteOnly' | 'OpenToRequests';

/** Where the viewer stands on this trip. Null means no relationship at all. */
export type ViewerSeatStatus = 'requested' | 'invited' | 'active' | 'declined' | 'left' | null;

export interface TripSeats {
  tripId: string;
  joinPolicy: JoinPolicy;
  /** Total places including the organiser. Null = the organiser did not say. */
  capacity: number | null;
  takenSeats: number;
  /**
   * Null when there is no capacity. That is "unknown", NOT "unlimited" - the UI
   * must render silence rather than inventing a number.
   */
  spotsLeft: number | null;
  pricePerPerson: number | null;
  priceCurrency: string | null;
  listingBlurb: string | null;
  confirmed: boolean;
  /** Always 0 unless the caller owns the trip. */
  pendingRequests: number;
  viewerStatus: ViewerSeatStatus;
  /** Set when an approved travel business runs this trip: enquiry, not join. */
  operatorName: string | null;
}

export interface TripJoinRequest {
  id: string;
  userId: number;
  name: string;
  profilePicture: string | null;
  /** Profiles stores a free-text location, not a country code. */
  location: string | null;
  message: string | null;
  requestedAt: string;
}

/**
 * Every field optional: the server treats an omitted property as "unchanged",
 * so a form can send only what the organiser actually touched.
 */
export interface UpdateTripSeatsDto {
  joinPolicy?: JoinPolicy;
  capacity?: number | null;
  pricePerPerson?: number | null;
  priceCurrency?: string | null;
  listingBlurb?: string | null;
  confirmed?: boolean;
}

/** Seats a trip can still take, as a sentence. Null when nothing is known. */
export function describeSpots(seats: Pick<TripSeats, 'spotsLeft'>): string | null {
  const n = seats.spotsLeft;
  if (n === null || n === undefined) return null;
  if (n === 0) return 'Full';
  return `${n} spot${n === 1 ? '' : 's'} left`;
}

/**
 * Whether this trip should show a join control to this viewer.
 *
 * Owners are excluded by the server (it refuses their request), but the button
 * should not appear for them either - offering an action that is guaranteed to
 * fail is worse than offering none.
 */
export function canRequestToJoin(seats: TripSeats, isOwner: boolean): boolean {
  if (isOwner) return false;
  if (seats.joinPolicy !== 'OpenToRequests') return false;
  if (seats.viewerStatus !== null) return false;
  return seats.spotsLeft === null || seats.spotsLeft > 0;
}

/**
 * Pending requests on one trip, for the organiser inbox.
 *
 * Grouped by trip because the first thing an organiser needs to know is which
 * trip a stranger is asking about: the same person could reasonably apply to
 * two, and the answer might differ.
 */
export interface PendingRequestsGroup {
  tripId: string;
  tripName: string;
  /** Null means the organiser set no capacity: "they did not say", not unlimited. */
  spotsLeft: number | null;
  requests: TripJoinRequest[];
}

/**
 * What an organiser has actually done, counted from their public records.
 *
 * Deliberately all numbers and dates. Identity verification says a person is
 * real; it says nothing about whether the trip is real or whether they have ever
 * taken anybody anywhere, which is the risk a traveller actually carries.
 */
export interface OrganiserRecord {
  userId: number;
  memberSince: string;
  identityVerified: boolean;
  /** Published trips of theirs that have already ended. Never planned ones. */
  tripsRun: number;
  /** Distinct people carried across those trips, organiser excluded. */
  travellersTaken: number;
  /** Published stories about those trips, by any author. */
  storiesPublished: number;
  /** Trips of theirs Tripician reviewed. The only figure Tripician vouches for. */
  verifiedTrips: number;
  /** Distinct countries on those trips. Uncapped. Never use topCountries.length. */
  countriesVisited: number;
  nightsTravelled: number;
  /** Flags to draw, at most eight. */
  topCountries: string[];
}
