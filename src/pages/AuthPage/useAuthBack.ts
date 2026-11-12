import type React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { safeNext, withNext } from '../../services/APIs/Auth/nextDestination';

type AuthPath = '/signin' | '/signup' | '/forgot-password';

/** The parts of a router location these decisions read. */
export interface AuthLocation {
  key: string;
  search: string;
  state: unknown;
}

/**
 * True when there is no in-app page behind this auth page to step back to: the
 * visitor arrived from outside the site or reloaded, here or on an auth page
 * they hopped from.
 */
function arrivedCold(location: AuthLocation): boolean {
  return location.key === 'default'
    || (location.state as { authCold?: unknown } | null)?.authCold === true;
}

/** The `?next=` this auth page was given, already checked by safeNext. */
function nextOf(location: AuthLocation): string | null {
  return safeNext(new URLSearchParams(location.search).get('next'));
}

/**
 * Where the Back button on /signin, /signup and /forgot-password goes.
 *
 * It used to be a hard `navigate('/')`, so a visitor who tapped Sign Up on
 * /stories, or "Make it yours" on a public trip, and then changed their mind
 * was thrown to the landing page instead of where they had been reading.
 *
 * - Arrived from inside the app: step back, exactly as the browser's Back would.
 *   Hops between the auth pages replace each other (useAuthSwitch), so the
 *   entry behind is always the page they came from.
 * - Arrived cold: go to the `?next=` they were heading for, else the front page,
 *   replacing this entry so the browser's Back does not return to the form.
 */
export function authBackTarget(location: AuthLocation): { pop: true } | { pop: false; to: string } {
  if (!arrivedCold(location)) return { pop: true };
  return { pop: false, to: nextOf(location) ?? '/' };
}

/**
 * Where a hop between the auth pages goes, and the state it carries: `?next=`
 * kept, so wherever the visitor finally signs in they land on the page that sent
 * them (they used to land on the home feed), and whether there is a page behind.
 */
export function authSwitchTarget(
  path: AuthPath,
  location: AuthLocation,
  state?: Record<string, unknown>,
): { to: string; state: Record<string, unknown> | undefined } {
  return {
    to: withNext(path, nextOf(location)),
    state: arrivedCold(location) ? { ...state, authCold: true } : state,
  };
}

export function useAuthBack(): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    const target = authBackTarget(location);
    if (target.pop) navigate(-1);
    else navigate(target.to, { replace: true });
  };
}

/** Moves between /signin, /signup and /forgot-password, replacing the entry so Back skips the hops. */
export function useAuthSwitch(): (path: AuthPath, state?: Record<string, unknown>) => void {
  const navigate = useNavigate();
  const location = useLocation();
  return (path, state) => {
    const target = authSwitchTarget(path, location, state);
    navigate(target.to, { replace: true, state: target.state });
  };
}

/**
 * Props for an <a> that switches auth page: a real href, so it still opens in
 * a new tab, and an in-app switch on a plain click.
 */
export function useAuthSwitchLink(): (path: AuthPath) => {
  href: string;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
} {
  const location = useLocation();
  const switchTo = useAuthSwitch();
  return (path) => ({
    href: authSwitchTarget(path, location).to,
    onClick: (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      switchTo(path);
    },
  });
}
