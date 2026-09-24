// A module-level loader several pages can share: one request in flight, a short freshness window, errors never cached.

export interface ResourceSnapshot<T> {
  data: T;
  /** True until the first data (or the first progressive page) arrives. */
  loading: boolean;
  /** True once the whole load has finished, successfully or not. */
  complete: boolean;
  error: string | null;
}

export interface SharedResource<T> {
  getSnapshot: () => ResourceSnapshot<T>;
  subscribe: (listener: () => void) => () => void;
  /** Loads unless a fresh, successful copy exists. `force` always reloads, keeping the old data on screen meanwhile. */
  ensure: (force?: boolean) => Promise<void>;
}

export interface SharedResourceOptions {
  ttlMs: number;
  now?: () => number;
  errorMessage?: string;
}

/** `load` may call `emit` with partial data as it pages, so a list paints from its first page. */
export function createSharedResource<T>(
  initial: T,
  load: (emit: (partial: T) => void) => Promise<T>,
  { ttlMs, now = () => Date.now(), errorMessage = 'Something went wrong. Please try again.' }: SharedResourceOptions,
): SharedResource<T> {
  let snapshot: ResourceSnapshot<T> = { data: initial, loading: true, complete: false, error: null };
  let loadedAt = 0;
  let inFlight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<ResourceSnapshot<T>>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  };

  const ensure = (force = false): Promise<void> => {
    if (inFlight) return inFlight;
    const fresh = snapshot.complete && !snapshot.error && now() - loadedAt < ttlMs;
    if (!force && fresh) return Promise.resolve();

    if (snapshot.error) set({ error: null, loading: true });
    inFlight = load((partial) => set({ data: partial, loading: false }))
      .then((data) => {
        loadedAt = now();
        set({ data, loading: false, complete: true, error: null });
      })
      .catch(() => {
        set({ loading: false, complete: true, error: errorMessage });
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    ensure,
  };
}
