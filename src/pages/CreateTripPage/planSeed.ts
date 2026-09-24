/**
 * A plan that already exists, handed to the planner to lay out.
 *
 * Two things produce one: the TripicianAI chat ("Create this trip"), which fills only
 * `stops`, and importing a plan the traveller wrote elsewhere, which fills the
 * rest. The planner treats them identically, so an imported plan gets the same
 * geocoding, the same place verification and the same provenance marks as
 * anything else. Nothing here costs a credit; the reading was already paid for.
 */
export interface PlanSeedSpot {
  name: string;
  description: string;
  /** Only where the plan's own author marked it. Never our inference. */
  mustVisit?: boolean;
}

export interface PlanSeedStay {
  name: string;
  reference: string;
}

export interface PlanSeedStop {
  name: string;
  nights: number;
  notes: string;
  spots: PlanSeedSpot[];
  foods: string[];
  stays?: PlanSeedStay[];
}

export interface PlanSeed {
  stops: PlanSeedStop[];
  /** Trip-wide notes, already merged with anything that fitted nowhere else, including checklist, budget and cost lines. */
  importantNotes?: string;
}

/**
 * Joins the trip-wide notes with the lines that fitted nowhere else.
 *
 * The heading matters. These lines were pulled out of somebody's own writing,
 * and presenting them unlabelled beside notes we structured would blur which is
 * which. Under a heading they read as what they are: the rest of what you wrote.
 */
export function composeImportantNotes(importantNotes: string, unplaced: string[]): string {
  const notes = (importantNotes ?? '').trim();
  const rest = (unplaced ?? []).map((u) => u.trim()).filter(Boolean);
  if (rest.length === 0) return notes;

  const block = ['From your notes:', ...rest.map((r) => `- ${r}`)].join('\n');
  return notes ? `${notes}\n\n${block}` : block;
}

/** Lines for what the planner does not keep separately, so an imported plan loses none of it. */
export function composeImportedExtras(
  checklist: { category?: string; name: string; qty?: number }[] | undefined,
): string[] {
  const items = (checklist ?? [])
    .map((i) => i.name?.trim() ? `${i.name.trim()}${(i.qty ?? 1) > 1 ? ` x${i.qty}` : ''}` : '')
    .filter(Boolean);
  return items.length ? [`To bring: ${items.join(', ')}`] : [];
}
