import React from 'react';
import { Box, Typography } from '@mui/material';
import { IconCamera, IconCertificate, IconLock, IconSparkles } from '@tabler/icons-react';
import { fitWidth } from '../../utils/imageThumb';
import { formatAbsoluteDateTime } from '../../utils/relativeTime';
import {
  describeSource, imageDataRows, type DetailRow, type PhotoDetails, type SourceTone,
} from '../../utils/photoDetails';

export interface DetailsPhoto {
  url: string;
  details?: PhotoDetails | null;
}

interface PhotoDetailsOverlayProps {
  id: string;
  photos: DetailsPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  /** When it was posted. Not who: the poster is not always who made the photo. Absent in the composer. */
  postedAt?: string;
  onClose: () => void;
  /** The height the details need, so a small photo can grow to hold them instead of scrolling. */
  onNeededHeight?: (height: number) => void;
}

/** Container name for the size queries below: the panel adapts to the photo, not the window. */
const BOX = 'photo-details';
const small = `@container ${BOX} (max-width: 440px)`;

const TONES: Record<SourceTone, { bg: string; border: string; color: string }> = {
  ai: { bg: 'rgba(255, 183, 77, 0.22)', border: 'rgba(255, 196, 110, 0.6)', color: '#FFE3B8' },
  capture: { bg: 'rgba(110, 200, 120, 0.2)', border: 'rgba(140, 220, 150, 0.55)', color: '#D5F5D8' },
  other: { bg: 'rgba(255, 255, 255, 0.14)', border: 'rgba(255, 255, 255, 0.3)', color: '#FFFFFF' },
};

/**
 * One fact: a small label over its value, or over "Not available" in a quieter
 * voice. A second, quieter line when the answer has two parts (the lens under
 * the camera), and the whole width of the grid when it asks for it.
 */
const Fact: React.FC<{ row: DetailRow }> = ({ row: { label, value, detail, missing, wide } }) => (
  <Box sx={{ minWidth: 0, gridColumn: wide ? '1 / -1' : undefined }}>
    <Typography
      component="dt"
      sx={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72, m: 0 }}
    >
      {label}
    </Typography>
    <Typography
      component="dd"
      sx={{
        m: 0,
        mt: 0.25,
        lineHeight: 1.3,
        overflowWrap: 'anywhere',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        ...(missing
          ? { fontSize: '0.84rem', fontWeight: 400, opacity: 0.55, [small]: { fontSize: '0.8rem' } }
          : { fontSize: '0.9rem', fontWeight: 600, [small]: { fontSize: '0.84rem' } }),
      }}
    >
      {value}
    </Typography>
    {detail && (
      <Typography component="dd" sx={{ m: 0, mt: 0.15, fontSize: '0.8rem', lineHeight: 1.3, opacity: 0.8, overflowWrap: 'anywhere' }}>
        {detail}
      </Typography>
    )}
  </Box>
);

/**
 * A photo's details, laid over the photo itself, so a reader can judge how
 * original it is without leaving it.
 *
 * Every question gets a line even when the file has no answer ("Not
 * available" is an answer too: a picture with no author, no date and no camera
 * says something about where it came from). What its Content Credentials say
 * made it, a camera or an AI generator, leads, because that answers the
 * question most directly. All of it is the file's own claim, and says so.
 * Never where: location is not read, in the browser or on the phone, and not
 * kept on the server.
 */
