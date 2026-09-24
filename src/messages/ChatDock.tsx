import React from 'react';
import { Avatar, Box, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { IconArrowsDiagonal, IconMinus, IconX } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import ConversationThread from './ConversationThread';
import DecisionBar from './DecisionBar';
import { SCREENING_REPLIES, pendingLabel } from './inbox';
import type { Conversation } from './types';
import { ChatDockContext } from './chatDockContext';

// Two windows fit beside each other above the fold at laptop widths; a third pushes the oldest out.
const MAX_WINDOWS = 2;

// Above the TripicianAI bar (1250) so the box someone is typing in is never covered, below dialogs and menus (1300).
const DOCK_Z = 1260;

// decided: what happened to the request in this thread, kept on the window so minimising does not forget it.
type OpenWindow = { conversation: Conversation; minimized: boolean; decided?: string };

const ChatWindow: React.FC<{
  window: OpenWindow;
  meUserId: number;
  onToggle: () => void;
  onClose: () => void;
  onDecided: (outcome: string) => void;
}> = ({ window: w, meUserId, onToggle, onClose, onDecided }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const c = w.conversation;
  const status = pendingLabel(c);

  return (
    <Box
      role="dialog"
      aria-label={`Chat with ${c.otherName ?? 'traveller'}`}
      sx={{
        pointerEvents: 'auto', width: 328, height: w.minimized ? 56 : 460,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: '14px 14px 0 0', border: `1px solid ${theme.custom.surface.border}`, borderBottom: 'none',
        bgcolor: 'background.paper', boxShadow: '0 -8px 32px rgba(0,0,0,0.16)',
      }}
    >
      <Box
        onClick={onToggle}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, height: 56, flexShrink: 0, cursor: 'pointer', borderBottom: w.minimized ? 'none' : `1px solid ${theme.custom.surface.border}` }}
      >
        <Avatar src={c.otherAvatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>{(c.otherName ?? '?').charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            component={RouterLink}
            to={`/traveler/${c.otherUserId}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            noWrap
            sx={{ fontWeight: 700, color: 'text.primary', textDecoration: 'none', display: 'block', '&:hover': { textDecoration: 'underline' } }}
          >
            {c.otherName ?? 'Traveller'}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {[c.tripName, status].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        <Tooltip title="Open in Messages">
          <IconButton size="small" aria-label="Open in Messages" onClick={(e) => { e.stopPropagation(); navigate(`/messages?c=${c.id}`); }}>
            <IconArrowsDiagonal size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title={w.minimized ? 'Open' : 'Minimise'}>
          <IconButton size="small" aria-label={w.minimized ? 'Open chat' : 'Minimise chat'} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            <IconMinus size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton size="small" aria-label="Close chat" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <IconX size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      {!w.minimized && (
        <>
          <DecisionBar conversation={c} outcome={w.decided} onDecided={onDecided} />
          <Box sx={{ flex: 1, minHeight: 0, px: 1.5, pb: 1.25 }}>
            <ConversationThread
              conversation={c}
              meUserId={meUserId}
              compact
              live
              quickReplies={c.pending === 'their-request' && !w.decided ? SCREENING_REPLIES : undefined}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

// Quick replies without leaving the page, the way Messenger docks chats along the bottom edge.
export const ChatDockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const me = useSelector((state: RootState) => state.user.profile);
  const meUserId = Number(me?.id);
  const [windows, setWindows] = React.useState<OpenWindow[]>([]);

  const openChat = React.useCallback((conversation: Conversation) => {
    if (!wide) {
      navigate(`/messages?c=${conversation.id}`);
      return;
    }
    setWindows((prev) => [
      ...prev.filter((w) => w.conversation.id !== conversation.id),
      { conversation, minimized: false },
    ].slice(-MAX_WINDOWS));
  }, [wide, navigate]);

  const value = React.useMemo(() => ({ openChat }), [openChat]);

  // The Messages page already shows every thread in full; a docked copy on top of it would be the same chat twice.
  const hidden = location.pathname.startsWith('/messages') || !wide || !(Number.isFinite(meUserId) && meUserId > 0);

  return (
    <ChatDockContext.Provider value={value}>
      {children}
      {!hidden && windows.length > 0 && (
        <Box
          sx={{
            position: 'fixed', bottom: 0, right: 96, zIndex: DOCK_Z,
            display: 'flex', alignItems: 'flex-end', gap: 1.5, pointerEvents: 'none',
          }}
        >
          {windows.map((w) => (
            <ChatWindow
              key={w.conversation.id}
              window={w}
              meUserId={meUserId}
              onToggle={() => setWindows((prev) => prev.map((x) => (x.conversation.id === w.conversation.id ? { ...x, minimized: !x.minimized } : x)))}
              onClose={() => setWindows((prev) => prev.filter((x) => x.conversation.id !== w.conversation.id))}
              onDecided={(outcome) => setWindows((prev) => prev.map((x) => (x.conversation.id === w.conversation.id ? { ...x, decided: outcome } : x)))}
            />
          ))}
        </Box>
      )}
    </ChatDockContext.Provider>
  );
};
