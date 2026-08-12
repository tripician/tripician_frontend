import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { runFeasibility, type FeasibilityReport, type FeasibilityStop } from './feasibility';

/**
 * The reality check, computed from the LIVE Redux plan.
 *
 * Extracted out of PlanReviewDialog so the planner toolbar can report findings
 * without the dialog being open. Previously the engine only ever ran inside the
 * mounted dialog, which is why the toolbar control could say nothing at all -
 * you had to click an unlabelled button to discover the plan had problems.
 *
 * Safe to call from more than one place: `runFeasibility` is pure, offline, makes
 * no network call and costs no credits, and both callers here share this one memo.
 *
 * One honest caveat: `checkClosedForStay` reads the session-volatile place-details
 * cache, so a report computed before spots have resolved legitimately differs from
 * one computed after. The memo re-runs as `destinations` changes, so the count
 * settles on its own - just don't treat the first value as final.
 */
export function useFeasibility(): FeasibilityReport {
  const destinations = useSelector((s: RootState) => s.planner.destinations);
  const tripStartDate = useSelector((s: RootState) => s.planner.tripStartDate);
  const tripEndDate = useSelector((s: RootState) => s.planner.tripEndDate);
  // The pace they asked for at creation. Undefined on trips made before we asked,
  // which the engine reads as the balanced default.
  const pace = useSelector((s: RootState) => s.planner.preferences?.pace);

  return React.useMemo(() => {
    const stops: FeasibilityStop[] = destinations.map(d => ({
      id: d.id,
      name: d.name,
      nights: d.nights || 0,
      lat: d.lat,
      lng: d.lng,
      spots: d.spots ?? [],
      startDate: d.startDate,
      stays: d.stays ?? [],
    }));
    return runFeasibility({ stops, tripStartDate, tripEndDate, pace });
  }, [destinations, tripStartDate, tripEndDate, pace]);
}

export default useFeasibility;
