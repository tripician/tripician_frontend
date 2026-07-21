import type React from 'react';
import {
  IconMap2,
  IconUsersGroup,
  IconRadar,
  IconSparkles,
  IconRoute,
  IconCampfire,
  IconShieldBolt,
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

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: 'explore',
    label: 'Explore',
    shortLabel: 'Explore',
    path: '/community',
    Icon: IconUsersGroup,
    PageHeaderIcon: IconCampfire,
  },
  {
    id: 'trips',
    label: 'My Trips',
    shortLabel: 'Trips',
    path: '/dashboard',
    Icon: IconMap2,
    PageHeaderIcon: IconRoute,
  },
  {
    id: 'navia',
    label: 'Navia',
    shortLabel: 'Navia',
    path: '/navia',
    Icon: NaviaOrbIcon,
    PageHeaderIcon: IconSparkles,
    tooltip: 'Navia - your AI travel companion',
  },
  {
    id: 'risk',
    label: 'Risk Monitor',
    shortLabel: 'Risk',
    path: '/risk-monitor',
    Icon: IconRadar,
    PageHeaderIcon: IconShieldBolt,
    tooltip: 'Travel Risk Monitor - real-time safety intel for your destinations',
  },
  {
    id: 'profile',
    label: 'My Profile',
    shortLabel: 'Profile',
    path: '/profile',
    Icon: IconUserCircle,
    PageHeaderIcon: IconUserCircle,
    tooltip: 'Your profile - trips, stats, and travel identity',
  },
];

export function navItemFromPath(pathname: string): AppNavItem | undefined {
  return APP_NAV_ITEMS.find((item) => item.path === pathname);
}

