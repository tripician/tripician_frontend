import React from 'react';
import { Avatar, Badge, Box, Button, CircularProgress, Popover, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { formatRelativeTime } from '../utils/relativeTime';
import { useChatDock } from './chatDockContext';
import { INBOX_CHANGED_EVENT, pendingLabel, previewLine, sortInbox } from './inbox';
import type { Conversation } from './types';

const SHOWN = 8;

// The header's message dropdown: who wrote, about which trip, and who is waiting on a decision. Picking one opens a quick reply.
const MessagesMenu: React.FC<{ anchorEl: HTMLElement | null; onClose: () => void }> = ({ anchorEl, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dock = useChatDock();
  const open = Boolean(anchorEl);
  const [conversations, setConversations] = React.useState<Conversation[] | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    const load = () => {
      void apiServices.getConversations()
        .then((r) => { if (active) setConversations(sortInbox(Array.isArray(r.data) ? r.data : [])); })
        .catch(() => { if (active) setConversations([]); });
    };
    load();
    window.addEventListener(INBOX_CHANGED_EVENT, load);
    return () => { active = false; window.removeEventListener(INBOX_CHANGED_EVENT, load); };
  }, [open]);

  const pick = (c: Conversation) => {
    onClose();
    setConversations((prev) => prev?.map((x) => (x.id === c.id ? { ...x, unreadCount: 0 } : x)) ?? prev);
    if (dock) dock.openChat(c);
    else navigate(`/messages?c=${c.id}`);
  };

  const shown = (conversations ?? []).slice(0, SHOWN);
  const waiting = shown.filter((c) => c.pending === 'their-request');
  const recent = shown.filter((c) => c.pending !== 'their-request');

  const row = (c: Conversation) => {
    const unread = c.unreadCount > 0;
    const status = pendingLabel(c);
    return (
      <Box
        key={c.id}
        component="button"
        type="button"
        onClick={() => pick(c)}
        sx={{
          display: 'flex', gap: 1.25, alignItems: 'center', width: '100%', textAlign: 'left',
          border: 'none', bgcolor: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
          px: 1.5, py: 1, borderRadius: '12px',
          '&:hover': { bgcolor: theme.custom.surface.hover },
          '&:focus-visible': { outline: `2px solid ${theme.custom.ring}`, outlineOffset: -2 },
        }}
      >
        <Badge color="primary" variant="dot" invisible={!unread} overlap="circular">
          <Avatar src={c.otherAvatarUrl ?? undefined} sx={{ width: 44, height: 44 }}>{(c.otherName ?? '?').charAt(0).toUpperCase()}</Avatar>
        </Badge>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: unread ? 800 : 600, color: 'text.primary', flex: 1, minWidth: 0 }}>
              {c.otherName ?? 'Traveller'}
            </Typography>
            <Typography variant="caption" sx={{ color: unread ? 'primary.main' : 'text.disabled', flexShrink: 0, fontWeight: unread ? 700 : 400 }}>
              {formatRelativeTime(c.lastMessageAt)}
            </Typography>
          </Box>
          <Typography variant="body2" noWrap sx={{ color: unread ? 'text.primary' : 'text.secondary', fontWeight: unread ? 600 : 400 }}>
            {previewLine(c)}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: status && c.pending === 'their-request' ? 'primary.main' : 'text.disabled', display: 'block', fontWeight: status ? 600 : 400 }}>
            {[status, c.tripName].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
      </Box>
    );
  };

  const heading = (text: string) => (
    <Typography variant="overline" component="p" sx={{ color: 'text.secondary', px: 1.5, pt: 1, display: 'block' }}>{text}</Typography>
  );

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: 'min(380px, calc(100vw - 16px))', maxHeight: 540, borderRadius: '16px', mt: 1, display: 'flex', flexDirection: 'column' } } }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>Messages</Typography>
      </Box>

      <Box sx={{ overflowY: 'auto', px: 0.75, pb: 1, flex: 1, minHeight: 0 }}>
        {conversations === null ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={22} /></Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ px: 1.5, py: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No conversations yet. You can message people on your trips, and anyone who asks to join one.
            </Typography>
          </Box>
        ) : (
          <>
            {waiting.length > 0 && (
              <>
                {heading('Waiting on you')}
                {waiting.map(row)}
                {recent.length > 0 && heading('Recent')}
              </>
            )}
            {recent.map(row)}
          </>
        )}
      </Box>

      {(conversations?.length ?? 0) > 0 && (
        <Box sx={{ borderTop: `1px solid ${theme.custom.surface.border}`, p: 1 }}>
          <Button fullWidth onClick={() => { onClose(); navigate('/messages'); }} sx={{ textTransform: 'none', fontWeight: 700 }}>
            See all in Messages
          </Button>
        </Box>
      )}
    </Popover>
  );
};

export default MessagesMenu;
