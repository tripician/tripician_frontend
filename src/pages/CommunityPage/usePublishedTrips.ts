import React from 'react';
import { apiServices } from '../../services/APIs/apiServices';
import { useAuthToken } from '../../hooks/useAuth0Token';

export interface PublishedTripsState {
  trips: any[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Every published trip, with the /public fallback the community page has always had.
 *
 * Shared so /community and /trips cannot drift: the fallback path used to drop seat
 * fields, which silently emptied the recruiting rail with nothing logged.
 */
export function usePublishedTrips(): PublishedTripsState {
  const { token } = useAuthToken();
  const [trips, setTrips] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const fetchToken = token || localStorage.getItem('accessToken') || null;

    void (async () => {
      try {
        const resp = await apiServices.getPublishedTrips(fetchToken ?? undefined);
        if (!active) return;
        const data = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp?.data?.trips) ? resp.data.trips : [];
        setTrips(data);
      } catch {
        if (!active) return;
        try {
          const resp2 = await apiServices.getPublicTrips(fetchToken ?? undefined);
          if (!active) return;
          setTrips(Array.isArray(resp2?.data) ? resp2.data : []);
        } catch {
          if (active) setError('Unable to load community trips. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [token, reloadKey]);

  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);
  return { trips, loading, error, reload };
}

export const isRecruiting = (t: any): boolean =>
  (t?.joinPolicy ?? t?.JoinPolicy) === 'OpenToRequests';
