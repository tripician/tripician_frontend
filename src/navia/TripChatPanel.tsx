/**
 * TripChatPanel.tsx
 *
 * Premium real-time trip chat panel.
 *
 * Features:
 *  � All trip members can send messages
 *  � Type @navia to summon the AI agent � the backend handles routing,
 *    Navia's reply arrives back through SignalR as a Proposal or Navia message
 *  � Proposal bubbles surface the AI suggestion with structured Accept / Reject actions
 *  � System messages show structured per-change results (destination added, dates updated�)
 *  � Auto-scroll + "New message" jump button
 *  � Connection status indicator
 *  � @navia mention hint in the input
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { motion, AnimatePresence } from 'framer-motion';

import { useTripChat } from './useTripChat';
import {
  parseProposalMetadata,
  parseSystemMetadata,
  type TripChatMessage,
  type TripMember,
} from './tripChatService';

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
const EVENT_LABELS: Record<string, { icon: string; label: (r: any) => string }> = {
  destination_added:         { icon: '??', label: r => `${r.destination} added to trip` },
  destination_already_present: { icon: '??', label: r => `${r.destination} already in trip` },
  destination_removed:       { icon: '???', label: r => `${r.destination} removed from trip` },
  destination_not_found:     { icon: '???', label: r => `${r.destination} not found in trip` },
  dates_updated:             { icon: '??', label: r => `Trip dates updated${r.startDate ? ` � start ${r.startDate}` : ''}${r.endDate ? ` � end ${r.endDate}` : ''}` },
  dates_update_failed:       { icon: '??', label: () => 'Date update failed' },
  place_noted:               { icon: '???', label: r => `Place "${r.place}" noted` },
  member_invite_noted:       { icon: '??', label: r => `Invite for "${r.memberName}" noted` },
  execution_error:           { icon: '??', label: r => r.summary ?? 'Execution error' },
};

// ??? Sub-components ???????????????????????????????????????????????????????????

/** Navia logo mark */
const NaviaLogo: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Box
    sx={{
      width: size, height: size, borderRadius: `${size * 0.28}px`,
      background: 'linear-gradient(135deg,#FF385C,#D91A50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}
  >
    <AutoAwesomeRoundedIcon sx={{ fontSize: size * 0.55, color: '#fff' }} />
  </Box>
);

/** System change result row */
const SystemResultRow: React.FC<{ result: ReturnType<typeof parseSystemMetadata>[number] }> = ({ result }) => {
  const entry = result.event ? EVENT_LABELS[result.event] : null;
  const icon = entry?.icon ?? (result.success ? '?' : '?');
  const label = entry ? entry.label(result) : (result.summary ?? result.action);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.15 }}>
      <Typography sx={{ fontSize: 13, lineHeight: 1 }}>{icon}</Typography>
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
}

