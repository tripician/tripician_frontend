// The trip invite link: how a crew brings in friends who are not on Tripician yet.

export function tripInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/join/trip/${encodeURIComponent(token)}`;
}

/** "3 to 6 Oct 2026", "3 Oct 2026", or null when the plan has no dates yet. */
export function inviteDates(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = Date.parse(start ?? '');
  if (Number.isNaN(s)) return null;
  const fmt = (t: number, withYear: boolean) => new Date(t).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC',
  });
  const e = Date.parse(end ?? '');
  if (Number.isNaN(e) || fmt(e, true) === fmt(s, true)) return fmt(s, true);
  const sameYear = new Date(s).getUTCFullYear() === new Date(e).getUTCFullYear();
  return `${fmt(s, !sameYear)} to ${fmt(e, true)}`;
}
