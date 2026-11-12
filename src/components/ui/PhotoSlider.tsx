import React from 'react';
import { Box } from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconInfoSmall, IconX } from '@tabler/icons-react';
import type { PhotoDetails } from '../../utils/photoDetails';
import PhotoViewer from './PhotoViewer';
import PhotoDetailsOverlay from './PhotoDetailsOverlay';

export interface SliderPhoto {
  url: string;
  details?: PhotoDetails | null;
  /** The stored picture's size, when known, so it is laid out before it loads. */
  width?: number | null;
  height?: number | null;
}

interface PhotoSliderProps {
  photos: SliderPhoto[];
  /**
   * A photography post: every photo in its own shape, never cropped, square
   * corners, and an "i" for its Image details. Otherwise an everyday post:
   * photos fill a frame fitted to the feed, cropped if need be, with rounded corners.
   */
  photography?: boolean;
  /** When the post went out, for the details. */
  postedAt?: string;
  /** Controlled Image details, so the card's menu can open them too. */
  detailsOpen?: boolean;
  onDetailsOpenChange?: (open: boolean) => void;
  /** Corner radius of an everyday post's frame. A photography post's is always square. */
  rounded?: number;
  sx?: object;
}

/** Instagram's bounds for a feed photo: no taller than 4:5, no wider than 1.91:1. */
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;

const ratioOf = (photo: SliderPhoto): number | undefined => {
  const w = photo.width ?? photo.details?.width;
  const h = photo.height ?? photo.details?.height;
  return w && h ? w / h : undefined;
};

/**
 * A post's photos, one at a time, swiped or stepped through.
 *
 * It replaces the collage (PhotoMosaic) on posts: the owner wanted every photo
 * seen whole and in turn, the way Instagram shows a carousel, rather than four
 * cut into a grid. The frame takes the first photo's shape, as Instagram's
 * does; on a photography post the others sit inside it uncropped.
 */
