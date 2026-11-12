import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useAuthToken } from '../../hooks/useAuth0Token';
import { useRequireAuth } from '../../auth/AuthGate';
import { apiServices } from '../../services/APIs/apiServices';
import { UploadError, uploadSignedAsset, uploadSignedVideo } from '../../utils/signedUpload';

const SIGN_URL = '/api/feedback/media/upload-url';
/** Matches FeedbackAttachmentRules on the server: four photos and a video. */
const MAX_PHOTOS = 4;
const MAX_VIDEOS = 1;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];

type Attachment = {
  id: string;
  kind: 'photo' | 'video';
  name: string;
  /** A local object URL, for the thumbnail while and after it uploads. */
  preview: string;
  state: 'uploading' | 'done' | 'failed';
  progress: number;
  url?: string;
  error?: string;
};

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Tell Us Everything": the feedback form, with screenshots and a screen recording.
 *
 * Customers asked for two things here: a way to show a problem rather than
 * describe it, and a close button at the top like every other dialog. Files
 * upload as soon as they are picked, so Send is instant; Send waits only while
 * something is still going up.
 *
 * The X and the backdrop close it and keep the draft (it lives in this
 * component, which stays mounted). Cancel throws the draft away.
 */
const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const auth = useAuthToken();
  const requireAuth = useRequireAuth();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = React.useState('');
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');
  const [pickError, setPickError] = React.useState('');
  const [creditsGranted, setCreditsGranted] = React.useState(0);

  // Object URLs hold the file in memory until revoked.
  const previewsRef = React.useRef<string[]>([]);
  React.useEffect(() => () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p)), []);

  const patch = (id: string, next: Partial<Attachment>) =>
    setAttachments((list) => list.map((a) => (a.id === id ? { ...a, ...next } : a)));

  const upload = async (item: Attachment, file: File) => {
    try {
      const stored = item.kind === 'video'
        ? await uploadSignedVideo({
          signUrl: SIGN_URL,
          file,
          signBody: { kind: 'video' },
          onProgress: (fraction) => patch(item.id, { progress: fraction }),
        })
        : await uploadSignedAsset({ signUrl: SIGN_URL, file, signBody: { kind: 'photo' } });
      patch(item.id, { state: 'done', progress: 1, url: stored.url });
    } catch (err) {
      patch(item.id, {
        state: 'failed',
        error: err instanceof UploadError ? err.message : 'That file could not be uploaded.',
      });
    }
  };

  const onPick = (files: File[]) => {
    setPickError('');
    if (files.length === 0) return;

    let photos = attachments.filter((a) => a.kind === 'photo' && a.state !== 'failed').length;
    let videos = attachments.filter((a) => a.kind === 'video' && a.state !== 'failed').length;
    const added: Array<{ item: Attachment; file: File }> = [];
    const refused: string[] = [];

    files.forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isPhoto = file.type.startsWith('image/');
      if (!isVideo && !isPhoto) { refused.push(`${file.name} is not a photo or a video.`); return; }
      if (isVideo && !VIDEO_TYPES.includes(file.type)) { refused.push(`${file.name}: use an MP4, MOV or WebM video.`); return; }
      if (isVideo && file.size > MAX_VIDEO_BYTES) { refused.push(`${file.name} is over 50 MB. Trim it, or send a shorter clip.`); return; }
      if (isVideo && videos >= MAX_VIDEOS) { refused.push('One video per message.'); return; }
      if (isPhoto && photos >= MAX_PHOTOS) { refused.push(`Up to ${MAX_PHOTOS} photos per message.`); return; }

      if (isVideo) videos += 1; else photos += 1;
      const preview = URL.createObjectURL(file);
      previewsRef.current.push(preview);
      added.push({
        file,
        item: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: isVideo ? 'video' : 'photo',
          name: file.name,
          preview,
          state: 'uploading',
          progress: 0,
        },
      });
    });

    if (refused.length > 0) setPickError(Array.from(new Set(refused)).join(' '));
    if (added.length === 0) return;
    setAttachments((list) => [...list, ...added.map((a) => a.item)]);
    added.forEach(({ item, file }) => void upload(item, file));
  };

  const remove = (id: string) => {
    setAttachments((list) => {
      const gone = list.find((a) => a.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((a) => a.id !== id);
    });
  };

  const reset = () => {
    attachments.forEach((a) => URL.revokeObjectURL(a.preview));
    setAttachments([]);
    setMessage('');
    setDone(false);
    setError('');
    setPickError('');
  };

  const uploading = attachments.some((a) => a.state === 'uploading');
  const ready = attachments.filter((a) => a.state === 'done' && a.url).map((a) => a.url as string);
  const canSend = !sending && !done && !uploading && (message.trim().length > 0 || ready.length > 0);
  const photoCount = attachments.filter((a) => a.kind === 'photo').length;
  const videoCount = attachments.filter((a) => a.kind === 'video').length;
  const full = photoCount >= MAX_PHOTOS && videoCount >= MAX_VIDEOS;

  // Signed out, Send used to do nothing at all. Now it says why, the same way the rest of the site does.
  const SIGN_IN_REASON = 'Sign in to send feedback, so a person can reply to you.';

  const send = async () => {
    if (!canSend) return;
    if (!requireAuth({ reason: SIGN_IN_REASON }) || !auth.token) return;
    setSending(true);
    setError('');
    try {
      const resp = await apiServices.sendFeedback(auth.token, message.trim(), ready);
      setCreditsGranted(Number(resp?.data?.creditsGranted) || 0);
      setDone(true);
      setTimeout(() => {
        onClose();
        reset();
        setCreditsGranted(0);
      }, 2400);
    } catch (err) {
      const serverMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(serverMessage || "Couldn't send that - please try again.");
    } finally {
      setSending(false);
    }
  };

  const tint = theme.palette.mode === 'light' ? 'rgba(156,39,176,0.04)' : 'rgba(206,147,216,0.1)';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="feedback-dialog-title"
    >
      <DialogTitle id="feedback-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1.5 }}>
        <FeedbackOutlinedIcon color="secondary" />
        <Box component="span" sx={{ flex: 1 }}>Tell Us Everything</Box>
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close feedback" edge="end">
            <CloseRoundedIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent dividers sx={{ backgroundColor: tint }}>
        <Stack spacing={2}>
          <Chip
            icon={<SendRoundedIcon fontSize="small" />}
            label="A human reads every message."
            color="secondary"
            variant="outlined"
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          />
          <Typography variant="body2" color="text.secondary">
            Loved something? Hit a bump? Wish a feature existed? This is the fastest way to shape Tripician.
            A screenshot or a short screen recording helps us see exactly what you saw.
          </Typography>
          <TextField
            label="Your thoughts"
            placeholder="e.g. The planner timeline is great, but..."
            fullWidth
            multiline
            minRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending || done}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: theme.palette.mode === 'light' ? 'common.white' : 'background.paper' } }}
          />

          {/* Attachments */}
          <Box>
            <input
              ref={inputRef}
              type="file"
              accept={`image/*,${VIDEO_TYPES.join(',')}`}
              multiple
              hidden
              onChange={(e) => {
                // Copied before the reset: the FileList is live and the reset empties it.
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                onPick(files);
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddPhotoAlternateOutlinedIcon />}
                onClick={() => { if (requireAuth({ reason: SIGN_IN_REASON })) inputRef.current?.click(); }}
                disabled={sending || done || full}
                sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 600 }}
              >
                Add photos or a video
              </Button>
              <Typography variant="caption" color="text.secondary">
                Up to {MAX_PHOTOS} photos and 1 video (50 MB)
              </Typography>
            </Box>

            {attachments.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mt: 1.5 }}>
                {attachments.map((a) => (
                  <Box
                    key={a.id}
                    title={a.state === 'failed' ? a.error : a.name}
                    sx={{
                      position: 'relative',
                      width: 84,
                      height: 84,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: a.state === 'failed' ? 'error.main' : 'divider',
                    }}
                  >
                    {a.kind === 'photo' ? (
                      <Box component="img" src={a.preview} alt={a.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <Box component="video" src={a.preview} muted playsInline preload="metadata" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}

                    {a.kind === 'video' && a.state === 'done' && (
                      <PlayCircleOutlineRoundedIcon
                        sx={{ position: 'absolute', inset: 0, m: 'auto', color: 'common.white', fontSize: 30, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                      />
                    )}

                    {a.state === 'uploading' && (
                      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: alpha(theme.palette.common.black, 0.45) }}>
                        <CircularProgress
                          size={28}
                          sx={{ color: 'common.white' }}
                          variant={a.kind === 'video' && a.progress > 0 ? 'determinate' : 'indeterminate'}
                          value={Math.round(a.progress * 100)}
                          aria-label={`Uploading ${a.name}`}
                        />
                      </Box>
                    )}

                    {a.state === 'failed' && (
                      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: alpha(theme.palette.error.main, 0.55) }}>
                        <ErrorOutlineRoundedIcon sx={{ color: 'common.white' }} />
                      </Box>
                    )}

                    <IconButton
                      size="small"
                      onClick={() => remove(a.id)}
                      aria-label={`Remove ${a.name}`}
                      disabled={sending || done}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 22,
                        height: 22,
                        bgcolor: alpha(theme.palette.common.black, 0.6),
                        color: 'common.white',
                        '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.8) },
                      }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {attachments.some((a) => a.state === 'failed') && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {attachments.filter((a) => a.state === 'failed').map((a) => `${a.name}: ${a.error}`).join(' ')}
              </Typography>
            )}
            {pickError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>{pickError}</Typography>
            )}
          </Box>

          {done && (
            <Typography variant="body2" color="success.main" fontWeight={600}>
              {creditsGranted > 0
                ? `✓ Sent - thank you! +${creditsGranted} bonus AI credits added 🎉`
                : '✓ Sent - thank you for making Tripician better!'}
            </Typography>
          )}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => { onClose(); reset(); }}>Cancel</Button>
        <Button variant="contained" disabled={!canSend} onClick={() => void send()}>
          {sending ? 'Sending…' : done ? 'Sent ✓' : uploading ? 'Uploading…' : 'Send feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
