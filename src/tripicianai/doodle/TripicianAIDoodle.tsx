import React, { useEffect, useId, useRef } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { useReducedMotion } from 'framer-motion';

import { DOODLE } from './doodleStyle';
import { canFollowPointer, watchPointer } from './doodlePointer';

export interface TripicianAIDoodleProps {
  /** The square it is drawn in, in px. The ball fills 80% of it; its glow, the rest. */
  size?: number;
  /** Working on something: the glow swirls round the ball and the eyes glance about. */
  active?: boolean;
  /** Feels alive: blinks now and then, and its eyes follow the mouse pointer. */
  alive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

// Where the eyes look comes from two custom properties the pointer sets on the
// root (-1 to 1 each); without them the eyes rest a little to the right.
const LOOK_X = `var(--doodle-x, ${DOODLE.restingLook})`;
const LOOK_Y = 'var(--doodle-y, 0)';
const EYES_AT = `translate(calc(${LOOK_X} * ${DOODLE.eyesTravel}em), calc(${LOOK_Y} * ${DOODLE.eyesTravelY}em - ${DOODLE.eyesRaise}em))`;
const PUPILS_AT = `translate(calc(${LOOK_X} * ${DOODLE.pupilTravel}em), calc(${LOOK_Y} * ${DOODLE.pupilTravelY}em - ${DOODLE.pupilRaise}em))`;

/** Thinking: look left, hold, look right, hold (the app's timings, 1.94 s a round). */
function glance(travel: number, raise: number) {
  const side = (look: number) => ({ transform: `translate(${+(look * travel).toFixed(4)}em, ${-raise}em)` });
  return {
    '0%, 74.2%, 100%': side(0.8),
    '21.6%, 47.4%': side(-0.8),
  };
}

const MOVE = 'transform 240ms ease-out';

// The doodle's size is its font size, so every length below is a fraction of it (em).
function doodleSx(active: boolean): SxProps<Theme> {
  return {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    lineHeight: 0,
    verticalAlign: 'middle',
    pointerEvents: 'none',
    '& .doodle-layer': { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' },
    '& .doodle-glow': { animation: active ? 'tripicianDoodleSwirl 2.6s linear infinite' : 'none' },
    '& .doodle-eyes': {
      position: 'relative',
      display: 'flex',
      transform: EYES_AT,
      transition: MOVE,
      animation: active ? 'tripicianDoodleGlance 1.94s ease-in-out infinite' : 'none',
    },
    '& .doodle-lids': { display: 'flex', alignItems: 'center', gap: `${DOODLE.eyeGap}em` },
    '& .doodle-eye': {
      width: `${DOODLE.eyeWidth}em`,
      height: `${DOODLE.eyeHeight}em`,
      borderRadius: `${Math.min(DOODLE.eyeWidth, DOODLE.eyeHeight) / 2}em`,
      bgcolor: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    '& .doodle-pupil': {
      width: `${DOODLE.pupil}em`,
      height: `${DOODLE.pupil}em`,
      flexShrink: 0,
      borderRadius: '50%',
      bgcolor: DOODLE.ball,
      transform: PUPILS_AT,
      transition: MOVE,
      animation: active ? 'tripicianDoodlePupils 1.94s ease-in-out infinite' : 'none',
    },
    '@keyframes tripicianDoodleSwirl': { to: { transform: 'rotate(360deg)' } },
    '@keyframes tripicianDoodleGlance': glance(DOODLE.eyesTravel, DOODLE.eyesRaise),
    '@keyframes tripicianDoodlePupils': glance(DOODLE.pupilTravel, DOODLE.pupilRaise),
    '@media (prefers-reduced-motion: reduce)': {
      '& .doodle-glow, & .doodle-eyes, & .doodle-pupil': { animation: 'none', transition: 'none' },
    },
  };
}

const STILL_SX = doodleSx(false);
const ACTIVE_SX = doodleSx(true);

/**
 * Tripician Intelligence's face: a black ball with a glowing rim (violet on
 * the left, pink through the middle, orange to yellow on the right) and two
 * white eyes with black pupils. The owner's sketch, 2026-11-23, drawn the same
 * way as the app's `TripicianAIDoodle`, in place of the red glass ring.
 *
 * Everywhere the assistant shows itself uses this one component, from a 13px
 * badge to the 40px welcome. Inline SVG and a few spans, no image to load.
 * Motion is CSS (the swirl and glance) plus the Web Animations API (blinks), and
 * all of it stops for people who ask for reduced motion.
 */
const TripicianAIDoodle: React.FC<TripicianAIDoodleProps> = ({
  size = 28,
  active = false,
  alive = false,
  style,
  className,
}) => {
  const reduced = useReducedMotion();
  // SVG ids must be unique on the page: several doodles can share a screen.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glowId = `doodle-glow-${uid}`;
  const fadeId = `doodle-fade-${uid}`;
  const maskId = `doodle-mask-${uid}`;

  const rootRef = useRef<HTMLSpanElement>(null);
  const lidsRef = useRef<HTMLSpanElement>(null);

  // A blink every few seconds, at random.
  useEffect(() => {
    const lids = lidsRef.current;
    if (!alive || reduced || !lids || typeof lids.animate !== 'function') return undefined;
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(() => {
        lids.animate(
          [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.08)', offset: 0.39 }, { transform: 'scaleY(1)' }],
          { duration: 180, easing: 'ease-in-out' },
        );
        next();
      }, 2800 + Math.random() * 3600);
    };
    next();
    return () => window.clearTimeout(timer);
  }, [alive, reduced]);

  // The eyes follow the mouse; while it thinks, the glance takes over.
  useEffect(() => {
    const root = rootRef.current;
    if (!alive || active || reduced || !root || !canFollowPointer()) return undefined;
    const rest = () => {
      root.style.removeProperty('--doodle-x');
      root.style.removeProperty('--doodle-y');
    };
    const stop = watchPointer(root, (look) => {
      if (!look) return rest();
      root.style.setProperty('--doodle-x', look.x.toFixed(3));
      root.style.setProperty('--doodle-y', look.y.toFixed(3));
    });
    return () => {
      stop();
      rest();
    };
  }, [alive, active, reduced]);

  return (
    <Box
      component="span"
      ref={rootRef}
      aria-hidden="true"
      className={className}
      sx={active ? ACTIVE_SX : STILL_SX}
      style={{ width: size, height: size, fontSize: size, ...style }}
    >
      <svg className="doodle-layer" viewBox="0 0 100 100" focusable="false">
        <circle cx="50" cy="50" r={DOODLE.ballRadius} fill={DOODLE.ball} />
      </svg>

      <span className="doodle-layer doodle-glow">
        <svg className="doodle-layer" viewBox="0 0 100 100" focusable="false">
          <defs>
            <linearGradient id={glowId} x1="0" y1="0.3" x2="1" y2="0.7">
              {DOODLE.glow.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
            {/* White where the glow shows: brightest at the ball's edge, fading inwards and outwards. */}
            <radialGradient id={fadeId} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              {DOODLE.rim.map(([offset, shade]) => (
                <stop key={offset} offset={offset} stopColor={shade} />
              ))}
            </radialGradient>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <rect x="0" y="0" width="100" height="100" fill={`url(#${fadeId})`} />
            </mask>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${glowId})`} mask={`url(#${maskId})`} />
        </svg>
      </span>

      <span className="doodle-eyes">
        <span className="doodle-lids" ref={lidsRef}>
          <span className="doodle-eye"><span className="doodle-pupil" /></span>
          <span className="doodle-eye"><span className="doodle-pupil" /></span>
        </span>
      </span>
    </Box>
  );
};

export default TripicianAIDoodle;
