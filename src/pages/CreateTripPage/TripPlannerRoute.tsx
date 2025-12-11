import React from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetPlanner } from '../../store/plannerSlice';
import TripPlanner from './TripPlanner';

interface TripPlannerRouteLocationState {
  tripId?: string;
  trip?: any; // preferred key carrying trip meta
  initialTrip?: any; // legacy key for backwards navigation compatibility
  __ts?: number; // optional navigation timestamp for proactive reset
  isOwner?: boolean;
  isMember?: boolean;
  canEdit?: boolean;
}

const TripPlannerRoute: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const dispatch = useDispatch();
  const location = useLocation();
  const state = (location.state || {}) as TripPlannerRouteLocationState;

  if(!tripId) {
    return <Navigate to="/error/404" replace />;
  }

  // Prefer `state.trip`; fall back to `state.initialTrip` if provided and matching id
  const stateMatches = state.tripId === tripId;
  const passedTrip = stateMatches ? (state.trip || state.initialTrip) : undefined;
  const derivedIsOwner = stateMatches && typeof state.isOwner === 'boolean' ? state.isOwner : undefined;
  const derivedCanEdit = stateMatches && typeof state.canEdit === 'boolean' ? state.canEdit : undefined;

  // Proactive planner reset when navigating to a new trip (route-level) before TripPlanner mounts.
  // This complements internal mismatch detection and ensures no stale itinerary flashes.
  React.useEffect(() => {
  if (tripId && typeof state.__ts === 'number') {
      // Reset with tripId to clear previous destinations immediately.
      dispatch(resetPlanner({ tripId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, state.__ts]);
  // Force component remount on tripId changes so internal refs (hydratedRef) don't carry over.
  return (
    <TripPlanner
      key={tripId}
      tripId={tripId}
      initialTrip={passedTrip}
      isOwnerExternal={derivedIsOwner ?? true}
      isExternalNonOwner={false}
      effectiveCanEdit={derivedCanEdit ?? true}
    />
  );
};

export default TripPlannerRoute;