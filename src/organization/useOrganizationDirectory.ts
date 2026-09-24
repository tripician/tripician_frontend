import React from 'react';
import { apiServices } from '../services/APIs/apiServices';
import { createSharedResource } from '../utils/sharedResource';
import type { OrganizationDirectoryEntry } from './types';

// Shared by Groups & Stories and Search; a backend without the endpoint just yields no groups.
const directory = createSharedResource<OrganizationDirectoryEntry[]>(
  [],
  async () => {
    try {
      const resp = await apiServices.getOrganizationDirectory();
      return Array.isArray(resp?.data) ? resp.data.filter((o) => o && o.slug) : [];
    } catch {
      return [];
    }
  },
  { ttlMs: 60_000 },
);

export function useOrganizationDirectory(): { organizations: OrganizationDirectoryEntry[]; loading: boolean } {
  const snap = React.useSyncExternalStore(directory.subscribe, directory.getSnapshot);
  React.useEffect(() => { void directory.ensure(); }, []);
  return { organizations: snap.data, loading: snap.loading };
}

/** Open trips per organisation, counted from the published list with the same joinability rule as everywhere else. */
export function openTripsByOrganization(trips: any[], isOpen: (trip: any) => boolean): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of trips) {
    const id = t?.organizationId;
    if (typeof id !== 'string' || !isOpen(t)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
