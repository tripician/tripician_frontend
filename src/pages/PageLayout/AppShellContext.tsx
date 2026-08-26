import React, { createContext, useContext } from 'react';

/**
 * What a caller already knows about the trip when it opens the create dialog.
 *
 * Exists because the chat-to-trip fallback used to open the form completely blank
 * after Navia had already read a destination, a name and a style out of the
 * conversation, so the traveller had to type back what they had just said.
 */
export interface CreateTripPrefill {
  name?: string;
  countries?: string[];
  vibe?: string | null;
  /** Preselects the organisation running the trip. The server re-checks it. */
  organizationId?: string;
}

export interface AppShellContextValue {
  openCreateTrip: (prefill?: CreateTripPrefill) => void;
  /**
   * Raises the plan popup from anywhere: the top bar, an organisation gate, or a
   * Navia wallet that has just run out. Those are the moments upgrading is worth
   * explaining, and routing away from them loses whatever the person was doing.
   */
  openProDialog: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export const AppShellProvider: React.FC<{ value: AppShellContextValue; children: React.ReactNode }> = ({
  value,
  children,
}) => <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    return {
      openCreateTrip: (prefill) =>
        window.dispatchEvent(new CustomEvent('trip:create', { detail: prefill })),
      openProDialog: () => window.dispatchEvent(new CustomEvent('plan:open')),
    };
  }
  return ctx;
}
