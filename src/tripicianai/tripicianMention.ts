/**
 * "@tripician" brings TripicianAI into a group trip chat. "@tripicianai", the handle the
 * app used to suggest, still works.
 *
 * The server decides for real (TripChatService.TripicianAIMentionPattern); this copy only
 * drives the composer's hint and the "analysing" indicator, so keep the two in step.
 *
 * The "@" has to start a word, so support@tripician.com is not a mention, and neither is
 * a domain (@tripician.com) or a longer word (@tripicians). There is no lookbehind
 * because Safari before 16.4 rejects one.
 */
export const TRIPICIAN_MENTION_RE = /(^|[^\w.@])@tripician(?:ai)?\b(?!\.\w)/i;

/** What the composer inserts and what the copy tells people to type, without the "@". */
export const TRIPICIAN_HANDLE = 'tripician';

export function mentionsTripician(text: string): boolean {
  return TRIPICIAN_MENTION_RE.test(text);
}
