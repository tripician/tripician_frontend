import React from 'react';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { photoLayout } from './photoLayout';
import PhotoViewer from './PhotoViewer';

export interface MosaicPhoto {
  url: string;
  /** Stable key. The composer has a publicId; a posted photo only has its URL. */
  id?: string;
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
 */
const PhotoMosaic: React.FC<PhotoMosaicProps> = ({
  photos, onRemove, uploading = false, rounded = 12, sx,
}) => {
  const [viewing, setViewing] = React.useState<number | null>(null);

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
          display: 'grid',
          gridTemplateColumns: layout.columns,
          gridTemplateRows: layout.rows,
          // Declared up front so the block holds its space before the images
          // load, rather than shunting the page down as each one arrives.
          aspectRatio: layout.ratio,
          gap: '3px',
          borderRadius: `${rounded}px`,
          overflow: 'hidden',
          ...sx,
        }}
      >
        {photos.map((photo, i) => (
          <Box
            key={photo.id ?? photo.url}
            sx={{
              position: 'relative',
              minWidth: 0,
              minHeight: 0,
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

      {/* Owned here rather than wired up at every call site. */}
      {!composing && (
        <PhotoViewer photos={photos} index={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
};

export default PhotoMosaic;
