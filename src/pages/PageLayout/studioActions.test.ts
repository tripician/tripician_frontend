import { describe, it, expect, vi } from 'vitest';
import { studioActions } from './studioActions';

const handlers = () => ({
  onCreateTrip: vi.fn(),
  onWriteStory: vi.fn(),
  onAskTripicianAI: vi.fn(),
});

describe('studioActions', () => {
  // Studio is for tools. A group is a place you use them in, so it is started from where groups live.
  it('holds only making tools, never a place', () => {
    const keys = studioActions(handlers()).map((a) => a.key);
    expect(keys.every((k) => ['trip', 'story', 'tripicianai'].includes(k))).toBe(true);
    expect(keys).not.toContain('group');
  });

  it('keeps planning first and TripicianAI last, each on its own handler', () => {
    const h = handlers();
    const actions = studioActions(h);
    expect(actions[0].key).toBe('trip');
    expect(actions[actions.length - 1].key).toBe('tripicianai');
    actions[0].run();
    expect(h.onCreateTrip).toHaveBeenCalledTimes(1);
    expect(h.onAskTripicianAI).not.toHaveBeenCalled();
  });
});
