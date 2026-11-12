import React from 'react';
import { Avatar, Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import type { ChatSummary } from './chatApi';
import type { Opened } from './e2ee/chatEngine';
import { chatEngine } from './e2ee/chatSession';
import { previewText, shortWhen } from './chatFormat';

/**
 * Where the chat list goes before it has loaded: a spinner while it is on its
 * way, or the failure and a retry once it has failed. It used to show the spinner
 * for as long as the list had not loaded, so a request that failed (a server
 * without the chat endpoints, a dropped connection) spun forever.
 */
export const ChatListPending: React.FC<{ error: string | null; loading: boolean; onRetry: () => void; py?: number }> = ({
  error, loading, onRetry, py = 4,
}) => {
  if (!error || loading) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py }}><CircularProgress size={22} aria-label="Loading messages" /></Box>;
  }
  return (
    <Box role="alert" sx={{ display: 'grid', justifyItems: 'center', gap: 0.75, py, px: 2, textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{error}</Typography>
      <Button onClick={onRetry} sx={{ textTransform: 'none', fontWeight: 700 }}>Try again</Button>
    </Box>
  );
};

/** The last message of a chat, opened in this browser for its row. */
function usePreview(chat: ChatSummary, ready: boolean): Opened | null {
  const [opened, setOpened] = React.useState<Opened | null>(null);
  const message = chat.lastMessage;
  React.useEffect(() => {
    let live = true;
    if (!message || !ready) {
      setOpened(null);
      return undefined;
    }
    void chatEngine.open(message, chat.other.userId).then((o) => live && setOpened(o));
    return () => {
      live = false;
    };
  }, [message, ready, chat.other.userId]);
  return opened;
}

export const ChatRow: React.FC<{
  chat: ChatSummary;
  myUserId: number | null;
  ready: boolean;
  typing: boolean;
  active?: boolean;
  dense?: boolean;
  onOpen: (chat: ChatSummary) => void;
}> = ({ chat, myUserId, ready, typing, active, dense, onOpen }) => {
  const theme = useTheme();
  const opened = usePreview(chat, ready);
  const unread = chat.unreadCount > 0 || (chat.status === 'request' && !chat.requestedByMe);
  const mine = chat.lastMessage?.senderUserId === myUserId;
  const seen = mine && chat.lastMessage?.read && chat.status === 'accepted';
  const preview = previewText(chat, opened, myUserId, typing);
  const size = dense ? 44 : 52;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(chat)}
      aria-label={`${chat.other.name ?? 'Traveller'}. ${preview}${unread ? '. Unread' : ''}`}
      sx={{
        display: 'flex', gap: 1.5, alignItems: 'center', textAlign: 'left',
        border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit', color: 'inherit',
        borderRadius: '12px', px: 1.25, py: dense ? 0.875 : 1,
        bgcolor: active ? theme.custom.surface.active : 'transparent',
        '&:hover': { bgcolor: active ? theme.custom.surface.active : theme.custom.surface.hover },
      }}
    >
      <Avatar src={chat.other.avatarUrl ?? undefined} sx={{ width: size, height: size }}>
        {(chat.other.name ?? '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: unread ? 700 : 500 }}>
          {chat.other.name ?? 'Traveller'}
        </Typography>
        <Box sx={{ display: 'flex', minWidth: 0, color: typing ? 'primary.main' : unread ? 'text.primary' : 'text.secondary' }}>
          <Typography variant="caption" noWrap sx={{ minWidth: 0, fontWeight: unread ? 600 : 400 }}>
            {preview}
          </Typography>
          {chat.lastMessageAt && (
            <Typography variant="caption" sx={{ flexShrink: 0, color: 'text.secondary' }}>
              &nbsp;·&nbsp;{seen ? 'Seen' : shortWhen(chat.lastMessageAt)}
            </Typography>
          )}
        </Box>
      </Box>
      {unread && <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
    </Box>
  );
};
