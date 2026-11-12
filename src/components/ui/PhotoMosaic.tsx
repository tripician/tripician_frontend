import React from 'react';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { IconInfoSmall, IconX } from '@tabler/icons-react';
import { hasPhotoData, type PhotoDetails } from '../../utils/photoDetails';
import { photoLayout } from './photoLayout';
import PhotoViewer from './PhotoViewer';
import PhotoDetailsOverlay from './PhotoDetailsOverlay';

export interface MosaicPhoto {
  url: string;
  /** Stable key. The composer has a publicId; a posted photo only has its URL. */
  id?: string;
  /** The resolution and lens the original recorded, for its Image details. */
  details?: PhotoDetails | null;
}

interface PhotoMosaicProps {
  photos: MosaicPhoto[];
  /**
   * Composer mode. Given, each tile carries a remove control and none of them
   * opens the viewer, because the tile's job there is to be taken back out.
   */
  onRemove?: (index: number) => void;
  /** Composer mode: an extra tile while an upload is still in flight. */
  uploading?: boolean;
  rounded?: number;
  sx?: object;
  /**
   * When the photos were posted (nothing in the composer). Given, the photos
   * carry an "i" in the bottom-right corner that opens their Image details.
   */
  credit?: { postedAt?: string };
  /** Controlled Image details, so a menu elsewhere on the card can open them too. */
  detailsOpen?: boolean;
  onDetailsOpenChange?: (open: boolean) => void;
}

/**
 * The photographs on a post, laid out the same way everywhere they appear.
 *
 * There were four of these: the composer's 74px strip, and three hand-rolled
 * grids on the card, the answer and the question page, each with its own pixel
 * heights and three of them leaving an empty cell on three photos. The same
 * photos looked like three different posts depending on where you saw them.
 *
 * The composer uses it too, which is the point of the owner's complaint: an
 * attached photo should be a preview of the post, not a row of file chips. Quick
 * Plan's strip looks like file chips because its screenshots are input being
 * consumed; these are content about to be published.
 *
 * With `credit`, the photos also carry their Image details: an "i" in the
 * corner that blurs them and lays the details over them (PhotoDetailsOverlay).
 */
