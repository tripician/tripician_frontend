/**
 * Cross-component signal for the "give us feedback" balloon beside the support
 * FAB. Two independent triggers race to request it - a trip being created, or
 * ten seconds of active Navia use - and whichever happens first wins; the
 * listener (SupportWidget) is what actually marks it shown, so it fires at
 * most once per browser, ever.
 *
 * A window CustomEvent rather than Redux/Context: the triggers live in
 * TripCreationModal and NaviaPage, the listener lives in SupportWidget deep in
 * the layout tree, and none of the three otherwise share state. This mirrors
 * the `trip:create` event the app already uses for the same kind of
 * cross-component "open create-trip" signal.
 */
const SHOWN_KEY = 'tripician:feedbackPromptShown';
const EVENT_NAME = 'feedback:prompt';

export type FeedbackPromptReason = 'trip_created' | 'navia_used';

export function hasShownFeedbackPrompt(): boolean {
  try { return localStorage.getItem(SHOWN_KEY) === '1'; } catch { return true; }
}

/** Called by the listener once it actually displays the balloon - not by the scheduler. */
export function markFeedbackPromptShown(): void {
  try { localStorage.setItem(SHOWN_KEY, '1'); } catch { /* private mode - may repeat, acceptable */ }
}

/** Requests the balloon. No-ops if it has already been shown, so callers never need to check first. */
export function scheduleFeedbackPrompt(reason: FeedbackPromptReason): void {
  if (hasShownFeedbackPrompt()) return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: reason }));
}

/** Subscribes to prompt requests; returns an unsubscribe function. */
export function onFeedbackPromptRequested(handler: (reason: FeedbackPromptReason) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<FeedbackPromptReason>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
