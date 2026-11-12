import React from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { IconLock } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import type { ChatSummary } from './chatApi';
import { ChatListPending, ChatRow } from './ChatList';
import { useChatDock } from './chatDockContext';
import { chatStore, useChatList } from './chatStore';
import { chatEngine, useChatKeyStatus } from './e2ee/chatSession';
import HeaderPopover from '../pages/PageLayout/CommonLayouts/HeaderPopover';

const SHOWN = 8;

// The header's message dropdown: requests waiting first, then the latest chats. Picking one opens a quick reply.
// Non-modal (HeaderPopover), so the feed behind it still scrolls while it is open.
const MessagesMenu: React.FC<{ anchorEl: HTMLElement | null; onClose: () => void }> = ({ anchorEl, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dock = useChatDock();
  const open = Boolean(anchorEl);
  const { inbox, requests, loaded, loading, error, typing } = useChatList();
  const keyStatus = useChatKeyStatus();
  const me = useSelector((state: RootState) => state.user.profile);
  const meUserId = Number(me?.id);

  // Opening the panel, or Try again, retries both: the list, and the keys if they failed to load.
  const retry = React.useCallback(() => {
    if (keyStatus.kind === 'error' && Number.isFinite(meUserId) && meUserId > 0) void chatEngine.init(meUserId);
    void chatStore.refresh();
  }, [keyStatus.kind, meUserId]);

  const retryRef = React.useRef(retry);
  retryRef.current = retry;
  React.useEffect(() => {
    if (open) retryRef.current();
  }, [open]);

  const pick = (c: ChatSummary) => {
    onClose();
    const target = { conversationId: c.id, userId: c.other.userId, name: c.other.name, avatarUrl: c.other.avatarUrl };
    if (dock) dock.openChat(target);
    else navigate(`/messages?c=${c.id}`);
  };

  const heading = (text: string) => (
    <Typography variant="overline" component="p" sx={{ color: 'text.secondary', px: 1.5, pt: 1, display: 'block' }}>{text}</Typography>
  );
  const ready = keyStatus.kind === 'ready';
  const row = (c: ChatSummary) => (
    <ChatRow key={c.id} chat={c} myUserId={Number.isFinite(meUserId) ? meUserId : null} ready={ready} typing={!!(c.id && typing[c.id])} dense onOpen={pick} />
  );

  return (
    <HeaderPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      label="Messages"
      paperSx={{ width: 'min(380px, calc(100vw - 16px))', maxHeight: 'min(560px, calc(100dvh - 96px))', overflowY: 'hidden', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>Messages</Typography>
      </Box>

      <Box sx={{ overflowY: 'auto', overscrollBehavior: 'contain', px: 0.75, pb: 1, flex: 1, minHeight: 0 }}>
        {keyStatus.kind === 'setup' || keyStatus.kind === 'locked' ? (
          <Box sx={{ px: 1.5, py: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              {keyStatus.kind === 'setup'
                ? 'Turn on private, end-to-end encrypted messages to chat with people on Tripician.'
                : 'Your messages are locked in this browser. Enter your chat passcode to read them.'}
            </Typography>
            <Button variant="contained" startIcon={<IconLock size={16} />} onClick={() => { onClose(); navigate('/messages'); }} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px' }}>
              {keyStatus.kind === 'setup' ? 'Turn on' : 'Unlock'}
            </Button>
          </Box>
        ) : !loaded ? (
          <ChatListPending error={error} loading={loading} onRetry={retry} />
        ) : inbox.length + requests.length === 0 ? (
          <Box sx={{ px: 1.5, py: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No messages yet. Message a travel buddy, or someone whose trips you love.
            </Typography>
          </Box>
        ) : (
          <>
            {requests.length > 0 && (
              <>
                {heading(`Requests · ${requests.length}`)}
                {requests.slice(0, 3).map(row)}
                {inbox.length > 0 && heading('Chats')}
              </>
            )}
            {inbox.slice(0, SHOWN).map(row)}
          </>
        )}
      </Box>

      <Box sx={{ borderTop: `1px solid ${theme.custom.surface.border}`, p: 1 }}>
        <Button fullWidth onClick={() => { onClose(); navigate('/messages'); }} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Open Messages
        </Button>
      </Box>
    </HeaderPopover>
  );
};

export default MessagesMenu;