const ProposalBubble: React.FC<ProposalBubbleProps> = ({ msg, actionState, onAccept, onReject, isLight }) => {
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
        <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#FF385C' }}>
          Navia Suggestion
        </Typography>
      </Box>

      {/* Message text */}
      <Typography sx={{ fontSize: 13.5, lineHeight: 1.65, color: isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)', mb: 1.25, whiteSpace: 'pre-line' }}>
        {msg.message}
      </Typography>

      {/* Operation chips */}
      {ops.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
          {ops.map((op, i) => {
            const label = op.action === 'add_destination' ? `+ ${op.destination}`
              : op.action === 'remove_destination' ? `? ${op.destination}`
              : op.action === 'update_dates' ? `?? ${op.startDate ?? ''}${op.startDate && op.endDate ? ' ? ' : ''}${op.endDate ?? ''}`
              : op.action === 'add_place' ? `?? ${op.place}`
              : op.action === 'add_member' ? `?? ${op.memberName}`
              : op.action;
            return (
              <Chip
                key={i}
                label={label}
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
              background: 'linear-gradient(135deg,#FF385C,#D91A50)',
              color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: '0 2px 10px rgba(255,56,92,0.35)',
              transition: 'opacity .15s, transform .1s',
              '&:hover': { opacity: 0.9, transform: 'translateY(-1px)' },
              '&:disabled': { opacity: 0.55, cursor: 'not-allowed', transform: 'none' },
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
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, isMine, isLight, showAvatar }) => {
  const isNavia = msg.messageType === 'Navia';
  const name = isNavia ? 'Navia' : (msg.displayName || `User ${msg.userId ?? ''}`);
  const initials = isNavia ? 'N' : getInitials(name);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
      {!isMine && showAvatar && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.4, ml: isNavia ? 0 : 0 }}>
          {isNavia ? <NaviaLogo size={16} /> : (
            <Avatar src={msg.avatarUrl} sx={{ width: 16, height: 16, fontSize: 8, bgcolor: '#FF385C' }}>
              {initials}
            </Avatar>
          )}
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: isNavia ? '#FF385C' : (isLight ? '#555' : 'rgba(255,255,255,0.55)'), letterSpacing: isNavia ? '0.4px' : 0, textTransform: isNavia ? 'uppercase' : 'none' }}>
            {name}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, flexDirection: isMine ? 'row-reverse' : 'row' }}>
        {!isMine && (
          <Avatar
            src={isNavia ? undefined : msg.avatarUrl}
            sx={{
              width: 28, height: 28, fontSize: 11, flexShrink: 0, alignSelf: 'flex-end',
              bgcolor: isNavia ? 'transparent' : '#FF385C',
              visibility: showAvatar ? 'visible' : 'hidden',
            }}
          >
            {isNavia ? <NaviaLogo size={28} /> : initials}
          </Avatar>
        )}
        <Box
          sx={{
            px: 1.5, py: 0.9,
            maxWidth: 360,
            borderRadius: isMine ? '14px 14px 3px 14px' : (isNavia ? '14px 14px 14px 3px' : '14px 14px 14px 3px'),
            fontSize: 13.5, lineHeight: 1.65, fontFamily: 'inherit', wordBreak: 'break-word',
            background: isMine
              ? 'linear-gradient(135deg,#FF385C,#D91A50)'
              : isNavia
                ? (isLight ? '#f4f4f4' : 'rgba(255,255,255,0.07)')
                : (isLight ? '#f0f0f0' : 'rgba(255,255,255,0.08)'),
            color: isMine ? '#fff' : (isLight ? '#1a1a1a' : 'rgba(255,255,255,0.88)'),
            boxShadow: isMine ? '0 2px 12px rgba(255,56,92,0.28)' : 'none',
            border: !isMine ? `0.5px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'}` : 'none',
          }}
        >
          <Typography sx={{ fontSize: 'inherit', lineHeight: 'inherit', whiteSpace: 'pre-line', color: 'inherit' }}>
            {msg.message}
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: 10.5, color: isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.28)', mt: 0.35, mx: isMine ? 0 : 4.5 }}>
        {formatTime(msg.sentAt)}
      </Typography>
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
}

