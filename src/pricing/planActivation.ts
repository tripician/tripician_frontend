/** What the home page is told when somebody arrives from paying. */
export interface PlanWelcome {
  planName: string;
  /** False when the payment went through but the plan had not turned on yet. */
  active: boolean;
}

interface WaitOptions {
  read: () => Promise<string | null | undefined>;
  wanted: string;
  attempts?: number;
  wait?: () => Promise<void>;
}

const pause = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 2000); });

/** Asks a few times whether the paid plan is on yet, because the webhook that turns it on lands after the sheet closes. */
export async function waitForPlan({ read, wanted, attempts = 10, wait = pause }: WaitOptions): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if ((await read()) === wanted) return true;
    } catch {
      // A read that failed is not a no, so the next try still counts.
    }
    if (attempt < attempts - 1) await wait();
  }
  return false;
}

/** One sentence for the buyer, true whether or not the plan has turned on yet. */
export const welcomeMessage = (welcome: PlanWelcome): string => (welcome.active
  ? `Thank you. You are on ${welcome.planName} now.`
  : `Payment received. ${welcome.planName} turns on as soon as Razorpay confirms it, usually within a minute.`);

/** Reads the welcome out of router state, which is untyped and may be anything. */
export function readPlanWelcome(state: unknown): PlanWelcome | null {
  const welcome = (state as { planWelcome?: unknown } | null | undefined)?.planWelcome;
  if (!welcome || typeof welcome !== 'object') return null;

  const { planName, active } = welcome as { planName?: unknown; active?: unknown };
  return typeof planName === 'string' && planName.trim() ? { planName: planName.trim(), active: active === true } : null;
}
