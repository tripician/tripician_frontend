/**
 * How a list of community trips is ordered.
 *
 * Lifted out of Community.tsx so the rule is testable. It is a product invariant
 * ("Tripician Verified trips rank first"), not a view preference, and it is enforced
 * in two places that must agree: an `OrderByDescending(t => t.Verified)` in the
 * backend queries, and this comparator, which runs after client-side filtering and
 * would otherwise throw the server's order away.
 */

/**
 * How much the community is engaging with a trip.
 *
 * Comments weigh heaviest: writing a reply costs far more than tapping a heart, so a
 * trip people are actually discussing deserves to surface above one that simply
 * collected likes.
 *
 * Reads both camelCase and PascalCase because the API has historically served both.
 */
export function engagementScore(t: any): number {
  return (Number(t?.likesCount ?? t?.likes) || 0)
    + 2 * (Number(t?.cloneCount) || 0)
    + 3 * (Number(t?.commentsCount ?? t?.CommentsCount) || 0);
}

/**
 * 1 for a verified trip, 0 otherwise.
 *
 * `=== true`, not truthiness: this drives a public trust claim, so a stray string or a
 * `1` from some future payload must not promote a trip that no one has reviewed.
 */
export function verifiedRank(t: any): number {
  return t?.verified === true || t?.Verified === true ? 1 : 0;
}

/**
 * The community ordering: verified first as a **hard tier**, engagement inside each
 * tier. A barely-engaged verified trip outranks a wildly popular unverified one, which
 * is the deliberate consequence of the tier being hard rather than a score boost.
 */
export function compareTripsForFeed(a: any, b: any): number {
  return (verifiedRank(b) - verifiedRank(a)) || (engagementScore(b) - engagementScore(a));
}
