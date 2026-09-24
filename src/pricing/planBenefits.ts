/**
 * What a plan actually gives you, in words, derived from the plan itself.
 *
 * One source for the pricing page, the Pro popup and the landing comparison, so
 * three surfaces cannot describe the same plan three different ways. Every line
 * comes from a real field: nothing here is marketing copy pinned to a plan id,
 * because that is exactly how a price list starts lying.
 */

import { isUnlimited } from './types';
import type { Plan } from './types';

/** Names for the org capabilities the server ships in `features`. */
const FEATURE_LABELS: Record<string, string> = {
  organization_posts: 'Post updates on your organization page',
  organization_staffing: 'Put your people onto your trips from one screen',
  organization_manager_role: 'Managers who run trips without running the group',
};

/** Whether this plan may open a trip to join requests at all. */
const recruits = (plan: Plan): boolean => (plan.features ?? []).includes('trip_recruiting');

export function planBenefits(plan: Plan): string[] {
  const lines: string[] = [];

  lines.push(isUnlimited(plan.maxTripMembers)
    ? 'Trip size to suit the organization'
    : `Up to ${plan.maxTripMembers} people on a trip`);

  // Only named on a plan that may actually list a trip: recruiting is a Business capability.
  if (recruits(plan)) {
    lines.push(isUnlimited(plan.maxRecruitedTravellers)
      ? 'Open your trips for travellers to ask to join'
      : `${plan.maxRecruitedTravellers} ${plan.maxRecruitedTravellers === 1 ? 'traveller' : 'travellers'} can join from a public listing`);
  }

  // Every group not on a paid group plan gets Basic's allowance, so a personal paid plan says nothing about groups.
  if (plan.scope === 'organization') {
    lines.push(isUnlimited(plan.maxGroupMembers)
      ? 'No limit on group members'
      : `Groups of up to ${plan.maxGroupMembers} members`);
  } else if (plan.monthlyPrice === 0) {
    lines.push(isUnlimited(plan.maxGroupMembers)
      ? 'Groups with no member limit'
      : `Groups of up to ${plan.maxGroupMembers} members`);
  }

  lines.push(plan.scope === 'organization'
    ? `${plan.tripicianAIMonthlyCredits.toLocaleString('en-IN')} TripicianAI credits a month, shared by the group`
    : `${plan.tripicianAIMonthlyCredits.toLocaleString('en-IN')} TripicianAI credits a month`);

  if (plan.storyBookPriceTier !== 'retail') lines.push('Member price on Story Books');

  for (const feature of plan.features ?? []) {
    const label = FEATURE_LABELS[feature];
    if (label) lines.push(label);
  }

  return lines;
}

/**
 * What moving from one plan to the next actually changes.
 *
 * Computed by comparison rather than written down, so it stays true when a
 * number in appsettings changes. Returns an empty list when the higher plan
 * genuinely adds nothing, which is a thing worth being able to see.
 */
/**
 * The member ceiling for a group run on this plan: a number, null for no limit, or undefined when unknown.
 * A personal plan does not change a group, so it reads the free plan's allowance.
 */
export function groupMemberLimit(plan: Plan, plans: Plan[]): number | null | undefined {
  const source = plan.scope === 'organization' ? plan : plans.find((p) => p.monthlyPrice === 0);
  if (!source) return undefined;
  return isUnlimited(source.maxGroupMembers) ? null : source.maxGroupMembers;
}

export function planUpgrade(from: Plan | null, to: Plan): string[] {
  if (!from) return planBenefits(to);

  const lines: string[] = [];

  if (recruits(to) && !recruits(from)) {
    lines.push('Open your trips for travellers to ask to join');
  } else if (recruits(to) && isUnlimited(to.maxRecruitedTravellers) && !isUnlimited(from.maxRecruitedTravellers)) {
    lines.push('Recruit as many travellers as a trip needs');
  } else if (
    recruits(to)
    && !isUnlimited(to.maxRecruitedTravellers)
    && !isUnlimited(from.maxRecruitedTravellers)
    && (to.maxRecruitedTravellers ?? 0) > (from.maxRecruitedTravellers ?? 0)
  ) {
    lines.push(`${to.maxRecruitedTravellers} travellers can join from a public listing, up from ${from.maxRecruitedTravellers}`);
  }

  if (isUnlimited(to.maxTripMembers) && !isUnlimited(from.maxTripMembers)) {
    lines.push('No ceiling on how many people are on a trip');
  } else if (
    !isUnlimited(to.maxTripMembers)
    && !isUnlimited(from.maxTripMembers)
    && (to.maxTripMembers ?? 0) > (from.maxTripMembers ?? 0)
  ) {
    lines.push(`Up to ${to.maxTripMembers} people on a trip, from ${from.maxTripMembers}`);
  }

  if (to.scope === 'organization' && isUnlimited(to.maxGroupMembers) && !isUnlimited(from.maxGroupMembers)) {
    lines.push('No limit on how many people join your group');
  }

  if (to.tripicianAIMonthlyCredits > from.tripicianAIMonthlyCredits) {
    const extra = to.tripicianAIMonthlyCredits - from.tripicianAIMonthlyCredits;
    lines.push(`${extra.toLocaleString('en-IN')} more TripicianAI credits every month`);
  }

  if (to.storyBookPriceTier !== 'retail' && from.storyBookPriceTier === 'retail') {
    lines.push('Member price on every Story Book you print');
  }

  const had = new Set(from.features ?? []);
  for (const feature of to.features ?? []) {
    if (had.has(feature)) continue;
    const label = FEATURE_LABELS[feature];
    if (label) lines.push(label);
  }

  return lines;
}
