import type { TripicianAIMessage } from './useTripicianAI';

/**
 * What a TripicianAI answer can be reported for. The values are validated by the
 * backend (`TripicianAIReportController.Reasons`), so keep the two in step.
 *
 * Google Play requires apps that generate content with AI to let people report it
 * without leaving the app; the website offers the same.
 */
export const AI_REPORT_REASONS = [
  { value: 'offensive', label: 'Offensive or hateful' },
  { value: 'harmful', label: 'Unsafe or harmful advice' },
  { value: 'inaccurate', label: 'Wrong or misleading' },
  { value: 'other', label: 'Something else' },
] as const;

/** The question an answer responds to: the nearest user message before it. */
export function promptFor(messages: readonly TripicianAIMessage[], answerId: string): string | undefined {
  const at = messages.findIndex((m) => m.id === answerId);
  for (let i = (at < 0 ? messages.length : at) - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return undefined;
}

/** Only a finished answer with something in it can be reported. */
export function isReportableAnswer(message: TripicianAIMessage): boolean {
  return message.role === 'tripicianai' && !message.isStreaming && message.content.trim().length > 0;
}
