import { describe, it, expect } from 'vitest';
import { USER_BLOCKED_EVENT, blockedIdFrom } from './blocking';

describe('blockedIdFrom', () => {
  it('reads the blocked id off the event lists listen for', () => {
    expect(blockedIdFrom(new CustomEvent(USER_BLOCKED_EVENT, { detail: { userId: 42 } }))).toBe(42);
  });

  it('ignores an event without a usable id, so a stray event never empties a list', () => {
    expect(blockedIdFrom(new CustomEvent(USER_BLOCKED_EVENT, { detail: { userId: '42' } }))).toBeNull();
    expect(blockedIdFrom(new CustomEvent(USER_BLOCKED_EVENT))).toBeNull();
    expect(blockedIdFrom(new Event('other'))).toBeNull();
  });
});
