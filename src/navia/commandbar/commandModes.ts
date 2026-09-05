import type React from 'react';
import { IconCompass, IconFeather, IconRoute, IconSparkles } from '@tabler/icons-react';
import { CREDIT_COSTS } from '../naviaService';

export type CommandMode = 'auto' | 'plan' | 'story' | 'ask';

export interface CommandModeSpec {
  id: CommandMode;
  label: string;
  Icon: React.ElementType;
  /** Whether screenshots can be attached while this mode is selected. */
  acceptsImages: boolean;
  /** Null where the mode resolves to another one, or spends nothing. */
  cost: number | null;
  /** One line saying what will happen and what it costs, shown before the press. */
  contract: (hasImages: boolean) => string;
}

const credits = (n: number) => (n === 1 ? '1 credit' : `${n} credits`);

/**
 * Labels are one word so the row fits a 390px phone without scrolling, and the
 * contract line carries the detail they no longer spell out.
 */
export const COMMAND_MODES: Record<CommandMode, CommandModeSpec> = {
  auto: {
    id: 'auto',
    label: 'Auto',
    Icon: IconSparkles,
    acceptsImages: true,
    cost: null,
    contract: () => 'Navia decides · nothing runs yet',
  },
  plan: {
    id: 'plan',
    label: 'Plan',
    Icon: IconRoute,
    acceptsImages: true,
    cost: CREDIT_COSTS.draft_trip.cost,
    contract: (hasImages) =>
      hasImages
        ? `Reads your screenshots · ${credits(CREDIT_COSTS.import_plan.cost)}`
        : `Drafts a trip · ${credits(CREDIT_COSTS.draft_trip.cost)}`,
  },
  story: {
    id: 'story',
    label: 'Write',
    Icon: IconFeather,
    acceptsImages: false,
    cost: 0,
    contract: () => 'Opens the story composer · free',
  },
  ask: {
    id: 'ask',
    label: 'Ask',
    Icon: IconCompass,
    acceptsImages: false,
    cost: CREDIT_COSTS.general_chat.cost,
    contract: () => `Answers, and finds real trips · ${credits(CREDIT_COSTS.general_chat.cost)}`,
  },
};

/** Display order. Auto leads because it is the default. */
export const COMMAND_MODE_ORDER: CommandMode[] = ['auto', 'plan', 'story', 'ask'];

/** The cost actually charged, once Auto has resolved and attachments are known. */
export function costFor(mode: Exclude<CommandMode, 'auto'>, hasImages: boolean): number {
  if (mode === 'plan') {
    return hasImages ? CREDIT_COSTS.import_plan.cost : CREDIT_COSTS.draft_trip.cost;
  }
  return COMMAND_MODES[mode].cost ?? 0;
}

/**
 * Where the dock appears. An allowlist, so a new route never inherits it.
 *
 * /posts and /profile were added when the Navia tab left the bottom bar. They
 * are bottom-bar destinations, and without them the only way to Navia there was
 * the support headset menu, which is not where anyone looks for an assistant.
 * NavigationPanel derives the SupportWidget's offset from this same predicate,
 * so that button moves up on the new routes without a second change.
 */
export const COMMAND_BAR_ROUTES = ['/community', '/stories', '/trips', '/templates', '/crew', '/posts', '/profile'];

export function onCommandBarRoute(pathname: string): boolean {
  return COMMAND_BAR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

/** What the dock is doing, so the support FAB can keep out of its corner. */
export type CommandBarState = 'none' | 'collapsed' | 'expanded';
export const COMMAND_BAR_STATE_EVENT = 'commandbar:state';
