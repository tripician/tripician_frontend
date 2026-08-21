/**
 * A country flag that renders on every platform.
 *
 * **Windows ships no flag-emoji font.** Chrome on Windows draws a regional
 * indicator pair as its two letters, so a card built on emoji flags showed
 * "MX Mexico" and "ID Indonesia", and a traveller's passport read
 * "JP IN US ES AE" where it should have shown flags. Emoji flags are therefore
 * the FALLBACK here, never the primary.
 *
 * Three tiers, in order:
 *   1. a raster image from flagcdn.com, identical everywhere;
 *   2. the emoji, for when the CDN is blocked or offline and the platform has
 *      the font;
 *   3. `IconWorld`, when the name did not resolve to a code at all.
 *
 * Tier 3 is a real case worth designing for rather than an edge: country data
 * on this site is free text and contains cities ("Abu Dhabi") and misspellings.
 * A neutral globe is honest; a pin emoji or the raw string next to real flags is
 * the visual mess this component replaced.
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { IconWorld } from '@tabler/icons-react';
import { countryCodeFromName, flagEmojiFromCode, flagPngUrl } from '../../utils/countryFlags';

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
   * 'circle' crops it square, for the token stacks on a trip card cover where it
   * has to read as one of a row of round chips beside the crew's faces.
   */
  variant?: 'rect' | 'circle';
}

const CountryFlag: React.FC<CountryFlagProps> = ({
  country,
  size = 20,
  showTooltip = false,
  variant = 'rect',
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  const code = countryCodeFromName(country);
  // A circular crop throws away the left and right thirds, so it needs a wider
  // source than its rendered width or vertically-striped flags turn to mush.
  const png = imageFailed ? undefined : flagPngUrl(code, variant === 'circle' ? size * 2 : size);
  const emoji = code ? flagEmojiFromCode(code) : '';
  const circle = variant === 'circle';
  const height = circle ? size : Math.round(size * 0.75);

  // Reset on a country change, or a card recycled in a list keeps the previous
  // country's failure and silently drops to the fallback forever.
  React.useEffect(() => setImageFailed(false), [country]);

  const flag = png ? (
    <Box
      component="img"
      src={png}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
      // Explicit box so a slow or failed image cannot reflow the row around it.
      sx={{
        width: size,
        height,
        flexShrink: 0,
        borderRadius: circle ? '50%' : '2px',
        objectFit: 'cover',
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
