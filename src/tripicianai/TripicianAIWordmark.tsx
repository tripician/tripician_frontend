import React from 'react';

// Read statically so Vite inlines it. One file for light and dark: "trip" in the brand
// red running into a gradient "intelligence", both of which read on either ground.
const SRC = import.meta.env.VITE_TRIPICIANAI as string | undefined;

/** Width over height of the lockup (the hosted file is already trimmed), so the space is reserved before it loads. */
const ASPECT = 1287 / 206;

interface Props {
  /**
   * Rendered height in px; width follows (about 6.25x). 22 for a label, 26 to 32 for a
   * header, and never under 18: the lowercase letters are only about 45% of this height.
   */
  height?: number;
  style?: React.CSSProperties;
}

/**
 * Tripician Intelligence's lockup ("trip" + "intelligence" on one line). Used on its own
 * wherever Tripician Intelligence introduces itself, never beside its written name or the orb.
 */
const TripicianAIWordmark: React.FC<Props> = ({ height = 26, style }) => {
  // No logo configured (a fresh checkout without .env): say the name instead of showing nothing.
  if (!SRC) {
    return (
      <span style={{ fontWeight: 700, fontSize: Math.round(height * 0.6), lineHeight: `${height}px`, ...style }}>
        Tripician Intelligence
      </span>
    );
  }

  const width = Math.round(height * ASPECT);
  return (
    <img
      src={SRC}
      alt="Tripician Intelligence"
      width={width}
      height={height}
      draggable={false}
      style={{ display: 'block', height, width, flexShrink: 0, ...style }}
    />
  );
};

export default TripicianAIWordmark;
