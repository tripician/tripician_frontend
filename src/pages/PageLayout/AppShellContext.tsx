import React, { createContext, useContext } from 'react';

export interface AppShellContextValue {
  openCreateTrip: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export const AppShellProvider: React.FC<{ value: AppShellContextValue; children: React.ReactNode }> = ({
  value,
  children,
}) => <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    return { openCreateTrip: () => window.dispatchEvent(new CustomEvent('trip:create')) };
  }
  return ctx;
}
