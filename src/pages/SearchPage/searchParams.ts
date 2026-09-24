// What /search shows, read from and written to the URL so a search can be shared, refreshed and gone Back to.

export type SearchTab = 'top' | 'people' | 'places' | 'plans' | 'stories' | 'groups' | 'tags';

export const SEARCH_TABS: { value: SearchTab; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'people', label: 'People' },
  { value: 'places', label: 'Places' },
  { value: 'plans', label: 'Plans' },
  { value: 'stories', label: 'Stories' },
  { value: 'groups', label: 'Groups' },
  { value: 'tags', label: 'Tags' },
];

export interface SearchState {
  q: string;
  tab: SearchTab;
  /** A place page, opened from a result; wins over the query while it is set. */
  place: string | null;
}

export function searchStateFromParams(params: URLSearchParams): SearchState {
  const tab = params.get('tab');
  return {
    q: params.get('q') ?? '',
    tab: SEARCH_TABS.some((t) => t.value === tab) ? (tab as SearchTab) : 'top',
    place: params.get('place')?.trim() || null,
  };
}

/** Defaults are left out, so a plain Search link stays /search. */
export function searchStateToParams(state: SearchState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set('q', state.q.trim());
  if (state.tab !== 'top') p.set('tab', state.tab);
  if (state.place) p.set('place', state.place);
  return p;
}

export function searchHref(patch: Partial<SearchState>): string {
  const params = searchStateToParams({ q: '', tab: 'top', place: null, ...patch }).toString();
  return params ? `/search?${params}` : '/search';
}
