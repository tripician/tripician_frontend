/**
 * A country flag that renders on every platform.
 *
 * **Windows ships no flag-emoji font.** Chrome on Windows draws a regional
 * indicator pair as its two letters, so a card built on emoji flags showed
 * "MX Mexico" and "ID Indonesia", and a traveller's passport read
 * "JP IN US ES AE" where it should have shown flags. Emoji flags are therefore
 * the FALLBACK here, never the primary.
 *
 * Four tiers, in order:
 *   1. for the circle variant, the vendored circular SVG, same origin and sharp
 *      at any density;
 *   2. a raster image from flagcdn.com, identical everywhere;
 *   3. the emoji, for when both are blocked or offline and the platform has
 *      the font;
 *   4. `IconWorld`, when the name did not resolve to a code at all.
 *
 * Tier 3 is a real case worth designing for rather than an edge: country data
 * on this site is free text and contains cities ("Abu Dhabi") and misspellings.
 * A neutral globe is honest; a pin emoji or the raw string next to real flags is
 * the visual mess this component replaced.
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { IconWorld } from '@tabler/icons-react';
import { countryCodeFromName, flagEmojiFromCode, flagPngUrl, flagSvgUrl } from '../../utils/countryFlags';

interface CountryFlagProps {
  /** Country name, alias, or an alpha-2/alpha-3 code. Resolution is shared. */
  country: string;
  /** Rendered width in px. flagcdn serves 16/20/24/32 well; height follows 3:4. */
  size?: number;
  /**
   * Wrap in a tooltip naming the country. Off where the name is already beside
   * the flag, on where the flag stands alone.
   */
  showTooltip?: boolean;
  /**
   * 'rect' is the true 3:4 flag, for anywhere it sits in a line of text.
   * 'circle' draws the vendored circular flag, for the token stacks on a trip
   * card cover where it has to read as one of a row of round chips beside the
   * crew's faces.
   */
  variant?: 'rect' | 'circle';
}

const CountryFlag: React.FC<CountryFlagProps> = ({
  country,
  size = 20,
  showTooltip = false,
  variant = 'rect',
}) => {
  const circle = variant === 'circle';

  /*
   * Which source is being tried, not merely whether one failed.
   *
   * A boolean could only say "fall all the way to emoji", so a missing circular
   * SVG would have skipped the raster that has always worked. Each stage steps
   * to the next on error instead.
   */
  const [stage, setStage] = React.useState<'svg' | 'png' | 'emoji'>(circle ? 'svg' : 'png');

  const code = countryCodeFromName(country);
  const src = stage === 'svg'
    ? flagSvgUrl(code)
    : stage === 'png'
      ? flagPngUrl(code, size)
      : undefined;
  const emoji = code ? flagEmojiFromCode(code) : '';
  const height = circle ? size : Math.round(size * 0.75);

  // Reset on a country change, or a card recycled in a list keeps the previous
  // country's failure and silently drops to the fallback forever.
  React.useEffect(() => setStage(circle ? 'svg' : 'png'), [country, circle]);

  const flag = src ? (
    <Box
      component="img"
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setStage((s) => (s === 'svg' ? 'png' : 'emoji'))}
      // Explicit box so a slow or failed image cannot reflow the row around it.
      sx={{
        width: size,
        height,
        flexShrink: 0,
        borderRadius: circle ? '50%' : '2px',
        // The circular SVG is already a disc, so cropping it would only shave
        // its edge. Only the raster fallback needs covering.
        objectFit: stage === 'svg' ? 'contain' : 'cover',
        display: 'block',
      }}
    />
  ) : (
    <Box
      component="span"
      sx={{
        width: size,
        height,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        color: 'text.disabled',
        fontSize: `${Math.round(size * 0.85)}px`,
        ...(circle ? { borderRadius: '50%', bgcolor: 'background.paper' } : null),
      }}
    >
      {emoji || <IconWorld size={Math.round(size * 0.8)} stroke={1.7} />}
    </Box>
  );

  const labelled = (
    <Box
      component="span"
      aria-label={country}
      role="img"
      sx={{ display: 'inline-flex', flexShrink: 0 }}
    >
      {flag}
    </Box>
  );

  return showTooltip ? (
    <Tooltip title={country} arrow placement="top">
      {labelled}
    </Tooltip>
  ) : (
    labelled
  );
};

export default CountryFlag;
