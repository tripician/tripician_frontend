import { apiServices } from '../services/APIs/apiServices';

// Fired after a block so every open list can drop that person's posts without a reload.
export const USER_BLOCKED_EVENT = 'tripician:user-blocked';

/** Asks first, then blocks. Resolves true when the block went through. */
export async function confirmAndBlock(userId: number, name?: string | null): Promise<boolean> {
  const who = name?.trim() || 'this person';
  if (!window.confirm(`Block ${who}? You will stop seeing each other's posts and answers, they cannot message you, and any follow between you ends. They are not told.`)) return false;
  await apiServices.blockUser(userId);
  window.dispatchEvent(new CustomEvent(USER_BLOCKED_EVENT, { detail: { userId } }));
  return true;
}

/** The blocked id carried by a USER_BLOCKED_EVENT, or null for anything else. */
export function blockedIdFrom(event: Event): number | null {
  const id = (event as CustomEvent<{ userId?: unknown }>).detail?.userId;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}
