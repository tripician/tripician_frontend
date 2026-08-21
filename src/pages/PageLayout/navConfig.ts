import type React from 'react';
import {
  IconUsersGroup,
  IconSparkles,
  IconRoute,
  IconCampfire,
  IconBook,
  IconUserCircle,
} from '@tabler/icons-react';
import NaviaOrbIcon from '../../navia/NaviaOrbIcon';

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
}

/**
 * The five destinations, in reading order, with Navia in the middle.
 *
 * The order is the product's own claim about itself: you find a trip
 * (Community), you read what it was actually like (Stories), you get help
 * planning yours (Navia), you find people to go with (Crew), and your own work
 * lives on Profile. Anything that does not sit on that line is not top-level
 * navigation, however useful it is.
 *
 * Risk Monitor was here and is not any more. It is a tool you reach for about a
 * specific destination, not a place you go, and holding a fifth of the nav for
 * it pushed Stories - which is now half the reason the product exists - out of
 * sight entirely. It lives in the account popover.
 */
export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: 'explore',
    label: 'Community',
    shortLabel: 'Community',
    // Campfire rather than the group icon, which now belongs to Crew. Two
    // identical glyphs sitting next to each other in the pill made the nav
    // read as one destination split in half.
    path: '/community',
    Icon: IconCampfire,
    PageHeaderIcon: IconCampfire,
    tooltip: 'Trips from travellers - read, comment, and ask the people who went',
  },
  {
    id: 'stories',
    label: 'Stories',
    shortLabel: 'Stories',
    path: '/stories',
    Icon: IconBook,
    PageHeaderIcon: IconBook,
    tooltip: 'What the trips were actually like, written by the people who took them',
  },
  {
    id: 'navia',
    label: 'Navia',
    shortLabel: 'Navia',
    path: '/navia',
    Icon: NaviaOrbIcon,
    PageHeaderIcon: IconSparkles,
    tooltip: 'Navia - your travel companion',
  },
  {
    // Replaces "My Trips". Your own trips now live on Profile, which is the
    // page that already carried your identity and your stats; keeping a second
    // destination for the same data was the reason both pages fetched it.
    id: 'crew',
    label: 'Find crew',
    shortLabel: 'Crew',
    path: '/crew',
    Icon: IconUsersGroup,
    PageHeaderIcon: IconRoute,
    tooltip: 'Travellers going where you are going',
  },
  {
    id: 'profile',
    label: 'My Profile',
    shortLabel: 'Profile',
    path: '/profile',
    Icon: IconUserCircle,
    PageHeaderIcon: IconUserCircle,
    tooltip: 'Your trips, stories, saved and stats',
  },
];

export function navItemFromPath(pathname: string): AppNavItem | undefined {
  return APP_NAV_ITEMS.find((item) => item.path === pathname);
}
