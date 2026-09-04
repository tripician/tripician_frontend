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
  organization_posts: 'Post to the community as your organization',
  organization_staffing: 'Put your people onto your trips from one screen',
  organization_manager_role: 'Managers who run trips without running the business',
  organization_cover_image: 'A cover image on your public profile',
};

export function planBenefits(plan: Plan): string[] {
  const lines: string[] = [];

  lines.push(isUnlimited(plan.maxTripMembers)
    ? 'Trip size to suit the organization'
    : `Up to ${plan.maxTripMembers} people on a trip`);

  lines.push(isUnlimited(plan.maxRecruitedTravellers)
    ? 'Recruit travellers at organization scale'
    : `${plan.maxRecruitedTravellers} ${plan.maxRecruitedTravellers === 1 ? 'traveller' : 'travellers'} can join from a public listing`);

  lines.push(`${plan.naviaMonthlyCredits.toLocaleString('en-IN')} Navia credits a month`);

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
export function planUpgrade(from: Plan | null, to: Plan): string[] {
  if (!from) return planBenefits(to);

  const lines: string[] = [];

  if (isUnlimited(to.maxRecruitedTravellers) && !isUnlimited(from.maxRecruitedTravellers)) {
    lines.push('Recruit as many travellers as a trip needs');
  } else if (
    !isUnlimited(to.maxRecruitedTravellers)
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

  if (to.naviaMonthlyCredits > from.naviaMonthlyCredits) {
    const extra = to.naviaMonthlyCredits - from.naviaMonthlyCredits;
    lines.push(`${extra.toLocaleString('en-IN')} more Navia credits every month`);
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
