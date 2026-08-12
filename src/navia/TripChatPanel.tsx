/**
 * TripChatPanel.tsx
 *
 * Premium real-time trip chat panel.
 *
 * Features:
 *   All trip members can send messages
 *   Type @navia to summon the AI agent  the backend handles routing,
 *    Navia's reply arrives back through SignalR as a Proposal or Navia message
 *   Proposal bubbles surface the AI suggestion with structured Accept / Reject actions
 *   System messages show structured per-change results (destination added, dates updated)
 *   Auto-scroll + "New message" jump button
 *   Connection status indicator
 *   @navia mention hint in the input
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
  Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { motion, AnimatePresence } from 'framer-motion';

import { useTripChat } from './useTripChat';
import {
  parseProposalMetadata,
  parseSystemMetadata,
  type TripChatMessage,
  type TripMember,
} from './tripChatService';
import { fetchTripCredits, type NaviaCreditBalance } from './naviaService';
import CreditUsagePopover from './CreditUsagePopover';
import NaviaOrb from './NaviaOrb';
import { renderMarkdown } from './markdown';
import {
  IconMapPin, IconInfoCircle, IconTrash, IconHelpCircle, IconCalendar,
  IconAlertTriangle, IconTag, IconMail, IconUser, IconCoin,
} from '@tabler/icons-react';

// ??? Constants ????????????????????????????????????????????????????????????????

const MAX_CHARS = 1000;
const NAVIA_MENTION_RE = /@navia\b/i;

// ??? Helpers ??????????????????????????????????????????????????????????????????

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// Event label map for System message ExecuteResult events
// Keys mirror TripOperationExecutor's ExecuteResult.Event values exactly.
const EVENT_LABELS: Record<string, { Icon: React.ElementType; label: (r: any) => string }> = {
  destination_added:           { Icon: IconMapPin,       label: r => `${r.destination} added to trip` },
  destination_already_present: { Icon: IconInfoCircle,   label: r => `${r.destination} already in trip` },
  destination_removed:         { Icon: IconTrash,        label: r => `${r.destination} removed from trip` },
  destination_not_found:       { Icon: IconHelpCircle,   label: r => `${r.destination} not found in trip` },
  dates_updated:               { Icon: IconCalendar,     label: r => `Trip dates updated${r.startDate ? ` · start ${r.startDate}` : ''}${r.endDate ? ` · end ${r.endDate}` : ''}` },
  dates_update_failed:         { Icon: IconAlertTriangle, label: () => 'Date update failed' },
  place_added:                 { Icon: IconTag,          label: r => `${r.place} added to your itinerary` },
  place_add_failed:            { Icon: IconAlertTriangle, label: r => `Could not add ${r.place}` },
  member_invite_noted:         { Icon: IconMail,         label: r => `Invite for "${r.memberName}" noted` },
  execution_error:             { Icon: IconAlertTriangle, label: r => r.summary ?? 'Execution error' },
};

// ??? Sub-components ???????????????????????????????????????????????????????????

/** Navia logo mark - the glossy red orb; glows while Navia is processing */
const NaviaLogo: React.FC<{ size?: number; processing?: boolean }> = ({ size = 28, processing = false }) => (
  <NaviaOrb size={size} processing={processing} />
);

/** System change result row */
const SystemResultRow: React.FC<{ result: ReturnType<typeof parseSystemMetadata>[number] }> = ({ result }) => {
  const entry = result.event ? EVENT_LABELS[result.event] : null;
  const label = entry ? entry.label(result) : (result.summary ?? result.action);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.15 }}>
      {entry && (
        <entry.Icon size={13} stroke={1.9} style={{ flexShrink: 0, opacity: 0.75 }} />
      )}
      <Typography sx={{ fontSize: 12.5, color: result.success ? 'text.primary' : 'error.main', lineHeight: 1.4 }}>
        {label}
      </Typography>
    </Box>
  );
};

/** Proposal bubble with Accept / Reject */
interface ProposalBubbleProps {
  msg: TripChatMessage;
  actionState: 'pending' | 'accepting' | 'rejecting' | 'accepted' | 'rejected' | 'error';
  onAccept: () => void;
  onReject: () => void;
  isLight: boolean;
  /** Set when the proposal id could not be resolved (expired/missing on server) */
  resolveError?: string;
}

