import React, { useId } from 'react';

interface TripicianAIOrbProps {
  /** Rendered width/height in px */
  size?: number;
  /** Extra styles on the wrapper (positioning etc.) */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * TripicianAIOrb - TripicianAI's visual identity: a glossy red ring.
 * Drawn as inline SVG (no image assets): crisp at any size, ~1 KB.
 */
// Deliberately still: the orb never animates, busy state is shown by the surface around it.
const TripicianAIOrb: React.FC<TripicianAIOrbProps> = ({ size = 28, style, className }) => {
  // SVG defs need document-unique ids; several orbs can be on screen at once.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ringId = `tripicianai-ring-${uid}`;
  const sheenId = `tripicianai-sheen-${uid}`;
  const glossId = `tripicianai-gloss-${uid}`;

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
        filter: 'drop-shadow(0 1px 3px rgba(227,16,46,0.35))',
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
      </svg>
    </span>
  );
};

export default TripicianAIOrb;
