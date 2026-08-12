import React from 'react';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import TshirtIcon from './TshirtIcon';

export interface PlannerNavItem { id: string; label: string; icon: React.ReactNode }

export const PLANNER_NAV_ITEMS: PlannerNavItem[] = [
  { id: 'plan', label: 'Plan', icon: <CalendarMonthIcon fontSize='small' /> },
  { id: 'budget', label: 'Budget', icon: <AccountBalanceWalletOutlinedIcon fontSize='small' /> },
  { id: 'news', label: 'News', icon: <NewspaperIcon fontSize='small' /> },
  { id: 'packing', label: 'Packing', icon: <TshirtIcon fontSize='small' /> },
  { id: 'docs', label: 'Docs', icon: <InsertDriveFileIcon fontSize='small' /> },
];

export interface PlannerNavGating {
  hideSections?: string[];
  canAccessDocs?: boolean;
  docsEnabled?: boolean;
  budgetEnabled?: boolean;
}

/**
 * Which sections a user can actually reach, given the mode and the feature flags.
 *
 * Shared by the desktop rail and the phone's section sheet. It lives here rather
 * than inside `TripPlannerNav` because those two surfaces silently disagreeing
 * about what exists is exactly the kind of bug nobody notices until a section is
 * unreachable on one of them.
 */
export function visiblePlannerNavItems({
  hideSections = [],
  canAccessDocs = true,
  docsEnabled = true,
  budgetEnabled = true,
}: PlannerNavGating): PlannerNavItem[] {
  const { docsSection } = FEATURE_FLAGS;
  return PLANNER_NAV_ITEMS.filter(i => {
    if (hideSections.includes(i.id)) return false;
    // Docs needs all three: permission, the section flag, and upload enabled. The
    // rail used to render it disabled-and-hidden, which amounts to the same thing.
    if (i.id === 'docs' && !(canAccessDocs && docsSection && docsEnabled)) return false;
    if (i.id === 'budget' && !budgetEnabled) return false;
    return true;
  });
}
