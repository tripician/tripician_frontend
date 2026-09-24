/**
 * The plan or story a post carries, as one line.
 *
 * Deliberately a strip and not a card. A post that embeds a 4:5 jacket stops
 * being a post and becomes a trip card with a caption on it, and the board is a
 * column of people talking. The ribbon on the post says what kind of thing this
 * is; this says which one, and gets out of the way.
 *
 * Nothing in the component library goes this small. TripListingCard and StoryCard
 * are both around 310 to 350px tall at their narrowest, and the only compact
 * idiom that existed was inline JSX inside the old recruiting rail.
 *
 * Everything here arrives resolved on the post: the cover, the meta line and the
 * href. The strip never fetches, and it never decides where a link goes.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconWorld, IconX } from '@tabler/icons-react';
import { CARD_TYPES } from '../components/ui/cardTypes';
import type { PostAttachment as Attachment } from './types';

interface PostAttachmentProps {
  attachment: Attachment;
  /** Preview mode for the composer: the strip does not navigate, and shows a remove control instead of a chevron. */
  onRemove?: () => void;
}

const THUMB = 40;

const PostAttachmentStrip: React.FC<PostAttachmentProps> = ({ attachment, onRemove }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [coverFailed, setCoverFailed] = React.useState(false);

  const spec = CARD_TYPES[attachment.kind];
  const cover = coverFailed ? null : attachment.coverUrl;
  // In the composer a tap must never navigate: it would throw away the unsent draft.
  const isPreview = Boolean(onRemove);

  return (
    <Box
      // A div in preview, because the remove control inside it is itself a button and buttons cannot nest.
      component={isPreview ? 'div' : 'button'}
      type={isPreview ? undefined : 'button'}
      // Stops the click reaching the post card, which is itself a link.
      onClick={isPreview ? undefined : (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(attachment.href);
      }}
      aria-label={isPreview ? undefined : `${spec.label}: ${attachment.title}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        width: '100%',
        mb: 1,
        p: 0.75,
        pr: 1,
        borderRadius: '12px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'transparent',
        cursor: isPreview ? 'default' : 'pointer',
        font: 'inherit',
        textAlign: 'left',
        transition: `background-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        '&:hover': isPreview ? undefined : { bgcolor: theme.custom.surface.hover, borderColor: 'text.disabled' },
        '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 2 },
      }}
    >
      <Box
        sx={{
          flex: '0 0 auto',
          width: THUMB,
          height: THUMB,
          borderRadius: '9px',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          // A plain tile rather than a guessed photograph. The server sends the
          // saved banner or nothing; inventing a stock country shot here would
          // put a picture of somewhere the traveller may not have been.
          bgcolor: theme.custom.surface.active,
          color: 'text.disabled',
        }}
      >
        {cover ? (
          <Box
            component="img"
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <IconWorld size={18} stroke={1.7} />
        )}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <spec.Icon size={12} stroke={2} />
          <Typography variant="overline" sx={{ lineHeight: 1.2 }}>
            {spec.label}
          </Typography>
        </Box>
        <Typography
          variant="subtitle2"
          noWrap
          sx={{ color: 'text.primary', lineHeight: 1.3 }}
        >
          {attachment.title}
        </Typography>
        {attachment.meta && (
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {attachment.meta}
          </Typography>
        )}
      </Box>

      {isPreview ? (
        <Box
          component="button"
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${attachment.title}`}
          sx={{
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            width: 28,
            height: 28,
            border: 0,
            borderRadius: '50%',
            bgcolor: 'transparent',
            color: 'text.secondary',
            cursor: 'pointer',
            '&:hover': { bgcolor: theme.custom.surface.hover, color: 'text.primary' },
            '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: 1 },
          }}
        >
          <IconX size={15} stroke={2} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexShrink: 0, color: 'text.disabled' }}>
          <IconChevronRight size={16} stroke={2} />
        </Box>
      )}
    </Box>
  );
};

export default PostAttachmentStrip;
