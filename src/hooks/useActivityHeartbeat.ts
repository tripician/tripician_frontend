import { useEffect, useRef } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { telemetryAPI } from '../services/APIs/apiServices';

const SESSION_KEY = 'tripician.activitySessionId';
const BEAT_INTERVAL_MS = 60_000;

/** Per-tab session id: survives route changes, dies with the tab. */
function getClientSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Session/planner-time telemetry. Sends a heartbeat every 60s while the user is
 * signed in and the tab is visible, plus a keepalive flush when the tab hides.
 * All failures are swallowed - this must never affect the user experience or
 * auth state. Server side accrues visible-time deltas capped at 150s.
 */
export default function useActivityHeartbeat() {
  const location = useLocation();
  const plannerTripIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  // Track whether the current route is the trip planner (and which trip).
  useEffect(() => {
    const match = matchPath('/tripplanner/:tripId', location.pathname);
    plannerTripIdRef.current = match?.params?.tripId ?? null;
  }, [location.pathname]);

  useEffect(() => {
    const beat = async () => {
      if (inFlightRef.current) return;
      if (typeof window === 'undefined') return;
      if (!localStorage.getItem('accessToken')) return;
      if (document.visibilityState !== 'visible') return;
      inFlightRef.current = true;
      try {
        await telemetryAPI.heartbeat(getClientSessionId(), plannerTripIdRef.current);
      } catch {
        // silent - telemetry never surfaces errors or touches auth state
      } finally {
        inFlightRef.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && localStorage.getItem('accessToken')) {
        telemetryAPI.flush(getClientSessionId(), plannerTripIdRef.current);
      }
    };

    beat();
    const interval = window.setInterval(beat, BEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}

/** Null-render wrapper so App.tsx can mount the hook inside the Router. */
export function ActivityHeartbeat() {
  useActivityHeartbeat();
  return null;
}
