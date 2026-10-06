import { describe, it, expect } from 'vitest';
import { readPlanWelcome, waitForPlan, welcomeMessage } from './planActivation';

// No real clock: the wait resolves at once and is counted.
const counted = () => {
  let waits = 0;
  return { wait: async () => { waits += 1; }, waits: () => waits };
};

describe('waitForPlan', () => {
  it('says yes at once when the plan is already on', async () => {
    const clock = counted();
    expect(await waitForPlan({ read: async () => 'pro', wanted: 'pro', wait: clock.wait })).toBe(true);
    expect(clock.waits()).toBe(0);
  });

  it('keeps asking until the webhook has landed', async () => {
    const clock = counted();
    const answers = ['basic', 'basic', 'pro'];
    const read = async () => answers.shift();

    expect(await waitForPlan({ read, wanted: 'pro', wait: clock.wait })).toBe(true);
    expect(clock.waits()).toBe(2);
  });

  it('gives up after the tries it was given, without a wait after the last', async () => {
    const clock = counted();
    let reads = 0;
    const read = async () => { reads += 1; return 'basic'; };

    expect(await waitForPlan({ read, wanted: 'pro', attempts: 4, wait: clock.wait })).toBe(false);
    expect(reads).toBe(4);
    expect(clock.waits()).toBe(3);
  });

  it('treats a failed read as not yet, never as a no', async () => {
    const clock = counted();
    let reads = 0;
    const read = async () => {
      reads += 1;
      if (reads < 3) throw new Error('network');
      return 'pro';
    };

    expect(await waitForPlan({ read, wanted: 'pro', wait: clock.wait })).toBe(true);
  });

  it('does not mistake another plan for the one that was bought', async () => {
    const clock = counted();
    expect(await waitForPlan({ read: async () => 'business', wanted: 'pro', attempts: 2, wait: clock.wait })).toBe(false);
    expect(await waitForPlan({ read: async () => null, wanted: 'pro', attempts: 2, wait: clock.wait })).toBe(false);
  });
});

describe('welcomeMessage', () => {
  it('names the plan once it is on', () => {
    expect(welcomeMessage({ planName: 'Tripician Pro', active: true })).toBe('Thank you. You are on Tripician Pro now.');
  });

  it('does not claim the plan is on before it is', () => {
    expect(welcomeMessage({ planName: 'Tripician Pro', active: false })).toBe(
      'Payment received. Tripician Pro turns on as soon as Razorpay confirms it, usually within a minute.',
    );
  });
});

describe('readPlanWelcome', () => {
  it('reads what the pricing page sent', () => {
    expect(readPlanWelcome({ planWelcome: { planName: 'Tripician Pro', active: true } })).toEqual({
      planName: 'Tripician Pro',
      active: true,
    });
  });

  it('only believes the plan is on when told so plainly', () => {
    expect(readPlanWelcome({ planWelcome: { planName: 'Tripician Pro' } })?.active).toBe(false);
    expect(readPlanWelcome({ planWelcome: { planName: 'Tripician Pro', active: 'yes' } })?.active).toBe(false);
  });

  it('shows nothing for any other arrival', () => {
    expect(readPlanWelcome(null)).toBeNull();
    expect(readPlanWelcome(undefined)).toBeNull();
    expect(readPlanWelcome({})).toBeNull();
    expect(readPlanWelcome({ planWelcome: 'pro' })).toBeNull();
    expect(readPlanWelcome({ planWelcome: { planName: '   ' } })).toBeNull();
    expect(readPlanWelcome({ planWelcome: { active: true } })).toBeNull();
  });
});
