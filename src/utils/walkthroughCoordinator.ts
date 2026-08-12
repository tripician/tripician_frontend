/**
 * Keeps the app's two walkthroughs from firing back to back.
 *
 * There are two first-run guides: the `OnboardingCarousel` on the dashboard, and
 * the `PlannerTour` on the trip planner. A genuinely new user hits them within a
 * minute of each other - three carousel slides, create a trip, then a spotlight
 * tour - which is more instruction than anyone absorbs in one sitting.
 *
 * Both consult this before showing, and whichever displays first claims the slot
 * for the rest of the session; the other simply waits for a later visit. Neither
 * component needs to know the other exists.
 *
 * Session-scoped on purpose. A per-device flag would permanently suppress one of
 * them, and each still has its own once-ever `seen` key for that job - this only
 * decides "not right now".
 *
 * Following the rule that made `feedbackPrompt` work: **the thing that displays
 * marks the slot, not the thing that requests it.** A guide that never actually
 * appeared must not consume the session.
 */
const SLOT_KEY = 'tripician:walkthroughShown';

export type WalkthroughId = 'appCarousel' | 'plannerTour';

/** True when another walkthrough has already run this session. */
export function walkthroughShownThisSession(): boolean {
  try {
    return Boolean(sessionStorage.getItem(SLOT_KEY));
  } catch {
    // Private mode / storage disabled. Reporting "already shown" is the safe
    // failure: at worst a guide is skipped, never doubled up.
    return true;
  }
}

/** Called by a walkthrough at the moment it becomes visible. */
export function markWalkthroughShown(id: WalkthroughId): void {
  try { sessionStorage.setItem(SLOT_KEY, id); } catch { /* private mode - may double up once */ }
}

/** Which walkthrough claimed this session, if any. Diagnostics only. */
export function walkthroughOwner(): WalkthroughId | null {
  try { return (sessionStorage.getItem(SLOT_KEY) as WalkthroughId | null) ?? null; } catch { return null; }
}

/* ------------------------------------------------------------------ */
/* Planner tour: the once-ever flag                                    */
/* ------------------------------------------------------------------ */

/**
 * Device-scoped, like `tripician:onboardingSeen`. Registered in authSession's
 * DEVICE_PREFERENCE_KEYS so it survives sign-out - replaying a walkthrough at
 * someone who has already sat through it is worse than the flag persisting.
 *
 * These live here rather than in PlannerTour.tsx so that file exports only its
 * component (react-refresh needs that to hot-reload it), and because "should a
 * walkthrough run?" is exactly this module's job.
 */
const PLANNER_TOUR_SEEN_KEY = 'tripician:plannerTourSeen';

export function hasSeenPlannerTour(): boolean {
  try { return localStorage.getItem(PLANNER_TOUR_SEEN_KEY) === '1'; } catch { return true; }
}

export function markPlannerTourSeen(): void {
  try { localStorage.setItem(PLANNER_TOUR_SEEN_KEY, '1'); } catch { /* private mode - may show again */ }
}

/** True when the tour should open by itself: never seen, and no other guide this session. */
export function shouldAutoStartPlannerTour(): boolean {
  return !hasSeenPlannerTour() && !walkthroughShownThisSession();
}
