import React from 'react';
import { Box, ButtonBase, Dialog, IconButton, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { IconArrowUpRight, IconChevronLeft, IconChevronRight, IconMapPin, IconX } from '@tabler/icons-react';
import type { AuthorPhoto } from './photobook';

function photoDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * One photograph at a time, large, on a dark ground: the web's take on the
 * app's PhotoViewer. Arrow keys and the side buttons step through the
 * Photobook, asking for more as the end nears; the caption, place and date sit
 * under the picture, with a way into the post it was shared in (where its
 * likes and comments are).
 */
const PhotoLightbox: React.FC<{
  photos: readonly AuthorPhoto[];
  index: number | null;
  onIndex: (next: number | null) => void;
  /** More photos exist beyond those loaded. */
  hasMore?: boolean;
  /** Every photo in the Photobook, loaded or not: what the counter counts to. */
  total?: number;
  onNeedMore?: () => void;
}> = ({ photos, index, onIndex, hasMore, total, onNeedMore }) => {
  const open = index !== null && index >= 0 && index < photos.length;
  const photo = open ? photos[index!] : null;
  const atStart = !open || index === 0;
  const atEnd = !open || index === photos.length - 1;

  const step = React.useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      onIndex(next);
    },
    [index, photos.length, onIndex],
  );

  // Ask for the next page a few photos before the end, so stepping never stalls.
  React.useEffect(() => {
    if (open && hasMore && onNeedMore && index! >= photos.length - 3) onNeedMore();
  }, [open, index, photos.length, hasMore, onNeedMore]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  const sideButton = (side: 'left' | 'right') => {
    const disabled = side === 'left' ? atStart : atEnd;
    return (
      <IconButton
        aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
        onClick={() => step(side === 'left' ? -1 : 1)}
        disabled={disabled}
        sx={{
          position: 'absolute',
          top: '50%',
          [side]: { xs: 8, md: 20 },
          transform: 'translateY(-50%)',
          width: 44,
          height: 44,
          color: '#fff',
          bgcolor: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
          '&.Mui-disabled': { opacity: 0, pointerEvents: 'none' },
        }}
      >
        {side === 'left' ? <IconChevronLeft size={22} /> : <IconChevronRight size={22} />}
      </IconButton>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={() => onIndex(null)}
      fullScreen
      aria-label="Photo"
      PaperProps={{ sx: { bgcolor: 'rgb(10,10,12)', backgroundImage: 'none' } }}
    >
      {photo ? (
        <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 3 }, py: 1.5, color: 'rgba(255,255,255,0.72)' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              {index! + 1} / {Math.max(total ?? 0, photos.length)}
            </Typography>
            <IconButton aria-label="Close" onClick={() => onIndex(null)} sx={{ color: '#fff' }}>
              <IconX size={22} />
            </IconButton>
          </Box>

          <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 0, md: 10 } }}>
            <Box
              key={photo.id}
              component="img"
              src={photo.url}
              alt={photo.caption ?? (photo.placeName ? `Photo from ${photo.placeName}` : 'Photo')}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: { xs: 0, md: '6px' },
                '@keyframes lbIn': { from: { opacity: 0 }, to: { opacity: 1 } },
                animation: 'lbIn 220ms ease',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
            {sideButton('left')}
            {sideButton('right')}
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, color: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', maxWidth: 1040, width: '100%', mx: 'auto' }}>
            <Box sx={{ minWidth: 0, flex: '1 1 320px' }}>
              {photo.caption ? (
                <Typography sx={{ fontSize: '0.9375rem', lineHeight: 1.5, mb: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {photo.caption}
                </Typography>
              ) : null}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.64)', flexWrap: 'wrap' }}>
                {photo.placeName ? (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <IconMapPin size={14} />
                    <Typography variant="caption">{photo.placeName}</Typography>
                  </Box>
                ) : null}
                <Typography variant="caption">{photoDate(photo.createdAt)}</Typography>
              </Box>
            </Box>
            <ButtonBase
              component={RouterLink}
              to={`/post/${photo.postId}`}
              onClick={() => onIndex(null)}
              sx={{
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#fff',
                gap: 0.5,
                px: 1.75,
                py: 0.9,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.28)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Open post <IconArrowUpRight size={15} />
            </ButtonBase>
          </Box>
        </Box>
      ) : null}
    </Dialog>
  );
};

export default PhotoLightbox;
