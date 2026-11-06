import React from 'react';
import { apiServices } from '../services/APIs/apiServices';

// One fetch per page load: every surface asking the same question shares the answer.
let cached: Promise<boolean> | null = null;

function load(): Promise<boolean> {
  if (!cached) {
    cached = apiServices.getPlans()
      .then((resp) => resp.data?.plans?.some((p) => p.planId === 'business' && p.comingSoon === true) ?? false)
      .catch(() => {
        cached = null; // try again next time; the server refuses either way
        return false;
      });
  }
  return cached;
}

/**
 * Whether Tripician Business is paused ("Coming soon" in the server's pricing settings).
 * While it is, the Business plan cannot be bought and new business accounts cannot be
 * created; the server refuses both regardless, this only lets the page say so up front.
 * Null until known.
 */
export function useBusinessComingSoon(): boolean | null {
  const [soon, setSoon] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    let active = true;
    void load().then((value) => { if (active) setSoon(value); });
    return () => { active = false; };
  }, []);
  return soon;
}
