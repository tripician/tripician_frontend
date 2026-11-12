import { apiClient } from '../services/APIs/apiServices';
import { serverMessage } from '../utils/apiError';
import type { LockedKey } from './e2ee/chatCrypto';
import type { ChatKeysApi, ChatMessage, SealedForSend, ServerKey } from './e2ee/chatEngine';

/**
 * End-to-end encrypted chats (`ChatController` / `ChatKeysController` in the
 * backend), the same calls and shapes as the app's `features/messages/api.ts`.
 * The server never sees message text: messages go up sealed and come down
 * sealed, opened in the browser by `chatEngine`.
 */

export type { ChatMessage, ChatReaction } from './e2ee/chatEngine';

export type ChatPerson = { userId: number; name: string | null; avatarUrl: string | null };

/** Why the reader can't write: their request is waiting, a block, the other person's switch, or no chat key yet. */
export type ChatBlocker = 'waiting' | 'blocked' | 'unavailable' | 'not-accepting' | 'no-key';

export type ChatJoinRequest = { tripId: string; tripName: string | null; direction: 'their-request' | 'my-request' };

export type ChatSummary = {
  /** Null when there is no chat yet (from `with`): writing starts one. */
  id: string | null;
  other: ChatPerson;
  status: 'none' | 'request' | 'accepted';
  requestedByMe: boolean;
  lastMessageAt: string | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  tripId: string | null;
  tripName: string | null;
  joinRequest: ChatJoinRequest | null;
  canSend: boolean;
  blocker: ChatBlocker | null;
  needsRequest: boolean;
  otherKey: ServerKey | null;
  otherFollowsMe: boolean;
};

export type ChatPersonResult = {
  userId: number;
  name: string | null;
  avatarUrl: string | null;
  conversationId: string | null;
  followsYou: boolean;
  acceptingMessages: boolean;
  needsRequest: boolean;
};

export type ChatUnread = { inbox: number; requests: number };

export type ChatReportReason = 'spam' | 'harassment' | 'scam' | 'inappropriate' | 'impersonation' | 'other';

export type ChatExcerptLine = { senderUserId: number; text: string; sentAt: string | null };

/** How a chat is opened: by id, or with a person (a new chat when there is none). */
export type ChatTarget = {
  conversationId?: string | null;
  userId?: number;
  name?: string | null;
  avatarUrl?: string | null;
  tripId?: string | null;
};

/** The HTTP status and the server's code and sentence from a failed call. */
export function apiFailure(error: unknown, fallback = 'Something went wrong.'): { status: number | null; code: string | null; message: string } {
  const e = error as { response?: { status?: number; data?: { code?: unknown } } } | null;
  const code = e?.response?.data?.code;
  return {
    status: e?.response?.status ?? null,
    code: typeof code === 'string' ? code : null,
    message: serverMessage(error) ?? fallback,
  };
}

