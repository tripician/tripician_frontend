import React from 'react';
import { Box, Button, CircularProgress, Dialog, IconButton, Popover, Tooltip, Typography, useTheme } from '@mui/material';
import { IconAlertCircle, IconCopy, IconLock, IconMapPin, IconMoodSmile, IconPencil, IconPhoto, IconX } from '@tabler/icons-react';
import { CHAT_REACTIONS, type ChatReaction } from './chatApi';
import { accuracyText, mapsLink, placeMapUrl, usePhoto } from './chatMedia';
import type { LocationRef, PhotoRef } from './e2ee/chatCrypto';
import { instant, type ThreadItem } from './useChat';

const MEDIA_WIDTH = 260;
const MEDIA_MAX_HEIGHT = 340;

function timeOf(iso: string) {
  return new Date(instant(iso)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function mediaSize(w: number, h: number) {
  const aspect = w > 0 && h > 0 ? w / h : 1;
  let width = MEDIA_WIDTH;
  let height = width / aspect;
  if (height > MEDIA_MAX_HEIGHT) {
    height = MEDIA_MAX_HEIGHT;
    width = Math.max(150, height * aspect);
  }
  return { width, height };
}

/** A photo in a message, opened in this browser from its sealed copy. */
const PhotoBox: React.FC<{ photo?: PhotoRef; previewUrl?: string; size: { width: number; height: number }; radius: string; onOpen?: () => void }> = ({
  photo, previewUrl, size, radius, onOpen,
}) => {
  const theme = useTheme();
  const opened = usePhoto(previewUrl ? undefined : photo);
  const src = previewUrl ?? (opened && opened !== 'failed' ? opened : null);
  return (
    <Box
      component={onOpen && src ? 'button' : 'div'}
      type={onOpen && src ? 'button' : undefined}
      onClick={onOpen && src ? onOpen : undefined}
      aria-label={onOpen && src ? 'Open photo' : undefined}
      sx={{
        ...size, p: 0, border: 'none', borderRadius: radius, overflow: 'hidden', display: 'grid', placeItems: 'center',
        bgcolor: theme.custom.surface.active, cursor: onOpen && src ? 'zoom-in' : 'default',
      }}
    >
      {src ? (
        <Box component="img" src={src} alt="Photo" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : opened === 'failed' ? (
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <IconPhoto size={26} />
          <Typography variant="caption" sx={{ display: 'block' }}>Photo unavailable</Typography>
        </Box>
      ) : (
        <CircularProgress size={22} />
      )}
    </Box>
  );
};

/** A shared place: a small map with a pin, how precise it is, and a link to Google Maps. */
const PlaceBox: React.FC<{ location: LocationRef; radius: string }> = ({ location, radius }) => {
  const theme = useTheme();
  const [mapFailed, setMapFailed] = React.useState(false);
  const url = placeMapUrl(location, MEDIA_WIDTH, 140);
  const precision = accuracyText(location.acc);
  return (
    <Box
      component="a"
      href={mapsLink(location)}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        width: MEDIA_WIDTH, display: 'block', borderRadius: radius, overflow: 'hidden', textDecoration: 'none', color: 'inherit',
        border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ height: 140, bgcolor: theme.custom.surface.active, display: 'grid', placeItems: 'center' }}>
        {url && !mapFailed ? (
          <Box component="img" src={url} alt="Map of the shared location" onError={() => setMapFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <IconMapPin size={30} color={theme.palette.primary.main} />
        )}
      </Box>
      <Box sx={{ px: 1.5, py: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconMapPin size={16} /> Shared location
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {precision ? `${precision} · ` : ''}Open in Google Maps
        </Typography>
      </Box>
    </Box>
  );
};

const Reactions: React.FC<{ reactions: ChatReaction[]; myUserId: number; onClick: (e: React.MouseEvent<HTMLElement>) => void }> = ({ reactions, myUserId, onClick }) => {
  const theme = useTheme();
  if (!reactions.length) return null;
  const kinds = Array.from(new Set(reactions.map((r) => r.emoji))).slice(0, 3);
  const mine = reactions.some((r) => r.userId === myUserId);
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={`Reactions: ${reactions.map((r) => r.emoji).join(' ')}`}
      sx={{
        mt: -1, mx: 1, px: 0.75, py: 0.125, display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
        borderRadius: '12px', border: `2px solid ${theme.palette.background.paper}`, fontFamily: 'inherit',
        bgcolor: mine ? theme.custom.surface.active : theme.palette.background.paper, position: 'relative', zIndex: 1,
      }}
    >
      <span style={{ fontSize: 14, lineHeight: '20px' }}>{kinds.join('')}</span>
      {reactions.length > 1 && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{reactions.length}</Typography>}
    </Box>
  );
};

/**
 * One message: words, a photo or a place (with words as its caption), its
 * reactions, and on hover a way to react or edit. Double click to heart it.
 */
export const ChatBubble: React.FC<{
  item: ThreadItem;
  mine: boolean;
  myUserId: number;
  joinedAbove: boolean;
  joinedBelow: boolean;
  seen: boolean;
  canReact: boolean;
  editable: boolean;
  onRetry: (i: ThreadItem) => void;
  onDiscard: (i: ThreadItem) => void;
  onReact: (i: ThreadItem, emoji: string) => void;
  onHeart: (i: ThreadItem) => void;
  onEdit: (i: ThreadItem) => void;
  onOpenPhoto: (photo: PhotoRef, caption: string) => void;
}> = ({ item, mine, myUserId, joinedAbove, joinedBelow, seen, canReact, editable, onRetry, onDiscard, onReact, onHeart, onEdit, onOpenPhoto }) => {
  const theme = useTheme();
  const [pickerAt, setPickerAt] = React.useState<HTMLElement | null>(null);
  const [burst, setBurst] = React.useState(0);
  const opened = item.opened;
  const unreadable = opened?.kind === 'unreadable';
  const rich = opened?.kind === 'text' ? opened : null;
  const text = opened && opened.kind !== 'unreadable' ? opened.text : '';
  const photo = rich?.photo;
  const pendingPhoto = item.pending?.photo;
  const location = rich?.location;
  const interactive = canReact && !item.pending && !unreadable;
  const r = (joined: boolean) => (joined ? '6px' : '20px');
  const radius = mine ? `20px ${r(joinedAbove)} ${r(joinedBelow)} 20px` : `${r(joinedAbove)} 20px 20px ${r(joinedBelow)}`;
  const captionRadius = mine ? `6px 6px ${r(joinedBelow)} 20px` : `6px 6px 20px ${r(joinedBelow)}`;
  const myReaction = item.reactions.find((x) => x.userId === myUserId)?.emoji;

  const textBox = (words: React.ReactNode, br: string) => (
    <Box
      sx={{
        maxWidth: '100%', px: 1.75, py: 1, borderRadius: br,
        background: mine && !unreadable ? theme.custom.gradients.brand : undefined,
        bgcolor: mine && !unreadable ? undefined : theme.custom.surface.active,
        color: mine && !unreadable ? 'common.white' : 'text.primary',
      }}
    >
      {words}
    </Box>
  );

  const words = rich?.unsupported ? (
    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
      {text ? `${text} · ` : ''}Update Tripician to see this message.
    </Typography>
  ) : text ? (
    // Plain text, never markup: whatever someone sends reaches the other person as text.
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.95rem' }}>{text}</Typography>
  ) : null;

  let body: React.ReactNode;
  if (unreadable) {
    body = textBox(
      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconLock size={14} /> Can&apos;t open this message in this browser
      </Typography>,
      radius,
    );
  } else if (photo || pendingPhoto) {
    const shape = photo ? mediaSize(photo.w, photo.h) : pendingPhoto ? mediaSize(pendingPhoto.width, pendingPhoto.height) : mediaSize(4, 3);
    body = (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: '2px' }}>
        <PhotoBox
          photo={photo}
          previewUrl={pendingPhoto && !photo ? pendingPhoto.previewUrl : undefined}
          size={shape}
          radius={words ? (mine ? `20px ${r(joinedAbove)} 6px 6px` : `${r(joinedAbove)} 20px 6px 6px`) : radius}
          onOpen={photo ? () => onOpenPhoto(photo, text) : undefined}
        />
        {words && textBox(words, captionRadius)}
      </Box>
    );
  } else if (location) {
    body = (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: '2px' }}>
        <PlaceBox location={location} radius={words ? (mine ? `20px ${r(joinedAbove)} 6px 6px` : `${r(joinedAbove)} 20px 6px 6px`) : radius} />
        {words && textBox(words, captionRadius)}
      </Box>
    );
  } else {
    body = textBox(words, radius);
  }

  const under = [item.editedAt && !item.pending ? 'Edited' : null, seen && !item.pending ? 'Seen' : null].filter(Boolean).join(' · ');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', mt: joinedAbove ? 0.25 : 1 }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: '78%', flexDirection: mine ? 'row-reverse' : 'row',
          '&:hover .chat-tools, &:focus-within .chat-tools': { opacity: 1 },
        }}
      >
        <Box
          title={timeOf(item.createdAt)}
          onDoubleClick={
            interactive
              ? () => {
                  window.getSelection()?.removeAllRanges();
                  setBurst((n) => n + 1);
                  onHeart(item);
                }
              : undefined
          }
          sx={{ position: 'relative', minWidth: 0, opacity: item.pending ? 0.6 : 1 }}
        >
          {body}
          {burst > 0 && (
            <Box
              key={burst}
              aria-hidden
              sx={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', fontSize: 52,
                animation: 'chatHeart 700ms ease-out forwards',
                '@keyframes chatHeart': {
                  '0%': { transform: 'scale(0.2)', opacity: 0 },
                  '25%': { transform: 'scale(1.1)', opacity: 1 },
                  '60%': { transform: 'scale(1)', opacity: 1 },
                  '100%': { transform: 'scale(1.25)', opacity: 0 },
                },
              }}
            >
              ❤️
            </Box>
          )}
        </Box>
        {interactive && (
          <Box className="chat-tools" sx={{ display: 'flex', opacity: 0, transition: 'opacity 120ms', flexShrink: 0 }}>
            <Tooltip title="React">
              <IconButton size="small" aria-label="React" onClick={(e) => setPickerAt(e.currentTarget)}>
                <IconMoodSmile size={18} />
              </IconButton>
            </Tooltip>
            {editable && (
              <Tooltip title="Edit (for 15 minutes after sending)">
                <IconButton size="small" aria-label="Edit message" onClick={() => onEdit(item)}>
                  <IconPencil size={18} />
                </IconButton>
              </Tooltip>
            )}
            {text && (
              <Tooltip title="Copy text">
                <IconButton size="small" aria-label="Copy text" onClick={() => void navigator.clipboard?.writeText(text).catch(() => undefined)}>
                  <IconCopy size={18} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
      <Reactions reactions={item.reactions} myUserId={myUserId} onClick={(e) => interactive && setPickerAt(e.currentTarget)} />
      <Popover
        open={!!pickerAt}
        anchorEl={pickerAt}
        onClose={() => setPickerAt(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { borderRadius: '999px', px: 0.5, py: 0.25 } } }}
      >
        <Box sx={{ display: 'flex' }} role="group" aria-label="Reactions">
          {CHAT_REACTIONS.map((emoji) => (
            <IconButton
              key={emoji}
              aria-label={myReaction === emoji ? `Remove ${emoji}` : `React ${emoji}`}
              onClick={() => { setPickerAt(null); onReact(item, emoji); }}
              sx={{ fontSize: 24, width: 44, height: 44, bgcolor: myReaction === emoji ? theme.custom.surface.active : undefined, transition: 'transform 120ms', '&:hover': { transform: 'scale(1.2)' } }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Popover>
      {opened?.kind === 'plain' && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, mx: 0.5 }}>
          Not encrypted · sent before encryption or from an older app
        </Typography>
      )}
      {item.pending?.state === 'failed' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: 'error.main' }}>
          <IconAlertCircle size={14} />
          <Typography variant="caption">{item.pending.error ?? 'Not sent.'}</Typography>
          <Button size="small" onClick={() => onRetry(item)} sx={{ textTransform: 'none', minWidth: 0, p: 0 }}>Retry</Button>
          <Button size="small" color="inherit" onClick={() => onDiscard(item)} sx={{ textTransform: 'none', minWidth: 0, p: 0, color: 'text.secondary' }}>Delete</Button>
        </Box>
      ) : item.pending ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, mx: 0.5 }}>
          {pendingPhoto && !photo ? 'Sending photo…' : 'Sending…'}
        </Typography>
      ) : under ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, mx: 0.5 }}>{under}</Typography>
      ) : null}
    </Box>
  );
};