const TripChatPanel: React.FC<TripChatPanelProps> = ({
  tripId,
  token,
  members,
  myUserId,
  inline = false,
  onTripUpdated,
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

  const [input, setInput] = useState('');
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoStickRef = useRef(true);

  // Proposal id lookup � for now we read the proposal id from a local cache
  // keyed by chatMessageId. The backend should ideally embed proposalId in the
  // metadata; for now we extract it from a sibling field or use a heuristic.
  // The TripProposalController exposes GET /api/proposals/by-chat/{chatMessageId}
  // We lazily resolve it on first Accept/Reject click.
  const proposalIdCache = useRef<Map<string, number>>(new Map());

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

  // Detect @navia in input for hint
  const isNaviaMention = NAVIA_MENTION_RE.test(input);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    autoStickRef.current = true;
    sendMessage(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [input, sending, sendMessage]);

  const onKeyDown = (e: React.KeyboardEvent) => {
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
                onAccept={async () => {
                  const pid = await resolveProposalId(msg.id);
                  if (pid != null) {
                    await acceptProposalMsg(msg.id, pid);
                    // Trigger immediate refresh of the left planning panel
                    // (don't wait only for the SignalR System message)
                    onTripUpdated?.();
                  }
                }}
                onReject={async () => {
                  const pid = await resolveProposalId(msg.id);
                  if (pid != null) rejectProposalMsg(msg.id, pid);
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
            <MessageBubble msg={msg} isMine={isMine} isLight={isLight} showAvatar={showAvatar} />
          </Box>
        </motion.div>
      );
    });

    return nodes;
  };

  // ??? Status dot ?????????????????????????????????????????????????????????????
  const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#f59e0b' : '#ef4444';
  const statusLabel = status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting�' : 'Reconnecting�';

  // ??? Render ??????????????????????????????????????????????????????????????????
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      height: inline ? '100%' : '100%',
      minHeight: inline ? 420 : undefined,
      background: isLight ? '#fff' : '#0e1621',
      borderRadius: inline ? '12px' : 0,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <Box sx={{
        px: 2, py: 1.25, borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0,
        background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(14,22,33,0.95)',
        backdropFilter: 'blur(8px)',
      }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '9px',
          background: 'linear-gradient(135deg,#FF385C,#D91A50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: '#fff' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: isLight ? '#111' : '#fff' }}>
            Trip Chat
          </Typography>
          <Typography sx={{ fontSize: 11, color: isLight ? '#888' : 'rgba(255,255,255,0.45)', lineHeight: 1 }}>
            Type <Box component='span' sx={{ color: '#FF385C', fontWeight: 700 }}>@navia</Box> to ask the AI
          </Typography>
        </Box>
        <Tooltip title={statusLabel} arrow>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FiberManualRecordIcon sx={{ fontSize: 9, color: statusColor }} />
            <Typography sx={{ fontSize: 10.5, color: isLight ? '#999' : 'rgba(255,255,255,0.4)' }}>{statusLabel}</Typography>
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
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg,#FF385C,#D91A50)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
              <AutoAwesomeRoundedIcon sx={{ fontSize: 24, color: '#fff' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: isLight ? '#222' : 'rgba(255,255,255,0.85)' }}>
              Trip Chat
            </Typography>
            <Typography sx={{ fontSize: 13, color: isLight ? '#888' : 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 260, lineHeight: 1.55 }}>
              All trip members can chat here. Type <Box component='span' sx={{ color: '#FF385C', fontWeight: 700 }}>@navia</Box> to get AI suggestions for your trip.
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
                display: 'flex', alignItems: 'center', gap: 0.5,
                background: 'rgba(255,56,92,0.10)',
                border: '1px solid rgba(255,56,92,0.18)',
                borderRadius: '14px',
                px: 1.5, py: 0.7,
              }}>
                {[0, 1, 2].map(i => (
                  <Box
                    key={i}
                    component={motion.span as React.ElementType}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    sx={{ width: 6, height: 6, borderRadius: '50%', background: '#FF385C', display: 'block' }}
                  />
                ))}
                <Box component="span" sx={{ ml: 1, fontSize: '0.72rem', color: 'rgba(255,56,92,0.85)', fontWeight: 600, letterSpacing: 0.2 }}>
                  {naviaTyping
                    ? 'Navia is analysing�'
                    : typingUsers.length === 1
                      ? `${typingUsers[0]} is typing�`
                      : `${typingUsers.join(', ')} are typing�`}
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
      }}>
        {/* @navia hint */}
        <AnimatePresence>
          {isNaviaMention && (
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
                  Navia will be summoned � she'll analyse your trip and suggest changes
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{
          display: 'flex', alignItems: 'flex-end', gap: 0.75,
          border: `1.5px solid ${isNaviaMention ? 'rgba(255,56,92,0.50)' : (isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)')}`,
          borderRadius: '12px', px: 1.5, py: 0.75,
          background: isLight ? '#fafafa' : 'rgba(255,255,255,0.03)',
          boxShadow: isNaviaMention ? '0 0 0 3px rgba(255,56,92,0.10)' : 'none',
          transition: 'border-color .2s, box-shadow .2s',
          '&:focus-within': {
            borderColor: isNaviaMention ? 'rgba(255,56,92,0.60)' : (isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)'),
            boxShadow: isNaviaMention ? '0 0 0 3px rgba(255,56,92,0.10)' : 'none',
          },
        }}>
          <TextField
            inputRef={inputRef}
            value={input}
            onChange={e => { const v = e.target.value.slice(0, MAX_CHARS); setInput(v); notifyTyping(v); }}
            onKeyDown={onKeyDown}
            placeholder={token ? 'Message the group� or type @navia' : 'Sign in to chat'}
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
              background: (input.trim() && !sending && token) ? 'linear-gradient(135deg,#FF385C,#D91A50)' : 'transparent',
              color: (input.trim() && !sending && token) ? '#fff' : (isLight ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.20)'),
              boxShadow: (input.trim() && !sending && token) ? '0 2px 10px rgba(255,56,92,0.35)' : 'none',
              transition: 'background .18s, color .18s, box-shadow .18s',
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
    </Box>
  );
};

export default TripChatPanel;
