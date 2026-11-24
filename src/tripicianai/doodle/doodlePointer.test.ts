import { describe, expect, it } from 'vitest';

import { lookTowards } from './doodlePointer';

describe('lookTowards', () => {
  it('looks straight ahead when the pointer is on the doodle', () => {
    expect(lookTowards(0, 0)).toEqual({ x: 0, y: 0 });
    expect(lookTowards(0.4, -0.3)).toEqual({ x: 0, y: 0 });
  });

  it('looks all the way to a side once the pointer is a reach away', () => {
    expect(lookTowards(400, 0, 180)).toEqual({ x: 1, y: 0 });
    expect(lookTowards(-180, 0, 180)).toEqual({ x: -1, y: 0 });
    expect(lookTowards(0, 900, 180)).toEqual({ x: 0, y: 1 });
  });

  it('looks part of the way when the pointer is close', () => {
    const look = lookTowards(90, 0, 180);
    expect(look.x).toBeCloseTo(0.5);
    expect(look.y).toBe(0);
  });

  it('keeps the direction on a diagonal and never goes past 1', () => {
    const look = lookTowards(300, -300, 180);
    expect(Math.hypot(look.x, look.y)).toBeCloseTo(1);
    expect(look.x).toBeCloseTo(Math.SQRT1_2);
    expect(look.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it('rests for nonsense input', () => {
    expect(lookTowards(Number.NaN, 10)).toEqual({ x: 0, y: 0 });
    expect(lookTowards(50, 50, 0)).toEqual({ x: 0, y: 0 });
  });
});
