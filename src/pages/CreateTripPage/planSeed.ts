import type { PackingCategory } from '../../store/packingSlice';

/**
 * A plan that already exists, handed to the planner to lay out.
 *
 * Two things produce one: the Navia chat ("Create this trip"), which fills only
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
  /** Trip-wide notes, already merged with anything that fitted nowhere else. */
  importantNotes?: string;
  checklist?: { category: string; name: string; qty: number }[];
  budget?: number | null;
  expenses?: { label: string; amount: number; category: string }[];
}

/** Slug that survives a round trip, matching how packingSlice names user categories. */
function categoryId(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || 'packing';
}

/**
 * Turns a flat imported checklist into the planner's packing categories.
 *
 * Everything arrives unchecked. A traveller who wrote "passport" on a list
 * three weeks ago did not tell us whether it is in the bag yet, and starting
 * items ticked would be an answer we invented on their behalf.
 */
export function checklistToPackingCategories(
  items: { category: string; name: string; qty: number }[],
): PackingCategory[] {
  const byCategory = new Map<string, PackingCategory>();

  for (const item of items) {
    const name = item.name?.trim();
    if (!name) continue;
    const label = item.category?.trim() || 'Packing';
    const id = categoryId(label);

    let category = byCategory.get(id);
    if (!category) {
      category = { id, name: label, type: 'individual', items: [] };
      byCategory.set(id, category);
    }

    if (category.items.some((i) => i.name.toLowerCase() === name.toLowerCase())) continue;
    category.items.push({
      id: `${id}-${category.items.length}`,
      name,
      qty: Math.max(1, Math.min(99, Math.round(item.qty) || 1)),
      checked: false,
    });
  }

  return [...byCategory.values()].filter((c) => c.items.length > 0);
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