const PhotoMosaic: React.FC<PhotoMosaicProps> = ({
  photos, onRemove, uploading = false, rounded = 12, sx, credit, detailsOpen, onDetailsOpenChange,
}) => {
  const [viewing, setViewing] = React.useState<number | null>(null);
  const detailsId = React.useId();

  // Image details: open or not (controlled when the card passes it), and which photo.
  const [ownOpen, setOwnOpen] = React.useState(false);
  const showingDetails = Boolean(credit) && photos.length > 0 && (detailsOpen ?? ownOpen);
  const setShowingDetails = React.useCallback((open: boolean) => {
    if (onDetailsOpenChange) onDetailsOpenChange(open);
    else setOwnOpen(open);
  }, [onDetailsOpenChange]);
  const [detailsIndex, setDetailsIndex] = React.useState(0);
  // A small photo grows to hold its details rather than making them scroll inside it.
  const [neededHeight, setNeededHeight] = React.useState(0);

  // Opens on the first photo that recorded anything, which is the one worth showing.
  React.useEffect(() => {
    if (!showingDetails) return;
    const first = photos.findIndex((p) => hasPhotoData(p.details));
    setDetailsIndex(first >= 0 ? first : 0);
    // Only on opening: photos changing under an open panel keep its place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingDetails]);

  React.useEffect(() => {
    if (!showingDetails) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowingDetails(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showingDetails, setShowingDetails]);

  const composing = Boolean(onRemove);
  // The spinner occupies a cell, so the layout has to count it or the tiles
  // reflow the moment an upload lands.
  const cells = photos.length + (composing && uploading ? 1 : 0);
  const layout = photoLayout(cells);
  if (!layout) return null;

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          minHeight: showingDetails ? neededHeight : 0,
          transition: 'min-height 200ms ease-out',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          ...sx,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: layout.columns,
            gridTemplateRows: layout.rows,
            // Declared up front so the block holds its space before the images
            // load, rather than shunting the page down as each one arrives.
            aspectRatio: layout.ratio,
            gap: '3px',
            borderRadius: `${rounded}px`,
            overflow: 'hidden',
            // Image details: the photos blur and dim under the panel, quickly.
            '& img': {
              transition: 'filter 180ms ease-out, transform 180ms ease-out',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            },
            ...(showingDetails && {
              '& img': { filter: 'blur(18px) saturate(1.15) brightness(0.92)', transform: 'scale(1.08)' },
            }),
          }}
          // Out of the tab order and away from screen readers while the panel covers it.
          inert={showingDetails || undefined}
        >
          {photos.map((photo, i) => (
            <Box
              key={photo.id ?? photo.url}
              sx={{
                position: 'relative',
                minWidth: 0,
                minHeight: 0,
                overflow: 'hidden',
                gridRow: layout.firstSpansRows && i === 0 ? 'span 2' : undefined,
              }}
            >
              <Box
                component={composing ? 'div' : 'button'}
                type={composing ? undefined : 'button'}
                aria-label={composing ? undefined : `Open photo ${i + 1} of ${photos.length}`}
                onClick={composing ? undefined : (e: React.MouseEvent) => {
                  // The card around this is usually a link to the post. Without
                  // this, opening a photo also navigates away underneath it.
                  e.stopPropagation();
                  setViewing(i);
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  p: 0,
                  border: 'none',
                  background: 'none',
                  cursor: composing ? 'default' : 'zoom-in',
                  '&:focus-visible': (t: any) => ({
                    outline: `2px solid ${t.custom.ring}`,
                    outlineOffset: -2,
                  }),
                }}
              >
                <Box
                  component="img"
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </Box>

              {onRemove && (
                <IconButton
                  size="small"
                  aria-label="Remove picture"
                  onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                  sx={{
                    position: 'absolute', top: 6, right: 6, width: 24, height: 24,
                    bgcolor: 'rgba(10,10,13,0.6)', color: '#fff',
                    '&:hover': { bgcolor: 'rgba(10,10,13,0.85)' },
                  }}
                >
                  <IconX size={13} />
                </IconButton>
              )}
            </Box>
          ))}

          {composing && uploading && (
            <Box sx={{ display: 'grid', placeItems: 'center', bgcolor: 'action.hover', minWidth: 0, minHeight: 0 }}>
              <CircularProgress size={20} />
            </Box>
          )}
        </Box>

        {showingDetails && (
          <Box sx={{ position: 'absolute', inset: 0, borderRadius: `${rounded}px`, overflow: 'hidden' }}>
            <PhotoDetailsOverlay
              id={detailsId}
              photos={photos}
              index={Math.min(detailsIndex, photos.length - 1)}
              onIndexChange={setDetailsIndex}
              postedAt={credit?.postedAt}
              onClose={() => setShowingDetails(false)}
              onNeededHeight={setNeededHeight}
            />
          </Box>
        )}

        {/*
          Quiet on purpose: small, see-through, and in the corner a photo's
          subject is least often in, so it never competes with the picture. It
          turns into the close control while the details are up.
        */}
        {credit && photos.length > 0 && (
          <Box
            component="button"
            type="button"
            aria-label={showingDetails ? 'Hide image details' : 'Image details'}
            aria-expanded={showingDetails}
            aria-controls={showingDetails ? detailsId : undefined}
            title={showingDetails ? undefined : 'Image details'}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setShowingDetails(!showingDetails);
            }}
            sx={{
              position: 'absolute',
              right: 10,
              bottom: 10,
              zIndex: 3,
              width: 28,
              height: 28,
              p: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.95)',
              bgcolor: showingDetails ? 'rgba(255,255,255,0.18)' : 'rgba(12,12,16,0.34)',
              border: '1px solid rgba(255,255,255,0.32)',
              backdropFilter: 'blur(8px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(8px) saturate(1.4)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.16)',
              opacity: showingDetails ? 1 : 0.88,
              transition: 'background-color 150ms, opacity 150ms, transform 150ms',
              '&:hover': { opacity: 1, bgcolor: showingDetails ? 'rgba(255,255,255,0.28)' : 'rgba(12,12,16,0.52)' },
              '&:active': { transform: 'scale(0.94)' },
              '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 2 },
            }}
          >
            {showingDetails ? <IconX size={15} stroke={2.2} /> : <IconInfoSmall size={22} stroke={2} />}
          </Box>
        )}
      </Box>

      {/* Owned here rather than wired up at every call site. */}
      {!composing && (
        <PhotoViewer photos={photos} index={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
};

export default PhotoMosaic;
