import { useSyncExternalStore } from 'react';
import { chatApi, apiFailure, type ChatSummary, type ChatUnread } from './chatApi';
import type { ChatEvent } from './chatRealtime';

/**
 * The reader's chats as the header, the dock and the Messages page all show
 * them: one copy, so a badge never disagrees with the list it opens.
 */
export type ChatListState = {
  inbox: ChatSummary[];
  requests: ChatSummary[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  unread: ChatUnread;
  /** Chats where the other person is typing: conversation id -> when it was last heard. */
  typing: Record<string, number>;
};

const INITIAL: ChatListState = {
  inbox: [],
  requests: [],
  loading: false,
  loaded: false,
  error: null,
  unread: { inbox: 0, requests: 0 },
  typing: {},
};

let state: ChatListState = INITIAL;
const listeners = new Set<() => void>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** How long "typing…" stays up after the last signal (the other side sends one every few seconds). */
const TYPING_SHOWN_MS = 5000;

function set(next: Partial<ChatListState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const byRecent = (a: ChatSummary, b: ChatSummary) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '');

export const chatStore = {
  get: () => state,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async refresh() {
    set({ loading: true, error: null });
    try {
      const [inbox, requests] = await Promise.all([chatApi.list('inbox'), chatApi.list('requests')]);
      set({
        inbox: Array.isArray(inbox.data) ? inbox.data : [],
        requests: Array.isArray(requests.data) ? requests.data : [],
        loading: false,
        loaded: true,
      });
    } catch (error) {
      set({ loading: false, error: apiFailure(error, 'Could not load your messages.').message });
    }
  },

  async refreshUnread() {
    try {
      const { data } = await chatApi.unread();
      set({ unread: { inbox: data?.inbox ?? 0, requests: data?.requests ?? 0 } });
    } catch {
      // A missing badge says less than a wrong one.
    }
  },

  /** A chat opened or changed: put it where it now belongs. */
  upsert(chat: ChatSummary) {
    if (!chat.id) return;
    const inbox = state.inbox.filter((c) => c.id !== chat.id);
    const requests = state.requests.filter((c) => c.id !== chat.id);
    if (chat.status === 'request' && !chat.requestedByMe) requests.unshift(chat);
    else inbox.unshift(chat);
    set({ inbox: inbox.sort(byRecent), requests });
  },

  remove(id: string) {
    set({ inbox: state.inbox.filter((c) => c.id !== id), requests: state.requests.filter((c) => c.id !== id) });
  },

  /** The thread was read here: clear its count without another round trip. */
  readLocally(id: string) {
    const chat = state.inbox.find((c) => c.id === id);
    if (!chat || chat.unreadCount === 0) return;
    set({
      inbox: state.inbox.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      unread: { ...state.unread, inbox: Math.max(0, state.unread.inbox - 1) },
    });
  },

  /** A live event, applied to what is loaded. */
  apply(event: ChatEvent, myUserId: number | null) {
    const id = event.conversationId;
    switch (event.type) {
      case 'message': {
        const { [id]: _done, ...typing } = state.typing;
        const touch = (c: ChatSummary) =>
          c.id !== id || c.lastMessage?.id === event.message.id
            ? c
            : {
                ...c,
                lastMessage: event.message,
                lastMessageAt: event.message.createdAt,
                unreadCount: c.unreadCount + (event.message.senderUserId !== myUserId ? 1 : 0),
              };
        set({ typing, inbox: state.inbox.map(touch).sort(byRecent), requests: state.requests.map(touch) });
        return;
      }
      case 'edited': {
        // Only a row's preview cares, and only when it is the last message.
        const touch = (c: ChatSummary) =>
          c.id === id && c.lastMessage?.id === event.message.id
            ? { ...c, lastMessage: { ...event.message, read: c.lastMessage.read } }
            : c;
        set({ inbox: state.inbox.map(touch), requests: state.requests.map(touch) });
        return;
      }
      case 'read':
        if (event.userId === myUserId) return;
        set({
          inbox: state.inbox.map((c) =>
            c.id === id && c.lastMessage && c.lastMessage.senderUserId === myUserId
              ? { ...c, lastMessage: { ...c.lastMessage, read: true } }
              : c,
          ),
        });
        return;
      case 'typing': {
        set({ typing: { ...state.typing, [id]: Date.now() } });
        const previous = typingTimers.get(id);
        if (previous) clearTimeout(previous);
        typingTimers.set(
          id,
          setTimeout(() => {
            const { [id]: _gone, ...rest } = state.typing;
            set({ typing: rest });
          }, TYPING_SHOWN_MS),
        );
        return;
      }
      case 'removed':
        chatStore.remove(id);
        return;
      default:
    }
  },

  /** Signed out: nothing of anyone's chats stays in memory. */
  reset() {
    typingTimers.forEach(clearTimeout);
    typingTimers.clear();
    state = INITIAL;
    listeners.forEach((l) => l());
  },
};

export function useChatList(): ChatListState {
  return useSyncExternalStore(chatStore.subscribe, chatStore.get);
}