export const chatApi = {
  list: (folder: 'inbox' | 'requests') => apiClient.get<ChatSummary[]>('/api/chats', { params: { folder } }),
  unread: () => apiClient.get<ChatUnread>('/api/chats/unread'),
  people: (q: string) => apiClient.get<ChatPersonResult[]>('/api/chats/people', { params: { q } }),
  with: (userId: number) => apiClient.get<ChatSummary>(`/api/chats/with/${userId}`),
  get: (conversationId: string) => apiClient.get<ChatSummary>(`/api/chats/${conversationId}`),
  messages: (conversationId: string, before?: string) =>
    apiClient.get<ChatMessage[]>(`/api/chats/${conversationId}/messages`, { params: { take: 50, before } }),
  start: (body: { userId: number; tripId?: string | null; message?: SealedForSend | null }) =>
    apiClient.post<{ chat: ChatSummary; message: ChatMessage | null }>('/api/chats/start', body),
  send: (conversationId: string, sealed: SealedForSend) =>
    apiClient.post<ChatMessage>(`/api/chats/${conversationId}/messages`, sealed),
  accept: (conversationId: string) => apiClient.post(`/api/chats/${conversationId}/accept`),
  decline: (conversationId: string) => apiClient.post(`/api/chats/${conversationId}/decline`),
  read: (conversationId: string) => apiClient.post(`/api/chats/${conversationId}/read`),
  clear: (conversationId: string) => apiClient.delete(`/api/chats/${conversationId}`),
  report: (
    conversationId: string,
    body: { reason: ChatReportReason; note?: string | null; excerpt: ChatExcerptLine[]; block: boolean },
  ) => apiClient.post(`/api/chats/${conversationId}/report`, body),
  /** The sender's message, sealed again with new words (within 15 minutes of sending). */
  edit: (conversationId: string, messageId: string, sealed: SealedForSend) =>
    apiClient.put<ChatMessage>(`/api/chats/${conversationId}/messages/${messageId}`, sealed),
  react: (conversationId: string, messageId: string, emoji: string) =>
    apiClient.put<ChatMessage>(`/api/chats/${conversationId}/messages/${messageId}/reaction`, { emoji }),
  unreact: (conversationId: string, messageId: string) =>
    apiClient.delete<ChatMessage>(`/api/chats/${conversationId}/messages/${messageId}/reaction`),
  /** Stores a photo this browser already encrypted. */
  uploadMedia: (conversationId: string, sealedBase64: string) =>
    apiClient.post<{ id: string; url: string; bytes: number }>(
      `/api/chats/${conversationId}/media`,
      { data: sealedBase64 },
      { timeout: 120_000 },
    ),
};

/** The reactions on offer, in this order (the server takes no others). The heart is the double click. */
export const CHAT_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '✈️'] as const;

/** How long after sending a message its sender may still edit it (the server's `EditWindow`). */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const chatKeysApi: ChatKeysApi = {
  async myKeys() {
    const { data } = await apiClient.get<{ publicKey: ServerKey | null; backup: LockedKey | null }>('/api/chat-keys/me');
    return { publicKey: data?.publicKey ?? null, backup: data?.backup ?? null };
  },
  async setUp(input) {
    try {
      const { data } = await apiClient.post<ServerKey>('/api/chat-keys/me', input);
      return data;
    } catch (error) {
      const f = apiFailure(error);
      if (f.status === 409 && f.code === 'key-exists') return null;
      throw error;
    }
  },
  async saveBackup(backup) {
    await apiClient.put('/api/chat-keys/me/backup', backup);
  },
  async publicKey(userId, version) {
    try {
      const { data } = await apiClient.get<ServerKey>(
        version != null ? `/api/chat-keys/${userId}/${version}` : `/api/chat-keys/${userId}`,
      );
      return data ?? null;
    } catch (error) {
      if (apiFailure(error).status === 404) return null;
      throw error;
    }
  },
};

export const firstName = (name: string | null | undefined) => name?.trim().split(' ')[0] || '';

/** Words for each blocker, in the composer's place. */
export function blockerText(blocker: ChatBlocker | null, name: string | null, hasChat = false): string | null {
  const who = firstName(name);
  switch (blocker) {
    case 'waiting':
      return `Message request sent. You can say more once ${who || 'they'} ${who ? 'accepts' : 'accept'}.`;
    case 'blocked':
      return "You've blocked this person. Unblock them to message.";
    case 'unavailable':
      return "You can't message this account.";
    case 'not-accepting':
      return `${who || 'They'} ${who ? "isn't" : "aren't"} accepting messages.`;
    case 'no-key':
      return hasChat
        ? `Invite sent. You can write once ${who || 'they'} ${who ? 'has' : 'have'} the latest Tripician, which encrypts messages.`
        : `${who || 'They'} ${who ? 'needs' : 'need'} the latest Tripician to get encrypted messages. Send an invite so they know you'd like to chat.`;
    default:
      return null;
  }
}
