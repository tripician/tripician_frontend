import { describe, it, expect } from 'vitest';
import { greatCircle, isUsableCoord, routeBounds, sliceLine, type LngLat } from './geo';

describe('isUsableCoord', () => {
  it('accepts ordinary coordinates', () => {
    expect(isUsableCoord(24.2075, 55.7447)).toBe(true);   // Al Ain
    expect(isUsableCoord(-33.8688, 151.2093)).toBe(true); // Sydney
    expect(isUsableCoord(0, 12)).toBe(true);              // on the equator, but not Null Island
    expect(isUsableCoord(12, 0)).toBe(true);              // on the prime meridian
  });

  it('rejects Null Island, which is how a failed geocode is stored', () => {
    expect(isUsableCoord(0, 0)).toBe(false);
  });

  it('rejects missing, non-numeric and non-finite values', () => {
    expect(isUsableCoord(undefined, undefined)).toBe(false);
    expect(isUsableCoord(null, null)).toBe(false);
    expect(isUsableCoord(24, undefined)).toBe(false);
    expect(isUsableCoord(NaN, 55)).toBe(false);
    expect(isUsableCoord(24, Infinity)).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(isUsableCoord(91, 0)).toBe(false);
    expect(isUsableCoord(-91, 0)).toBe(false);
    expect(isUsableCoord(0, 181)).toBe(false);
    expect(isUsableCoord(0, -181)).toBe(false);
  });
});

describe('greatCircle', () => {
  const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

  it('starts at a and ends at b', () => {
    const a = { lat: 25.2048, lng: 55.2708 };  // Dubai
    const b = { lat: 35.6762, lng: 139.6503 }; // Tokyo
    const line = greatCircle(a, b, 32);

    expect(line.length).toBe(33);
    expect(near(line[0][0], a.lng)).toBe(true);
    expect(near(line[0][1], a.lat)).toBe(true);
    expect(near(line[line.length - 1][0], b.lng)).toBe(true);
    expect(near(line[line.length - 1][1], b.lat)).toBe(true);
  });

  it('bows away from the straight line (it is an arc, not a chord)', () => {
    // A long east-west path at mid latitude should bow poleward: its midpoint
    // latitude sits north of the average of the endpoints.
    const a = { lat: 25.2048, lng: 55.2708 };
    const b = { lat: 35.6762, lng: 139.6503 };
    const line = greatCircle(a, b, 64);
    const mid = line[Math.floor(line.length / 2)];
    const straightMidLat = (a.lat + b.lat) / 2;

    expect(mid[1]).toBeGreaterThan(straightMidLat);
  });

  it('crosses the antimeridian without wrapping back across the map', () => {
    const a = { lat: 35.6762, lng: 139.6503 };   // Tokyo
    const b = { lat: 37.7749, lng: -122.4194 };  // San Francisco
    const line = greatCircle(a, b, 64);

    // No single step may jump more than half the world - that jump is exactly
    // the artefact where the line shoots the wrong way round the globe.
    for (let i = 1; i < line.length; i++) {
      expect(Math.abs(line[i][0] - line[i - 1][0])).toBeLessThan(180);
    }
    // Unwrapping means longitudes are allowed to run past 180 rather than snap.
    expect(Math.max(...line.map((p) => p[0]))).toBeGreaterThan(180);
  });

  it('handles coincident points without dividing by zero', () => {
    const p = { lat: 10, lng: 20 };
    const line = greatCircle(p, p, 16);
    expect(line.every(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))).toBe(true);
  });

  it('handles antipodal points without producing NaN', () => {
    // sin(angular distance) -> 0 here, and the interpolation divides by it.
    // NaN coordinates make the entire layer render blank with no error.
    const line = greatCircle({ lat: 10, lng: 20 }, { lat: -10, lng: -160 }, 16);
    expect(line.every(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))).toBe(true);
  });
});

describe('routeBounds', () => {
  it('wraps the short way across the Pacific rather than the long way round', () => {
    // Tokyo and Los Angeles. Naive min/max gives a 258-degree span across Europe;
    // the true gap is about 102 degrees across the Pacific.
    const b = routeBounds([[139.6503, 35.6762], [-118.2437, 34.0522]])!;
    const span = b[2] - b[0];
    expect(span).toBeLessThan(120);
    expect(span).toBeGreaterThan(90);
  });

  it('keeps an ordinary regional trip unwrapped', () => {
    // Al Ain, Al-Kharj, Muscat - all within the Gulf.
    const b = routeBounds([[55.7447, 24.2075], [47.3346, 24.1483], [58.5922, 23.5859]])!;
    expect(b[0]).toBeCloseTo(47.3346, 3);
    expect(b[2]).toBeCloseTo(58.5922, 3);
    expect(b[1]).toBeCloseTo(23.5859, 3);
    expect(b[3]).toBeCloseTo(24.2075, 3);
  });

  it('returns null for no coordinates and a degenerate box for one', () => {
    expect(routeBounds([])).toBeNull();
    const b = routeBounds([[10, 20]])!;
    expect(b).toEqual([10, 20, 10, 20]);
  });
});

describe('sliceLine', () => {
  const line: LngLat[] = [[0, 0], [10, 0], [20, 0], [30, 0]];

  it('returns the whole line at 1 and beyond', () => {
    expect(sliceLine(line, 1)).toEqual(line);
    expect(sliceLine(line, 1.5)).toEqual(line);
  });

  it('returns just the origin at or below 0', () => {
    expect(sliceLine(line, 0)).toEqual([[0, 0]]);
    expect(sliceLine(line, -1)).toEqual([[0, 0]]);
  });

  it('cuts partway through a segment rather than snapping to a vertex', () => {
    const half = sliceLine(line, 0.5);
    expect(half[half.length - 1]).toEqual([15, 0]);
  });

  it('leaves degenerate input alone', () => {
    expect(sliceLine([[1, 1]], 0.5)).toEqual([[1, 1]]);
    expect(sliceLine([[1, 1], [1, 1]], 0.5)).toEqual([[1, 1], [1, 1]]);
  });
});
