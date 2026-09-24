import React from 'react';
import { apiServices } from '../../services/APIs/apiServices';
import { createSharedResource } from '../../utils/sharedResource';

export interface PublishedTripsState {
  trips: any[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// The list does not depend on who is asking, so one copy serves Search, Groups & Stories and every group page.
const publishedTrips = createSharedResource<any[]>(
  [],
  async () => {
    const token = localStorage.getItem('accessToken') ?? undefined;
    try {
      const resp = await apiServices.getPublishedTrips(token);
      return Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp?.data?.trips) ? resp.data.trips : [];
    } catch {
      const resp2 = await apiServices.getPublicTrips(token);
      return Array.isArray(resp2?.data) ? resp2.data : [];
    }
  },
  { ttlMs: 60_000, errorMessage: 'Unable to load community trips. Please try again.' },
);

/**
 * Every published trip, with the /public fallback the community page has always had.
 *
 * Shared so /community and /trips cannot drift: the fallback path used to drop seat
 * fields, which silently emptied the recruiting rail with nothing logged.
 */
export function usePublishedTrips(): PublishedTripsState {
  const snap = React.useSyncExternalStore(publishedTrips.subscribe, publishedTrips.getSnapshot);

  React.useEffect(() => { void publishedTrips.ensure(); }, []);

  const reload = React.useCallback(() => { void publishedTrips.ensure(true); }, []);
  return { trips: snap.data, loading: snap.loading, error: snap.error, reload };
}
