import React from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * Inserts Cloudinary's trim (and automatic format/quality) after /upload/.
 *
 * The two hosted logo files carry different blank margins, so drawn at one size the
 * lockup would shift whenever the theme changed. Trimmed, both are the same
 * 1135x261 box. Non-Cloudinary URLs pass through untouched.
 */
function cloudinaryTrimmed(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  return m ? `${m[1]}e_trim/f_auto,q_auto/${m[2]}` : url;
}

// Read statically so Vite inlines them: dark letters for light surfaces, white for dark.
const ON_LIGHT = cloudinaryTrimmed(import.meta.env.VITE_AILOGO_BLACK as string | undefined);
const ON_DARK = cloudinaryTrimmed(import.meta.env.VITE_AILOGO_WHITE as string | undefined);

/** Width over height of the trimmed lockup, so the space is reserved before it loads. */
const ASPECT = 1135 / 261;

interface Props {
  /**
   * Rendered height in px; width follows. 28 for a label, 32 or more for a header, and
   * never under 24, where "Intelligence" stops reading on a standard-density screen.
   * "Intelligence" hangs below the wordmark, so the T is only 63% of this height.
   */
  height?: number;
  /** Force the white-lettered version (over a photo or dark hero), regardless of theme. */
  onDark?: boolean;
  style?: React.CSSProperties;
}

/**
 * TripicianAI's lockup ("TRIPICIAN." with "Intelligence"). Used on its own wherever
 * TripicianAI introduces itself, never beside its written name or the orb.
 */
const TripicianAIWordmark: React.FC<Props> = ({ height = 32, onDark, style }) => {
  const theme = useTheme();
  const src = (onDark ?? theme.palette.mode === 'dark') ? ON_DARK : ON_LIGHT;

  // No logo configured (a fresh checkout without .env): say the name instead of showing nothing.
  if (!src) {
    return (
      <span style={{ fontWeight: 700, fontSize: Math.round(height * 0.6), lineHeight: `${height}px`, ...style }}>
        Tripician Intelligence
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="Tripician Intelligence"
      width={Math.round(height * ASPECT)}
      height={height}
      draggable={false}
      style={{ display: 'block', height, width: Math.round(height * ASPECT), flexShrink: 0, ...style }}
    />
  );
};

export default TripicianAIWordmark;
