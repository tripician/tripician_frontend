/**
 * Media blocks: photo, gallery, related.
 *
 * The related block is where a story's extra videos live. It renders thumbnail
 * cards that open in a new tab, never inline players. A story shows exactly one
 * moving image and that is the cover, so this is the block that keeps that rule
 * true no matter how many links the author adds.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { IconExternalLink, IconPlayerPlayFilled } from '@tabler/icons-react';
import { safeExternalUrl } from '../../../utils/sanitizeHtml';
import type { StoryTemplateStyle } from '../templates';
import type { StoryBlock } from '../../types';

interface BlockProps<T extends StoryBlock> {
  block: T;
  style: StoryTemplateStyle;
}

function captionSx(style: StoryTemplateStyle) {
  return {
    mt: 1.25,
    color: 'text.secondary',
    textAlign: style.captionAlign,
    ...(style.captionCaps
      ? { textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontSize: '0.6875rem', fontWeight: 600 }
      : {}),
  };
}

/**
 * Photo width is the main lever a template has over rhythm, so it is resolved
 * here rather than baked into the block: the same story reads differently as a
 * journal and as a photo essay without a single stored value changing.
 */
export const StoryPhotoBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'photo' }>>> = ({ block, style }) => {
  const theme = useTheme();
  const [failed, setFailed] = React.useState(false);

  const url = safeExternalUrl(block.url);
  if (!url || failed) return null;

  const width =
    block.width === 'full'
      ? { width: '100vw', marginLeft: 'calc(50% - 50vw)', borderRadius: 0 }
      : block.width === 'wide'
        ? { width: '100%', maxWidth: 1080, borderRadius: '16px' }
        : { width: '100%', maxWidth: `${style.measure + 12}ch`, borderRadius: '16px' };

  return (
    <Box component="figure" sx={{ margin: 0 }}>
      <Box
        component="img"
        src={url}
        alt={block.alt ?? block.caption ?? ''}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        sx={{
          display: 'block',
          objectFit: 'cover',
          maxHeight: block.width === 'full' ? '86vh' : 720,
          border: block.width === 'full' ? 'none' : `1px solid ${theme.custom.surface.border}`,
          ...width,
        }}
      />
      {block.caption && (
        <Typography
          component="figcaption"
          variant="body2"
          sx={{ ...captionSx(style), maxWidth: `${style.measure}ch` }}
        >
          {block.caption}
        </Typography>
      )}
    </Box>
  );
};

export const StoryGalleryBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'gallery' }>>> = ({
  block,
  style,
}) => {
  const theme = useTheme();

  const items = block.items.map((item) => ({ ...item, safe: safeExternalUrl(item.url) })).filter((i) => i.safe);
  if (items.length === 0) return null;

  // Two photos side by side read as a pair; three or more want a grid that can
  // wrap without stranding a single image on its own row.
  const columns =
    items.length === 2
      ? { xs: '1fr', sm: 'repeat(2, 1fr)' }
      : { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' };

  if (block.layout === 'strip') {
    return (
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          pb: 1,
          '::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {items.map((item, index) => (
          <Box key={`${item.safe}-${index}`} sx={{ flex: '0 0 auto', scrollSnapAlign: 'start' }}>
            <Box
              component="img"
              src={item.safe as string}
              alt={item.alt ?? item.caption ?? ''}
              loading="lazy"
              decoding="async"
              sx={{
                display: 'block',
                width: { xs: 260, sm: 320 },
                height: { xs: 200, sm: 240 },
                objectFit: 'cover',
                borderRadius: '16px',
                border: `1px solid ${theme.custom.surface.border}`,
              }}
            />
            {item.caption && (
              <Typography variant="caption" sx={{ ...captionSx(style), display: 'block', maxWidth: 320 }}>
                {item.caption}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: columns, gap: 1.5 }}>
      {items.map((item, index) => (
        <Box key={`${item.safe}-${index}`}>
          <Box
            component="img"
            src={item.safe as string}
            alt={item.alt ?? item.caption ?? ''}
            loading="lazy"
            decoding="async"
            sx={{
              display: 'block',
              width: '100%',
              aspectRatio: '4 / 3',
              objectFit: 'cover',
              borderRadius: '16px',
              border: `1px solid ${theme.custom.surface.border}`,
            }}
          />
          {item.caption && (
            <Typography variant="caption" sx={{ ...captionSx(style), display: 'block' }}>
              {item.caption}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

export const StoryRelatedBlock: React.FC<BlockProps<Extract<StoryBlock, { type: 'related' }>>> = ({ block }) => {
  const theme = useTheme();

  const items = block.items.map((item) => ({ ...item, safe: safeExternalUrl(item.url) })).filter((i) => i.safe);
  if (items.length === 0) return null;

  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        More from this trip
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {items.map((item, index) => (
          <Box
            key={`${item.safe}-${index}`}
            component="a"
            href={item.safe as string}
            target="_blank"
            rel="noopener noreferrer nofollow"
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
              p: 1.25,
              textDecoration: 'none',
              borderRadius: '16px',
              border: `1px solid ${theme.custom.surface.border}`,
              bgcolor: 'background.paper',
              boxShadow: theme.custom.shadows.card,
              transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
              '&:hover': { boxShadow: theme.custom.shadows.cardHover },
              '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                flex: '0 0 auto',
                width: 108,
                height: 68,
                borderRadius: '10px',
                overflow: 'hidden',
                bgcolor: theme.custom.surface.active,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {item.thumbUrl && (
                <Box
                  component="img"
                  src={item.thumbUrl}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              {/* A play badge, not a player. Nothing here autoplays. */}
              {item.kind === 'video' ? (
                <Box
                  sx={{
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    color: '#fff',
                    bgcolor: 'rgba(15,15,19,0.62)',
                  }}
                >
                  <IconPlayerPlayFilled size={14} />
                </Box>
              ) : (
                <Box sx={{ position: 'relative', color: 'text.secondary' }}>
                  <IconExternalLink size={18} />
                </Box>
              )}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'text.primary',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.title ?? hostOf(item.safe as string)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {hostOf(item.safe as string)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}
