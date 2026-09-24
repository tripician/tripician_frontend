import React from 'react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';
import type { GroupSuggestion, Organization } from '../organization/types';
import { hide, readHidden } from './hiddenSuggestions';

export interface PersonSuggestion {
  userId: number;
  name: string;
  avatar: string | null;
  identityVerified: boolean;
  reason: string;
  reasonKind: string;
}

export interface WallSuggestionsData {
  people: PersonSuggestion[];
  groups: GroupSuggestion[];
  /** The groups you are already in. Suggestions deliberately exclude these, so they are fetched separately. */
  mine: Organization[];
  loaded: boolean;
}

// Held in component state on purpose: a module cache would carry one account's suggestions into the next sign-in on the same tab.
export function useWallSuggestions(): WallSuggestionsData & { dismiss: (kind: 'people' | 'groups', id: number | string) => void } {
  const { token } = useAuthToken();
  const [data, setData] = React.useState<WallSuggestionsData>({ people: [], groups: [], mine: [], loaded: false });

  React.useEffect(() => {
    let active = true;
    // One failure must not empty the rail, so each call catches its own.
    Promise.all([
      apiServices.getPeopleSuggestions(8).then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      apiServices.getGroupSuggestions().then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => []),
      token
        ? apiServices.getMyOrganizations(token).then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => [])
        : Promise.resolve([] as Organization[]),
    ]).then(([people, groups, mine]) => {
      if (!active) return;
      const hidden = readHidden();
      setData({
        people: people.filter((p) => !hidden.people.includes(p.userId)),
        groups: groups.filter((g) => !hidden.groups.includes(g.id)),
        mine,
        loaded: true,
      });
    });
    return () => { active = false; };
  }, [token]);

  const dismiss = React.useCallback((kind: 'people' | 'groups', id: number | string) => {
    hide(kind, id);
    setData((prev) => (kind === 'people'
      ? { ...prev, people: prev.people.filter((p) => p.userId !== id) }
      : { ...prev, groups: prev.groups.filter((g) => g.id !== id) }));
  }, []);

  return { ...data, dismiss };
}
