import { describe, it, expect } from 'vitest';
import { planBenefits, planUpgrade } from './planBenefits';
import type { Plan } from './types';

/*
 * These lines are what somebody reads before they pay. Every one is derived from
 * a plan field on purpose, so a number changed in appsettings changes the claim
 * with it. A hardcoded benefit list is how a price page starts lying.
 */

const plan = (over: Partial<Plan> = {}): Plan => ({
  planId: 'basic',
  name: 'Tripician Basic',
  scope: 'user',
  monthlyPrice: 0,
  annualPrice: 0,
  maxTripMembers: 12,
  maxRecruitedTravellers: 2,
  naviaMonthlyCredits: 300,
  storyBookPriceTier: 'retail',
  ...over,
});

describe('planBenefits', () => {
  it('states the real numbers', () => {
    const lines = planBenefits(plan());
    expect(lines).toContain('Up to 12 people on a trip');
    expect(lines).toContain('2 travellers can join from a public listing');
    expect(lines).toContain('300 Navia credits a month');
  });

  // The API omits nulls, so an unlimited plan arrives with the field absent.
  it('reads an absent limit as no limit, never as zero', () => {
    const lines = planBenefits(plan({ planId: 'business', maxTripMembers: undefined, maxRecruitedTravellers: undefined }));
    expect(lines).toContain('Trip size to suit the organization');
    expect(lines).toContain('Recruit travellers at organization scale');
    expect(lines.some((l) => l.includes('Up to undefined'))).toBe(false);
    expect(lines.some((l) => l.includes('0 travellers'))).toBe(false);
  });

  it('says nothing about book pricing on the retail tier', () => {
    expect(planBenefits(plan())).not.toContain('Member price on Story Books');
    expect(planBenefits(plan({ storyBookPriceTier: 'pro_member' }))).toContain('Member price on Story Books');
  });

  it('only names features the server actually sent', () => {
    expect(planBenefits(plan())).not.toContain('Post to the community as your organization');
    expect(planBenefits(plan({ features: ['organization_posts'] })))
      .toContain('Post to the community as your organization');
  });

  it('ignores a feature id it has no name for, rather than printing the id', () => {
    const lines = planBenefits(plan({ features: ['some_future_thing'] }));
    expect(lines.some((l) => l.includes('some_future_thing'))).toBe(false);
  });

  it('singularises one traveller', () => {
    expect(planBenefits(plan({ maxRecruitedTravellers: 1 })))
      .toContain('1 traveller can join from a public listing');
  });
});

describe('planUpgrade', () => {
  const basic = plan();
  const pro = plan({
    planId: 'pro',
    name: 'Tripician Pro',
    monthlyPrice: 149,
    maxRecruitedTravellers: 5,
    naviaMonthlyCredits: 1500,
    storyBookPriceTier: 'pro_member',
  });

  it('names only what actually changes', () => {
    const lines = planUpgrade(basic, pro);
    expect(lines).toContain('5 travellers can join from a public listing, up from 2');
    expect(lines).toContain('1,200 more Navia credits every month');
    expect(lines).toContain('Member price on every Story Book you print');
    // Trip size is the same on both, so it must not be sold as an upgrade.
    expect(lines.some((l) => l.includes('people on a trip'))).toBe(false);
  });

  it('says an unlimited plan removes the ceiling rather than quoting a number', () => {
    const business = plan({
      planId: 'business',
      maxTripMembers: undefined,
      maxRecruitedTravellers: undefined,
      naviaMonthlyCredits: 10000,
      storyBookPriceTier: 'business_member',
    });
    const lines = planUpgrade(basic, business);
    expect(lines).toContain('Recruit as many travellers as a trip needs');
    expect(lines).toContain('No ceiling on how many people are on a trip');
  });

  it('returns nothing when the higher plan adds nothing', () => {
    expect(planUpgrade(pro, plan({ ...pro, planId: 'pro' }))).toEqual([]);
  });

  it('never claims a downgrade as a gain', () => {
    const lines = planUpgrade(pro, basic);
    expect(lines.some((l) => l.includes('more Navia credits'))).toBe(false);
    expect(lines.some((l) => l.includes('up from'))).toBe(false);
  });

  it('falls back to the whole benefit list when there is no current plan', () => {
    expect(planUpgrade(null, pro)).toEqual(planBenefits(pro));
  });

  it('does not repeat a feature the current plan already has', () => {
    const from = plan({ features: ['organization_posts'] });
    const to = plan({ features: ['organization_posts', 'organization_staffing'] });
    const lines = planUpgrade(from, to);
    expect(lines).toContain('Put your people onto your trips from one screen');
    expect(lines).not.toContain('Post to the community as your organization');
  });
});
