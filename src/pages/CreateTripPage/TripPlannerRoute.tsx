import React from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import TripPlanner from './TripPlanner';

interface TripPlannerRouteLocationState {
  tripId?: string;
  trip?: any; // preferred key carrying trip meta
  initialTrip?: any; // legacy key for backwards navigation compatibility
}

const TripPlannerRoute: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const location = useLocation();
  const state = (location.state || {}) as TripPlannerRouteLocationState;

  if(!tripId) {
    return <Navigate to="/error/404" replace />;
  }

  // Prefer `state.trip`; fall back to `state.initialTrip` if provided and matching id
  const passedTrip = state.tripId === tripId ? (state.trip || state.initialTrip) : undefined;
  return <TripPlanner tripId={tripId} initialTrip={passedTrip} />;
};

export default TripPlannerRoute;