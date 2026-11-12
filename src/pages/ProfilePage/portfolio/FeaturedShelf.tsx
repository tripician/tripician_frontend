import React from 'react';
import { Box, Button, Skeleton, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTripCover } from '../../../utils/tripCover';
import { featuredHref, featuredMeta, type FeaturedItem } from '../featuredItems';
import { SECTION_QUOTES } from './journal';
import { SectionHeader, SectionLink, SectionQuote } from './PortfolioSection';
import type { FeaturedState } from './usePortfolio';

/**
 * A featured item's picture: its own, or for a plan or story without one, a
 * photo of where it went (the same fallback every trip card uses).
 */
export const FeaturedCover: React.FC<{ item: FeaturedItem; radius?: number }> = ({ item, radius = 12 }) => {
  const fallback = useTripCover(
    item.type === 'photo' ? null : { photoUrl: item.coverUrl, countries: item.countries, name: item.place ?? item.title },
  );
  const src = item.type === 'photo' ? item.coverUrl : fallback;
  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        aspectRatio: '4 / 3',
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        bgcolor: theme.custom.surface.hover,
      })}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          loading="lazy"
          className="featured-img"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
    </Box>
  );
};

/** One card: the picture, then the title and "Travel plan · Italy". */
const FeaturedCard: React.FC<{ item: FeaturedItem }> = ({ item }) => {
  const href = featuredHref(item);
  const body = (
    <>
      <FeaturedCover item={item} />
      <Box sx={{ pt: 1.1, px: 0.25, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.title}
        </Typography>
        <Typography variant="caption" component="p" noWrap sx={{ color: 'text.secondary', mt: 0.25 }}>
          {featuredMeta(item)}
        </Typography>
      </Box>
    </>
  );
  const sx = {
    display: 'block',
    color: 'inherit',
    textDecoration: 'none',
    minWidth: 0,
    scrollSnapAlign: 'start',
  } as const;
  if (!href) return <Box sx={sx}>{body}</Box>;
  return (
    <Box
      component={RouterLink}
      to={href}
      aria-label={`${item.title}, ${featuredMeta(item)}`}
      sx={(theme) => ({
        ...sx,
        borderRadius: '12px',
        '& .featured-img': {
          transition: `transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
        },
        '&:hover .featured-img': { transform: 'scale(1.04)' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 4 },
      })}
    >
      {body}
    </Box>
  );
};

/**
 * The row the cards sit in. Five at most, so on a desktop it is one shelf with
 * every card in view; on a phone it scrolls sideways, cards a little under half
 * the width so the next one shows at the edge.
 */
const shelfSx = {
  display: { xs: 'flex', md: 'grid' },
  gridTemplateColumns: { md: 'repeat(5, minmax(0, 1fr))' },
  gap: { xs: 1.5, md: 2 },
  overflowX: { xs: 'auto', md: 'visible' },
  scrollSnapType: { xs: 'x mandatory', md: 'none' },
  mx: { xs: -2, sm: -3, md: 0 },
  px: { xs: 2, sm: 3, md: 0 },
  scrollPaddingInline: { xs: 16, sm: 24 },
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
  '& > *': { flex: { xs: '0 0 44%', sm: '0 0 30%', md: 'initial' } },
} as const;

export const FeaturedShelf: React.FC<{
  state: FeaturedState;
  isOwner: boolean;
  /** Owner only: opens the editor. Absent where saving could not land. */
  onEdit?: () => void;
}> = ({ state, isOwner, onEdit }) => {
  const canEdit = isOwner && !state.unsupported && !!onEdit;
  let body: React.ReactNode;

  if (state.status === 'loading' && state.items.length === 0) {
    body = (
      <Box sx={shelfSx} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Box key={i}>
            <Skeleton variant="rounded" sx={{ aspectRatio: '4 / 3', height: 'auto', borderRadius: '12px' }} />
            <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
            <Skeleton variant="text" width="50%" />
          </Box>
        ))}
      </Box>
    );
  } else if (state.items.length === 0) {
    // A failed read is the owner's to retry; to a visitor it is simply an empty shelf.
    const failed = isOwner && state.status === 'error';
    body = (
      <SectionQuote
        quote={SECTION_QUOTES.featured}
        line={failed ? 'Your highlights couldn’t load.' : null}
        action={
          failed ? (
            <Button variant="outlined" size="small" onClick={state.reload}>Try again</Button>
          ) : canEdit ? (
            <Button variant="contained" size="small" onClick={onEdit}>Choose highlights</Button>
          ) : null
        }
      />
    );
  } else {
    body = (
      <Box sx={shelfSx} role="list" aria-label="Featured">
        {state.items.map((item) => (
          <Box key={`${item.type}:${item.id}`} role="listitem" sx={{ minWidth: 0 }}>
            <FeaturedCard item={item} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box component="section" aria-labelledby="profile-featured">
      <SectionHeader
        id="profile-featured"
        title="Featured"
        description="Handpicked journeys, stories and moments"
        accessory={canEdit && state.items.length > 0 ? <SectionLink label="Edit" ariaLabel="Edit highlights" onClick={onEdit!} /> : null}
      />
      {body}
    </Box>
  );
};

