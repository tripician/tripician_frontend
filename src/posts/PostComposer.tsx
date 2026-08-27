import React from 'react';
import {
  Alert, Avatar, Box, Button, CircularProgress, IconButton, InputBase, Typography, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useRequireAuth } from '../auth/AuthGate';
import { takeDraft } from '../utils/pendingDraft';
import { useSelector } from 'react-redux';
import { IconPhotoPlus, IconMapPin } from '@tabler/icons-react';
import type { RootState } from '../store';
import { BRAND } from '../theme';
import { postsService, UploadError } from './postsService';
import { POST_LIMITS, PostRejectedError } from './types';
import type { PostKind, PostTagCount } from './types';
import SegmentedControl from '../components/ui/SegmentedControl';
import TagPicker from './TagPicker';
import PhotoMosaic from '../components/ui/PhotoMosaic';
import type { PostMediaInput, TravelerPost } from './types';

interface PostComposerProps {
  /** Set on a reply, which drops the place field and shortens the copy. */
  parentPostId?: string | null;
  /** What the send button says on a reply. The composer cannot know what it is answering. */
  submitLabel?: string;
  placeholder?: string;
  onPosted?: (post: TravelerPost) => void;
  compact?: boolean;
}

/**
 * Say something now.
 *
 * The counterpart to the Navia command bar, and deliberately its opposite: that
 * one is about a trip you have not taken, this is about the one you are on.
 *
 * Every post is checked before it goes out. A refusal is shown plainly, and the
 * pictures are already gone by then, so the previews clear rather than offering
 * a retry that would upload nothing.
 */
