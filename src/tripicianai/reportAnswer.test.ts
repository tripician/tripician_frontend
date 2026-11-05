import { describe, expect, it } from 'vitest';

import { AI_REPORT_REASONS, isReportableAnswer, promptFor } from './reportAnswer';
import type { TripicianAIMessage } from './useTripicianAI';

const msg = (id: string, role: TripicianAIMessage['role'], content: string, isStreaming = false): TripicianAIMessage => ({
  id,
  role,
  content,
  isStreaming,
  timestamp: new Date(0),
});

describe('reporting a TripicianAI answer', () => {
  it('offers exactly the reasons the backend accepts', () => {
    // TripicianAIReportController.Reasons - anything else is a 400.
    expect(AI_REPORT_REASONS.map((r) => r.value)).toEqual(['offensive', 'harmful', 'inaccurate', 'other']);
  });

  it('pairs an answer with the question right before it', () => {
    const chat = [
      msg('1', 'user', 'First question'),
      msg('2', 'tripicianai', 'First answer'),
      msg('3', 'user', 'Second question'),
      msg('4', 'tripicianai', 'Second answer'),
    ];
    expect(promptFor(chat, '2')).toBe('First question');
    expect(promptFor(chat, '4')).toBe('Second question');
  });

  it('has no question for a greeting that opens the chat', () => {
    expect(promptFor([msg('1', 'tripicianai', 'Hi, where to?')], '1')).toBeUndefined();
  });

  it('only offers Report on a finished answer with something in it', () => {
    expect(isReportableAnswer(msg('a', 'tripicianai', 'Go in May.'))).toBe(true);
    expect(isReportableAnswer(msg('b', 'tripicianai', 'Go in', true))).toBe(false);
    expect(isReportableAnswer(msg('c', 'tripicianai', '   '))).toBe(false);
    expect(isReportableAnswer(msg('d', 'user', 'When should I go?'))).toBe(false);
  });
});
