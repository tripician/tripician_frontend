import { describe, expect, it } from 'vitest';
import { clampView, coverScale, displayBox, outputSize, panBy, sourceRect, zoomTo } from './imageCrop';

// A landscape photo behind a square frame: zoom 1 shows the middle square of it.
const photo = { width: 2000, height: 1000 };
const square = { width: 300, height: 300 };

describe('image crop', () => {
  it('fills the frame at zoom 1, scaling by whichever side is short', () => {
    expect(coverScale(photo, square)).toBeCloseTo(0.3);
    expect(displayBox({ zoom: 1, x: 0, y: 0 }, photo, square)).toEqual({ left: -150, top: 0, width: 600, height: 300 });
  });

  it('keeps the middle of the photo when nothing is moved', () => {
    expect(sourceRect({ zoom: 1, x: 0, y: 0 }, photo, square)).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000 });
  });

  it('never lets the frame show past an edge of the photo', () => {
    // Only 150 px of slack sideways at zoom 1, and none up or down.
    expect(clampView({ zoom: 1, x: 999, y: -999 }, photo, square)).toEqual({ zoom: 1, x: 150, y: 0 });
    // Dragged fully right, the frame shows the photo's left edge.
    expect(sourceRect(panBy({ zoom: 1, x: 0, y: 0 }, 999, 0, photo, square), photo, square).sx).toBe(0);
  });

  it('holds zoom between 1 and 4', () => {
    expect(clampView({ zoom: 0.2, x: 0, y: 0 }, photo, square).zoom).toBe(1);
    expect(clampView({ zoom: 9, x: 0, y: 0 }, photo, square).zoom).toBe(4);
    expect(clampView({ zoom: Number.NaN, x: 0, y: 0 }, photo, square).zoom).toBe(1);
  });

  it('zooms about the middle of the frame', () => {
    const zoomed = zoomTo({ zoom: 1, x: 100, y: 0 }, 2, photo, square);
    expect(zoomed).toEqual({ zoom: 2, x: 200, y: 0 });
    // Twice the zoom keeps half as much of the photo, around the same point.
    expect(sourceRect(zoomed, photo, square).sw).toBeCloseTo(500);
  });

  it('uploads at the target size, but never enlarges a small selection', () => {
    expect(outputSize({ sx: 0, sy: 0, sw: 1000, sh: 1000 }, 1, 512)).toEqual({ width: 512, height: 512 });
    expect(outputSize({ sx: 0, sy: 0, sw: 300, sh: 300 }, 1, 512)).toEqual({ width: 300, height: 300 });
    expect(outputSize({ sx: 0, sy: 0, sw: 3000, sh: 1000 }, 3, 1500)).toEqual({ width: 1500, height: 500 });
  });

  it('crops a cover to 3:1 from a tall photo', () => {
    const tall = { width: 1200, height: 1600 };
    const banner = { width: 600, height: 200 };
    const rect = sourceRect({ zoom: 1, x: 0, y: 0 }, tall, banner);
    expect(rect.sw).toBeCloseTo(1200);
    expect(rect.sh).toBeCloseTo(400);
    expect(rect.sy).toBeCloseTo(600);
  });
});
