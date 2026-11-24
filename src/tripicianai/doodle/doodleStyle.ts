/**
 * The look of Tripician Intelligence's doodle (`TripicianAIDoodle`), in one
 * place. Same numbers as the app's `doodleStyle.ts`, so the two match. Lengths
 * are fractions of the doodle's size (em, since the doodle sets its font size
 * to its own size) unless they say otherwise.
 */
export const DOODLE = {
  /** The ball, in the 0-100 drawing box: 80% of the doodle, the rest is glow. */
  ballRadius: 40,
  ball: '#050307',

  /** The rim's colours, left to right: violet, magenta, pink, orange, yellow. */
  glow: [
    ['0', '#5B3DF5'],
    ['0.3', '#B03CF0'],
    ['0.52', '#FF2E8A'],
    ['0.8', '#FF7A1A'],
    ['1', '#FFD23F'],
  ] as ReadonlyArray<readonly [string, string]>,

  /**
   * How strongly the rim shows from the centre (0) to the box edge (1, radius
   * 50): nothing in the middle of the ball, full at its edge (radius 40 = 0.8),
   * a soft glow just past it, gone by the box edge.
   */
  rim: [
    ['0', '#000000'],
    ['0.5', '#000000'],
    ['0.66', '#2E2E2E'],
    ['0.74', '#7A7A7A'],
    ['0.8', '#FFFFFF'],
    ['0.84', '#8C8C8C'],
    ['0.92', '#2A2A2A'],
    ['1', '#000000'],
  ] as ReadonlyArray<readonly [string, string]>,

  eyeWidth: 0.15,
  eyeHeight: 0.17,
  eyeGap: 0.05,
  pupil: 0.085,
  /** How far the pair of eyes moves towards where it looks, at look = ±1. */
  eyesTravel: 0.1,
  /** The same, up and down (web only: the eyes follow the pointer). */
  eyesTravelY: 0.05,
  /** The eyes sit a little above the middle. */
  eyesRaise: 0.03,
  /** How far the pupils move inside the eyes, at look = ±1. */
  pupilTravel: 0.022,
  pupilTravelY: 0.018,
  pupilRaise: 0.018,
  /** Where the eyes look when nothing moves them: a little to the right, as in the sketch. */
  restingLook: 0.45,
  /** How far away (px) the pointer has to be for the eyes to look all the way to one side. */
  reachPx: 180,
} as const;
