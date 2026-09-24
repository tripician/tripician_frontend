import type { TripicianAIMessage } from './useTripicianAI';

const MAX_STORED = 40;

function storageKey(tripId: string): string {
  return `tripicianai-chat-${tripId || 'general'}`;
}

export function loadTripicianAIMessages(tripId: string): TripicianAIMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<TripicianAIMessage, 'timestamp'> & { timestamp: string }>;
    return parsed.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

export function saveTripicianAIMessages(tripId: string, messages: TripicianAIMessage[]): void {
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

export function clearTripicianAISession(tripId: string): void {
  try {
    sessionStorage.removeItem(storageKey(tripId));
  } catch {
    /* ignore */
  }
}
