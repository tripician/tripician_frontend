import type React from 'react';
import {
  IconHome2,
  IconMap2,
  IconUsersGroup,
  IconRadar,
  IconAdjustmentsHorizontal,
  IconPlanet,
  IconRoute,
  IconCampfire,
  IconShieldBolt,
} from '@tabler/icons-react';

export interface AppNavItem {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  Icon: React.ElementType;
  /** Icon shown in page-level header blocks (28px, brand color) */
  PageHeaderIcon?: React.ElementType;
  /** Tooltip text shown on hover — shown in desktop nav */
  tooltip?: string;
  disabled?: boolean;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    shortLabel: 'Home',
    path: '/home',
    Icon: IconHome2,
    PageHeaderIcon: IconPlanet,
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
    id: 'community',
    label: 'Community',
    shortLabel: 'Community',
    path: '/community',
    Icon: IconUsersGroup,
    PageHeaderIcon: IconCampfire,
  },
  {
    id: 'risk',
    label: 'Risk Monitor',
    shortLabel: 'Risk',
    path: '/risk-monitor',
    Icon: IconRadar,
    PageHeaderIcon: IconShieldBolt,
    tooltip: 'Travel Risk Monitor — real-time safety intel for your destinations',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    path: '/settings',
    Icon: IconAdjustmentsHorizontal,
    PageHeaderIcon: IconAdjustmentsHorizontal,
  },
];

export function navItemFromPath(pathname: string): AppNavItem | undefined {
  return APP_NAV_ITEMS.find((item) => item.path === pathname);
}

