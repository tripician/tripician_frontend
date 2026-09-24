/**
 * One thread, read and written.
 *
 * Shared by the messages page and the dialog that opens from a join request, so
 * an organiser answering an applicant sees the same thing either way.
 *
 * A live thread (the docked chat window) re-reads every few seconds while it is
 * visible, and at once when the notification hub says something arrived. The
 * Messages page reads on open and on send, and the composer is optimistic.
 */

import React from 'react';
import { Alert, Avatar, Box, Chip, CircularProgress, IconButton, TextField, Typography, useTheme } from '@mui/material';
import { IconSend } from '@tabler/icons-react';
import { apiServices } from '../services/APIs/apiServices';
import { INBOX_CHANGED_EVENT, MESSAGES_READ_EVENT } from './inbox';
import { REASON_COPY, type Conversation, type ConversationMessage } from './types';

// How often an open, visible chat re-reads its thread when the notification hub has said nothing.
const LIVE_POLL_MS = 6000;

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
  /** Drops the name header, for a window that already shows who this is. */
  compact?: boolean;
  /** Keeps re-reading while the thread is open and visible: somebody is waiting on the other end. */
  live?: boolean;
  /** One-tap openers that fill the box for the reader to edit, never send on their own. */
  quickReplies?: readonly string[];
  /** Shown under the name header, above the messages: what the thread is about right now. */
  banner?: React.ReactNode;
}

const ConversationThread: React.FC<Props> = ({ conversation, meUserId, reason, onSent, compact, live, quickReplies, banner }) => {
  const theme = useTheme();
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = React.useRef<ConversationMessage[]>([]);
  React.useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Reading a thread marks it read on the server, so the header badge is told to re-ask.
  const hadUnread = React.useRef(conversation.unreadCount > 0);

  React.useEffect(() => {
    let wanted = conversation.id;
    setLoading(true);
    void apiServices.getConversationMessages(conversation.id)
      .then((resp) => {
        if (wanted !== conversation.id) return;
        setMessages(Array.isArray(resp.data) ? resp.data : []);
        if (hadUnread.current) window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
        hadUnread.current = false;
      })
      .catch(() => { if (wanted === conversation.id) setError('Could not load this conversation.'); })
      .finally(() => { if (wanted === conversation.id) setLoading(false); });
    return () => { wanted = ''; };
  }, [conversation.id]);

  // A quiet re-read for a live thread: no spinner, and only a real change replaces what is on screen.
  React.useEffect(() => {
    if (!live) return;
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void apiServices.getConversationMessages(conversation.id)
        .then((resp) => {
          if (!active || !Array.isArray(resp.data)) return;
          const next = resp.data;
          const prev = messagesRef.current;
          const changed = next.length !== prev.length || next[next.length - 1]?.id !== prev[prev.length - 1]?.id;
          if (!changed) return;
          // Something new from them was just read by this fetch, so the badge is out of date.
          if (next.some((m) => m.senderUserId !== meUserId && !prev.some((old) => old.id === m.id))) {
            window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
          }
          setMessages(next);
        })
        .catch(() => { /* the next tick tries again */ });
    };
    const timer = window.setInterval(refresh, LIVE_POLL_MS);
    window.addEventListener(INBOX_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(INBOX_CHANGED_EVENT, refresh);
    };
  }, [live, conversation.id, meUserId]);

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
      {!compact && (
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
      )}

      {banner}

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

      {quickReplies && quickReplies.length > 0 && !body && (
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, flexShrink: 0, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {quickReplies.map((text) => (
            <Chip
              key={text}
              label={text}
              size="small"
              variant="outlined"
              onClick={() => { setBody(text); window.setTimeout(() => inputRef.current?.focus(), 0); }}
              sx={{ flexShrink: 0, fontWeight: 600 }}
            />
          ))}
        </Box>
      )}

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
          inputRef={inputRef}
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
