import React from 'react';
import {
  Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  ListItemIcon, Menu, MenuItem, TextField, Tooltip, Typography, useTheme,
} from '@mui/material';
import { IconArrowUp, IconCheck, IconInfoCircle, IconLock, IconMapPin, IconPencil, IconPhoto, IconPlus, IconX } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import ReportDialog from '../components/ui/ReportDialog';
import { ChatBubble, PhotoLightbox } from './ChatBubble';
import { apiFailure, blockerText, firstName, type ChatReportReason, type ChatTarget } from './chatApi';
import { currentLocation, preparePhoto, SHARE_LOCATION_MESSAGES, ShareLocationError } from './chatMedia';
import ChatSendDialog, { type SendDraft } from './ChatSendDialog';
import { useChatList } from './chatStore';
import ChatInfoDialog from './ChatInfoDialog';
import ChatPasscodeForm from './ChatPasscodeForm';
import DecisionBar from './DecisionBar';
import { MAX_MESSAGE_LENGTH, type PhotoRef } from './e2ee/chatCrypto';
import { canEdit, instant, useChat, type ThreadItem } from './useChat';

const SEPARATOR_GAP_MS = 60 * 60_000;
const JOIN_GAP_MS = 3 * 60_000;

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'inappropriate', label: 'Inappropriate or sexual' },
  { value: 'impersonation', label: 'Pretending to be someone else' },
  { value: 'other', label: 'Something else' },
] as const;

function timeOf(iso: string) {
  return new Date(instant(iso)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(iso: string) {
  const d = new Date(instant(iso));
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

const TypingDots: React.FC = () => {
  const theme = useTheme();
  return (
    <Box aria-label="Typing" sx={{ display: 'inline-flex', gap: 0.5, px: 1.75, py: 1.5, mt: 1, borderRadius: '20px', bgcolor: theme.custom.surface.active }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: 'text.secondary',
            animation: 'chatTyping 1.1s ease-in-out infinite', animationDelay: `${i * 0.16}s`,
            '@keyframes chatTyping': { '0%, 100%': { opacity: 0.3 }, '50%': { opacity: 1 } },
          }}
        />
      ))}
    </Box>
  );
};

/**
 * One chat, end-to-end encrypted: opened in the browser with the chat key and
 * sealed here before it leaves. Used full size on the Messages page and
 * compact in a docked window.
 */
