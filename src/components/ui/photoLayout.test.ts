import { describe, it, expect } from 'vitest';
import { photoLayout } from './photoLayout';

/**
 * The three-photo case is why this is tested. It was wrong on PostCard,
 * AnswerCard and PostPage simultaneously - all three put three photos in a
 * two-column grid and ended on an empty cell.
 */

describe('photoLayout', () => {
  it('renders nothing for no photos', () => {
    // A bordered, rounded, empty box is worse than no box.
    expect(photoLayout(0)).toBeNull();
  });

  it('gives one photo the full width', () => {
    expect(photoLayout(1)).toMatchObject({ columns: '1fr', rows: '1fr', firstSpansRows: false });
  });

  it('puts two side by side', () => {
    expect(photoLayout(2)).toMatchObject({ columns: '1fr 1fr', rows: '1fr', firstSpansRows: false });
  });

  it('gives three a tall first tile and two stacked, with no empty cell', () => {
    const layout = photoLayout(3)!;
    expect(layout.columns).toBe('2fr 1fr');
    expect(layout.rows).toBe('1fr 1fr');
    // Without this the third cell is a hole, which is the bug being fixed.
    expect(layout.firstSpansRows).toBe(true);
  });

  it('gives four an even grid', () => {
    expect(photoLayout(4)).toMatchObject({ columns: '1fr 1fr', rows: '1fr 1fr', firstSpansRows: false });
  });

  it('treats more than four like four, since the composer caps there', () => {
    expect(photoLayout(7)).toEqual(photoLayout(4));
  });

  it('always fills every cell it declares', () => {
    // columns x rows must never exceed the photo count, or the block ends on a gap.
    for (const count of [1, 2, 3, 4]) {
      const layout = photoLayout(count)!;
      const cells = layout.columns.split(' ').length * layout.rows.split(' ').length;
      const filled = layout.firstSpansRows ? count + 1 : count;
      expect(filled, `${count} photos leaves a hole`).toBe(cells);
    }
  });

  it('carries a ratio for every layout, so nothing collapses before images load', () => {
    for (const count of [1, 2, 3, 4]) {
      expect(photoLayout(count)!.ratio).toMatch(/^\d+ \/ \d+$/);
    }
  });
});
