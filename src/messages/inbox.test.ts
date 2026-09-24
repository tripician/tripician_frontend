import { describe, it, expect } from 'vitest';
import { pendingLabel, previewLine, sortInbox, unreadTotal } from './inbox';
import type { Conversation } from './types';

const convo = (id: string, patch: Partial<Conversation> = {}): Conversation => ({
  id, tripId: 't', tripName: 'Kyoto in spring', otherUserId: 1, otherName: 'Asha Rao', otherAvatarUrl: null,
  lastMessageAt: '2026-09-18T10:00:00Z', lastMessagePreview: 'See you there', unreadCount: 0, ...patch,
});

describe('sortInbox', () => {
  it('puts people waiting on your decision first, then the newest', () => {
    const list = sortInbox([
      convo('old', { lastMessageAt: '2026-09-10T10:00:00Z' }),
      convo('new', { lastMessageAt: '2026-09-19T10:00:00Z' }),
      convo('request', { lastMessageAt: '2026-09-01T10:00:00Z', pending: 'their-request' }),
      convo('mine', { lastMessageAt: '2026-09-15T10:00:00Z', pending: 'my-request' }),
    ]);
    expect(list.map((c) => c.id)).toEqual(['request', 'new', 'mine', 'old']);
  });
});

describe('previewLine', () => {
  it('marks the reader\'s own last message and flattens line breaks', () => {
    expect(previewLine(convo('a', { lastMessagePreview: 'On my\nway', lastMessageMine: true }))).toBe('You: On my way');
    expect(previewLine(convo('b'))).toBe('See you there');
  });

  it('says what an empty thread is about', () => {
    expect(previewLine(convo('c', { lastMessagePreview: null, pending: 'their-request' }))).toBe('Asked to join. Say hello before you decide.');
    expect(previewLine(convo('d', { lastMessagePreview: '  ' }))).toBe('Kyoto in spring');
  });
});

describe('pendingLabel and unreadTotal', () => {
  it('names who is waiting, and nothing otherwise', () => {
    expect(pendingLabel({ pending: 'their-request' })).toBe('Wants to join');
    expect(pendingLabel({ pending: 'my-request' })).toBe('Your request is pending');
    expect(pendingLabel({ pending: null })).toBeNull();
  });

  it('adds unread across threads, ignoring anything negative', () => {
    expect(unreadTotal([convo('a', { unreadCount: 2 }), convo('b', { unreadCount: 3 }), convo('c', { unreadCount: -1 })])).toBe(5);
  });
});