const ChatThread: React.FC<{
  target: ChatTarget;
  meUserId: number;
  compact?: boolean;
  /** Left the chat: deleted it, declined the request, or reported and blocked. */
  onLeave?: () => void;
}> = ({ target, meUserId, compact, onLeave }) => {
  const theme = useTheme();
  const chat = useChat(target, meUserId);
  const { summary, items, keyStatus } = chat;
  const { typing: typingMap } = useChatList();
  const [text, setText] = React.useState('');
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [askBlock, setAskBlock] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  /** The message being edited in the composer. */
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [attachAt, setAttachAt] = React.useState<HTMLElement | null>(null);
  const [draft, setDraft] = React.useState<SendDraft | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ photo: PhotoRef; caption: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const atBottom = React.useRef(true);

  const name = summary?.other.name ?? target.name ?? null;
  const first = firstName(name) || 'them';
  const avatarUrl = summary?.other.avatarUrl ?? target.avatarUrl ?? null;
  const otherId = summary?.other.userId ?? target.userId ?? null;
  const typing = !!(summary?.id && typingMap[summary.id]);
  const incomingRequest = summary?.status === 'request' && !summary.requestedByMe;
  const ready = keyStatus.kind === 'ready';

  // Newest in view on open and as messages arrive, unless the reader scrolled up to read.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [items.length, typing]);

  const lastMineRead = React.useMemo(() => [...items].reverse().find((i) => i.senderUserId === meUserId && !i.pending), [items, meUserId]);

  const send = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    if (editingId) {
      const id = editingId;
      setEditingId(null);
      chat.edit(id, value).catch((e) => setNotice(apiFailure(e, e instanceof Error ? e.message : 'That edit didn’t save.').message));
      return;
    }
    atBottom.current = true;
    void chat.send(value);
  };

  const startEdit = (item: ThreadItem) => {
    if (item.opened?.kind !== 'text') return;
    setEditingId(item.id);
    setText(item.opened.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText('');
  };

  const react = (item: ThreadItem, emoji: string) => {
    chat.react(item.id, emoji).catch((e) => setNotice(apiFailure(e, 'That reaction didn’t go through.').message));
  };

  /** Double click: a heart. Never takes one away (the reaction picker does that). */
  const heart = (item: ThreadItem) => {
    if (!item.reactions.some((r) => r.userId === meUserId && r.emoji === '❤️')) react(item, '❤️');
  };

  /** Photos and places: once a chat is accepted (a stranger's request is words only). */
  const canAttach = !!summary?.id && summary.status === 'accepted' && !summary.blocker;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setDraft({ kind: 'photo', photo: await preparePhoto(file) });
    } catch {
      setNotice("That file couldn't be read as a photo. Try a JPEG or PNG.");
    }
  };

  const shareLocation = async () => {
    setLocating(true);
    try {
      setDraft({ kind: 'location', location: await currentLocation() });
    } catch (e) {
      setNotice(SHARE_LOCATION_MESSAGES[e instanceof ShareLocationError ? e.reason : 'unavailable']);
    } finally {
      setLocating(false);
    }
  };

  const sendDraft = (d: SendDraft, caption: string) => {
    setDraft(null);
    atBottom.current = true;
    if (d.kind === 'photo') void chat.sendPhoto(d.photo, caption);
    else void chat.sendLocation(d.location, caption);
  };

  const toggleBlock = async () => {
    if (otherId == null) return;
    try {
      if (summary?.blocker === 'blocked') await apiServices.unblockUser(otherId);
      else await apiServices.blockUser(otherId);
      setNotice(summary?.blocker === 'blocked' ? `Unblocked ${first}.` : `Blocked ${first}. They can't message you.`);
      void chat.reload();
    } catch {
      setNotice('That didn’t work. Try again.');
    }
  };

  const subtitle = typing
    ? 'typing…'
    : summary?.joinRequest
      ? (summary.joinRequest.direction === 'their-request'
        ? `Asked to join ${summary.joinRequest.tripName ?? 'your trip'}`
        : `You asked to join ${summary.joinRequest.tripName ?? 'their trip'}`)
      : (summary?.tripName ?? (summary?.otherFollowsMe ? 'Follows you' : ''));

  // ─── The footer: the composer, or why there isn't one ─────────────────────
  let footer: React.ReactNode = null;
  if (ready && chat.status === 'ready' && summary) {
    if (incomingRequest) {
      footer = (
        <Box sx={{ textAlign: 'center', pt: 1.5, borderTop: `1px solid ${theme.custom.surface.border}` }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{first} wants to send you a message.</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            They won&apos;t know you&apos;ve seen it unless you accept.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button color="error" onClick={() => void toggleBlock()} sx={{ textTransform: 'none' }}>Block</Button>
            <Button
              variant="outlined"
              disabled={chat.busy === 'decline'}
              onClick={() => void chat.decline().then(() => onLeave?.())}
              sx={{ textTransform: 'none', borderRadius: '999px' }}
            >
              Delete
            </Button>
            <Button
              variant="contained"
              disabled={chat.busy === 'accept'}
              onClick={() => void chat.accept()}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', px: 3 }}
            >
              Accept
            </Button>
          </Box>
        </Box>
      );
    } else if (summary.blocker) {
      footer = (
        <Box sx={{ textAlign: 'center', pt: 1.5, borderTop: `1px solid ${theme.custom.surface.border}` }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {blockerText(summary.blocker, name, !!summary.id)}
          </Typography>
          {summary.blocker === 'no-key' && !summary.id && (
            <Button variant="contained" disabled={chat.busy === 'invite'} onClick={() => void chat.invite()} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px' }}>
              {summary.needsRequest ? 'Send a message request' : 'Send a chat invite'}
            </Button>
          )}
          {summary.blocker === 'blocked' && (
            <Button variant="outlined" onClick={() => void toggleBlock()} sx={{ textTransform: 'none', borderRadius: '999px' }}>
              Unblock {first}
            </Button>
          )}
        </Box>
      );
    } else {
      const canSend = text.trim().length > 0;
      footer = (
        <Box sx={{ pt: 1, borderTop: `1px solid ${theme.custom.surface.border}` }}>
          {summary.needsRequest && !summary.id && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', mb: 0.75 }}>
              {first} will get this as a message request. You can send more once they accept.
            </Typography>
          )}
          {editingId && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, color: 'primary.main' }}>
              <IconPencil size={16} />
              <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>Editing message</Typography>
              <IconButton size="small" aria-label="Cancel editing" onClick={cancelEdit}><IconX size={16} /></IconButton>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            {canAttach && !editingId && (
              <>
                <Tooltip title="Send a photo or your location">
                  <IconButton
                    aria-label="Send a photo or your location"
                    onClick={(e) => setAttachAt(e.currentTarget)}
                    disabled={locating}
                    sx={{ width: 40, height: 40, flexShrink: 0, color: 'primary.main', bgcolor: theme.custom.surface.hover }}
                  >
                    {locating ? <CircularProgress size={18} /> : <IconPlus size={20} />}
                  </IconButton>
                </Tooltip>
                <Menu anchorEl={attachAt} open={!!attachAt} onClose={() => setAttachAt(null)} anchorOrigin={{ vertical: 'top', horizontal: 'left' }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                  <MenuItem onClick={() => { setAttachAt(null); fileRef.current?.click(); }}>
                    <ListItemIcon><IconPhoto size={18} /></ListItemIcon>Choose a photo
                  </MenuItem>
                  <MenuItem onClick={() => { setAttachAt(null); void shareLocation(); }}>
                    <ListItemIcon><IconMapPin size={18} /></ListItemIcon>Share my location
                  </MenuItem>
                </Menu>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  hidden
                  onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }}
                />
              </>
            )}
            <TextField
              value={text}
              onChange={(e) => { setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH)); chat.typing(); }}
              onKeyDown={(e) => {
                // Enter sends, shift+enter breaks the line, Escape leaves an edit.
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                if (e.key === 'Escape' && editingId) { e.preventDefault(); cancelEdit(); }
              }}
              autoFocus={!!editingId}
              placeholder={locating ? 'Finding where you are…' : summary.needsRequest && !summary.id ? 'Write a message request…' : 'Message…'}
              multiline
              maxRows={5}
              fullWidth
              size="small"
              inputProps={{ 'aria-label': 'Message', maxLength: MAX_MESSAGE_LENGTH }}
              helperText={text.length > MAX_MESSAGE_LENGTH - 200 ? `${MAX_MESSAGE_LENGTH - text.length} left` : undefined}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '22px', bgcolor: theme.custom.surface.hover } }}
            />
            <IconButton
              onClick={send}
              disabled={!canSend}
              aria-label={editingId ? 'Save edit' : 'Send'}
              sx={{
                width: 40, height: 40, flexShrink: 0, color: 'common.white',
                background: canSend ? theme.custom.gradients.brand : undefined,
                bgcolor: canSend ? undefined : theme.custom.surface.active,
                '&:hover': { background: canSend ? theme.custom.gradients.brandHover : undefined },
                '&.Mui-disabled': { color: 'text.disabled' },
              }}
            >
              {editingId ? <IconCheck size={20} /> : <IconArrowUp size={20} />}
            </IconButton>
          </Box>
        </Box>
      );
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {!compact && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, borderBottom: `1px solid ${theme.custom.surface.border}`, flexShrink: 0 }}>
          <Avatar src={avatarUrl ?? undefined} sx={{ width: 40, height: 40 }}>{(name ?? '?').charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body1"
              component={otherId != null ? RouterLink : 'span'}
              to={otherId != null ? `/traveler/${otherId}` : undefined}
              noWrap
              sx={{ fontWeight: 700, color: 'text.primary', textDecoration: 'none', display: 'block', '&:hover': { textDecoration: otherId != null ? 'underline' : 'none' } }}
            >
              {name ?? 'Messages'}
            </Typography>
            {subtitle && (
              <Typography variant="caption" noWrap sx={{ color: typing ? 'primary.main' : 'text.secondary', display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Tooltip title="Chat details">
            <IconButton aria-label="Chat details" onClick={() => setInfoOpen(true)}><IconInfoCircle size={22} /></IconButton>
          </Tooltip>
        </Box>
      )}

      {summary?.joinRequest && otherId != null && (
        <DecisionBar joinRequest={summary.joinRequest} otherUserId={otherId} otherName={name} sx={{ borderRadius: compact ? 0 : '10px', mt: compact ? 0 : 1.5 }} />
      )}
      {notice && <Alert severity="info" onClose={() => setNotice(null)} sx={{ mt: 1 }}>{notice}</Alert>}

      {!ready && keyStatus.kind !== 'loading' && keyStatus.kind !== 'idle' ? (
        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {keyStatus.kind === 'error' ? (
            <Alert severity="error" sx={{ mt: 2 }}>{keyStatus.message}</Alert>
          ) : (
            <ChatPasscodeForm mode={keyStatus.kind === 'setup' ? 'setup' : 'unlock'} compact />
          )}
        </Box>
      ) : chat.status === 'loading' && !items.length ? (
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>
      ) : chat.status === 'error' ? (
        <Box sx={{ flex: 1, py: 3 }}>
          <Alert severity="error" action={<Button color="inherit" onClick={() => void chat.reload()}>Retry</Button>}>{chat.error}</Alert>
        </Box>
      ) : (
        <Box
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          sx={{ flex: 1, overflowY: 'auto', minHeight: 0, py: 1.5, px: compact ? 0 : 0.5 }}
        >
          {chat.hasOlder && (
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Button size="small" disabled={chat.loadingOlder} onClick={() => { atBottom.current = false; void chat.loadOlder(); }} sx={{ textTransform: 'none' }}>
                {chat.loadingOlder ? 'Loading…' : 'Earlier messages'}
              </Button>
            </Box>
          )}
          <Box
            component="button"
            type="button"
            onClick={() => setInfoOpen(true)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, mx: 'auto', mb: 1, maxWidth: 420, px: 1.75, py: 1.25,
              border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
              bgcolor: theme.custom.surface.hover, color: 'text.secondary',
            }}
          >
            <IconLock size={14} style={{ flexShrink: 0 }} />
            <Typography variant="caption">
              Messages with {first} are end-to-end encrypted. Nobody else can read them, not even Tripician. Click to check.
            </Typography>
          </Box>
          {items.map((item, index) => {
            const at = instant(item.createdAt);
            const prev = items[index - 1];
            const next = items[index + 1];
            const newDay = !prev || at - instant(prev.createdAt) > SEPARATOR_GAP_MS;
            const nextAt = next ? instant(next.createdAt) : 0;
            return (
              <React.Fragment key={item.id}>
                {newDay && (
                  <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 2, mb: 0.5 }}>
                    {dayLabel(item.createdAt)} · {timeOf(item.createdAt)}
                  </Typography>
                )}
                <ChatBubble
                  item={item}
                  mine={item.senderUserId === meUserId}
                  myUserId={meUserId}
                  joinedAbove={!newDay && !!prev && prev.senderUserId === item.senderUserId && at - instant(prev.createdAt) < JOIN_GAP_MS}
                  joinedBelow={!!next && next.senderUserId === item.senderUserId && nextAt - at < JOIN_GAP_MS}
                  seen={!!lastMineRead && lastMineRead.id === item.id && item.read}
                  canReact={summary?.status === 'accepted'}
                  editable={canEdit(item, meUserId)}
                  onRetry={(i) => void chat.retry(i)}
                  onDiscard={(i) => chat.discard(i.id)}
                  onReact={react}
                  onHeart={heart}
                  onEdit={startEdit}
                  onOpenPhoto={(photo, caption) => setLightbox({ photo, caption })}
                />
              </React.Fragment>
            );
          })}
          {typing && <TypingDots />}
        </Box>
      )}

      {footer}

      <ChatSendDialog draft={draft} to={first} onSend={sendDraft} onClose={() => setDraft(null)} />
      <PhotoLightbox photo={lightbox?.photo ?? null} caption={lightbox?.caption} onClose={() => setLightbox(null)} />
      <ChatInfoDialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        chat={summary}
        meUserId={meUserId}
        onDelete={() => { setInfoOpen(false); setConfirmDelete(true); }}
        onToggleBlock={() => { setInfoOpen(false); void toggleBlock(); }}
        onReport={() => { setInfoOpen(false); setReportOpen(true); }}
      />
      <ReportDialog
        open={reportOpen}
        noun="chat"
        reasons={REPORT_REASONS}
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason) => {
          await chat.report(reason as ChatReportReason, false);
          setReportOpen(false);
          setNotice('Reported. Thanks — we review every report. We can’t read chats, so it includes the recent messages in this browser.');
          if (summary?.blocker !== 'blocked') setAskBlock(true);
        }}
      />
      <Dialog open={askBlock} onClose={() => setAskBlock(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Block {first} too?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>They won&apos;t be able to message you or see your profile. They aren&apos;t told.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAskBlock(false)} sx={{ textTransform: 'none' }}>Not now</Button>
          <Button color="error" variant="contained" onClick={() => { setAskBlock(false); void toggleBlock().then(() => onLeave?.()); }} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Block
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this chat?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>It goes from your messages, on all your devices. {first} keeps their copy.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} sx={{ textTransform: 'none' }}>Keep it</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmDelete(false);
              void chat.clear().then(() => onLeave?.()).catch((e) => setNotice(apiFailure(e, 'Could not delete this chat.').message));
            }}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatThread;