const PhotoSlider: React.FC<PhotoSliderProps> = ({
  photos, photography = false, postedAt, detailsOpen, onDetailsOpenChange, rounded = 12, sx,
}) => {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = React.useState(0);
  const [viewing, setViewing] = React.useState<number | null>(null);
  // Shapes measured from the pictures themselves, for older posts that never stored a size.
  const [measured, setMeasured] = React.useState<Record<number, number>>({});
  const detailsId = React.useId();

  const [ownOpen, setOwnOpen] = React.useState(false);
  const showingDetails = photography && photos.length > 0 && (detailsOpen ?? ownOpen);
  const setShowingDetails = React.useCallback((open: boolean) => {
    if (onDetailsOpenChange) onDetailsOpenChange(open);
    else setOwnOpen(open);
  }, [onDetailsOpenChange]);
  const [neededHeight, setNeededHeight] = React.useState(0);

  React.useEffect(() => {
    if (!showingDetails) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowingDetails(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showingDetails, setShowingDetails]);

  const count = photos.length;
  if (count === 0) return null;

  const first = ratioOf(photos[0]) ?? measured[0];
  const ratio = photography
    ? first ?? 4 / 3
    : Math.min(MAX_RATIO, Math.max(MIN_RATIO, first ?? 1));
  const radius = photography ? 0 : rounded;

  const goTo = (i: number) => {
    const track = trackRef.current;
    const next = Math.max(0, Math.min(count - 1, i));
    if (track) track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    setIndex(next);
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next !== index) setIndex(Math.max(0, Math.min(count - 1, next)));
  };

  const glass = {
    display: 'grid',
    placeItems: 'center',
    p: 0,
    border: '1px solid rgba(255,255,255,0.32)',
    borderRadius: '50%',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.95)',
    bgcolor: 'rgba(12,12,16,0.34)',
    backdropFilter: 'blur(8px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(8px) saturate(1.4)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.16)',
    transition: 'background-color 150ms, opacity 150ms, transform 150ms',
    '&:hover': { bgcolor: 'rgba(12,12,16,0.52)' },
    '&:active': { transform: 'scale(0.94)' },
    '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 2 },
  } as const;

  return (
    <>
      <Box
        // The card around this is usually a link to the post; nothing in here should open it.
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        sx={{
          position: 'relative',
          minHeight: showingDetails ? neededHeight : 0,
          transition: 'min-height 200ms ease-out',
          '&:hover .photo-slider-nav, &:focus-within .photo-slider-nav': { opacity: 1 },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          ...sx,
        }}
      >
        <Box
          ref={trackRef}
          role="group"
          aria-roledescription="carousel"
          aria-label={count > 1 ? `Photos, ${index + 1} of ${count}` : 'Photo'}
          tabIndex={count > 1 ? 0 : undefined}
          onScroll={onScroll}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
          }}
          inert={showingDetails || undefined}
          sx={{
            display: 'flex',
            width: '100%',
            aspectRatio: String(ratio),
            // A tall photograph is shown whole, inside the screen, rather than cropped.
            maxHeight: photography ? 'min(85vh, 1100px)' : undefined,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            borderRadius: `${radius}px`,
            bgcolor: photography ? 'action.hover' : 'transparent',
            '&:focus-visible': (t: any) => ({ outline: `2px solid ${t.custom.ring}`, outlineOffset: 2 }),
          }}
        >
          {photos.map((photo, i) => (
            <Box
              key={`${photo.url}:${i}`}
              component="button"
              type="button"
              aria-label={count > 1 ? `Open photo ${i + 1} of ${count}` : 'Open photo'}
              onClick={() => setViewing(i)}
              sx={{
                flex: '0 0 100%',
                height: '100%',
                p: 0,
                border: 'none',
                background: 'none',
                cursor: 'zoom-in',
                scrollSnapAlign: 'start',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={photo.url}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  if (ratioOf(photo) || measured[i]) return;
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setMeasured((prev) => ({ ...prev, [i]: img.naturalWidth / img.naturalHeight }));
                  }
                }}
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  // Photography is never cropped; an everyday photo fills its frame.
                  objectFit: photography ? 'contain' : 'cover',
                  transition: 'filter 180ms ease-out, transform 180ms ease-out',
                  ...(showingDetails && { filter: 'blur(18px) brightness(0.92)', transform: 'scale(1.08)' }),
                }}
              />
            </Box>
          ))}
        </Box>

        {count > 1 && !showingDetails && (
          <>
            <Box
              aria-hidden
              sx={{
                position: 'absolute', top: 10, right: 10, px: 1, py: 0.25, borderRadius: 999,
                bgcolor: 'rgba(12,12,16,0.5)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, pointerEvents: 'none',
              }}
            >
              {index + 1}/{count}
            </Box>
            {index > 0 && (
              <Box
                component="button"
                type="button"
                className="photo-slider-nav"
                aria-label="Previous photo"
                onClick={() => goTo(index - 1)}
                sx={{ ...glass, position: 'absolute', left: 10, top: '50%', mt: '-16px', width: 32, height: 32, opacity: 0, '@media (hover: none)': { display: 'none' } }}
              >
                <IconChevronLeft size={18} />
              </Box>
            )}
            {index < count - 1 && (
              <Box
                component="button"
                type="button"
                className="photo-slider-nav"
                aria-label="Next photo"
                onClick={() => goTo(index + 1)}
                sx={{ ...glass, position: 'absolute', right: 10, top: '50%', mt: '-16px', width: 32, height: 32, opacity: 0, '@media (hover: none)': { display: 'none' } }}
              >
                <IconChevronRight size={18} />
              </Box>
            )}
          </>
        )}

        {showingDetails && (
          <Box sx={{ position: 'absolute', inset: 0, borderRadius: `${radius}px`, overflow: 'hidden' }}>
            <PhotoDetailsOverlay
              id={detailsId}
              photos={photos}
              index={index}
              onIndexChange={goTo}
              postedAt={postedAt}
              onClose={() => setShowingDetails(false)}
              onNeededHeight={setNeededHeight}
            />
          </Box>
        )}

        {/* Photography only. Quiet: small, see-through, in the corner a subject is least often in. */}
        {photography && (
          <Box
            component="button"
            type="button"
            aria-label={showingDetails ? 'Hide image details' : 'Image details'}
            aria-expanded={showingDetails}
            aria-controls={showingDetails ? detailsId : undefined}
            title={showingDetails ? undefined : 'Image details'}
            onClick={() => setShowingDetails(!showingDetails)}
            sx={{
              ...glass,
              position: 'absolute',
              right: 10,
              bottom: 10,
              zIndex: 3,
              width: 28,
              height: 28,
              opacity: showingDetails ? 1 : 0.88,
              bgcolor: showingDetails ? 'rgba(255,255,255,0.18)' : 'rgba(12,12,16,0.34)',
              '&:hover': { opacity: 1, bgcolor: showingDetails ? 'rgba(255,255,255,0.28)' : 'rgba(12,12,16,0.52)' },
            }}
          >
            {showingDetails ? <IconX size={15} stroke={2.2} /> : <IconInfoSmall size={22} stroke={2} />}
          </Box>
        )}
      </Box>

      {count > 1 && (
        <Box aria-hidden sx={{ display: 'flex', justifyContent: 'center', gap: '5px', pt: 1 }}>
          {photos.map((photo, i) => (
            <Box
              key={`${photo.url}:dot:${i}`}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: i === index ? 'primary.main' : 'text.disabled',
                opacity: i === index ? 1 : 0.45,
                transition: 'opacity 150ms, background-color 150ms',
              }}
            />
          ))}
        </Box>
      )}

      <PhotoViewer
        photos={photos.map((p) => ({ url: p.url }))}
        index={viewing}
        onClose={() => setViewing(null)}
      />
    </>
  );
};

export default PhotoSlider;
