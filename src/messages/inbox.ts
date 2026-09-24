// Inbox rules shared by the header dropdown, the docked chat windows and the Messages page, kept free of React so they are tested.
import type { Conversation } from './types';

/** Fired by the notification hub when something new arrives, so open lists and windows re-read. */
export const INBOX_CHANGED_EVENT = 'tripician:inbox-changed';

/** Fired when a thread was read, so the header badge re-asks the server. */
export const MESSAGES_READ_EVENT = 'tripician:messages-read';

/** Questions an organiser can drop into a join-request thread with one tap, then edit before sending. */
export const SCREENING_REPLIES = [
  'Hi! Tell me a little about how you like to travel.',
  'Which dates work for you?',
  'Have you done a trip like this before?',
] as const;

/** Someone waiting on the reader's decision leads; after that, newest first. */
export function sortInbox(conversations: Conversation[]): Conversation[] {
  const time = (c: Conversation) => Date.parse(c.lastMessageAt) || 0;
  return [...conversations].sort((a, b) =>
    Number(b.pending === 'their-request') - Number(a.pending === 'their-request') || time(b) - time(a));
}

/** The line under a name: the last message, marked when it was the reader's, or what the thread is about. */
export function previewLine(c: Conversation): string {
  const text = c.lastMessagePreview?.replace(/\s+/g, ' ').trim();
  if (text) return c.lastMessageMine ? `You: ${text}` : text;
  return c.pending === 'their-request' ? 'Asked to join. Say hello before you decide.' : (c.tripName ?? '');
}

/** A short status for the thread, or null when there is nothing waiting on anyone. */
export function pendingLabel(c: Pick<Conversation, 'pending'>): string | null {
  if (c.pending === 'their-request') return 'Wants to join';
  if (c.pending === 'my-request') return 'Your request is pending';
  return null;
}

/** Total unread across threads, for a badge that agrees with the list it opens. */
export function unreadTotal(conversations: Conversation[]): number {
  return conversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? c.unreadCount : 0), 0);
}
