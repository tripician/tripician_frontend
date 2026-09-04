/**
 * One thread, read and written.
 *
 * Shared by the messages page and the dialog that opens from a join request, so
 * an organiser answering an applicant sees the same thing either way.
 *
 * There is no realtime here yet. Messages arrive when the thread is opened or
 * sent to, and the composer is optimistic. Polling every few seconds for every
 * open thread is a cost worth paying only once somebody is actually waiting on
 * the other end, and SignalR already exists for when that day comes.
 */

import React from 'react';
import { Alert, Avatar, Box, CircularProgress, IconButton, TextField, Typography, useTheme } from '@mui/material';
import { IconSend } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { REASON_COPY, type Conversation, type ConversationMessage } from './types';

const MAX_BODY = 2000;

interface Props {
  conversation: Conversation;
  /**
   * The signed-in reader, to tell their messages from the other person's.
   *
   * Must be a real id. Bubbles are sided by comparing against it and NaN matches
   * nobody, so passing an unresolved profile renders every message as the other
   * person's. Callers guard before mounting this.
   */
  meUserId: number;
  /** Why the pair may talk, when the caller already knows. */
  reason?: string | null;
  /** Told when a message goes out, so a list can reorder without refetching. */
  onSent?: (message: ConversationMessage) => void;
}

const ConversationThread: React.FC<Props> = ({ conversation, meUserId, reason, onSent }) => {
  const theme = useTheme();
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let wanted = conversation.id;
    setLoading(true);
    void apiServices.getConversationMessages(conversation.id)
      .then((resp) => {
        if (wanted !== conversation.id) return;
        setMessages(Array.isArray(resp.data) ? resp.data : []);
      })
      .catch(() => { if (wanted === conversation.id) setError('Could not load this conversation.'); })
      .finally(() => { if (wanted === conversation.id) setLoading(false); });
    return () => { wanted = ''; };
  }, [conversation.id]);

  // Newest message in view on open and after sending, which is where a reader
  // expects to land in anything shaped like a chat.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const resp = await apiServices.sendConversationMessage(conversation.id, text);
      if (resp.data) {
        setMessages((prev) => [...prev, resp.data]);
        onSent?.(resp.data);
      }
      setBody('');
    } catch {
      // The likeliest cause by far is the reason to talk having gone: a request
      // declined while this was open. The message names that rather than
      // reporting that something went wrong.
      setError('That did not send. The trip may have changed, or this conversation may be closed now.');
    } finally {
      setSending(false);
    }
  };

  const reasonText = reason ? REASON_COPY[reason] : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          pb: 1.5, borderBottom: `1px solid ${theme.custom.surface.border}`, flexShrink: 0,
        }}
      >
        <Avatar src={conversation.otherAvatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
          {(conversation.otherName ?? '?').charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
            {conversation.otherName ?? 'Traveller'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
            {[conversation.tripName, reasonText].filter(Boolean).join('  ·  ')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
        ) : messages.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
            No messages yet. Say something.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.map((m) => {
              const mine = m.senderUserId === meUserId;
              return (
                <Box
                  key={m.id}
                  sx={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    px: 1.5, py: 1,
                    borderRadius: '14px',
                    bgcolor: mine ? 'primary.main' : theme.custom.surface.hover,
                    color: mine ? '#fff' : 'text.primary',
                  }}
                >
                  {/* pre-line, never markup: bodies are stored unformatted so a
                      sender can never deliver markup to the other person. */}
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                    {m.body}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', mt: 0.25, opacity: 0.7, fontSize: '0.7rem' }}
                  >
                    {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              );
            })}
            <div ref={endRef} />
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
        <TextField
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
          onKeyDown={(e) => {
            // Enter sends, shift+enter breaks the line. Reversing these is the
            // single most complained-about thing in any message box.
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
          }}
          placeholder="Write a message"
          multiline
          maxRows={4}
          fullWidth
          size="small"
        />
        <IconButton
          color="primary"
          onClick={() => void send()}
          disabled={!body.trim() || sending}
          aria-label="Send message"
        >
          {sending ? <CircularProgress size={20} /> : <IconSend size={20} />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default ConversationThread;
