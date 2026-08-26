import React from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export interface ViewerPhoto {
  url: string;
}

interface PhotoViewerProps {
  photos: ViewerPhoto[];
  /** Null when closed. Otherwise the index to open on. */
  index: number | null;
  onClose: () => void;
}

/** How far a drag has to travel before it counts as a swipe rather than a wobble. */
const SWIPE_PX = 60;

/**
 * A photo, full size, because the mosaic crops.
 *
 * Every tile in a mosaic is `objectFit: cover`, so a four-photo post is four
 * pieces of four photographs. Without somewhere to see the whole thing, tiling
 * them makes the pictures less viewable than posting one would have been. This
 * is the other half of that trade.
 *
 * Built on Dialog for the focus trap, Escape, and focus returning to the tile
 * that opened it, none of which is worth reimplementing.
 */
const PhotoViewer: React.FC<PhotoViewerProps> = ({ photos, index, onClose }) => {
  const open = index !== null;
  const [current, setCurrent] = React.useState(index ?? 0);

  React.useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  const count = photos.length;
  const go = React.useCallback((delta: number) => {
    setCurrent((prev) => (prev + delta + count) % count);
  }, [count]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (!open || count === 0) return null;
  const photo = photos[Math.min(current, count - 1)];

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen
      // A neutral scrim. The picture is the subject, so nothing here is tinted.
      PaperProps={{ sx: { bgcolor: 'rgba(8,8,10,0.96)' } }}
      // The card underneath is usually a link to the post. Without this, every
      // click inside the viewer also navigates it.
      onClick={(e) => e.stopPropagation()}
    >
      <Box
        sx={{ position: 'relative', width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}
        onClick={onClose}
      >
        <IconButton
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
          sx={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            color: '#fff', bgcolor: 'rgba(255,255,255,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
          }}
        >
          <IconX size={20} />
        </IconButton>

        {count > 1 && (
          <Typography
            sx={{
              position: 'absolute', top: 18, left: 0, right: 0, zIndex: 1,
              textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600,
            }}
          >
            {Math.min(current, count - 1) + 1} of {count}
          </Typography>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={photo.url}
            src={photo.url}
            alt=""
            // Contain, not cover. Seeing what the tile cropped is the whole point.
            style={{
              maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain',
              display: 'block', borderRadius: 8, cursor: 'default',
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            drag={count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_PX) go(1);
              else if (info.offset.x > SWIPE_PX) go(-1);
            }}
          />
        </AnimatePresence>

        {count > 1 && (
          <>
            <ViewerArrow side="left" onClick={(e) => { e.stopPropagation(); go(-1); }} />
            <ViewerArrow side="right" onClick={(e) => { e.stopPropagation(); go(1); }} />
          </>
        )}
      </Box>
    </Dialog>
  );
};

const ViewerArrow: React.FC<{
  side: 'left' | 'right';
  onClick: (e: React.MouseEvent) => void;
}> = ({ side, onClick }) => (
  <IconButton
    onClick={onClick}
    aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
    sx={{
      position: 'absolute',
      [side]: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 2,
      color: '#fff',
      bgcolor: 'rgba(255,255,255,0.12)',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
      // Below sm the gesture is the swipe, and an arrow over the picture is
      // just something covering it.
      display: { xs: 'none', sm: 'inline-flex' },
    }}
  >
    {side === 'left' ? <IconChevronLeft size={22} /> : <IconChevronRight size={22} />}
  </IconButton>
);

export default PhotoViewer;