const PhotoDetailsOverlay: React.FC<PhotoDetailsOverlayProps> = ({
  id, photos, index, onIndexChange, postedAt, onClose, onNeededHeight,
}) => {
  const current = photos[Math.min(index, photos.length - 1)];
  const d: PhotoDetails = current?.details ?? {};
  const source = describeSource(d.digitalSourceType);
  const madeBy = [d.createdWith, d.credentialsBy && `Content Credentials by ${d.credentialsBy}`].filter(Boolean).join(' · ');
  const rows = imageDataRows(d);
  const posted = postedAt ? formatAbsoluteDateTime(postedAt) : '';

  // How tall the details are when nothing stretches them: the photo grows to that if it is shorter.
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const report = React.useRef(onNeededHeight);
  report.current = onNeededHeight;
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    const header = headerRef.current;
    const body = bodyRef.current;
    if (!content || !header || !body) return undefined;
    const measure = () => {
      const cs = window.getComputedStyle(content);
      const gap = parseFloat(cs.rowGap) || 0;
      report.current?.(Math.ceil(header.offsetHeight + body.offsetHeight + gap + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  const tone = source ? TONES[source.tone] : TONES.other;

  return (
    <Box
      id={id}
      role="region"
      aria-label={photos.length > 1 ? `Image details, photo ${index + 1} of ${photos.length}` : 'Image details'}
      // The card around the photos is a link to the post; a click in here is not.
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        overflow: 'hidden',
        containerType: 'inline-size',
        containerName: BOX,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
        cursor: 'default',
        animation: 'photoDetailsIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        '@keyframes photoDetailsIn': { from: { opacity: 0 } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {/* The photo itself, blurred, behind everything: it also fills the space when a small photo grows. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: -32,
          backgroundImage: current ? `url("${current.url}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(22px) saturate(1.2) brightness(0.85)',
        }}
      />
      <Box
        aria-hidden
        sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,14,0.5) 0%, rgba(10,10,14,0.42) 45%, rgba(10,10,14,0.7) 100%)' }}
      />

      <Box
        ref={contentRef}
        sx={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          rowGap: '14px',
          p: '20px',
          [small]: { p: '14px', rowGap: '10px' },
          animation: 'photoDetailsRise 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          '@keyframes photoDetailsRise': { from: { transform: 'translateY(6px)' } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {/* Which photo, when there are several: its own thumbnail, unblurred, so it is obvious. */}
        <Box ref={headerRef} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 24 }}>
          <Typography
            component="h3"
            sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, m: 0 }}
          >
            Image details
          </Typography>
          {photos.length > 1 && (
            <Box role="tablist" aria-label="Photo" sx={{ display: 'flex', gap: 0.75 }}>
              {photos.map((photo, i) => (
                <Box
                  key={`${photo.url}:${i}`}
                  component="button"
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Photo ${i + 1}`}
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onIndexChange(i); }}
                  sx={{
                    width: 30,
                    height: 30,
                    p: 0,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: i === index ? '#fff' : 'rgba(255,255,255,0.25)',
                    opacity: i === index ? 1 : 0.7,
                    background: 'none',
                    transition: 'opacity 120ms, border-color 120ms',
                    '&:hover': { opacity: 1 },
                    '&:focus-visible': { outline: '2px solid #fff', outlineOffset: 2 },
                  }}
                >
                  <Box component="img" src={fitWidth(photo.url, 96) ?? photo.url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box ref={bodyRef} sx={{ display: 'grid', rowGap: '14px', [small]: { rowGap: '10px' } }}>
          {/* What made it, when the file's Content Credentials say. The most direct answer, so first. */}
          {(source || madeBy) && (
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px' }}>
              {source && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1.1,
                    py: 0.4,
                    borderRadius: 999,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textShadow: 'none',
                    bgcolor: tone.bg,
                    border: `1px solid ${tone.border}`,
                    color: tone.color,
                  }}
                >
                  {source.tone === 'ai' ? <IconSparkles size={14} /> : source.tone === 'capture' ? <IconCamera size={14} /> : <IconCertificate size={14} />}
                  {source.label}
                </Box>
              )}
              {madeBy && (
                <Typography sx={{ fontSize: '0.8rem', opacity: 0.88, minWidth: 0 }}>{madeBy}</Typography>
              )}
            </Box>
          )}

          <Box
            component="dl"
            sx={{
              m: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '12px 18px',
              [small]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 14px' },
            }}
          >
            {rows.map((row) => <Fact key={row.label} row={row} />)}
          </Box>

          {/* Clear of the close button, which sits in the bottom-right corner. */}
          <Box sx={{ pr: 5, minWidth: 0, borderTop: '1px solid rgba(255,255,255,0.18)', pt: '10px' }}>
            {posted && (
              <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.35 }}>
                <Box component="span" sx={{ opacity: 0.75 }}>Posted </Box>
                {posted}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.4, fontSize: '0.7rem', lineHeight: 1.35, opacity: 0.7 }}>
              <IconLock size={12} style={{ flex: '0 0 auto', marginTop: 1 }} />
              As recorded in the file, not verified. Location is never stored or shown.
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PhotoDetailsOverlay;
