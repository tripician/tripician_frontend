/**
 * useTripChat.ts
 *
 * Manages the full TripChat experience:
 *  - Fetches history on mount
 *  - Connects to SignalR hub, joins the trip group
 *  - Pushes incoming real-time messages into state
 *  - Sends user messages via REST
 *  - Detects @navia in the message and routes to /api/trip-chat/send
 *    (the backend TripChatService intercepts @navia and calls Navia internally)
 *  - Exposes accept/reject handlers for Proposal messages
 *  - Enriches messages with member display names / avatars
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import {
  fetchTripChatMessages,
  sendTripChatMessage,
  acceptProposal,
  rejectProposal,
  type TripChatMessage,
  type TripMember,
} from './tripChatService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ??? Types ????????????????????????????????????????????????????????????????????

export type ChatStatus = 'idle' | 'connecting' | 'connected' | 'error';

/** Per-proposal client-side action state to prevent double-clicks */
export type ProposalActionState = 'pending' | 'accepting' | 'rejecting' | 'accepted' | 'rejected' | 'error';

export interface UseTripChatReturn {
  messages: TripChatMessage[];
  status: ChatStatus;
  sending: boolean;
  /** Send a plain member message (or @navia message — backend decides) */
  sendMessage: (text: string) => Promise<void>;
  acceptProposalMsg: (chatMessageId: string, proposalId: number) => Promise<void>;
  rejectProposalMsg: (chatMessageId: string, proposalId: number) => Promise<void>;
  /** Track per-proposal action in-progress states */
  proposalStates: Record<string, ProposalActionState>;
  myUserId: number | null;
  /** Names of members currently typing (empty = nobody) */
  typingUsers: string[];
  /** True while Navia AI is analysing a @navia message */
  naviaTyping: boolean;
  /** Call when local input changes to broadcast typing state */
  notifyTyping: (text: string) => void;
}

// ??? Hook ?????????????????????????????????????????????????????????????????????

