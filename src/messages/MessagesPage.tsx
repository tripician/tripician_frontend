/**
 * Every thread in one place.
 *
 * Two panes above md, one below: the list becomes the page and picking a thread
 * replaces it, with a way back. A 320px list beside a thread on a phone gives
 * neither enough room to be usable.
 */

import React from 'react';
import {
  Avatar, Badge, Box, Button, CircularProgress, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { IconArrowLeft, IconMessage } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { RootState } from '../store';
import { apiServices } from '../services/APIs/apiServices';
import Seo from '../components/Seo';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import ConversationThread from './ConversationThread';
import DecisionBar from './DecisionBar';
import { SCREENING_REPLIES, pendingLabel, previewLine, sortInbox } from './inbox';
import type { Conversation } from './types';

const CONTENT_MAX = 1280;

const MessagesPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const narrow = useMediaQuery(theme.breakpoints.down('md'));
  const me = useSelector((state: RootState) => state.user.profile);
  const meUserId = Number(me?.id);
  /*
   * Who "me" is has to be known before a thread paints.
   *
   * Every bubble is sided by comparing against this id, and NaN matches nobody,
   * so a thread rendered before the profile arrives shows the reader's own
   * messages as the other person's. Wrong in a way that looks deliberate, which
   * is worse than a spinner.
   */
  const knowMe = Number.isFinite(meUserId) && meUserId > 0;

  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);
  // What was decided on a join request from this page, so the bar keeps saying it while the reader stays.
  const [decided, setDecided] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let active = true;
    void apiServices.getConversations()
      .then((resp) => { if (active) setConversations(sortInbox(Array.isArray(resp.data) ? resp.data : [])); })
      .catch(() => { if (active) setConversations([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  // The same decision bar and openers as the docked chat, so a phone can approve from the thread too.
  const thread = (c: Conversation) => (
    <ConversationThread
      conversation={c}
      meUserId={meUserId}
      live
      quickReplies={c.pending === 'their-request' && !decided[c.id] ? SCREENING_REPLIES : undefined}
      banner={(
        <DecisionBar
          conversation={c}
          outcome={decided[c.id]}
          onDecided={(o) => setDecided((prev) => ({ ...prev, [c.id]: o }))}
          sx={{ borderRadius: '10px', mt: 1.5 }}
        />
      )}
    />
  );

  const select = (id: string | null) =>
    setParams((prev) => {
      if (id) prev.set('c', id); else prev.delete('c');
      return prev;
    }, { replace: true });

  // Opening a thread clears its badge here too, or the list still claims unread
  // messages the reader is looking at.
  const markRead = (id: string) =>
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));

  const list = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {conversations.map((c) => {
        const active = c.id === selectedId;
        return (
          <Box
            key={c.id}
            component="button"
            type="button"
            onClick={() => { select(c.id); markRead(c.id); }}
            sx={{
              display: 'flex', gap: 1.5, alignItems: 'center', textAlign: 'left',
              border: 'none', cursor: 'pointer', width: '100%',
              borderRadius: '12px', p: 1.25, fontFamily: 'inherit',
              bgcolor: active ? theme.custom.surface.hover : 'transparent',
              '&:hover': { bgcolor: theme.custom.surface.hover },
            }}
          >
            <Badge color="primary" badgeContent={c.unreadCount} overlap="circular">
              <Avatar src={c.otherAvatarUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                {(c.otherName ?? '?').charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: c.unreadCount > 0 ? 700 : 600 }}
                noWrap
              >
                {c.otherName ?? 'Traveller'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                {previewLine(c)}
              </Typography>
              {pendingLabel(c) && (
                <Typography variant="caption" sx={{ color: c.pending === 'their-request' ? 'primary.main' : 'text.disabled', display: 'block', fontWeight: 600 }} noWrap>
                  {pendingLabel(c)}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Seo title="Messages" description="Your conversations on Tripician." path="/messages" noindex />

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, pt: { xs: 3, md: 4 }, pb: 10 }}>
        {(!narrow || !selected) && (
          <PageHeader
            title="Messages"
            subtitle="Private threads about trips you are on, or have asked to join."
          />
        )}

        {loading || !knowMe ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={26} /></Box>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={IconMessage}
            title="No conversations yet"
            description="You can message someone who has asked to join your trip, or anyone travelling with you. Threads start from the trip they are about."
            actionLabel="Find a trip to join"
            onAction={() => navigate('/stories?kind=plans&open=1')}
          />
        ) : narrow ? (
          selected ? (
            <Box sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
              <Button
                startIcon={<IconArrowLeft size={16} />}
                onClick={() => select(null)}
                sx={{ alignSelf: 'flex-start', mb: 1 }}
                color="inherit"
              >
                All messages
              </Button>
              {thread(selected)}
            </Box>
          ) : list
        ) : (
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'stretch', height: 'calc(100vh - 260px)' }}>
            <Box sx={{ width: 320, flexShrink: 0, overflowY: 'auto' }}>{list}</Box>
            <Box
              sx={{
                flex: 1, minWidth: 0,
                borderRadius: '16px',
                border: `1px solid ${theme.custom.surface.border}`,
                bgcolor: 'background.paper',
                p: 2,
              }}
            >
              {selected ? (
                thread(selected)
              ) : (
                <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Pick a conversation.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MessagesPage;
