// Simplified normalizer for the current stable backend shape:
// {
//   trip: { id, name, visibility, startDate, endDate, currencyCode, ... },
//   itinerary: [ { id, name, startDate, endDate, nights, lat, lng, ... } ]
// }
// We deliberately drop wide key / fallback scanning to reduce overhead.

/**
 * Which planner surface a trip opens in. Mirrors the backend
 * `Tripician.WebApi.Models.TripCoreModel.PlannerMode` enum (Easy = 0, Advanced = 1).
 */
export type PlannerMode = 'easy' | 'advanced';

/**
 * The backend serialises this enum as a PascalCase string, but older payloads and
 * some list endpoints can hand back the raw int - accept both rather than silently
 * dropping a trip into the wrong planner.
 */
export const parsePlannerMode = (value: unknown): PlannerMode | null => {
  if (typeof value === 'number') return value === 0 ? 'easy' : value === 1 ? 'advanced' : null;
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'easy' || v === '0') return 'easy';
  if (v === 'advanced' || v === '1') return 'advanced';
  return null;
};

/** Who inside a trip may see budget or checklist. Never public either way. */
export type TripAccessLevel = 'viewer' | 'member' | 'admin' | 'owner';

export type TripFeatureVisibility = 'admins' | 'members';

export const parseFeatureVisibility = (v: unknown): TripFeatureVisibility =>
  String(v ?? '').toLowerCase() === 'admins' ? 'admins' : 'members';

/** Wire form the API expects (PascalCase, matching the C# enum member names). */
export const plannerModeToWire = (mode: PlannerMode): 'Easy' | 'Advanced' =>
  mode === 'easy' ? 'Easy' : 'Advanced';

export interface NormalizedTripMeta {
  id: string;
  name: string;
  visibility: string; // raw visibility/privacy value (UPPER/LOWER)
  startDate: string | null;
  endDate: string | null;
  currencyCode?: string | null;
  targetNights?: number | null; // optional planned target nights from backend
  importantNotes?: string | null; // trip-level notes (optional)
  description?: string | null; // optional trip description
  vibe?: string | null; // optional trip vibe
  photoUrl?: string | null; // trip banner/cover photo URL
  published?: boolean; // whether the trip has been explicitly published (visible to global community)
  verified?: boolean; // Tripician Verified: an admin reviewed this itinerary
  verifiedAt?: string | null; // when the endorsement was granted; null when not verified
  plannerMode?: PlannerMode | null; // easy (minimal board) vs advanced (full planner)
  /**
   * What the caller may do here. Resolved server side; the browser renders
   * from these and never decides them. Absent means no, so a payload from an
   * older server leaves the surface read-only rather than wide open.
   */
  myAccessLevel?: TripAccessLevel;
  canEditPlan?: boolean;
  canManageMembers?: boolean;
  canManageAdmins?: boolean;
  canDelete?: boolean;
  /** Crew size against the plan allowance. Only meaningful when crewLimitEnforced. */
  crewCount?: number;
  crewLimit?: number | null;
  crewLimitEnforced?: boolean;
  /** Set when an organisation runs this trip. Null for a personal one. */
  organizationId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  organizationLogoUrl?: string | null;
  organizationVerified?: boolean;
  budgetVisibility?: TripFeatureVisibility;
  checklistVisibility?: TripFeatureVisibility;
}

export interface NormalizedTrip {
  meta: NormalizedTripMeta;
  itinerary: any[]; // backend itinerary items (unmapped here)
  raw: any; // original input for debugging
}

const toStringOrUndefined = (v: any): string | undefined => typeof v === 'string' && v.trim().length > 0 ? v : undefined;

