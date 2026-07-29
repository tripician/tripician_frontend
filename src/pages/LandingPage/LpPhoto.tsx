import React from 'react';

/**
 * Photo slot for the landing page.
 *
 * The page had no image primitive at all - the single working `<img>` carried
 * inline styles with no `loading`, no `decoding` and no reserved height, so every
 * copy of it shifted the layout as it loaded. This reserves space via
 * aspect-ratio, lazy-loads below the fold, and degrades to the brand gradient if
 * the photo 404s, so a missing image never leaves a blank hole.
 */
interface LpPhotoProps {
  src?: string;
  alt: string;
  /** CSS aspect-ratio, e.g. '4 / 3'. Reserves space before the image loads. */
  ratio?: string;
  /** Hero and other above-the-fold images should load eagerly. */
  priority?: boolean;
  className?: string;
  /** Rendered over the photo, e.g. a caption. Gets a legibility scrim. */
  overlay?: React.ReactNode;
  rounded?: number | string;
}

const LpPhoto: React.FC<LpPhotoProps> = ({
  src, alt, ratio = '4 / 3', priority = false, className, overlay, rounded = 16,
}) => {
  const [failed, setFailed] = React.useState(false);
  const showPhoto = !!src && !failed;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        aspectRatio: ratio,
        width: '100%',
        borderRadius: typeof rounded === 'number' ? `${rounded}px` : rounded,
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #2a1420 0%, #1c1018 55%, #12090e 100%)',
      }}
    >
      {showPhoto && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {overlay && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'flex-end',
            padding: '14px 16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)',
            color: '#fff',
          }}
        >
          {overlay}
        </div>
      )}
    </div>
  );
};

export default LpPhoto;
