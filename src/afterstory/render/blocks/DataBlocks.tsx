/**
 * Structured blocks: place, list, map, cost.
 *
 * These are what make a story useful to the next traveller rather than only
 * pleasant to read, and they are the part search engines and AI assistants can
 * actually resolve into entities. The place block in particular carries coords
 * and a Google Maps link, so a reader can act on it without leaving the page to
 * search a name they cannot spell.
 */

import React from 'react';
import { Box, Chip, Typography, useTheme, alpha } from '@mui/material';
import {
  IconMapPin,
  IconExternalLink,
  IconHeartFilled,
  IconThumbUp,
  IconArrowRampRight,
  IconToolsKitchen2,
  IconBulb,
  IconPoint,
} from '@tabler/icons-react';
import { safeExternalUrl } from '../../../utils/sanitizeHtml';
import { staticMapUrl } from '../../../utils/staticMap';
import type { StoryTemplateStyle } from '../templates';
import type { StoryBlock } from '../../types';

interface BlockProps<T extends StoryBlock> {
  block: T;
  style: StoryTemplateStyle;
}

const VERDICT = {
  loved: { label: 'Loved it', Icon: IconHeartFilled },
  liked: { label: 'Worth it', Icon: IconThumbUp },
  skip: { label: 'Would skip', Icon: IconArrowRampRight },
} as const;

