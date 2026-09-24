import React from 'react';
import { Box, Button, Skeleton, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconBook, IconMessages, IconPhoto, IconPlayerPlayFilled, IconRoute } from '@tabler/icons-react';
import { squareThumb } from '../../utils/imageThumb';
import type { ExploreKind, ExploreTile } from './exploreFeed';
import { arrangeExplore, BLOCKS, type TilePlacement } from './exploreLayout';

const KIND: Record<ExploreKind, { label: string; Icon: React.ElementType }> = {
  plan: { label: 'Plan', Icon: IconRoute },
  story: { label: 'Story', Icon: IconBook },
  post: { label: 'From the road', Icon: IconMessages },
};

// Gaps in px, per breakpoint. Rows are one column wide, so every cell is square whatever the width.
const GAP = { xs: 6, sm: 10 };
const rowHeight = (gap: number) => `calc((100cqw - ${gap * 2}px) / 3)`;

const ON_PHOTO = 'rgba(255,255,255,0.96)';
const ON_PHOTO_MUTED = 'rgba(255,255,255,0.78)';

const Tile: React.FC<{ tile: ExploreTile; p: TilePlacement }> = ({ tile, p }) => {
  const theme = useTheme();
  const [failed, setFailed] = React.useState(false);
  const large = p.shape === 'feature';
  const shaped = p.shape !== 'square';
  const src = failed ? null : squareThumb(tile.image, large || p.shape === 'banner' ? 960 : shaped ? 640 : 400);
  const kind = KIND[tile.kind];

  return (
    <Box
      component={RouterLink}
      to={tile.href}
      state={tile.trip ? { trip: tile.trip } : undefined}
      aria-label={`${kind.label}: ${tile.title}${tile.meta ? `, ${tile.meta}` : ''}`}
      sx={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        isolation: 'isolate',
        gridColumn: `${p.col} / span ${p.w}`,
        gridRow: `${p.row} / span ${p.h}`,
        borderRadius: { xs: '12px', sm: large ? '22px' : '16px' },
        bgcolor: theme.custom.surface.active,
        color: 'text.disabled',
        textDecoration: 'none',
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
        '@media (hover: hover)': {
          '&:hover .explore-img': { transform: 'scale(1.06)' },
          '&:hover .explore-caption': { transform: 'translateY(0)' },
        },
      }}
    >
      {src ? (
        <Box
          component="img"
          className="explore-img"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          sx={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transition: `transform 700ms ${theme.custom.motion.easing.standard}`,
          }}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <IconPhoto size={22} />
        </Box>
      )}

      {/* A scrim only as tall as the words need, so most of the photograph stays untouched. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(10,10,13,0.82) 0%, rgba(10,10,13,0.42) 32%, rgba(10,10,13,0) 58%)',
          display: { xs: shaped ? 'block' : 'none', sm: 'block' },
        }}
      />

      <Box
        aria-hidden
        sx={{
          position: 'absolute', top: { xs: 6, sm: 10 }, left: { xs: 6, sm: 10 },
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          px: { xs: 0.6, sm: 1 }, py: 0.4, borderRadius: '999px',
          bgcolor: 'rgba(10,10,13,0.58)', color: ON_PHOTO,
          fontSize: 11, fontWeight: 700, lineHeight: 1,
        }}
      >
        <kind.Icon size={13} stroke={2.2} />
        <Box component="span" sx={{ display: { xs: shaped ? 'inline' : 'none', sm: 'inline' } }}>{kind.label}</Box>
      </Box>

      {tile.isVideo && (
        <Box aria-hidden sx={{ position: 'absolute', top: { xs: 6, sm: 10 }, right: { xs: 6, sm: 10 }, display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(10,10,13,0.58)', color: '#fff' }}>
          <IconPlayerPlayFilled size={12} />
        </Box>
      )}

      <Box
        className="explore-caption"
        aria-hidden
        sx={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          p: large ? { xs: 1.25, sm: 2.25 } : { xs: 1, sm: 1.5 },
          display: { xs: shaped ? 'block' : 'none', sm: 'block' },
          transition: `transform ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
          transform: { xs: 'none', sm: 'translateY(2px)' },
        }}
      >
        <Typography
          variant={large ? 'h5' : shaped ? 'subtitle1' : 'body2'}
          component="span"
          sx={{
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            color: ON_PHOTO, fontWeight: 700, lineHeight: 1.2,
            ...(large ? {} : { fontSize: { xs: 13, sm: shaped ? 16 : 13.5 } }),
          }}
        >
          {tile.title}
        </Typography>
        {tile.meta && shaped && (
          <Typography variant="caption" component="span" noWrap sx={{ display: 'block', mt: 0.35, color: ON_PHOTO_MUTED, fontWeight: 500 }}>
            {tile.meta}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const Mosaic: React.FC<{ children: React.ReactNode; busy?: boolean }> = ({ children, busy }) => (
  <Box sx={{ containerType: 'inline-size', px: { xs: 2, sm: 0 } }}>
    <Box
      aria-busy={busy || undefined}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: { xs: `${GAP.xs}px`, sm: `${GAP.sm}px` },
        gridAutoRows: { xs: rowHeight(GAP.xs), sm: rowHeight(GAP.sm) },
      }}
    >
      {children}
    </Box>
  </Box>
);

interface ExploreGridProps {
  tiles: ExploreTile[];
  loading: boolean;
  /** Whether "Show more" can bring anything: more built tiles, or another page to fetch. */
  hasMore: boolean;
  onMore: () => void;
  shown: number;
}

// Search before you type: a mosaic of what travellers made, each tile shaped to suit it and captioned so it reads at a glance.
const ExploreGrid: React.FC<ExploreGridProps> = ({ tiles, loading, hasMore, onMore, shown }) => {
  const arranged = React.useMemo(
    () => arrangeExplore(tiles.slice(0, shown), (t) => t.kind, hasMore),
    [tiles, shown, hasMore],
  );

  if (loading && tiles.length === 0) {
    const ghost = [...BLOCKS[0].slots, ...BLOCKS[1].slots.map((s) => ({ ...s, row: s.row + 3 }))];
    return (
      <Mosaic busy>
        {ghost.map((p, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            sx={{ gridColumn: `${p.col} / span ${p.w}`, gridRow: `${p.row} / span ${p.h}`, height: '100%', borderRadius: { xs: '12px', sm: '16px' } }}
          />
        ))}
      </Mosaic>
    );
  }

  if (arranged.length === 0) return null;

  return (
    <Box component="section" aria-label="Explore">
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, px: { xs: 2, sm: 0 }, mb: { xs: 1.25, sm: 1.75 } }}>
        <Typography variant="h6" component="h2">Fresh from travellers</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
          Plans, stories and road photos, newest first
        </Typography>
      </Box>
      <Mosaic>
        {arranged.map(({ item, placement }) => (
          <Tile key={item.key} tile={item} p={placement} />
        ))}
      </Mosaic>
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            onClick={onMore}
            disabled={loading}
            sx={(t) => ({
              border: `1px solid ${t.custom.surface.border}`,
              bgcolor: 'background.paper',
              color: 'text.primary',
              borderRadius: '50px',
              px: 3,
              py: 1.1,
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { borderColor: 'text.primary', bgcolor: 'background.paper' },
            })}
          >
            {loading ? 'Loading' : 'Show more'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ExploreGrid;
