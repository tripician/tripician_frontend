import React from 'react';
import { Navigate } from 'react-router-dom';

// Entry component for /tripplanner without an id.
// Behavior:
// 1. Reuse last draft trip id from localStorage if present.
// 2. Otherwise generate a temporary client id and redirect.
// 3. Could be extended to call backend create-trip endpoint before redirecting.
// Local storage key constant
const DRAFT_KEY = 'tripician:lastDraftTripId';

const TripPlannerEntry: React.FC = () => {
  // Attempt to restore last draft id
  let draftId = typeof window !== 'undefined' ? window.localStorage.getItem(DRAFT_KEY) : null;
  if(!draftId) {
    // Generate a pseudo id (prefixed). Backend persistence will later replace with real id if needed.
    draftId = 'draft_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
    try { window.localStorage.setItem(DRAFT_KEY, draftId); } catch { /* ignore quota errors */ }
  }
  return <Navigate to={`/tripplanner/${draftId}`} replace />;
};

export default TripPlannerEntry;
