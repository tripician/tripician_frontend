/**
 * The own profile's tab strip: which tabs exist, in what order, and which one
 * opens when the URL does not say.
 *
 * Split out of `Profile.tsx` so `pickDefaultTab` can be tested. That page needs
 * a signed-in Auth0 session to render at all, so the one bit of real logic in
 * the tab strip would otherwise ship unexercised.
 */

export type TabId = 'road' | 'trips' | 'stories' | 'saved' | 'archived';

/**
 * Order as displayed. The road leads because it is the newest and most human
 * thing a traveller has, which is already how the PUBLIC profile is arranged:
 * diary, then recent posts, then the travel history, then published trips.
 */
export const TAB_IDS: TabId[] = ['road', 'trips', 'stories', 'saved', 'archived'];

export function isTabId(value: string | null | undefined): value is TabId {
  return !!value && (TAB_IDS as string[]).includes(value);
}

interface DefaultTabArgs {
  /** Raw `?tab=` from the URL, whatever it happens to contain. */
  requested?: string | null;
  /** False until the first posts request has settled. */
  postsResolved: boolean;
  hasPosts: boolean;
}

/**
 * Which tab to open, or null while the answer is not knowable yet.
 *
 * The first tab is normally also the default, and that is the whole risk in
 * putting the road first: somebody with 88 trips and no posts would land on an
 * empty box. So the road only opens when there is something in it.
 *
 * Null is a real answer, not a loading placeholder to paint over. Guessing
 * `trips` and correcting to `road` when the posts arrive would flip the content
 * out from under whoever was already reading it. The caller shows a skeleton
 * instead, and only ever on a cold landing: every tab change writes `?tab=`, so
 * from then on the first branch answers immediately.
 */
export function pickDefaultTab({ requested, postsResolved, hasPosts }: DefaultTabArgs): TabId | null {
  if (isTabId(requested)) return requested;
  if (!postsResolved) return null;
  return hasPosts ? 'road' : 'trips';
}