export function normalizeTrip(input: any): NormalizedTrip | null {
  if (!input || typeof input !== 'object') return null;
  const tripRoot = (input.trip && typeof input.trip === 'object') ? input.trip : input;
  const id = toStringOrUndefined(tripRoot.id) || 'unknown';
  const name = toStringOrUndefined(tripRoot.name) || 'Untitled Trip';
  const visibility =
    toStringOrUndefined(tripRoot.visibility) ||
    toStringOrUndefined(tripRoot.Visibility) ||
    toStringOrUndefined(tripRoot.privacy) ||
    toStringOrUndefined(tripRoot.Privacy) ||
    'PRIVATE';
  const startDate = toStringOrUndefined(tripRoot.startDate) || null;
  const endDate = toStringOrUndefined(tripRoot.endDate) || null;
  const currencyCode = toStringOrUndefined(tripRoot.currencyCode) || null;
  const targetNightsRaw = tripRoot.targetNights ?? tripRoot.targetNight ?? tripRoot.plannedNights;
  const importantNotes = typeof tripRoot.importantNotes === 'string' && tripRoot.importantNotes.trim().length
    ? tripRoot.importantNotes
    : (typeof tripRoot.notes === 'string' && tripRoot.notes.trim().length ? tripRoot.notes : null);
  const targetNights = typeof targetNightsRaw === 'number' && targetNightsRaw > 0 ? targetNightsRaw
    : (typeof targetNightsRaw === 'string' && targetNightsRaw.trim() && !isNaN(Number(targetNightsRaw)) ? Number(targetNightsRaw) : null);
  const description = typeof tripRoot.description === 'string' ? tripRoot.description : null;
  const vibe = typeof tripRoot.vibe === 'string' ? tripRoot.vibe : null;
  const plannerMode = parsePlannerMode(tripRoot.plannerMode ?? tripRoot.PlannerMode);
  const level = tripRoot.myAccessLevel ?? tripRoot.MyAccessLevel;
  const myAccessLevel: TripAccessLevel | undefined =
    level === 'owner' || level === 'admin' || level === 'member' || level === 'viewer' ? level : undefined;
  // Strict true. Anything else, including a missing field, means no.
  const canEditPlan = (tripRoot.canEditPlan ?? tripRoot.CanEditPlan) === true;
  const canManageMembers = (tripRoot.canManageMembers ?? tripRoot.CanManageMembers) === true;
  const canManageAdmins = (tripRoot.canManageAdmins ?? tripRoot.CanManageAdmins) === true;
  const canDelete = (tripRoot.canDelete ?? tripRoot.CanDelete) === true;
  const crewCount = typeof tripRoot.crewCount === 'number' ? tripRoot.crewCount : undefined;
  const crewLimit = typeof tripRoot.crewLimit === 'number' ? tripRoot.crewLimit : null;
  const crewLimitEnforced = tripRoot.crewLimitEnforced === true;
  const asText = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length ? value : null;
  const organizationId = asText(tripRoot.organizationId ?? tripRoot.OrganizationId);
  const organizationName = asText(tripRoot.organizationName ?? tripRoot.OrganizationName);
  const organizationSlug = asText(tripRoot.organizationSlug ?? tripRoot.OrganizationSlug);
  const organizationLogoUrl = asText(tripRoot.organizationLogoUrl ?? tripRoot.OrganizationLogoUrl);
  const organizationVerified = (tripRoot.organizationVerified ?? tripRoot.OrganizationVerified) === true;
  const budgetVisibility = parseFeatureVisibility(tripRoot.budgetVisibility ?? tripRoot.BudgetVisibility);
  const checklistVisibility = parseFeatureVisibility(tripRoot.checklistVisibility ?? tripRoot.ChecklistVisibility);
  const photoUrl = typeof tripRoot.photoUrl === 'string' && tripRoot.photoUrl.trim().length ? tripRoot.photoUrl : null;
  // `undefined`, not `false`, when no shape carried the field. The planner adopts
  // this as the trip's published state, and defaulting to `false` would tell it an
  // already-published trip is a draft whenever a payload simply omits the flag.
  // "We were not told" and "it is not published" are different facts.
  const published =
    typeof tripRoot.published === 'boolean'
      ? tripRoot.published
      : typeof tripRoot.Published === 'boolean'
        ? tripRoot.Published
        : typeof tripRoot.isPublished === 'boolean'
          ? tripRoot.isPublished
          : typeof tripRoot.IsPublished === 'boolean'
            ? tripRoot.IsPublished
            : undefined;
  /*
   * Resolves to `false`, not `undefined`. That is the OPPOSITE of `published` directly
   * above, and the difference is deliberate rather than a copy-paste slip.
   *
   * `published` stays undefined when absent because the planner adopts it and writes it
   * back, so "we were not told" must not be mistaken for "it is a draft". Nothing ever
   * writes `verified` back from a client: it is an affirmative claim of endorsement that
   * only an admin can grant. The safe reading of silence is therefore "no badge", and
   * `=== true` keeps a truthy-adjacent value from rendering a claim we cannot support.
   */
  const verified = tripRoot.verified === true || tripRoot.Verified === true;
  const verifiedAt = typeof tripRoot.verifiedAt === 'string' ? tripRoot.verifiedAt
    : typeof tripRoot.VerifiedAt === 'string' ? tripRoot.VerifiedAt
      : null;
  const itinerary =
    Array.isArray(input.itinerary) ? input.itinerary :
    Array.isArray(input.Itinerary) ? input.Itinerary :
    Array.isArray(input.destinations) ? input.destinations :
    Array.isArray(input.Destinations) ? input.Destinations :
    Array.isArray(tripRoot.itinerary) ? tripRoot.itinerary :
    Array.isArray(tripRoot.Itinerary) ? tripRoot.Itinerary :
    Array.isArray(tripRoot.destinations) ? tripRoot.destinations :
    Array.isArray(tripRoot.Destinations) ? tripRoot.Destinations :
    [];
  return { meta: { id, name, visibility, startDate, endDate, currencyCode, targetNights, importantNotes, description, vibe, photoUrl, published, verified, verifiedAt, plannerMode, myAccessLevel, canEditPlan, canManageMembers, canManageAdmins, canDelete,
      crewCount, crewLimit, crewLimitEnforced, organizationId, organizationName, organizationSlug, organizationLogoUrl, organizationVerified, budgetVisibility, checklistVisibility }, itinerary, raw: input };
}

export default normalizeTrip;
