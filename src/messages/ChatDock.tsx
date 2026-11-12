import React from 'react';
import { Avatar, Box, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { IconArrowsDiagonal, IconLock, IconMinus, IconX } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import type { ChatTarget } from './chatApi';
import ChatThread from './ChatThread';
import { ChatDockContext, messagesHref } from './chatDockContext';

// Two windows fit beside each other above the fold at laptop widths; a third pushes the oldest out.
const MAX_WINDOWS = 2;

// Above the TripicianAI bar (1250) so the box someone is typing in is never covered, below dialogs and menus (1300).
const DOCK_Z = 1260;

type OpenWindow = { key: string; target: ChatTarget; minimized: boolean };

const keyOf = (t: ChatTarget) => (t.conversationId ? `c:${t.conversationId}` : `u:${t.userId}`);

const ChatWindow: React.FC<{
  window: OpenWindow;
  meUserId: number;
  onToggle: () => void;
  onClose: () => void;
}> = ({ window: w, meUserId, onToggle, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const t = w.target;

  return (
    <Box
      role="dialog"
      aria-label={`Chat with ${t.name ?? 'traveller'}`}
      sx={{
        pointerEvents: 'auto', width: 340, height: w.minimized ? 56 : 480,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: '14px 14px 0 0', border: `1px solid ${theme.custom.surface.border}`, borderBottom: 'none',
        bgcolor: 'background.paper', boxShadow: '0 -8px 32px rgba(0,0,0,0.16)',
      }}
    >
      <Box
        onClick={onToggle}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, height: 56, flexShrink: 0, cursor: 'pointer', borderBottom: w.minimized ? 'none' : `1px solid ${theme.custom.surface.border}` }}
      >
        <Avatar src={t.avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>{(t.name ?? '?').charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            component={t.userId != null ? RouterLink : 'span'}
            to={t.userId != null ? `/traveler/${t.userId}` : undefined}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            noWrap
            sx={{ fontWeight: 700, color: 'text.primary', textDecoration: 'none', display: 'block', '&:hover': { textDecoration: 'underline' } }}
          >
            {t.name ?? 'Traveller'}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconLock size={11} /> End-to-end encrypted
          </Typography>
        </Box>
        <Tooltip title="Open in Messages">
          <IconButton size="small" aria-label="Open in Messages" onClick={(e) => { e.stopPropagation(); onClose(); navigate(messagesHref(t)); }}>
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
        <Box sx={{ flex: 1, minHeight: 0, px: 1.5, pb: 1.25 }}>
          <ChatThread target={t} meUserId={meUserId} compact onLeave={onClose} />
        </Box>
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

  const openChat = React.useCallback((target: ChatTarget) => {
    if (!wide) {
      navigate(messagesHref(target));
      return;
    }
    const key = keyOf(target);
    setWindows((prev) => [
      ...prev.filter((w) => w.key !== key && !(target.userId != null && w.target.userId === target.userId)),
      { key, target, minimized: false },
    ].slice(-MAX_WINDOWS));
  }, [wide, navigate]);

  const value = React.useMemo(() => ({ openChat }), [openChat]);

  // The Messages page already shows every chat in full; a docked copy on top of it would be the same chat twice.
  const hidden = location.pathname.startsWith('/messages') || !wide || !(Number.isFinite(meUserId) && meUserId > 0);

  return (
    <ChatDockContext.Provider value={value}>
      {children}
      {!hidden && windows.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 0, right: 96, zIndex: DOCK_Z, display: 'flex', alignItems: 'flex-end', gap: 1.5, pointerEvents: 'none' }}>
          {windows.map((w) => (
            <ChatWindow
              key={w.key}
              window={w}
              meUserId={meUserId}
              onToggle={() => setWindows((prev) => prev.map((x) => (x.key === w.key ? { ...x, minimized: !x.minimized } : x)))}
              onClose={() => setWindows((prev) => prev.filter((x) => x.key !== w.key))}
            />
          ))}
        </Box>
      )}
    </ChatDockContext.Provider>
  );
};