const PostComposer: React.FC<PostComposerProps> = ({
  parentPostId = null, placeholder, onPosted, compact = false, submitLabel,
}) => {
  const theme = useTheme();
  const requireAuth = useRequireAuth();
  const profile = useSelector((s: RootState) => s.user.profile);

  // Scoped to what is being written, so a reply draft cannot surface on the feed.
  const draftKey = parentPostId ? `post-reply:${parentPostId}` : 'post:new';

  const [body, setBody] = React.useState(() => takeDraft(draftKey) ?? '');
  const [kind, setKind] = React.useState<PostKind>('note');
  const [title, setTitle] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [topics, setTopics] = React.useState<PostTagCount[]>([]);
  const [focused, setFocused] = React.useState(false);
  const [place, setPlace] = React.useState('');
  const [placeOpen, setPlaceOpen] = React.useState(false);
  const [media, setMedia] = React.useState<PostMediaInput[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (parentPostId) return;
    let active = true;
    void postsService.tags().then((rows) => { if (active) setTopics(rows); });
    return () => { active = false; };
  }, [parentPostId]);

  /*
   * True once somebody is actually writing.
   *
   * The card keeps its switch, its icons and its button at rest, because those
   * are what tell you what it can do. What it drops is the part that only
   * matters mid-sentence: the second row of the field, and the rule about
   * pictures, which at rest was small print on a card nobody had touched.
   *
   * The helper line beside the switch is gone outright. It read "Say what is
   * happening where you are", forty pixels from a placeholder reading "What is
   * happening where you are?".
   */
  const open = focused || body.length > 0 || title.length > 0 || media.length > 0 || Boolean(error);

  const isQuestion = kind === 'question' && !parentPostId;
  const bodyCap = isQuestion ? POST_LIMITS.maxQuestionBody : POST_LIMITS.maxBody;
  const remaining = bodyCap - body.length;
  const canPost = (body.trim().length > 0 || media.length > 0)
    && (!isQuestion || title.trim().length > 0)
    && !busy && !uploading;
  const displayName = profile ? `${profile.fname ?? ''}`.trim() : '';

  const pickPhotos = async (files: File[]) => {
    const room = POST_LIMITS.maxPhotos - media.length;
    if (room <= 0) return;

    setUploading(true);
    setError(null);
    try {
      // Sequential, not parallel: four uploads at once stalls a phone connection,
      // which is exactly where these get written.
      for (const file of files.slice(0, room)) {
        const asset = await postsService.uploadPhoto(file);
        setMedia((prev) => [...prev, asset]);
      }
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'That picture did not upload.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!canPost) return;
    // Was a bounce to /signin?next=/community, which returned a guest replying on
    // a permalink to the wrong page entirely.
    if (!requireAuth({
      reason: parentPostId
        ? 'Your reply is saved. Sign in and it posts where you left it.'
        : 'Your post is saved. Sign in and it goes out where you left it.',
      draft: { key: draftKey, text: body },
    })) return;

    setBusy(true);
    setError(null);
    try {
      const post = await postsService.create({
        body: body.trim(),
        placeName: place.trim() || null,
        parentPostId,
        media,
        kind: parentPostId ? undefined : kind,
        title: isQuestion ? title.trim() : null,
        tags: parentPostId ? undefined : tags,
      });
      setBody('');
      setPlace('');
      setPlaceOpen(false);
      setMedia([]);
      setTitle('');
      setTags([]);
      setFocused(false);
      onPosted?.(post);
    } catch (err) {
      // A rejection has already destroyed the uploads server-side, so the
      // previews go too. Leaving them would offer a retry that posts nothing.
      if (err instanceof PostRejectedError) setMedia([]);
      setError(err instanceof Error ? err.message : 'That could not be posted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      onClick={open ? undefined : () => bodyRef.current?.focus()}
      sx={{
        borderRadius: '16px',
        border: `1px solid ${theme.custom.surface.border}`,
        bgcolor: 'background.paper',
        boxShadow: compact ? 'none' : theme.custom.shadows.card,
        p: compact ? 1.75 : 2.25,
        width: '100%',
        // Fills an equal-height row when it is in one; resolves to auto when it
        // is alone, which is how /posts and a reply still look unchanged.
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: open ? 'default' : 'text',
        transition: `box-shadow ${theme.custom.motion.duration.base} ${theme.custom.motion.easing.standard}`,
      }}
    >
      {/* The helper sentence that used to sit beside this said the same words as
          the placeholder, forty pixels apart. The placeholder keeps them. */}
      {!compact && !parentPostId && (
        <Box sx={{ mb: 1.5 }}>
          <SegmentedControl
            value={kind}
            options={[
              { value: 'note' as PostKind, label: 'Note', tip: 'Something happening now' },
              { value: 'question' as PostKind, label: 'Question', tip: 'Something you need answered' },
            ]}
            onChange={setKind}
            size="small"
            aria-label="What are you posting"
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
        <Avatar
          src={profile?.profilepicture ?? undefined}
          sx={{
            width: 34, height: 34, fontSize: 14, bgcolor: 'primary.main',
            // The row stretches now, so this has to opt out of it.
            flexShrink: 0, alignSelf: 'flex-start',
          }}
        >
          {(displayName || 'T').charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {isQuestion && (
            <InputBase
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, POST_LIMITS.maxTitle))}
              placeholder="Ask it in one line. Is there an issue with VietJet flights?"
              sx={{ fontSize: 16.5, fontWeight: 700, color: 'text.primary', mb: 0.75 }}
            />
          )}
          <InputBase
            fullWidth
            multiline
            minRows={open ? (compact ? 1 : 2) : 1}
            maxRows={8}
            value={body}
            inputRef={bodyRef}
            onFocus={() => setFocused(true)}
            onChange={(e) => setBody(e.target.value.slice(0, bodyCap))}
            placeholder={placeholder ?? (!open
              ? 'Say something, or ask something'
              : isQuestion
                ? 'What do you need to know? Where are you going, and what have you already tried?'
                : 'What is happening where you are? A queue worth skipping, a meal worth the detour.')}
            sx={{ fontSize: 15, lineHeight: 1.55, color: 'text.primary' }}
          />

          {placeOpen && (
            <InputBase
              fullWidth
              value={place}
              onChange={(e) => setPlace(e.target.value.slice(0, 120))}
              placeholder="Where? Hampi, Karnataka"
              autoFocus
              sx={{ fontSize: 13.5, color: 'text.secondary', mt: 0.5 }}
            />
          )}

          {/* A preview of the post, not a row of file chips. What you see here is
              the layout it will have once it goes out. */}
          {(media.length > 0 || uploading) && (
            <Box sx={{ mt: 1.25 }}>
              <PhotoMosaic
                photos={media.map((m) => ({ url: m.url, id: m.publicId }))}
                uploading={uploading}
                onRemove={(i) => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                rounded={10}
              />
            </Box>
          )}

          {isQuestion && topics.length > 0 && (
            <Box sx={{ mt: 1.75 }}>
              <TagPicker topics={topics} value={tags} onChange={setTags} />
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto', pt: 1.25 }}>
            <IconButton
              size="small"
              aria-label="Add a picture"
              disabled={uploading || media.length >= POST_LIMITS.maxPhotos}
              onClick={() => fileRef.current?.click()}
              sx={{ color: 'text.secondary' }}
            >
              {uploading && media.length === 0 ? <CircularProgress size={16} /> : <IconPhotoPlus size={18} />}
            </IconButton>

            {!parentPostId && (
              <IconButton
                size="small"
                aria-label="Add a place"
                onClick={() => setPlaceOpen((v) => !v)}
                sx={{ color: placeOpen || place ? 'primary.main' : 'text.secondary' }}
              >
                <IconMapPin size={18} />
              </IconButton>
            )}

            <Box sx={{ flex: 1 }} />

            {body.length > POST_LIMITS.maxBody - 40 && (
              <Typography
                variant="caption"
                sx={{ color: remaining <= 0 ? 'error.main' : 'text.disabled', fontWeight: 700 }}
              >
                {remaining}
              </Typography>
            )}

            <Button
              variant="contained"
              size="small"
              disabled={!canPost}
              onClick={() => void submit()}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px', px: 2.25, ml: 0.5 }}
            >
              {busy ? 'Checking' : parentPostId ? (submitLabel ?? 'Reply') : isQuestion ? 'Ask' : 'Post'}
            </Button>
          </Box>
        </Box>
      </Box>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          /*
           * Copied out BEFORE the reset, and that order is the whole thing.
           *
           * `e.target.files` is a live FileList owned by the input, not a
           * snapshot. Clearing `value` to make the same file re-selectable also
           * empties the very list just captured, so the length check below saw
           * zero and the upload never started. Photos on a post have never
           * worked because of these two lines.
           *
           * Every other picker here already does it this way; see
           * BlockEditors.tsx and PlanImportControls.tsx.
           */
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length > 0) void pickPhotos(files);
        }}
      />

      {error && (
        <Alert
          severity="warning"
          onClose={() => setError(null)}
          sx={{
            mt: 1.5, borderRadius: '12px', fontSize: 13,
            bgcolor: alpha(BRAND.coral, 0.06),
            border: `1px solid ${alpha(BRAND.coral, 0.25)}`,
          }}
        >
          {error}
        </Alert>
      )}

      {/* A rule about posting, shown to somebody who is posting. At rest it was a
          line of small print on a card nobody had touched. */}
      {!compact && !error && open && (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1.25 }}>
          Every post is checked before it goes out. Pictures only, no video.
        </Typography>
      )}
    </Box>
  );
};

export default PostComposer;
