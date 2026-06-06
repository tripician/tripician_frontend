import type { NaviaMessage } from './useNavia';

const MAX_STORED = 40;

function storageKey(tripId: string): string {
  return `navia-chat-${tripId || 'general'}`;
}

export function loadNaviaMessages(tripId: string): NaviaMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<NaviaMessage, 'timestamp'> & { timestamp: string }>;
    return parsed.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

export function saveNaviaMessages(tripId: string, messages: NaviaMessage[]): void {
  try {
    const trimmed = messages
      .filter(m => !m.isStreaming && m.content.trim())
      .slice(-MAX_STORED)
      .map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      }));
    sessionStorage.setItem(storageKey(tripId), JSON.stringify(trimmed));
  } catch {
    /* ignore quota errors */
  }
}

export function clearNaviaSession(tripId: string): void {
  try {
    sessionStorage.removeItem(storageKey(tripId));
  } catch {
    /* ignore */
  }
}
