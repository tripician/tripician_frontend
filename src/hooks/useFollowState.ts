import React from 'react';
import { apiServices } from '../services/APIs/apiServices';

export interface FollowState {
  /** Null until loaded, so a button waits rather than showing a state it cannot stand behind. */
  following: Set<number> | null;
  busyId: number | null;
  toggle: (userId: number) => Promise<void>;
}

// Who the reader follows, fetched once as a set when `enabled`; toggles are optimistic and put back on failure.
export function useFollowState(viewerId: number | undefined, token: string | null | undefined, enabled: boolean): FollowState {
  const [following, setFollowing] = React.useState<Set<number> | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const requested = React.useRef(false);

  React.useEffect(() => {
    if (!enabled || !viewerId || requested.current) return;
    requested.current = true;
    void apiServices
      .getFollowing(viewerId)
      .then((r) => setFollowing(new Set((r.data || []).map((f: any) => f.userId))))
      .catch(() => setFollowing(new Set()));
  }, [enabled, viewerId]);

  const toggle = React.useCallback(async (userId: number) => {
    if (!token || busyId === userId || following === null) return;
    const wasFollowing = following.has(userId);
    const flip = (on: boolean) => setFollowing((prev) => {
      const next = new Set(prev ?? []);
      if (on) next.add(userId);
      else next.delete(userId);
      return next;
    });

    setBusyId(userId);
    flip(!wasFollowing);
    try {
      if (wasFollowing) await apiServices.unfollowUser(token, userId);
      else await apiServices.followUser(token, userId);
    } catch {
      flip(wasFollowing);
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message: 'That did not save. Try again.' } }));
    } finally {
      setBusyId(null);
    }
  }, [token, busyId, following]);

  return { following, busyId, toggle };
}
