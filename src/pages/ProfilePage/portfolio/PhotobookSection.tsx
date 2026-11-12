import React from 'react';
import { Box, Button, ButtonBase, Dialog, DialogContent, IconButton, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { IconCamera, IconX } from '@tabler/icons-react';
import { SECTION_QUOTES } from './journal';
import { photobookPreview, photoCountLabel, type AuthorPhoto } from './photobook';
import PhotoLightbox from './PhotoLightbox';
import { SectionHeader, SectionNote, SectionQuote } from './PortfolioSection';
import type { PhotobookState } from './usePortfolio';

/** One square photograph; it fades in once loaded, so a slow grid fills in gently instead of popping. */
const PhotoTile: React.FC<{ photo: AuthorPhoto; onOpen: () => void; hero?: boolean }> = ({ photo, onOpen, hero }) => {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={photo.caption ? `Photo: ${photo.caption}` : photo.placeName ? `Photo from ${photo.placeName}` : 'Photo'}
      sx={(theme) => ({
        position: 'relative',
        display: 'block',
        width: '100%',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        borderRadius: { xs: '4px', md: hero ? '12px' : '8px' },
        bgcolor: theme.custom.surface.hover,
        ...(hero ? { gridColumn: 'span 2', gridRow: 'span 2' } : null),
        '& img': {
          opacity: loaded ? 1 : 0,
          transition: `opacity ${theme.custom.motion.duration.base} ease, transform ${theme.custom.motion.duration.slow} ${theme.custom.motion.easing.standard}`,
        },
        '&:hover img': { transform: 'scale(1.035)' },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.28), transparent 45%)',
          opacity: 0,
          transition: `opacity ${theme.custom.motion.duration.fast} ease`,
        },
        '&:hover::after': { opacity: 1 },
        '&:hover .hero-place, &:focus-visible .hero-place': { opacity: 1 },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      })}
    >
      <Box
        component="img"
        src={photo.url}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {hero && photo.placeName ? (
        <Typography
          variant="caption"
          className="hero-place"
          sx={{ position: 'absolute', left: 14, bottom: 12, zIndex: 1, color: '#fff', fontWeight: 600, textShadow: '0 1px 8px rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 160ms ease' }}
        >
          {photo.placeName}
        </Typography>
      ) : null}
    </ButtonBase>
  );
};

/** The last square when there are more photos than fit: "+16 / View all". */
const MoreTile: React.FC<{ remaining: number; total: number; onClick: () => void }> = ({ remaining, total, onClick }) => (
  <ButtonBase
    onClick={onClick}
    aria-label={`View all ${total} photos`}
    sx={(theme) => ({
      width: '100%',
      aspectRatio: '1 / 1',
      borderRadius: { xs: '4px', md: '8px' },
      bgcolor: theme.custom.surface.hover,
      display: 'flex',
      flexDirection: 'column',
      gap: 0.25,
      transition: `background-color ${theme.custom.motion.duration.fast} ease`,
      '&:hover': { bgcolor: theme.custom.surface.active },
      '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
    })}
  >
    <Typography sx={(theme) => ({ fontFamily: theme.custom.fontDisplay, fontWeight: 700, fontSize: { xs: '1.125rem', md: '1.375rem' }, letterSpacing: '-0.02em' })}>
      +{remaining}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>View all</Typography>
  </ButtonBase>
);

/**
 * How the preview is laid out. A phone gets the app's 3 × 3. A wider screen
 * gets a contact sheet: six columns, the newest photo leading at twice the size,
 * so nine photographs read as a spread rather than a towering grid. A short
 * Photobook is one row of equal squares, which looks finished at any count.
 */
function previewGridSx(count: number, wide: boolean) {
  if (!wide) return { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '3px' };
  if (count >= 7) return { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '6px' };
  return { gridTemplateColumns: `repeat(${Math.max(count, 3)}, minmax(0, 1fr))`, gap: '6px' };
}

