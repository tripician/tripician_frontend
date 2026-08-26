import type React from 'react';
import {
  IconSparkles,
  IconMessages,
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
 * The five destinations, with Navia in the middle.
 *
 * Navia is a hinge rather than just the third item. Everything to its left is
 * material that already exists for you to read - Community's feed, Browse's
 * library. Everything to its right is where you make something: Navia turns a
 * thought into a trip, From the road turns a moment into a post, Profile holds
 * what you have made. Read on one side, make on the other.
 *
 * From the road took the slot Crew used to hold. It is the only destination
 * with a same-minute reason to open it - you are standing in the queue now -
 * and on a phone the right of the bar is where a thumb already rests, so the
 * item with the shortest fuse gets the easiest tap. Crew is the opposite: you
 * go looking for people deliberately and rarely. It is now the Travellers
 * segment on Browse, and /crew still resolves.
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
    // The library. Community is the live feed; this is where you go to browse
    // finished work, which is both the plans and the stories about them. The id
    // stays `stories` because the mobile bars and navConfig.test pick items by it.
    id: 'stories',
    label: 'Plans & stories',
    shortLabel: 'Browse',
    path: '/stories',
    Icon: IconBook,
    PageHeaderIcon: IconBook,
    tooltip: 'Every published plan and the stories of how they went',
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
    // The one destination with a same-minute reason to open it, which is why it
    // sits on the far side of the orb rather than beside the reading surfaces.
    //
    // Two speech bubbles, not the note glyph the card ribbon uses. That pairing
    // was right when this section was only notes; it now holds questions and
    // answers as well, so the ribbon labels one KIND of post while this labels
    // the whole place. A folded rectangle also had no silhouette left at 20px,
    // beside a campfire and a book.
    id: 'road',
    label: 'From the road',
    shortLabel: 'The road',
    path: '/posts',
    Icon: IconMessages,
    PageHeaderIcon: IconMessages,
    tooltip: 'Ask travellers who are there right now',
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
