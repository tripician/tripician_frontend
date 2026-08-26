/**
 * How a set of photos is tiled.
 *
 * Pulled out of the component so it can be tested. The three-photo case was
 * wrong on three separate surfaces at once - each dropped three photos into a
 * two-column grid and ended on an empty cell - which is what happens when the
 * same small decision is made four times by hand.
 *
 * The container carries an aspect ratio rather than a pixel height. That is what
 * lets one component be right at 720px on a question page, at ~400px in a card
 * and inside the composer, without anybody tuning a number per surface.
 */

export interface PhotoLayout {
  columns: string;
  rows: string;
  /** Aspect ratio of the whole block, as a CSS `aspect-ratio` value. */
  ratio: string;
  /** True when the first tile fills the left column across both rows. */
  firstSpansRows: boolean;
}

export function photoLayout(count: number): PhotoLayout | null {
  switch (count) {
    case 0:
      return null;

    case 1:
      return { columns: '1fr', rows: '1fr', ratio: '16 / 10', firstSpansRows: false };

    // Two portrait-ish tiles side by side read better than two letterboxes.
    case 2:
      return { columns: '1fr 1fr', rows: '1fr', ratio: '16 / 9', firstSpansRows: false };

    // One tall on the left, two stacked on the right. The case that was broken.
    case 3:
      return { columns: '2fr 1fr', rows: '1fr 1fr', ratio: '16 / 10', firstSpansRows: true };

    // Four and anything beyond it, which the composer caps at four anyway.
    default:
      return { columns: '1fr 1fr', rows: '1fr 1fr', ratio: '1 / 1', firstSpansRows: false };
  }
}
