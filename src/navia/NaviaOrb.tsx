import React, { useId } from 'react';

interface NaviaOrbProps {
  /** Rendered width/height in px */
  size?: number;
  /** True while Navia is thinking/streaming - animates a pulsing glow + rotating sheen */
  processing?: boolean;
  /** Extra styles on the wrapper (positioning etc.) */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * NaviaOrb - Navia's visual identity: a glossy red ring.
 * Drawn as inline SVG (no image assets): crisp at any size, ~1 KB, and the
 * glow is state-driven instead of a looping GIF. Keyframes live in index.css
 * (`navia-orb-pulse`, `navia-orb-spin`).
 */
const NaviaOrb: React.FC<NaviaOrbProps> = ({ size = 28, processing = false, style, className }) => {
  // SVG defs need document-unique ids; several orbs can be on screen at once.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ringId = `navia-ring-${uid}`;
  const sheenId = `navia-sheen-${uid}`;
  const glossId = `navia-gloss-${uid}`;

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        // Idle: soft brand halo. Processing: the pulse keyframes take over.
        filter: processing ? undefined : 'drop-shadow(0 1px 3px rgba(227,16,46,0.35))',
        animation: processing ? 'navia-orb-pulse 1.4s ease-in-out infinite' : undefined,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ display: 'block' }}
      >
        <defs>
          {/* Ring body: bright top-left falling into a deep bottom-right */}
          <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff6b71" />
            <stop offset="0.35" stopColor="#ed1b2f" />
            <stop offset="0.72" stopColor="#93000f" />
            <stop offset="1" stopColor="#c2001d" />
          </linearGradient>
          {/* Top-left specular streak */}
          <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/* Bottom-right glass reflection */}
          <linearGradient id={glossId} x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffd9dc" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ring body */}
        <circle cx="50" cy="50" r="34" fill="none" stroke={`url(#${ringId})`} strokeWidth="17" />
        {/* Inner rim shadow for depth */}
        <circle cx="50" cy="50" r="26" fill="none" stroke="rgba(60,0,6,0.55)" strokeWidth="2.5" />

        {/* Sheen group - slowly rotates while processing so the orb feels alive */}
        <g
          style={{
            transformOrigin: '50px 50px',
            animation: processing ? 'navia-orb-spin 2.6s linear infinite' : undefined,
          }}
        >
          {/* Main highlight streak (top-left) */}
          <circle
            cx="50" cy="50" r="38.5"
            fill="none"
            stroke={`url(#${sheenId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="72 170"
            transform="rotate(-165 50 50)"
          />
          {/* Secondary glass reflection (bottom-right) */}
          <circle
            cx="50" cy="50" r="30"
            fill="none"
            stroke={`url(#${glossId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="46 196"
            transform="rotate(30 50 50)"
            opacity="0.8"
          />
        </g>
      </svg>
    </span>
  );
};

export default NaviaOrb;
