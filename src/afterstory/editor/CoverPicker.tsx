/**
 * The cover: one image, or one video, never both.
 *
 * A story shows exactly one moving image and this is it. Extra videos go in a
 * "More links" block at the end, as cards. That rule is what keeps a story page
 * from turning into a wall of competing autoplay, and it is enforced here rather
 * than left to the author's restraint.
 */

import React from 'react';
import { Box, Button, IconButton, Tab, Tabs, TextField, Typography, useTheme } from '@mui/material';
import { IconTrash, IconPhotoPlus, IconBrandYoutube } from '@tabler/icons-react';
import StoryVideoCover from '../render/StoryVideoCover';
import { UploadDropZone } from './BlockEditors';
import { useUpload } from './useUpload';
import { parseVideoUrl, defaultThumbUrl, toProviderKey } from '../videoEmbed';
import type { StoryDraft } from '../types';
import { STORY_FIELD_SX } from '../storyFormat';

interface CoverPickerProps {
  draft: StoryDraft;
  onChange: (patch: Partial<StoryDraft>) => void;
  onUpload: (file: File) => Promise<string>;
}

const CoverPicker: React.FC<CoverPickerProps> = ({ draft, onChange, onUpload }) => {
  const theme = useTheme();
  const { busy, error, pick } = useUpload(onUpload);

  const [tab, setTab] = React.useState<'image' | 'video'>(draft.coverKind === 'Video' ? 'video' : 'image');
  const [videoInput, setVideoInput] = React.useState('');
  const [videoError, setVideoError] = React.useState<string | null>(null);

  const providerKey = toProviderKey(draft.coverVideoProvider);

  const clear = () =>
    onChange({
      coverKind: 'None',
      coverImageUrl: null,
      coverVideoProvider: null,
      coverVideoId: null,
      coverVideoThumbUrl: null,
    });

  const applyVideo = () => {
    const parsed = parseVideoUrl(videoInput);
    if (!parsed) {
      setVideoError('That is not a YouTube or Vimeo link we can read.');
      return;
    }
    onChange({
      coverKind: 'Video',
      coverImageUrl: null,
      coverVideoProvider: parsed.provider === 'youtube' ? 'YouTube' : 'Vimeo',
      coverVideoId: parsed.id,
      // Vimeo has no predictable poster path, so the server resolves that one
      // through oEmbed on save and this stays null until it comes back.
      coverVideoThumbUrl: defaultThumbUrl(parsed.provider, parsed.id),
    });
    setVideoInput('');
    setVideoError(null);
  };

  const hasCover = draft.coverKind !== 'None';

  return (
    <Box
      sx={{
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {hasCover && (
        <Box sx={{ position: 'relative' }}>
          {draft.coverKind === 'Video' && providerKey && draft.coverVideoId ? (
            <StoryVideoCover
              provider={providerKey}
              videoId={draft.coverVideoId}
              thumbUrl={draft.coverVideoThumbUrl}
              title={draft.title || 'Story cover'}
              height={{ xs: 200, md: 260 }}
            />
          ) : (
            draft.coverImageUrl && (
              <Box
                component="img"
                src={draft.coverImageUrl}
                alt=""
                sx={{ display: 'block', width: '100%', height: { xs: 200, md: 260 }, objectFit: 'cover' }}
              />
            )
          )}

          <IconButton
            aria-label="Remove cover"
            onClick={clear}
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              color: '#fff',
              bgcolor: 'rgba(15,15,19,0.5)',
              '&:hover': { bgcolor: 'rgba(15,15,19,0.7)' },
            }}
          >
            <IconTrash size={16} />
          </IconButton>
        </Box>
      )}

      <Box sx={{ p: 2 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Cover
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          sx={{ minHeight: 36, mb: 1.5, borderBottom: `1px solid ${theme.custom.surface.border}` }}
        >
          <Tab
            value="image"
            label="Photo"
            disableRipple
            icon={<IconPhotoPlus size={15} />}
            iconPosition="start"
            sx={{ minHeight: 36, py: 0 }}
          />
          <Tab
            value="video"
            label="Video"
            disableRipple
            icon={<IconBrandYoutube size={15} />}
            iconPosition="start"
            sx={{ minHeight: 36, py: 0 }}
          />
        </Tabs>

        {tab === 'image' ? (
          <>
            <UploadDropZone
              busy={busy}
              label={draft.coverKind === 'Image' ? 'Replace the cover photo' : 'Add a cover photo'}
              onPick={(file) =>
                pick(file, (url) =>
                  onChange({
                    coverKind: 'Image',
                    coverImageUrl: url,
                    coverVideoProvider: null,
                    coverVideoId: null,
                    coverVideoThumbUrl: null,
                  }),
                )
              }
            />
            {error && (
              <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                {error}
              </Typography>
            )}
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Paste a YouTube or Vimeo link"
                value={videoInput}
                onChange={(e) => {
                  setVideoInput(e.target.value);
                  setVideoError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyVideo();
                  }
                }}
                error={Boolean(videoError)}
                helperText={videoError}
                sx={STORY_FIELD_SX}
              />
              <Button onClick={applyVideo} sx={{ flexShrink: 0 }}>
                Use it
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              It plays silently on a loop when readers scroll to it. Only one video can be the cover; add any
              others in a "More links" block at the end.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default CoverPicker;
