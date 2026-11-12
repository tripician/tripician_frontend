/**
 * The own profile's tab strip: which tabs exist, in what order, and which one
 * opens for a given `?tab=`.
 *
 * Split out of `Profile.tsx` so the rules can be tested: that page needs a
 * signed-in session to render at all.
 *
 * Since the 2026-11 redesign the profile opens on the Wall, the app's
 * portfolio (Featured, Photobook, Travel Journal), which is never empty because
 * every section shows a quote when it has nothing. So there is no longer any
 * waiting to see whether there are posts before choosing a tab.
 */

export type TabId = 'wall' | 'trips' | 'stories' | 'saved';

/** Order as displayed. */
export const TAB_IDS: TabId[] = ['wall', 'trips', 'stories', 'saved'];

export function isTabId(value: string | null | undefined): value is TabId {
  return !!value && (TAB_IDS as string[]).includes(value);
}

/**
 * Tabs that used to exist, and where their links land now. `/dashboard` still
 * redirects to `?tab=trips`, and old bookmarks may say `road` or `archived`.
 */
const LEGACY: Record<string, { tab: TabId; archived?: boolean }> = {
  road: { tab: 'wall' },
  archived: { tab: 'trips', archived: true },
};

/** Which tab a `?tab=` opens, and whether it asked for the archived trips. Unknown or absent opens the Wall. */
export function resolveTab(requested: string | null | undefined): { tab: TabId; archived: boolean } {
  if (isTabId(requested)) return { tab: requested, archived: false };
  const legacy = requested ? LEGACY[requested] : undefined;
  if (legacy) return { tab: legacy.tab, archived: !!legacy.archived };
  return { tab: 'wall', archived: false };
}
