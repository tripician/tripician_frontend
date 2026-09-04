/**
 * Private threads between two people about one trip.
 *
 * Every conversation carries a trip, and that is not incidental: reports reach
 * admins grouped by trip, so a thread without one would produce reports nobody
 * could see or close. Threads between people who share no trip are not built.
 */

export interface Conversation {
  id: string;
  tripId: string;
  tripName: string | null;
  otherUserId: number;
  otherName: string | null;
  otherAvatarUrl: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
}

export interface ConversationMessage {
  id: string;
  senderUserId: number;
  body: string;
  createdAt: string;
  read: boolean;
}

/**
 * Why a pair may talk, as the server reports it.
 *
 * Shown to the reader rather than kept internal: an organiser messaging someone
 * they have never met should be able to see it is because that person asked to
 * join, not wonder how a stranger reached them.
 */
export const REASON_COPY: Record<string, string> = {
  'join-request': 'They asked to join this trip',
  trip: 'You are both on this trip',
};
