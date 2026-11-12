/**
 * Messages: every chat in one place, end-to-end encrypted.
 *
 * Two panes above md, one below: the list becomes the page and picking a chat
 * replaces it, with a way back. `?c=<id>` opens a chat; `?with=<userId>`
 * opens the chat with someone, or a blank one their first message starts.
 */

import React from 'react';
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { IconArrowLeft, IconEdit, IconLock, IconMessage } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { RootState } from '../store';
import Seo from '../components/Seo';
import SearchField from '../components/ui/SearchField';
import SegmentedControl from '../components/ui/SegmentedControl';
import type { ChatSummary, ChatTarget } from './chatApi';
import { ChatListPending, ChatRow } from './ChatList';
import ChatPasscodeForm from './ChatPasscodeForm';
import { chatStore, useChatList } from './chatStore';
import ChatThread from './ChatThread';
import { chatEngine, useChatKeyStatus } from './e2ee/chatSession';
import NewMessageDialog from './NewMessageDialog';

const CONTENT_MAX = 1280;

type Folder = 'inbox' | 'requests';

const MessagesPage: React.FC = () => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('md'));
  const me = useSelector((state: RootState) => state.user.profile);
  const meUserId = Number(me?.id);
  // Bubbles are sided by comparing against this id, so nothing paints before it is known.
  const knowMe = Number.isFinite(meUserId) && meUserId > 0;
  const keyStatus = useChatKeyStatus();
  const ready = keyStatus.kind === 'ready';
  const { inbox, requests, loaded, loading, error, typing } = useChatList();

  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');
  const withUser = Number(params.get('with')) || null;
  const tripId = params.get('trip');
  const [folder, setFolder] = React.useState<Folder>('inbox');
  const [query, setQuery] = React.useState('');
  const [composeOpen, setComposeOpen] = React.useState(false);

  React.useEffect(() => {
    if (knowMe) void chatEngine.init(meUserId);
  }, [knowMe, meUserId]);

  React.useEffect(() => {
    if (!knowMe) return;
    void chatStore.refresh();
    void chatStore.refreshUnread();
  }, [knowMe, ready]);

  const select = (target: ChatTarget | null) =>
    setParams((prev) => {
      prev.delete('c');
      prev.delete('with');
      prev.delete('trip');
      if (target?.conversationId) prev.set('c', target.conversationId);
      else if (target?.userId != null) {
        prev.set('with', String(target.userId));
        if (target.tripId) prev.set('trip', target.tripId);
      }
      return prev;
    }, { replace: true });

  const all = [...inbox, ...requests];
  const selectedChat = selectedId ? all.find((c) => c.id === selectedId) ?? null : null;
  const target: ChatTarget | null = selectedId
    ? { conversationId: selectedId, userId: selectedChat?.other.userId, name: selectedChat?.other.name, avatarUrl: selectedChat?.other.avatarUrl }
    : withUser
      ? { userId: withUser, tripId }
      : null;

  const list = (folder === 'inbox' ? inbox : requests)
    .filter((c) => !query.trim() || (c.other.name ?? '').toLowerCase().includes(query.trim().toLowerCase()));

  const open = (c: ChatSummary) => select({ conversationId: c.id, userId: c.other.userId });

  const listPane = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minHeight: 0, height: '100%' }}>
      <SearchField value={query} onChange={setQuery} placeholder="Search" onClear={() => setQuery('')} />
      <SegmentedControl<Folder>
        options={[
          { value: 'inbox', label: 'Chats' },
          { value: 'requests', label: requests.length ? `Requests · ${requests.length}` : 'Requests' },
        ]}
        value={folder}
        onChange={setFolder}
        aria-label="Chats or requests"
      />
      <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0, mx: -0.5 }}>
        {folder === 'requests' && requests.length > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', px: 1, pb: 1 }}>
            People you don&apos;t follow and haven&apos;t travelled with. They won&apos;t know you&apos;ve seen their request unless you accept it.
          </Typography>
        )}
        {!loaded ? (
          <ChatListPending error={error} loading={loading} onRetry={() => void chatStore.refresh()} py={6} />
        ) : list.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 2, color: 'text.secondary' }}>
            <IconMessage size={36} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 1 }}>
              {query ? 'Nobody by that name here' : folder === 'inbox' ? 'No messages yet' : 'No message requests'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              {query ? 'Try another name, or start a new chat.'
                : folder === 'inbox' ? 'Message a travel buddy, or someone whose trips you love.'
                  : 'When someone you don’t know messages you, it waits here for you to decide.'}
            </Typography>
            {folder === 'inbox' && !query && (
              <Button onClick={() => setComposeOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}>Send a message</Button>
            )}
          </Box>
        ) : (
          list.map((c) => (
            <ChatRow
              key={c.id}
              chat={c}
              myUserId={meUserId}
              ready={ready}
              typing={!!(c.id && typing[c.id])}
              active={c.id === selectedId}
              onOpen={open}
            />
          ))
        )}
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'text.secondary', py: 2 }}>
          <IconLock size={12} /> Your messages are end-to-end encrypted
        </Typography>
      </Box>
    </Box>
  );

  const threadPane = target ? (
    <ChatThread key={selectedId ?? `with-${withUser}`} target={target} meUserId={meUserId} onLeave={() => select(null)} />
  ) : (
    <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', textAlign: 'center', color: 'text.secondary' }}>
      <Box>
        <IconMessage size={40} />
        <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary', mt: 1 }}>Your messages</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>Private chats with travellers, end-to-end encrypted.</Typography>
        <Button variant="contained" onClick={() => setComposeOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px' }}>
          Send a message
        </Button>
      </Box>
    </Box>
  );

  const locked = keyStatus.kind === 'setup' || keyStatus.kind === 'locked';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo title="Messages" description="Your private messages on Tripician." path="/messages" noindex />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 2, md: 4 }, pb: 4 }}>
        {(!narrow || !target) && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, flex: 1 }}>Messages</Typography>
            {ready && (
              <Tooltip title="New message">
                <IconButton aria-label="New message" onClick={() => setComposeOpen(true)}><IconEdit size={22} /></IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {!knowMe || keyStatus.kind === 'loading' || keyStatus.kind === 'idle' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={26} /></Box>
        ) : locked ? (
          <ChatPasscodeForm mode={keyStatus.kind === 'setup' ? 'setup' : 'unlock'} />
        ) : keyStatus.kind === 'error' ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{keyStatus.message}</Typography>
            <Button onClick={() => void chatEngine.init(meUserId, true)} sx={{ textTransform: 'none' }}>Try again</Button>
          </Box>
        ) : narrow ? (
          target ? (
            <Box sx={{ height: 'calc(100dvh - 160px)', display: 'flex', flexDirection: 'column' }}>
              <Button startIcon={<IconArrowLeft size={16} />} onClick={() => select(null)} sx={{ alignSelf: 'flex-start', mb: 1, textTransform: 'none' }} color="inherit">
                All messages
              </Button>
              <Box sx={{ flex: 1, minHeight: 0 }}>{threadPane}</Box>
            </Box>
          ) : (
            <Box sx={{ height: 'calc(100dvh - 180px)' }}>{listPane}</Box>
          )
        ) : (
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'stretch', height: 'calc(100vh - 200px)', minHeight: 480 }}>
            <Box sx={{ width: 340, flexShrink: 0, minHeight: 0 }}>{listPane}</Box>
            <Box sx={{ flex: 1, minWidth: 0, borderRadius: '16px', border: `1px solid ${theme.custom.surface.border}`, bgcolor: 'background.paper', p: 2, minHeight: 0 }}>
              {threadPane}
            </Box>
          </Box>
        )}
      </Box>

      <NewMessageDialog open={composeOpen} onClose={() => setComposeOpen(false)} onPick={(t) => select(t)} />
    </Box>
  );
};

export default MessagesPage;
