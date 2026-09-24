// Where each tile of the Search grid sits: 3 columns of square cells, filled by a repeating set of shapes so there is never a hole.

export type TileShape = 'feature' | 'tall' | 'wide' | 'banner' | 'square';

export interface TilePlacement {
  /** 1-based CSS grid lines. */
  col: number;
  row: number;
  /** Columns and rows spanned. */
  w: 1 | 2 | 3;
  h: 1 | 2;
  shape: TileShape;
}

interface Block { rows: number; slots: TilePlacement[] }

const slot = (col: number, row: number, w: 1 | 2 | 3, h: 1 | 2, shape: TileShape): TilePlacement => ({ col, row, w, h, shape });

// Four blocks that repeat: a feature with a wide, a tall with a wide, then their mirrors. Each fills its rows exactly.
export const BLOCKS: Block[] = [
  { rows: 3, slots: [slot(1, 1, 2, 2, 'feature'), slot(3, 1, 1, 1, 'square'), slot(3, 2, 1, 1, 'square'), slot(1, 3, 2, 1, 'wide'), slot(3, 3, 1, 1, 'square')] },
  { rows: 2, slots: [slot(1, 1, 1, 2, 'tall'), slot(2, 1, 1, 1, 'square'), slot(3, 1, 1, 1, 'square'), slot(2, 2, 2, 1, 'wide')] },
  { rows: 3, slots: [slot(2, 1, 2, 2, 'feature'), slot(1, 1, 1, 1, 'square'), slot(1, 2, 1, 1, 'square'), slot(1, 3, 1, 1, 'square'), slot(2, 3, 2, 1, 'wide')] },
  { rows: 2, slots: [slot(1, 1, 2, 1, 'wide'), slot(3, 1, 1, 2, 'tall'), slot(1, 2, 1, 1, 'square'), slot(2, 2, 1, 1, 'square')] },
];

// The last few tiles, when there is nothing more to load. Each fills whole rows.
const TAILS: Record<number, Block> = {
  1: { rows: 1, slots: [slot(1, 1, 3, 1, 'banner')] },
  2: { rows: 1, slots: [slot(1, 1, 2, 1, 'wide'), slot(3, 1, 1, 1, 'square')] },
  3: { rows: 1, slots: [slot(1, 1, 1, 1, 'square'), slot(2, 1, 1, 1, 'square'), slot(3, 1, 1, 1, 'square')] },
  4: BLOCKS[1],
};

/** Which kinds suit a shape best, in order. Story covers are portrait, plan banners are landscape. */
const PREFERENCE: Record<TileShape, string[]> = {
  feature: ['story', 'post', 'plan'],
  tall: ['story', 'post', 'plan'],
  wide: ['plan', 'post', 'story'],
  banner: ['plan', 'post', 'story'],
  square: [],
};

// Shaped slots choose first; squares take what is left, in feed order.
const PICK_ORDER: TileShape[] = ['feature', 'tall', 'banner', 'wide', 'square'];

export interface Arranged<T> { item: T; placement: TilePlacement }

/**
 * Lays tiles into the mosaic, in reading order. Tiles only move within their own block, so the feed stays newest first.
 * While more can load, only whole blocks show, so nothing already on screen moves when the next page arrives.
 */
export function arrangeExplore<T>(items: T[], kindOf: (item: T) => string, hasMore: boolean): Arranged<T>[] {
  const out: Arranged<T>[] = [];
  let i = 0;
  let row = 1;
  let b = 0;
  while (i < items.length) {
    const left = items.length - i;
    const full = BLOCKS[b % BLOCKS.length];
    let block: Block;
    if (left >= full.slots.length) block = full;
    else if (!hasMore) block = TAILS[left];
    else break;

    const window = items.slice(i, i + block.slots.length);
    const taken = new Set<number>();
    const assigned = new Map<TilePlacement, T>();
    const byPriority = [...block.slots].sort((a, z) => PICK_ORDER.indexOf(a.shape) - PICK_ORDER.indexOf(z.shape));
    for (const s of byPriority) {
      let pick = -1;
      for (const kind of PREFERENCE[s.shape]) {
        pick = window.findIndex((it, k) => !taken.has(k) && kindOf(it) === kind);
        if (pick >= 0) break;
      }
      if (pick < 0) pick = window.findIndex((_, k) => !taken.has(k));
      taken.add(pick);
      assigned.set(s, window[pick]);
    }

    const reading = [...block.slots].sort((a, z) => a.row - z.row || a.col - z.col);
    for (const s of reading) out.push({ item: assigned.get(s)!, placement: { ...s, row: s.row + row - 1 } });

    i += block.slots.length;
    row += block.rows;
    b += 1;
  }
  return out;
}
