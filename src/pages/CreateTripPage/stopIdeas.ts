import type { PlannerDestination } from '../../store/plannerSlice';

/** A stop nobody has put anything into yet. TripicianAI fills only these, so it never writes over what someone added. */
export function isEmptyStop(d: Pick<PlannerDestination, 'notes' | 'spots' | 'foods'>): boolean {
  return !(d.notes || '').trim() && (d.spots?.length ?? 0) === 0 && (d.foods?.length ?? 0) === 0;
}

interface Named { name: string; placeId?: string | null }

/** The suggestions not already on the stop, matched by place id or by name, and without repeats among themselves. */
export function ideasToAdd<T extends Named>(existing: Named[], suggested: T[]): T[] {
  const names = new Set(existing.map((e) => e.name.trim().toLowerCase()));
  const ids = new Set(existing.map((e) => e.placeId).filter((id): id is string => !!id));
  const out: T[] = [];
  for (const s of suggested) {
    const key = s.name?.trim().toLowerCase();
    if (!key || names.has(key) || (s.placeId && ids.has(s.placeId))) continue;
    names.add(key);
    if (s.placeId) ids.add(s.placeId);
    out.push(s);
  }
  return out;
}
