import type React from 'react';
import {
  IconHome,
  IconSearch,
  IconUsersGroup,
  IconUserCircle,
} from '@tabler/icons-react';

export interface AppNavItem {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  Icon: React.ElementType;
  /** Icon shown in page-level header blocks (28px, brand color) */
  PageHeaderIcon?: React.ElementType;
  /** Tooltip text shown on hover - shown in desktop nav */
  tooltip?: string;
  disabled?: boolean;
  /** The desktop pill's wording when it has room for more than the phone bar's shortLabel. */
  desktopLabel?: string;
  /** Other paths (and everything under them) that belong to this destination. */
  activeOn?: string[];
}

// Four destinations: the wall, Search, Groups & Stories (trips to join, the groups running them, stories), and you.
//
// The assistant is deliberately not one of them. A nav holds places you go; TripicianAI is a tool you use, and it
// already has three doors: the floating command bar on every destination here, Studio on every page, and the planner.
// The phone bar dropped it for exactly that reason, and a row that disagreed with itself between phone and desktop
// was the thing making this bar look odd.
/**
 * Where the centred desktop nav starts, and the bottom bar stops. It also
 * decides which create control is in charge.
 *
 * It no longer holds off an overlap. It used to: the pill was absolutely centred
 * on the viewport while the right cluster sat in normal flow, so the cluster grew
 * underneath it, and this number was measured and re-measured every time a button
 * changed. "Get Pro" overlapped "Profile" by 35px at 1440 and 115px at 1280.
 *
 * The header is now a three-track grid, so the pill slides rather than collides
 * and overlap is structurally impossible at any width. What this value still
 * decides is which of the two navigations is showing, and therefore where
 * creation lives: the header's split button at or above it, the bottom bar's
 * centre button below it. Exactly one of each, at every width.
 *
 * Both navs read this one value so there can never be a width with neither.
 */
export const DESKTOP_NAV_MIN_WIDTH = 1280;


export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    /*
     * The wall, wearing the mark.
     *
     * It was briefly left out on the argument that the logo already goes here,
     * so a nav item would be a second door to the same page. On screen that was
     * wrong twice over: the bar looked half empty, and on a phone the logo is a
     * 24px mark in a corner rather than anything anyone reads as navigation.
     *
     * A house, not the brand mark: the logo already sits in the corner, and a
     * second copy of it inside the row read as branding rather than as the way
     * home. A glyph among glyphs is what a nav row is.
     *
     * It also fixes a standing bug for free: navItemFromPath is an exact match,
     * so with nothing registered at "/" the root highlighted no tab at all.
     */
    id: 'wall',
    label: 'Wall',
    shortLabel: 'Wall',
    path: '/',
    Icon: IconHome,
    PageHeaderIcon: IconHome,
    tooltip: 'What travellers are doing right now',
  },
  {
    // Instagram-style lookup: people, places, plans, stories, groups and tags. The traveller directory lives here too.
    id: 'search',
    label: 'Search',
    shortLabel: 'Search',
    path: '/search',
    Icon: IconSearch,
    PageHeaderIcon: IconSearch,
    tooltip: 'Find people, places, trips and groups',
    activeOn: ['/crew'],
  },
  {
    // The id stays `stories` and the path stays /stories, which is indexed and linked from everywhere.
    id: 'stories',
    label: 'Groups & Stories',
    desktopLabel: 'Groups & Stories',
    shortLabel: 'G&S',
    path: '/stories',
    Icon: IconUsersGroup,
    PageHeaderIcon: IconUsersGroup,
    tooltip: 'Trips you can join, the groups that run them, and the stories of how they went',
    activeOn: ['/trips', '/o', '/groups', '/join'],
  },
  {
    // From the road used to sit here, pointing at /posts. The board carries
    // notes and questions now, so this was a nav item for a subset of the page
    // the logo already reaches. /posts survives as the archive with the filters,
    // sorts and search the board does not have, and as the parent of every post
    // permalink; it is simply reached from a post rather than from the bar.
    id: 'profile',
    label: 'My Profile',
    shortLabel: 'Profile',
    path: '/profile',
    Icon: IconUserCircle,
    PageHeaderIcon: IconUserCircle,
    tooltip: 'Your trips, stories, saved and stats',
  },
];

/**
 * Ids deliberately absent from the bottom bar, and why.
 *
 * Empty now: TripicianAI used to be the one entry here, and it has left the nav
 * altogether rather than only the phone. Every destination is in both bars again.
 *
 * The list stays because the guard uses it to tell a deliberate omission from an
 * item somebody quietly dropped. Adding an id here is a decision with a name on it.
 */
export const MOBILE_NAV_EXCLUDED: readonly string[] = [];

const underPath = (pathname: string, base: string): boolean =>
  pathname === base || pathname.startsWith(`${base}/`);

/** The destination a path belongs to: its own path exactly, then an `activeOn` path, then anything under its own path. */
export function navItemFromPath(pathname: string): AppNavItem | undefined {
  return APP_NAV_ITEMS.find((item) => item.path === pathname)
    ?? APP_NAV_ITEMS.find((item) => item.activeOn?.some((base) => underPath(pathname, base)))
    ?? APP_NAV_ITEMS.find((item) => item.path !== '/' && underPath(pathname, item.path));
}

/** One rule for both navs, so the header and the bottom bar never light different tabs. */
export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  return navItemFromPath(pathname)?.id === item.id;
}
