import React from 'react';
import { apiServices } from '../../services/APIs/apiServices';
import type { PersonResult } from './topResults';

// Answers per query for this visit, so Back and tab switches never ask twice.
const cache = new Map<string, PersonResult[]>();

/** People for a query, from the crew search only: it is the lookup that honours private and friends-only profiles. */
export function usePeopleSearch(query: string, enabled: boolean): { people: PersonResult[]; loading: boolean } {
  const key = query.trim().toLowerCase();
  const [state, setState] = React.useState<{ key: string; people: PersonResult[] } | null>(null);

  React.useEffect(() => {
    if (!enabled || !key || cache.has(key)) return;
    let active = true;
    apiServices
      .getTravelersCrew(undefined, undefined, undefined, false, query.trim())
      .then((r) => (Array.isArray(r.data) ? r.data : []))
      .catch(() => [] as PersonResult[])
      .then((people) => {
        cache.set(key, people);
        if (active) setState({ key, people });
      });
    return () => { active = false; };
  }, [enabled, key, query]);

  if (!enabled || !key) return { people: [], loading: false };
  const cached = cache.get(key);
  if (cached) return { people: cached, loading: false };
  return { people: state?.key === key ? state.people : [], loading: true };
}