export const StoryPlaceBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'place' }>>> = ({ block, style }) => {
  const theme = useTheme();

  const mapsHref =
    safeExternalUrl(block.mapsHref) ??
    (block.lat != null && block.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${block.lat},${block.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(block.name)}`);

  const photo = safeExternalUrl(block.photoUrl);
  const verdict = block.verdict ? VERDICT[block.verdict] : null;

  return (
    <Box
      sx={{
        maxWidth: `${style.measure + 8}ch`,
        display: 'grid',
        gridTemplateColumns: photo ? { xs: '1fr', sm: '132px 1fr' } : '1fr',
        gap: 2,
        p: 2,
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
      }}
    >
      {photo && (
        <Box
          component="img"
          src={photo}
          alt=""
          aria-hidden
          loading="lazy"
          sx={{
            width: '100%',
            height: { xs: 160, sm: 116 },
            objectFit: 'cover',
            borderRadius: '10px',
          }}
        />
      )}

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
          <IconMapPin size={16} style={{ color: theme.palette.primary.main, flexShrink: 0 }} />
          <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
            {block.name}
          </Typography>
          {verdict && (
            <Chip
              size="small"
              icon={<verdict.Icon size={13} />}
              label={verdict.label}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                // Chips are labels here, not controls. Flat, no shadow.
                bgcolor:
                  block.verdict === 'skip'
                    ? alpha(theme.palette.text.primary, 0.06)
                    : theme.custom.surface.brandTint,
                color: block.verdict === 'skip' ? 'text.secondary' : 'primary.main',
                '& .MuiChip-icon': { color: 'inherit', marginLeft: '6px' },
              }}
            />
          )}
        </Box>

        {block.note && (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {block.note}
          </Typography>
        )}

        <Box
          component="a"
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            mt: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: 13,
            fontWeight: 600,
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
            '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
          }}
        >
          Open in Maps
          <IconExternalLink size={13} />
        </Box>
      </Box>
    </Box>
  );
};

const LIST_STYLE = {
  musttry: { Icon: IconToolsKitchen2, fallbackTitle: 'Must try' },
  tips: { Icon: IconBulb, fallbackTitle: 'Worth knowing' },
  plain: { Icon: IconPoint, fallbackTitle: '' },
} as const;

export const StoryListBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'list' }>>> = ({ block, style }) => {
  const theme = useTheme();
  const config = LIST_STYLE[block.style];
  const items = block.items.filter((i) => i.trim().length > 0);
  if (items.length === 0) return null;

  const title = block.title ?? config.fallbackTitle;

  return (
    <Box
      sx={{
        maxWidth: `${style.measure}ch`,
        p: 2.25,
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        // One tonal step toward the brand, so a list reads as a pull-out without
        // becoming a different material from the page around it.
        backgroundImage: block.style === 'plain' ? 'none' : theme.custom.gradients.brandSubtle,
        bgcolor: 'background.paper',
      }}
    >
      {title && (
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}
        >
          <config.Icon size={14} />
          {title}
        </Typography>
      )}

      <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'grid', gap: 0.875 }}>
        {items.map((item, index) => (
          <Box
            key={`${item}-${index}`}
            component="li"
            sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline', color: 'text.primary' }}
          >
            <Box
              aria-hidden
              sx={{
                flex: '0 0 auto',
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                transform: 'translateY(-2px)',
              }}
            />
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              {item}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * The route as one flat image plus the stops in order.
 *
 * A static image rather than an interactive map: mounting Mapbox GL here would
 * put a GL context and a tile bill on every story page, including the ones
 * crawlers fetch, and the printed book cannot pan anyway. The picture and the
 * page get identical pixels. The numbered list stays underneath, because it is
 * the half that survives a failed image fetch.
 */
export const StoryMapBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'map' }>>> = ({ block, style }) => {
  const theme = useTheme();
  const [mapFailed, setMapFailed] = React.useState(false);
  const mapSrc = React.useMemo(
    () => staticMapUrl(block.stops, { dark: theme.palette.mode === 'dark' }),
    [block.stops, theme.palette.mode],
  );

  if (block.stops.length === 0) return null;

  const allHref = `https://www.google.com/maps/dir/${block.stops
    .map((s) => `${s.lat},${s.lng}`)
    .join('/')}`;

  return (
    <Box
      sx={{
        maxWidth: `${style.measure + 8}ch`,
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {mapSrc && !mapFailed && (
        <Box
          component="img"
          src={mapSrc}
          alt={`Route through ${block.stops.map((s) => s.name).join(', ')}`}
          loading="lazy"
          decoding="async"
          onError={() => setMapFailed(true)}
          sx={{ display: 'block', width: '100%', aspectRatio: '25 / 14', objectFit: 'cover' }}
        />
      )}

      <Box sx={{ p: 2.25 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        The route
      </Typography>

      <Box sx={{ display: 'grid', gap: 0 }}>
        {block.stops.map((stop, index) => (
          <Box key={`${stop.name}-${index}`} sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'primary.contrastText',
                  bgcolor: 'primary.main',
                }}
              >
                {index + 1}
              </Box>
              {index < block.stops.length - 1 && (
                <Box sx={{ width: 2, flex: 1, minHeight: 22, bgcolor: theme.custom.surface.border, my: 0.5 }} />
              )}
            </Box>
            <Typography variant="body1" sx={{ color: 'text.primary', pt: 0.1, pb: 1.75 }}>
              {stop.name}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        component="a"
        href={allHref}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: 13,
          fontWeight: 600,
          color: 'primary.main',
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
        }}
      >
        See the whole route in Maps
        <IconExternalLink size={13} />
      </Box>
      </Box>
    </Box>
  );
};

export const StoryCostBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'cost' }>>> = ({ block, style }) => {
  const theme = useTheme();
  const rows = block.rows.filter((r) => r.label.trim().length > 0);
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const format = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: block.currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      // An unrecognised currency code should not blank the whole block.
      return `${block.currency} ${Math.round(amount).toLocaleString()}`;
    }
  };

  return (
    <Box
      sx={{
        maxWidth: `${style.measure}ch`,
        p: 2.25,
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        What it cost
      </Typography>

      <Box sx={{ display: 'grid', gap: 1 }}>
        {rows.map((row, index) => (
          <Box
            key={`${row.label}-${index}`}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {row.label}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {format(row.amount)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          alignItems: 'baseline',
          mt: 1.5,
          pt: 1.5,
          borderTop: `1px solid ${theme.custom.surface.border}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
          Total
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'text.primary', whiteSpace: 'nowrap' }}>
          {format(total)}
        </Typography>
      </Box>

      {block.note && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'text.secondary' }}>
          {block.note}
        </Typography>
      )}
    </Box>
  );
};
