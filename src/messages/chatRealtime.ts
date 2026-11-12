import type { HubConnection } from '@microsoft/signalr';
import type { ChatMessage, ChatReaction } from './e2ee/chatEngine';

/**
 * Live chat events from the notifications hub ("ChatEvent"), which the app
 * shell's connection hands here, and "typing…" sent back through it.
 */
export type ChatEvent =
  | { type: 'message'; conversationId: string; message: ChatMessage }
  | { type: 'edited'; conversationId: string; message: ChatMessage }
  | { type: 'reaction'; conversationId: string; messageId: string; reactions: ChatReaction[]; userId: number; emoji: string | null }
  | { type: 'request'; conversationId: string; message: ChatMessage | null }
  | { type: 'accepted'; conversationId: string; readAt?: string }
  | { type: 'read'; conversationId: string; readAt: string; userId: number }
  | { type: 'typing'; conversationId: string; userId: number }
  | { type: 'removed'; conversationId: string };

type Listener = (event: ChatEvent) => void;

const listeners = new Set<Listener>();
let hub: HubConnection | null = null;

export const chatEvents = {
  emit(event: ChatEvent) {
    listeners.forEach((l) => {
      try {
        l(event);
      } catch {
        // One bad listener must not stop the others.
      }
    });
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Checks the shape before anything trusts it. */
export function toChatEvent(raw: unknown): ChatEvent | null {
  const e = raw as { type?: unknown; conversationId?: unknown } | null;
  if (!e || typeof e.type !== 'string' || typeof e.conversationId !== 'string') return null;
  return ['message', 'edited', 'reaction', 'request', 'accepted', 'read', 'typing', 'removed'].includes(e.type)
    ? (raw as ChatEvent)
    : null;
}

/** The app shell's notifications connection, or null when signed out. */
export function setChatHub(connection: HubConnection | null) {
  hub = connection;
}

/** "Typing…" for the other person. Best effort: dropped when offline. */
export function sendChatTyping(conversationId: string) {
  if (hub?.state === 'Connected') void hub.invoke('ChatTyping', conversationId).catch(() => undefined);
}