const ProposalBubble: React.FC<ProposalBubbleProps> = ({ msg, actionState, onAccept, onReject, isLight, resolveError }) => {
  const envelope = parseProposalMetadata(msg.metadata);
  const ops = envelope?.operations ?? [];
  const done = actionState === 'accepted' || actionState === 'rejected';

  return (
    <Box
      sx={{
        background: isLight
          ? 'linear-gradient(135deg, rgba(255,56,92,0.05) 0%, rgba(255,56,92,0.09) 100%)'
          : 'linear-gradient(135deg, rgba(255,56,92,0.10) 0%, rgba(255,56,92,0.17) 100%)',
        border: `1px solid ${isLight ? 'rgba(255,56,92,0.22)' : 'rgba(255,56,92,0.30)'}`,
        borderRadius: '14px 14px 14px 3px',
        px: 1.75, py: 1.5,
        maxWidth: 460,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <NaviaLogo size={16} />
        <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#FF385C' }}>
          Navia Suggestion
        </Typography>
      </Box>

      {/* Message text. Navia writes markdown, so "**Abu Dhabi**" has to arrive as
          bold rather than as its own asterisks. */}
      <Typography sx={{ fontSize: 13.5, lineHeight: 1.65, color: isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)', mb: 1.25 }}>
        {renderMarkdown(msg.message)}
      </Typography>

      {/* Operation chips */}
      {ops.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
          {ops.map((op, i) => {
            // Icon in the chip's own icon slot rather than glued to the front of
            // the label string, so it sits on the text baseline properly.
            const { label, OpIcon } =
                op.action === 'add_destination' ? { label: `+ ${op.destination}`, OpIcon: undefined }
              : op.action === 'remove_destination' ? { label: `− ${op.destination}`, OpIcon: undefined }
              : op.action === 'update_dates' ? { label: `${op.startDate ?? ''}${op.startDate && op.endDate ? ' → ' : ''}${op.endDate ?? ''}`, OpIcon: IconCalendar }
              : op.action === 'add_place' ? { label: String(op.place), OpIcon: IconMapPin }
              : op.action === 'add_member' ? { label: String(op.memberName), OpIcon: IconUser }
              : { label: op.action, OpIcon: undefined };
            return (
              <Chip
                key={i}
                label={label}
                icon={OpIcon ? <OpIcon size={12} stroke={1.9} /> : undefined}
                size='small'
                sx={{
                  fontSize: 11, height: 22, borderRadius: '6px',
                  bgcolor: isLight ? 'rgba(255,56,92,0.09)' : 'rgba(255,56,92,0.18)',
                  color: '#FF385C', fontWeight: 600,
                  border: '1px solid rgba(255,56,92,0.22)',
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Actions */}
      {!done ? (
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Box
            component='button'
            onClick={onAccept}
            disabled={actionState === 'accepting' || actionState === 'rejecting'}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1.5, py: 0.6, borderRadius: '8px', border: 'none', cursor: 'pointer',
              bgcolor: '#FF385C',
              color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
              transition: 'background-color .15s',
              '&:hover': { bgcolor: '#E31C5F' },
              '&:active': { bgcolor: '#D91A50' },
              '&:disabled': { opacity: 0.55, cursor: 'not-allowed' },
            }}
          >
            {actionState === 'accepting'
              ? <CircularProgress size={11} sx={{ color: '#fff', mr: 0.5 }} />
              : <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
            Apply to trip
          </Box>
          <Box
            component='button'
            onClick={onReject}
            disabled={actionState === 'accepting' || actionState === 'rejecting'}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1.5, py: 0.6, borderRadius: '8px', border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'}`,
              cursor: 'pointer', background: 'transparent',
              color: isLight ? '#555' : 'rgba(255,255,255,0.65)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
              transition: 'opacity .15s',
              '&:hover': { opacity: 0.75 },
              '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
            }}
          >
            {actionState === 'rejecting'
              ? <CircularProgress size={11} sx={{ color: 'inherit', mr: 0.5 }} />
              : <CancelRoundedIcon sx={{ fontSize: 14 }} />}
            Dismiss
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          {actionState === 'accepted'
            ? <CheckCircleRoundedIcon sx={{ fontSize: 15, color: '#22c55e' }} />
            : <CancelRoundedIcon sx={{ fontSize: 15, color: isLight ? '#999' : 'rgba(255,255,255,0.4)' }} />}
          <Typography sx={{ fontSize: 12, color: actionState === 'accepted' ? '#22c55e' : (isLight ? '#999' : 'rgba(255,255,255,0.45)') }}>
            {actionState === 'accepted' ? 'Applied to your trip' : 'Dismissed'}
          </Typography>
        </Box>
      )}
      {(resolveError || actionState === 'error') && (
        <Typography sx={{ fontSize: 11.5, color: 'error.main', mt: 0.75 }}>
          {resolveError ?? "Couldn't apply this suggestion. Please try again."}
        </Typography>
      )}
    </Box>
  );
};

/** System confirmation bubble */
const SystemBubble: React.FC<{ msg: TripChatMessage; isLight: boolean }> = ({ msg, isLight }) => {
  const results = parseSystemMetadata(msg.metadata);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
      <Box
        sx={{
          background: isLight ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.12)',
          border: `1px solid ${isLight ? 'rgba(34,197,94,0.20)' : 'rgba(34,197,94,0.25)'}`,
          borderRadius: '10px', px: 1.5, py: 1, maxWidth: 420,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: results.length > 0 ? 0.75 : 0 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#22c55e' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Trip Updated
          </Typography>
          <Typography sx={{ fontSize: 11, color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)', ml: 'auto' }}>
            {formatTime(msg.sentAt)}
          </Typography>
        </Box>
        {results.length > 0
          ? results.map((r, i) => <SystemResultRow key={i} result={r} />)
          : <Typography sx={{ fontSize: 12.5, color: isLight ? '#444' : 'rgba(255,255,255,0.7)' }}>{msg.message}</Typography>}
      </Box>
    </Box>
  );
};

/** Single member or Navia message bubble */
interface MessageBubbleProps {
  msg: TripChatMessage;
  isMine: boolean;
  isLight: boolean;
  showAvatar: boolean;
  /** Only the last message of a same-sender group shows the timestamp */
  showTime?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, isMine, isLight, showAvatar, showTime = true }) => {
  const isNavia = msg.messageType === 'Navia';
  const name = isNavia ? 'Navia' : (msg.displayName || `User ${msg.userId ?? ''}`);
  const initials = isNavia ? 'N' : getInitials(name);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, flexDirection: isMine ? 'row-reverse' : 'row' }}>
        {!isMine && (
          <Avatar
            src={isNavia ? undefined : msg.avatarUrl}
            sx={{
              width: 26, height: 26, fontSize: 10.5, flexShrink: 0, alignSelf: 'flex-end',
              bgcolor: isNavia ? 'transparent' : '#FF385C',
              visibility: showAvatar ? 'visible' : 'hidden',
            }}
          >
            {isNavia ? <NaviaLogo size={26} /> : initials}
          </Avatar>
        )}
        <Box
          sx={{
            px: 1.5, py: 0.9,
            maxWidth: 360,
            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            fontSize: 13.5, lineHeight: 1.6, fontFamily: 'inherit', wordBreak: 'break-word',
            background: isMine
              ? '#FF385C'
              : (isLight ? '#f3f4f6' : 'rgba(255,255,255,0.07)'),
            color: isMine ? '#fff' : (isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)'),
          }}
        >
          {!isMine && showAvatar && (
            <Typography sx={{ fontSize: 11, fontWeight: 700, mb: 0.35, color: isNavia ? '#FF385C' : (isLight ? '#666' : 'rgba(255,255,255,0.55)') }}>
              {name}
            </Typography>
          )}
          {/* Same renderer for members and Navia: whoever writes markdown gets it
              rendered, and plain text is unaffected. */}
          <Typography sx={{ fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}>
            {renderMarkdown(msg.message)}
          </Typography>
        </Box>
      </Box>
      {showTime && (
        <Typography sx={{ fontSize: 10, color: isLight ? 'rgba(0,0,0,0.30)' : 'rgba(255,255,255,0.28)', mt: 0.4, mx: isMine ? 0.5 : 4.5 }}>
          {formatTime(msg.sentAt)}
        </Typography>
      )}
    </Box>
  );
};

// ??? Main component ???????????????????????????????????????????????????????????

export interface TripChatPanelProps {
  tripId: string;
  token: string | null | undefined;
  members: TripMember[];
  myUserId: number | null;
  /** Inline mode: renders without fixed height (used inside a tab panel) */
  inline?: boolean;
  /** Called whenever Navia executes a trip mutation so the parent can re-fetch the plan */
  onTripUpdated?: () => void;
  /** Whether the panel is currently shown (drives unread tracking); defaults to true */
  visible?: boolean;
  /** Reports the number of messages that arrived while the panel was hidden */
  onUnreadChange?: (count: number) => void;
}

const TripChatPanel: React.FC<TripChatPanelProps> = ({
  tripId,
  token,
  members,
  myUserId,
  inline = false,
  onTripUpdated,
  visible = true,
  onUnreadChange,
}) => {
  const prevMessageCountRef = React.useRef(0);

  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const {
    messages,
    status,
    sending,
    sendMessage,
    acceptProposalMsg,
    rejectProposalMsg,
    proposalStates,
    typingUsers,
    naviaTyping,
    notifyTyping,
  } = useTripChat(tripId, token, members, myUserId);

  React.useEffect(() => {
    if (!onTripUpdated) return;
    const newMsgs = messages.slice(prevMessageCountRef.current);
    prevMessageCountRef.current = messages.length;
    if (newMsgs.some(m => m.messageType === 'System')) {
      onTripUpdated();
    }
  }, [messages, onTripUpdated]);

  // ── Unread tracking: count messages that land while the panel is hidden ──
  const lastSeenCountRef = useRef(0);
  const [firstUnreadIdx, setFirstUnreadIdx] = useState<number | null>(null);
  useEffect(() => {
    if (visible) {
      lastSeenCountRef.current = messages.length;
      onUnreadChange?.(0);
    } else {
      const unread = Math.max(0, messages.length - lastSeenCountRef.current);
      if (unread > 0 && firstUnreadIdx === null) setFirstUnreadIdx(lastSeenCountRef.current);
      onUnreadChange?.(unread);
    }
  }, [messages.length, visible, onUnreadChange, firstUnreadIdx]);
  // The "New messages" divider fades out shortly after the panel is reopened
  useEffect(() => {
    if (!visible || firstUnreadIdx === null) return;
    const tm = setTimeout(() => setFirstUnreadIdx(null), 6000);
    return () => clearTimeout(tm);
  }, [visible, firstUnreadIdx]);

  const [input, setInput] = useState('');
  const [showJump, setShowJump] = useState(false);

  // One-time note when the chat flips solo → group: explains that @navia is now
  // required to summon the AI, so returning solo users aren't surprised.
  const [showGroupHint, setShowGroupHint] = useState(false);
  const prevMemberCountRef = useRef(members.length);
  useEffect(() => {
    const prev = prevMemberCountRef.current;
    const curr = members.length;
    prevMemberCountRef.current = curr;
    // prev === 1 (not <= 1) so the initial [] → N populate on load doesn't read
    // as a join; a genuine real-time join always happens from a settled solo (1).
    if (prev === 1 && curr > 1) {
      try {
        if (!localStorage.getItem(`tripician:naviaGroupHint:${tripId}`)) setShowGroupHint(true);
      } catch {
        setShowGroupHint(true);
      }
    }
  }, [members.length, tripId]);
  const dismissGroupHint = useCallback(() => {
    setShowGroupHint(false);
    try { localStorage.setItem(`tripician:naviaGroupHint:${tripId}`, '1'); } catch { /* best-effort */ }
  }, [tripId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoStickRef = useRef(true);

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartRef = useRef<number>(-1);

  // Proposal id lookup  for now we read the proposal id from a local cache
  // keyed by chatMessageId. The backend should ideally embed proposalId in the
  // metadata; for now we extract it from a sibling field or use a heuristic.
  // The TripProposalController exposes GET /api/proposals/by-chat/{chatMessageId}
  // We lazily resolve it on first Accept/Reject click.
  const proposalIdCache = useRef<Map<string, number>>(new Map());
  const [resolveErrors, setResolveErrors] = useState<Record<string, string>>({});

  // ── Trip credit balance (group wallet) ──
  const [tripWallet, setTripWallet] = useState<NaviaCreditBalance | null>(null);
  const [creditAnchor, setCreditAnchor] = useState<HTMLElement | null>(null);
  const tripCredits = tripWallet?.balance ?? null;
  const naviaSpendCountRef = useRef(0);
  useEffect(() => {
    if (!tripId || !token) return;
    // Refresh whenever Navia-driven messages land (each implies a spend).
    const naviaSpendCount = messages.filter(
      m => m.messageType === 'Navia' || m.messageType === 'Proposal',
    ).length;
    if (tripCredits !== null && naviaSpendCount === naviaSpendCountRef.current) return;
    naviaSpendCountRef.current = naviaSpendCount;
    fetchTripCredits(tripId, token)
      .then(setTripWallet)
      .catch(() => { /* chip is best-effort */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, token, messages]);

  const resolveProposalId = useCallback(async (chatMessageId: string): Promise<number | null> => {
    if (proposalIdCache.current.has(chatMessageId)) {
      return proposalIdCache.current.get(chatMessageId)!;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/proposals/by-chat/${chatMessageId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const id = data?.data?.id as number | null;
      if (id) proposalIdCache.current.set(chatMessageId, id);
      return id ?? null;
    } catch {
      return null;
    }
  }, [token]);

  // Auto-scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    autoStickRef.current = atBottom;
    setShowJump(!atBottom);
  }, []);

  useEffect(() => {
    if (autoStickRef.current) {
      endRef.current?.scrollIntoView({ behavior: messages.length <= 20 ? 'auto' : 'smooth' });
    } else {
      setShowJump(true);
    }
  }, [messages, naviaTyping, typingUsers]);

  const jumpToBottom = () => {
    autoStickRef.current = true;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJump(false);
  };

  // Solo vs group: a trip is "solo" when the owner is its only participant.
  // `members` mirrors the backend participant set (owner + active members), so
  // members.length <= 1 here matches the server-side solo routing exactly.
  // Solo → every message reaches Navia, so we drop all the @navia ceremony.
  const isSolo = members.length <= 1;

  // Detect @navia in input for hint (only relevant once the chat is a group)
  const isNaviaMention = NAVIA_MENTION_RE.test(input);
  const showMentionCue = !isSolo && isNaviaMention;

  // All mentionable participants: Navia first, then trip members
  const mentionables = useMemo(() => [
    { id: 'navia', insertName: 'navia', displayName: 'Navia', isNavia: true as const, avatarUrl: undefined as string | null | undefined },
    ...members.map(m => ({
      id: String(m.id),
      insertName: m.name,
      displayName: m.name,
      isNavia: false as const,
      avatarUrl: m.avatarUrl,
    })),
  ], [members]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return mentionables.filter(m => m.displayName.toLowerCase().startsWith(q));
  }, [mentionQuery, mentionables]);

  const selectMention = useCallback((suggestion: { insertName: string; displayName: string }) => {
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    const cursorPos = el?.selectionStart ?? input.length;
    const start = mentionStartRef.current;
    if (start < 0) return;
    const before = input.slice(0, start);
    const after = input.slice(cursorPos);
    const inserted = `@${suggestion.insertName} `;
    const newVal = (before + inserted + after).slice(0, MAX_CHARS);
    setInput(newVal);
    notifyTyping(newVal);
    setMentionQuery(null);
    mentionStartRef.current = -1;
    const newCursor = before.length + inserted.length;
    setTimeout(() => {
      if (el) {
        el.selectionStart = newCursor;
        el.selectionEnd = newCursor;
        el.focus();
      }
    }, 0);
  }, [input, notifyTyping]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    autoStickRef.current = true;
    sendMessage(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [input, sending, sendMessage]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectMention(mentionSuggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        mentionStartRef.current = -1;
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Group consecutive messages from the same sender for avatar consolidation
  const renderMessages = () => {
    const nodes: React.ReactNode[] = [];
    let lastUserId: string | null = null;

    messages.forEach((msg, idx) => {
      const isMine = msg.userId != null && msg.userId === myUserId;
      const key = msg.id;

      // "New messages" divider - marks where you left off
      if (firstUnreadIdx !== null && idx === firstUnreadIdx) {
        lastUserId = null;
        nodes.push(
          <Box key="unread-divider" sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,56,92,0.35)' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FF385C', flexShrink: 0 }}>
              New
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,56,92,0.35)' }} />
          </Box>
        );
      }

      if (msg.messageType === 'System') {
        lastUserId = null;
        nodes.push(
          <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <SystemBubble msg={msg} isLight={isLight} />
          </motion.div>
        );
        return;
      }

      if (msg.messageType === 'Proposal') {
        lastUserId = null;
        const ps = proposalStates[msg.id] ?? 'pending';
        nodes.push(
          <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, my: 0.25 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'transparent', flexShrink: 0, alignSelf: 'flex-end' }}>
                <NaviaLogo size={28} />
              </Avatar>
              <ProposalBubble
                msg={msg}
                actionState={ps}
                isLight={isLight}
                resolveError={resolveErrors[msg.id]}
                onAccept={async () => {
                  const pid = await resolveProposalId(msg.id);
                  if (pid != null) {
                    setResolveErrors(prev => {
                      const { [msg.id]: _removed, ...rest } = prev;
                      return rest;
                    });
                    await acceptProposalMsg(msg.id, pid);
                    // Trigger immediate refresh of the left planning panel
                    // (don't wait only for the SignalR System message)
                    onTripUpdated?.();
                  } else {
                    setResolveErrors(prev => ({ ...prev, [msg.id]: 'This suggestion has expired and can no longer be applied.' }));
                  }
                }}
                onReject={async () => {
                  const pid = await resolveProposalId(msg.id);
                  if (pid != null) {
                    setResolveErrors(prev => {
                      const { [msg.id]: _removed, ...rest } = prev;
                      return rest;
                    });
                    rejectProposalMsg(msg.id, pid);
                  } else {
                    setResolveErrors(prev => ({ ...prev, [msg.id]: 'This suggestion has expired and can no longer be dismissed.' }));
                  }
                }}
              />
            </Box>
          </motion.div>
        );
        return;
      }

      // User / Navia messages
      const senderId = String(msg.userId ?? 'navia');
      const showAvatar = senderId !== lastUserId;
      lastUserId = senderId;

      // Check if next message is from same sender (for timestamp grouping)
      const nextMsg = messages[idx + 1];
      const isLast = !nextMsg || String(nextMsg.userId ?? 'navia') !== senderId || nextMsg.messageType !== msg.messageType;

      nodes.push(
        <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <Box sx={{ mb: isLast ? 1.5 : 0.35 }}>
            <MessageBubble msg={msg} isMine={isMine} isLight={isLight} showAvatar={showAvatar} showTime={isLast} />
          </Box>
        </motion.div>
      );
    });

    return nodes;
  };

  // ??? Status dot ?????????????????????????????????????????????????????????????
  const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#f59e0b' : '#ef4444';
  const statusLabel = status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Reconnecting';

  // ??? Render ??????????????????????????????????????????????????????????????????
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: inline ? '100%' : '100%',
      minHeight: inline ? 420 : undefined,
      bgcolor: 'background.paper',
      borderRadius: inline ? '12px' : 0,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Slim header - identity + live status */}
      <Box sx={(t) => ({
        px: 2, py: 1.1, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 1,
        borderBottom: `1px solid ${t.palette.divider}`,
      })}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary', lineHeight: 1.3 }}>
            Trip Discussion
          </Typography>
          <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
            {isSolo
              ? 'Just you & Navia · she replies to every message'
              : <>{members.length} travelers · <Box component='span' sx={{ color: 'primary.main', fontWeight: 600 }}>@navia</Box> to bring in the co-planner</>}
          </Typography>
        </Box>
        {tripCredits !== null && (
          <Tooltip title="Trip credits, a shared wallet for the whole crew. Tap for details" arrow>
            <Chip
              label={String(tripCredits)}
              icon={<IconCoin size={13} stroke={1.9} />}
              size="small"
              onClick={(e) => setCreditAnchor(e.currentTarget)}
              sx={{
                height: 22, fontSize: 11, fontWeight: 700, borderRadius: '7px', flexShrink: 0,
                cursor: 'pointer',
                bgcolor: tripCredits <= 10 ? 'rgba(239,68,68,0.10)' : 'rgba(255,56,92,0.08)',
                color: tripCredits <= 10 ? '#ef4444' : '#FF385C',
                border: `1px solid ${tripCredits <= 10 ? 'rgba(239,68,68,0.25)' : 'rgba(255,56,92,0.18)'}`,
                '&:hover': { bgcolor: tripCredits <= 10 ? 'rgba(239,68,68,0.16)' : 'rgba(255,56,92,0.14)' },
              }}
            />
          </Tooltip>
        )}
        <CreditUsagePopover
          open={Boolean(creditAnchor)}
          anchorEl={creditAnchor}
          onClose={() => setCreditAnchor(null)}
          wallet={tripWallet}
          title="Trip credits"
          subtitle="A shared wallet, every member's Navia requests on this trip spend from it."
        />
        <Tooltip title={statusLabel} arrow>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <FiberManualRecordIcon sx={{ fontSize: 9, color: statusColor }} />
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 600 }}>{statusLabel}</Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1, overflowY: 'auto', px: 2, py: 1.5,
          display: 'flex', flexDirection: 'column', gap: 0,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { background: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)', borderRadius: 4 },
        }}
      >
        {messages.length === 0 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1 }}>
            <NaviaLogo size={40} />
            <Typography sx={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.01em', color: 'text.primary' }}>
              {isSolo ? 'Plan it with Navia' : 'Plan it together'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', maxWidth: 260, lineHeight: 1.55 }}>
              {isSolo
                ? "It's just you and Navia here. Ask anything: routes, dates, places to add. She'll suggest changes to your trip."
                : <>All trip members can chat here. Type <Box component='span' sx={{ color: 'primary.main', fontWeight: 700 }}>@navia</Box> to get suggestions for your trip.</>}
            </Typography>
          </Box>
        )}

        <AnimatePresence initial={false}>
          {renderMessages()}
        </AnimatePresence>

        {/* Typing / analysing indicator */}
        <AnimatePresence>
          {(naviaTyping || typingUsers.length > 0) && (
            <Box
              component={motion.div as React.ElementType}
              key="typing-indicator"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pb: 1 }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                background: 'rgba(255,56,92,0.10)',
                border: '1px solid rgba(255,56,92,0.18)',
                borderRadius: '14px',
                px: 1.5, py: 0.7,
              }}>
                {naviaTyping ? (
                  <NaviaOrb size={16} processing />
                ) : (
                  [0, 1, 2].map(i => (
                    <Box
                      key={i}
                      component={motion.span as React.ElementType}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      sx={{ width: 6, height: 6, borderRadius: '50%', background: '#FF385C', display: 'block' }}
                    />
                  ))
                )}
                <Box component="span" sx={{ ml: 0.5, fontSize: '0.72rem', color: 'rgba(255,56,92,0.85)', fontWeight: 600, letterSpacing: 0.2 }}>
                  {naviaTyping
                    ? 'Navia is analysing...'
                    : typingUsers.length === 1
                      ? `${typingUsers[0]} is typing...`
                      : `${typingUsers.join(', ')} are typing...`}
                </Box>
              </Box>
            </Box>
          )}
        </AnimatePresence>

        <div ref={endRef} />
      </Box>

      {/* Jump button */}
      <Fade in={showJump}>
        <IconButton
          onClick={jumpToBottom}
          size='small'
          sx={{
            position: 'absolute', bottom: 76, right: 14, zIndex: 10,
            background: isLight ? '#fff' : '#1e2d3d',
            boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
            width: 32, height: 32,
            '&:hover': { background: isLight ? '#f5f5f5' : '#263547' },
          }}
        >
          <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Fade>

      {/* Input */}
      <Box sx={{
        px: 1.5, pb: 1.5, pt: 0.75,
        borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
        flexShrink: 0,
        background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(14,22,33,0.95)',
        backdropFilter: 'blur(8px)',
        position: 'relative',
      }}>

        {/* @mention dropdown */}
        <AnimatePresence>
          {mentionSuggestions.length > 0 && (
            <Box
              component={motion.div as React.ElementType}
              key="mention-dropdown"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              sx={{
                position: 'absolute',
                bottom: '100%',
                left: 12,
                right: 12,
                mb: 0.5,
                zIndex: 200,
                background: isLight ? '#fff' : '#1a2536',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: '12px',
                boxShadow: isLight
                  ? '0 -4px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
                  : '0 -4px 24px rgba(0,0,0,0.40)',
                overflow: 'hidden',
                maxHeight: 240,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 3 },
                '&::-webkit-scrollbar-thumb': { background: isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)', borderRadius: 4 },
              }}
            >
              <Box sx={{ px: 1.5, py: 0.65, borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}` }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: isLight ? '#aaa' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Mention a member
                </Typography>
              </Box>
              {mentionSuggestions.map((s, i) => (
                <Box
                  key={s.id}
                  onMouseDown={e => { e.preventDefault(); selectMention(s); }}
                  onMouseEnter={() => setMentionIndex(i)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    px: 1.5, py: 0.85, cursor: 'pointer',
                    background: i === mentionIndex
                      ? (isLight ? 'rgba(255,56,92,0.07)' : 'rgba(255,56,92,0.13)')
                      : 'transparent',
                    transition: 'background .1s',
                    '&:hover': {
                      background: isLight ? 'rgba(255,56,92,0.07)' : 'rgba(255,56,92,0.13)',
                    },
                  }}
                >
                  {s.isNavia ? (
                    <NaviaLogo size={28} />
                  ) : (
                    <Avatar
                      src={s.avatarUrl ?? undefined}
                      sx={{ width: 28, height: 28, fontSize: 10, bgcolor: '#FF385C', flexShrink: 0 }}
                    >
                      {getInitials(s.displayName)}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: isLight ? '#111' : 'rgba(255,255,255,0.88)', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {s.displayName}
                      {/* Deliberate exception to dropping "AI" from the UI: in a chat with
                          real people, saying which speaker is a machine is disclosure that
                          the reader needs. Keep this label. */}
                      {s.isNavia && (
                        <Chip
                          label="AI"
                          size="small"
                          sx={{ height: 16, fontSize: 9.5, fontWeight: 700, bgcolor: 'rgba(255,56,92,0.12)', color: '#FF385C', border: '1px solid rgba(255,56,92,0.22)', borderRadius: '4px', '& .MuiChip-label': { px: 0.75 } }}
                        />
                      )}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: isLight ? '#bbb' : 'rgba(255,255,255,0.30)', lineHeight: 1 }}>
                      @{s.insertName}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </AnimatePresence>
        {/* Solo → group transition note (shown once per trip) */}
        <AnimatePresence>
          {showGroupHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.7, mb: 0.75,
                background: isLight ? 'rgba(255,56,92,0.06)' : 'rgba(255,56,92,0.12)',
                borderRadius: '8px', border: '1px solid rgba(255,56,92,0.18)',
              }}>
                <NaviaLogo size={16} />
                <Typography sx={{ flex: 1, fontSize: 11.5, color: '#FF385C', fontWeight: 600, lineHeight: 1.4 }}>
                  Others just joined. Now type <Box component='span' sx={{ fontWeight: 700 }}>@navia</Box> to bring Navia into the chat.
                </Typography>
                <Box
                  component='button'
                  onClick={dismissGroupHint}
                  sx={{
                    flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer',
                    color: '#FF385C', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                    px: 0.75, py: 0.25, borderRadius: '6px',
                    '&:hover': { background: isLight ? 'rgba(255,56,92,0.10)' : 'rgba(255,56,92,0.18)' },
                  }}
                >
                  Got it
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
        {/* @navia hint */}
        <AnimatePresence>
          {showMentionCue && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.6, mb: 0.75,
                background: isLight ? 'rgba(255,56,92,0.06)' : 'rgba(255,56,92,0.12)',
                borderRadius: '8px', border: '1px solid rgba(255,56,92,0.18)',
              }}>
                <NaviaLogo size={14} />
                <Typography sx={{ fontSize: 11.5, color: '#FF385C', fontWeight: 600 }}>
                  Navia will be summoned... she'll analyse your trip and suggest changes
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{
          display: 'flex', alignItems: 'flex-end', gap: 0.75,
          border: `1.5px solid ${showMentionCue ? 'rgba(255,56,92,0.50)' : (isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)')}`,
          borderRadius: '12px', px: 1.5, py: 0.75,
          background: isLight ? '#fafafa' : 'rgba(255,255,255,0.03)',
          boxShadow: showMentionCue ? '0 0 0 3px rgba(255,56,92,0.10)' : 'none',
          transition: 'border-color .2s, box-shadow .2s',
          '&:focus-within': {
            borderColor: showMentionCue ? 'rgba(255,56,92,0.60)' : (isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)'),
            boxShadow: showMentionCue ? '0 0 0 3px rgba(255,56,92,0.10)' : 'none',
          },
        }}>
          <TextField
            inputRef={inputRef}
            value={input}
            onChange={e => {
                const v = e.target.value.slice(0, MAX_CHARS);
                setInput(v);
                notifyTyping(v);
                // @mention detection, group chats only. In a solo trip there is
                // no one to mention and every message already reaches Navia, so
                // the autocomplete stays closed.
                if (isSolo) {
                  setMentionQuery(null);
                  mentionStartRef.current = -1;
                  return;
                }
                const cursor = (e.target as HTMLTextAreaElement).selectionStart ?? v.length;
                const textUpToCursor = v.slice(0, cursor);
                const match = textUpToCursor.match(/@(\w*)$/);
                if (match) {
                  setMentionQuery(match[1]);
                  mentionStartRef.current = cursor - match[0].length;
                  setMentionIndex(0);
                } else {
                  setMentionQuery(null);
                  mentionStartRef.current = -1;
                }
              }}
            onKeyDown={onKeyDown}
            placeholder={!token ? 'Sign in to chat' : (isSolo ? 'Message Navia, she replies to everything' : 'Message the group or type @navia')}
            multiline
            maxRows={4}
            disabled={!token}
            fullWidth
            variant='standard'
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: 13.5, lineHeight: 1.55, fontFamily: "'Inter', system-ui, sans-serif",
                '& textarea': {
                  color: isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)',
                  resize: 'none', padding: 0,
                },
                '& textarea::placeholder': {
                  color: isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.25)', opacity: 1,
                },
              },
            }}
          />
          <IconButton
            size='small'
            onClick={send}
            disabled={!input.trim() || sending || !token}
            sx={{
              width: 34, height: 34, borderRadius: '9px', flexShrink: 0, mb: 0.1,
              background: (input.trim() && !sending && token) ? '#FF385C' : 'transparent',
              color: (input.trim() && !sending && token) ? '#fff' : (isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.20)'),
              transition: 'background .18s, color .18s',
              '&:hover': { background: (input.trim() && !sending && token) ? '#D91A50' : undefined },
              '&.Mui-disabled': { background: 'transparent' },
            }}
          >
            {sending ? (
              <CircularProgress size={13} sx={{ color: 'inherit' }} />
            ) : (
              <SendRoundedIcon sx={{ fontSize: 15 }} />
            )}
          </IconButton>
        </Box>
        {input.length > MAX_CHARS * 0.85 && (
          <Typography sx={{ fontSize: 10, color: input.length >= MAX_CHARS ? 'error.main' : (isLight ? '#aaa' : 'rgba(255,255,255,0.3)'), textAlign: 'right', mt: 0.4, mr: 0.5 }}>
            {input.length}/{MAX_CHARS}
          </Typography>
        )}
      </Box>
      <Box sx={{
        mt: 0.1,
        mb: 1.5,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0.2,
      }}>
        <Typography sx={{
          fontSize: 9.5,
          fontWeight: 500,
          lineHeight: 1.3,
          textAlign: 'center',
          color: isLight ? 'rgba(0,0,0,0.34)' : 'rgba(255,255,255,0.34)',
        }}>
          Navia can make mistakes. Always verify travel details before booking.
        </Typography>
        <Typography sx={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.4px',
          color: isLight
            ? 'rgba(0,0,0,0.28)'
            : 'rgba(255,255,255,0.28)',
        }}>
          Navia drafts, you decide
        </Typography>
      </Box>
    </Box>
  );
};

export default TripChatPanel;
