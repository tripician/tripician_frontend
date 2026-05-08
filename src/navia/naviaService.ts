// naviaService.ts — SSE streaming client for Navia AI
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function errorMessageForStatus(status: number): string {
  if (status === 401 || status === 403) return 'Please sign in to use Navia.';
  if (status === 400) return '⚠️ Navia needs a bit more context to help you. Try opening a trip and chatting from there!';
  if (status === 404) return 'z z z z z... 💤\n\nNavia is sleeping right now. Come back a little later and I\'ll be ready to plan your next adventure!';
  if (status >= 500) return '😵 Navia bumped into something on the server. Give it a moment and try again!';
  return '🤔 Hmm, something went sideways. Try again in a sec!';
}

/**
 * Streams Navia AI response chunks via SSE.
 * Routes to /api/navia/chat when tripId is provided, otherwise /api/navia/general-chat.
 */
export async function* streamNaviaResponse(
  tripId: string,
  userMessage: string,
  token?: string | null,
): AsyncGenerator<string> {
  const endpoint = tripId ? '/api/navia/chat' : '/api/navia/general-chat';
  const body = tripId ? { tripId, userMessage } : { userMessage };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    yield "📡 Whoops! Can't find Navia — looks like she wandered off the network. Check your connection and try again!";
    return;
  }

  if (!response.ok) {
    console.error(`[Navia] HTTP ${response.status} from /api/navia/chat`);
    yield errorMessageForStatus(response.status);
    return;
  }

  if (!response.body) {
    yield '🫙 Navia sent back an empty reply — like an empty suitcase. Try again!';
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
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        if (data.startsWith('[ERROR]')) {
          yield data.slice(7).trim() || 'An error occurred.';
          return;
        }
        yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
