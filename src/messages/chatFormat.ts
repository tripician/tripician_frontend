import type { ChatSummary } from './chatApi';
import type { Opened } from './e2ee/chatEngine';
import { instant } from './useChat';

/** "now", "5m", "3h", "Tue", "12 Mar": as short as a row allows. */
export function shortWhen(iso: string | null): string {
  if (!iso) return '';
  const t = instant(iso);
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h`;
  const d = new Date(t);
  if (mins < 7 * 24 * 60) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function previewText(chat: ChatSummary, opened: Opened | null, myUserId: number | null, typing: boolean): string {
  if (typing) return 'typing…';
  if (!chat.lastMessage) {
    if (chat.requestedByMe) return 'Message request sent';
    return chat.status === 'request' ? 'Wants to chat with you' : 'Say hello';
  }
  if (!opened) return '🔒 Encrypted message';
  if (opened.kind === 'unreadable') return "🔒 Can't open in this browser";
  const mine = chat.lastMessage.senderUserId === myUserId;
  return `${mine ? 'You: ' : ''}${openedLine(opened)}`;
}

/** A message on one line: its words, or what it is when it isn't words. */
export function openedLine(opened: Opened): string {
  if (opened.kind === 'unreadable') return "🔒 Can't open in this browser";
  const words = opened.text.replace(/\s+/g, ' ').trim();
  if (opened.kind === 'plain') return words;
  if (opened.photo) return `📷 ${words || 'Photo'}`;
  if (opened.location) return `📍 ${words || 'Shared a location'}`;
  if (opened.unsupported) return 'New message';
  return words;
}
