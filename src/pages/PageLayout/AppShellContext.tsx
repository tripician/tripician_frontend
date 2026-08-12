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
}

export interface AppShellContextValue {
  openCreateTrip: (prefill?: CreateTripPrefill) => void;
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
    };
  }
  return ctx;
}
