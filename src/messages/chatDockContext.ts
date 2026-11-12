import React from 'react';
import type { ChatTarget } from './chatApi';

export interface ChatDockValue {
  /** Opens a quick-reply window on a computer; on a phone, the full chat on the Messages page. */
  openChat: (target: ChatTarget) => void;
}

export const ChatDockContext = React.createContext<ChatDockValue | null>(null);

/** Null outside the signed-in shell, so callers can fall back to a link. */
export const useChatDock = () => React.useContext(ChatDockContext);

/** The Messages page address for a chat: by id, or with a person (a new chat). */
export function messagesHref(target: ChatTarget): string {
  if (target.conversationId) return `/messages?c=${target.conversationId}`;
  const params = new URLSearchParams();
  if (target.userId != null) params.set('with', String(target.userId));
  if (target.tripId) params.set('trip', target.tripId);
  return `/messages?${params.toString()}`;
}
