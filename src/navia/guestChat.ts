const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface GuestMessage {
  role: 'user' | 'navia';
  content: string;
}

/** Thrown when the daily allowance is spent, so the caller can offer sign-in. */
export class GuestQuotaSpentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuestQuotaSpentError';
  }
}

/**
 * Navia for somebody who has not signed in.
 *
 * A separate client from `streamNaviaResponse` rather than another branch in it.
 * That one takes a token, threads a tripId, and picks between two authenticated
 * endpoints; none of that applies here, and the one thing that matters most on
 * this path is that no credential is ever attached. Keeping it separate makes
 * that visible instead of conditional.
 *
 * The SSE envelope is the same, so the parsing below is deliberately the same
 * shape: {"d":"token"} | {"done":true} | {"error":"..."}.
 */
export async function* streamGuestChat(
  userMessage: string,
  history: GuestMessage[],
): AsyncGenerator<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/navia/guest/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        history: history
          .filter((m) => m.content.trim())
          .map((m) => ({ role: m.role === 'navia' ? 'assistant' : 'user', content: m.content.trim() })),
      }),
    });
  } catch {
    yield 'Navia could not be reached. Check your connection and try again.';
    return;
  }

  // The one status the page has to handle differently: it is not a failure, it
  // is the end of the free allowance, and it has a way forward.
  if (response.status === 429) {
    let message = 'Sign in to keep going.';
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') message = body.message;
    } catch { /* the default sentence is already the useful one */ }
    throw new GuestQuotaSpentError(message);
  }

  if (!response.ok || !response.body) {
    yield 'Navia had trouble answering that one. Try again in a moment.';
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        // Not trimmed: whitespace inside a token is significant.
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (typeof event?.d === 'string') { yield event.d; continue; }
          if (event?.done) return;
          if (typeof event?.error === 'string') { yield event.error; return; }
        } catch { /* a frame we cannot read is skipped rather than shown raw */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Mirrors DraftTripResponseDto. The field is `nights`, not `totalNights`. */
export interface GuestDraft {
  name?: string;
  countries?: string[];
  vibe?: string;
  nights?: number;
  startDate?: string | null;
}

/**
 * One drafted trip skeleton. Returns null when the allowance is spent or the
 * model could not read the sentence, and the caller says something different for
 * each, so the two are distinguished by the thrown type rather than by null.
 */
export async function draftGuestTrip(prompt: string): Promise<GuestDraft | null> {
  const resp = await fetch(`${API_BASE}/api/navia/guest/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (resp.status === 429) {
    let message = 'Sign in to draft another trip.';
    try {
      const body = await resp.json();
      if (typeof body?.message === 'string') message = body.message;
    } catch { /* default stands */ }
    throw new GuestQuotaSpentError(message);
  }

  return resp.ok ? await resp.json() : null;
}