export function useTripChat(
  tripId: string,
  token: string | null | undefined,
  members: TripMember[],
  myUserId: number | null,
): UseTripChatReturn {
  const [messages, setMessages] = useState<TripChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [sending, setSending] = useState(false);
  const [proposalStates, setProposalStates] = useState<Record<string, ProposalActionState>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [naviaTyping, setNaviaTyping] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const mountedRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Build a lookup for fast member enrichment
  const memberMap = useRef<Map<number | string, TripMember>>(new Map());
  useEffect(() => {
    const m = new Map<number | string, TripMember>();
    members.forEach(mb => m.set(String(mb.id), mb));
    memberMap.current = m;
  }, [members]);

  const enrich = useCallback((msg: TripChatMessage): TripChatMessage => {
    if (msg.userId == null) return msg; // Navia / System
    const member = memberMap.current.get(String(msg.userId));
    if (!member) return msg;
    return {
      ...msg,
      displayName: member.name || msg.displayName,
      avatarUrl: member.avatarUrl ?? msg.avatarUrl,
    };
  }, []);

  // ?? Initial history load ??????????????????????????????????????????????????
  useEffect(() => {
    if (!tripId || !token) return;
    fetchTripChatMessages(tripId, token)
      .then(msgs => {
        if (!mountedRef.current) return;
        setMessages(msgs.map(enrich));
      })
      .catch(() => { /* non-fatal */ });
  }, [tripId, token, enrich]);

  // ?? SignalR connection ????????????????????????????????????????????????????
  useEffect(() => {
    if (!tripId || !token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/trip-chat`, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1500, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('NaviaTyping', () => {
      if (mountedRef.current) setNaviaTyping(true);
    });

    connection.on('NaviaDoneTyping', () => {
      if (mountedRef.current) setNaviaTyping(false);
    });

    connection.on('UserTyping', (displayName: string) => {
      if (!mountedRef.current) return;
      setTypingUsers(prev => prev.includes(displayName) ? prev : [...prev, displayName]);
    });

    connection.on('UserStoppedTyping', (displayName: string) => {
      if (!mountedRef.current) return;
      setTypingUsers(prev => prev.filter(n => n !== displayName));
    });

    connection.on('ReceiveMessage', (raw: TripChatMessage) => {
      if (!mountedRef.current) return;
      const enriched = enrich(raw);
      setMessages(prev => {
        // De-duplicate by id (in case REST response and push arrive together)
        if (prev.some(m => m.id === enriched.id)) return prev;
        return [...prev, enriched];
      });
    });

    connection.onreconnecting(() => {
      if (mountedRef.current) setStatus('connecting');
    });
    connection.onreconnected(() => {
      if (mountedRef.current) setStatus('connected');
    });
    connection.onclose(() => {
      if (mountedRef.current) setStatus('error');
    });

    setStatus('connecting');
    connection
      .start()
      .then(() => {
        if (!mountedRef.current) return;
        return connection.invoke('JoinTrip', tripId);
      })
      .then(() => {
        if (mountedRef.current) setStatus('connected');
      })
      .catch(() => {
        if (mountedRef.current) setStatus('error');
      });

    return () => {
      mountedRef.current = false;
      connection.stop().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, token]);

  useEffect(() => { mountedRef.current = true; }, []);

  // ?? Send message ??????????????????????????????????????????????????????????
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending || !token) return;
      setSending(true);
      try {
        // Optimistic insert for user messages (not @navia — those get a Navia reply pushed back)
        const isNavia = /@navia\b/i.test(text);
        if (!isNavia && myUserId != null) {
          const optimistic: TripChatMessage = {
            id: `opt_${Date.now()}`,
            tripId,
            userId: myUserId,
            messageType: 'User',
            message: text.trim(),
            metadata: null,
            sentAt: new Date().toISOString(),
            displayName: memberMap.current.get(String(myUserId))?.name,
            avatarUrl: memberMap.current.get(String(myUserId))?.avatarUrl ?? undefined,
          };
          setMessages(prev => [...prev, optimistic]);
        }

        const confirmed = await sendTripChatMessage(tripId, text.trim(), token);
        const enriched = enrich(confirmed);

        setMessages(prev => {
          // Replace optimistic placeholder or deduplicate
          const withoutOpt = prev.filter(m => !m.id.startsWith('opt_') || m.message !== text.trim());
          if (withoutOpt.some(m => m.id === enriched.id)) return withoutOpt;
          return [...withoutOpt, enriched];
        });
      } catch {
        // Remove optimistic on failure
        setMessages(prev => prev.filter(m => !m.id.startsWith('opt_')));
      } finally {
        if (mountedRef.current) setSending(false);
      }
    },
    [tripId, token, sending, myUserId, enrich],
  );

  // ?? Proposal accept / reject ??????????????????????????????????????????????
  const setProposalState = (chatMessageId: string, state: ProposalActionState) => {
    setProposalStates(prev => ({ ...prev, [chatMessageId]: state }));
  };

  const acceptProposalMsg = useCallback(
    async (chatMessageId: string, proposalId: number) => {
      if (proposalStates[chatMessageId] && proposalStates[chatMessageId] !== 'pending') return;
      setProposalState(chatMessageId, 'accepting');
      try {
        await acceptProposal(proposalId, token);
        setProposalState(chatMessageId, 'accepted');
      } catch {
        setProposalState(chatMessageId, 'error');
      }
    },
    [proposalStates, token],
  );

  const rejectProposalMsg = useCallback(
    async (chatMessageId: string, proposalId: number) => {
      if (proposalStates[chatMessageId] && proposalStates[chatMessageId] !== 'pending') return;
      setProposalState(chatMessageId, 'rejecting');
      try {
        await rejectProposal(proposalId, token);
        setProposalState(chatMessageId, 'rejected');
      } catch {
        setProposalState(chatMessageId, 'error');
      }
    },
    [proposalStates, token],
  );

  // ?? Typing indicator ?????????????????????????????????????????????????????
  const notifyTyping = useCallback(
    (text: string) => {
      const conn = connectionRef.current;
      if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
      const myName = myUserId != null
        ? (memberMap.current.get(String(myUserId))?.name ?? 'Someone')
        : 'Someone';

      if (text.trim().length > 0) {
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          conn.invoke('SendTyping', tripId, myName).catch(() => {});
        }
        // Reset the auto-stop timer
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          isTypingRef.current = false;
          conn.invoke('StopTyping', tripId, myName).catch(() => {});
        }, 2500);
      } else {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          conn.invoke('StopTyping', tripId, myName).catch(() => {});
        }
      }
    },
    [tripId, myUserId],
  );

  return {
    messages,
    status,
    sending,
    sendMessage,
    acceptProposalMsg,
    rejectProposalMsg,
    proposalStates,
    myUserId,
    typingUsers,
    naviaTyping,
    notifyTyping,
  };
}
