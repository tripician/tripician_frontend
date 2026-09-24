import React from 'react';
import type { Conversation } from './types';

export interface ChatDockValue {
  /** Opens a quick-reply window on a computer; on a phone, the full thread. */
  openChat: (conversation: Conversation) => void;
}

export const ChatDockContext = React.createContext<ChatDockValue | null>(null);

/** Null outside the signed-in shell, so callers can fall back to their own dialog or a link. */
export const useChatDock = () => React.useContext(ChatDockContext);
