import React from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import TripPlanner from './TripPlanner';

interface TripPlannerRouteLocationState {
  tripId?: string;
  trip?: any; // TODO: type with backend Trip DTO interface
}

const TripPlannerRoute: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const location = useLocation();
  const state = (location.state || {}) as TripPlannerRouteLocationState;

  if(!tripId) {
    return <Navigate to="/error/404" replace />;
  }

  return <TripPlanner tripId={tripId} initialTrip={state.tripId === tripId ? state.trip : undefined} />;
};

export default TripPlannerRoute;