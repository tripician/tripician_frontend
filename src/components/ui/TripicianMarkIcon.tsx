import React from 'react';
import { Box } from '@mui/material';
import { IconHome } from '@tabler/icons-react';

interface TripicianMarkIconProps {
  size?: number;
  /** Accepted for icon-slot compatibility (Tabler icon props). Stroke does not apply to a solid mark. */
  stroke?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Icon-slot adapter for the Tripician mark, so the wall can wear the logo in the
 * nav the way TripicianAIOrbIcon lets TripicianAI wear the orb.
 *
 * ## It is a glyph, not a picture
 *
 * The mark is a remote raster, so `currentColor` cannot reach it and the first
 * version rendered it as an `<img>`. That put a full-colour coral logo in a row
 * of monochrome outline glyphs, where it read as louder and larger than its
 * neighbours and never picked up the nav's own colour.
 *
 * It is drawn as a MASK instead: the asset supplies the shape through its alpha
 * channel and the box behind it is painted `currentColor`. The result inherits
 * exactly like a Tabler icon does, so it is grey beside Browse and brand-coloured
 * when the wall is the page you are on, without the component knowing which.
 *
 * ## Optically smaller than its slot
 *
 * A solid mark at 20px outweighs a 20px glyph drawn at 1.9 stroke, because one is
 * filled and the other is a line. OPTICAL_SCALE takes the fill back down to the
 * weight of the row rather than the measurement of it.
 */

/** A filled shape needs to be smaller than a stroked one to read as the same size. */
const OPTICAL_SCALE = 0.84;

const TripicianMarkIcon: React.FC<TripicianMarkIconProps> = ({ size = 22, className, style }) => {
  const src = import.meta.env.VITE_TRIPICIAN_LOGO_ICON_URL as string | undefined;

  /*
   * A mask has no load event, so a dead URL would paint nothing and leave a hole
   * where the icon should be. The asset is fetched once here purely to find out
   * whether it resolves; the browser then serves the mask from the same cache
   * entry, so this costs a check rather than a second download.
   */
  const [usable, setUsable] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!src) { setUsable(false); return; }
    let live = true;
    const probe = new Image();
    probe.onload = () => { if (live) setUsable(true); };
    probe.onerror = () => { if (live) setUsable(false); };
    probe.src = src;
    return () => { live = false; };
  }, [src]);

  if (usable === false) {
    return <IconHome size={size} stroke={1.9} className={className} style={style} />;
  }

  const box = Math.round(size * OPTICAL_SCALE);
  const mask = src ? `url("${src}")` : undefined;

  return (
    <Box
      aria-hidden="true"
      className={className}
      style={style}
      sx={{
        width: box,
        height: box,
        display: 'block',
        flexShrink: 0,
        // Nothing until the probe says the asset is real, so a broken URL never
        // paints a block of colour in the shape of the box.
        backgroundColor: usable ? 'currentColor' : 'transparent',
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
};

export default TripicianMarkIcon;