/** Every photo, in a dialog, paging in as it nears the end. */
const PhotobookDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  state: PhotobookState;
  title: string;
  onOpenPhoto: (index: number) => void;
}> = ({ open, onClose, state, title, onOpenPhoto }) => {
  const sentinel = React.useRef<HTMLDivElement | null>(null);
  const { hasMore, loadingMore, loadMore } = state;

  React.useEffect(() => {
    const node = sentinel.current;
    if (!open || !node || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !loadingMore) void loadMore();
    }, { rootMargin: '400px' });
    io.observe(node);
    return () => io.disconnect();
  }, [open, hasMore, loadingMore, loadMore]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper" aria-labelledby="photobook-all-title">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, md: 3 }, py: 1.75, gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography id="photobook-all-title" sx={(theme) => ({ fontFamily: theme.custom.fontDisplay, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.015em' })} noWrap>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{photoCountLabel(state.total)}</Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onClose}><IconX size={20} /></IconButton>
      </Box>
      <DialogContent dividers sx={{ p: { xs: 1, md: 2 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: { xs: '3px', md: '6px' } }}>
          {state.items.map((photo, i) => (
            <PhotoTile key={photo.id} photo={photo} onOpen={() => onOpenPhoto(i)} />
          ))}
          {loadingMore
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={`s${i}`} variant="rounded" sx={{ aspectRatio: '1 / 1', height: 'auto' }} />)
            : null}
        </Box>
        <Box ref={sentinel} sx={{ height: 1 }} />
      </DialogContent>
    </Dialog>
  );
};

export const PhotobookSection: React.FC<{
  state: PhotobookState;
  isOwner: boolean;
  /** Theirs, for the full Photobook's title. */
  name: string | null;
  /** Owner only: a new photo post. */
  onAddPhoto?: () => void;
}> = ({ state, isOwner, name, onAddPhoto }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [viewer, setViewer] = React.useState<number | null>(null);
  const [allOpen, setAllOpen] = React.useState(false);

  const { tiles, remaining } = photobookPreview(state.items, state.total);
  const count = tiles.length + (remaining > 0 ? 1 : 0);
  const collage = wide && count >= 7;

  let body: React.ReactNode;
  if (state.status === 'loading' && state.items.length === 0) {
    body = (
      <Box sx={{ display: 'grid', ...previewGridSx(9, wide) }} aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            sx={{ aspectRatio: '1 / 1', height: 'auto', borderRadius: wide ? '8px' : '4px', ...(wide && i === 0 ? { gridColumn: 'span 2', gridRow: 'span 2' } : null) }}
          />
        ))}
      </Box>
    );
  } else if (state.items.length === 0) {
    // A failed read is the owner's to retry; to a visitor it is simply an empty book.
    const failed = isOwner && state.status === 'error';
    body = (
      <SectionQuote
        quote={SECTION_QUOTES.photobook}
        line={failed ? 'Your photos couldn’t load.' : null}
        action={
          failed ? (
            <Button variant="outlined" size="small" onClick={state.reload}>Try again</Button>
          ) : isOwner && onAddPhoto ? (
            <Button variant="contained" size="small" startIcon={<IconCamera size={16} />} onClick={onAddPhoto}>
              Share a memory
            </Button>
          ) : null
        }
      />
    );
  } else {
    body = (
      <Box sx={{ display: 'grid', ...previewGridSx(count, wide) }}>
        {tiles.map((photo, i) => (
          <PhotoTile key={photo.id} photo={photo} hero={collage && i === 0} onOpen={() => setViewer(i)} />
        ))}
        {remaining > 0 ? <MoreTile remaining={remaining} total={state.total} onClick={() => setAllOpen(true)} /> : null}
      </Box>
    );
  }

  const firstName = name?.trim().split(/\s+/)[0];
  return (
    <Box component="section" aria-labelledby="profile-photobook">
      <SectionHeader
        id="profile-photobook"
        title="Photobook"
        description="Snapshots from every journey"
        accessory={state.total > 0 ? <SectionNote>{photoCountLabel(state.total)}</SectionNote> : null}
      />
      {body}
      <PhotobookDialog
        open={allOpen}
        onClose={() => setAllOpen(false)}
        state={state}
        title={isOwner ? 'Your Photobook' : firstName ? `${firstName}’s Photobook` : 'Photobook'}
        onOpenPhoto={setViewer}
      />
      <PhotoLightbox
        photos={state.items}
        index={viewer}
        onIndex={setViewer}
        hasMore={state.hasMore}
        total={state.total}
        onNeedMore={() => void state.loadMore()}
      />
    </Box>
  );
};