/** A photo full size, on black, with its caption. */
export const PhotoLightbox: React.FC<{ photo: PhotoRef | null; caption?: string; onClose: () => void }> = ({ photo, caption, onClose }) => {
  const src = usePhoto(photo ?? undefined);
  return (
    <Dialog open={!!photo} onClose={onClose} fullScreen PaperProps={{ sx: { bgcolor: '#000' } }}>
      <IconButton aria-label="Close photo" onClick={onClose} sx={{ position: 'absolute', top: 12, left: 12, color: 'common.white', zIndex: 1 }}>
        <IconX size={28} />
      </IconButton>
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 0 }}>
        {src && src !== 'failed' ? (
          <Box component="img" src={src} alt={caption || 'Photo'} sx={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' }} />
        ) : src === 'failed' ? (
          <Typography sx={{ color: 'common.white' }}>This photo couldn&apos;t be opened.</Typography>
        ) : (
          <CircularProgress sx={{ color: 'common.white' }} />
        )}
      </Box>
      {caption && (
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, px: 3, py: 2, bgcolor: 'rgba(0,0,0,0.5)' }}>
          <Typography sx={{ color: 'common.white', whiteSpace: 'pre-wrap' }}>{caption}</Typography>
        </Box>
      )}
    </Dialog>
  );
};
