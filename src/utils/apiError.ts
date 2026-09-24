// The server's own sentence for why it said no, from a thrown axios error or a plain response body.
export function serverMessage(err: unknown): string | undefined {
  const source = err as { response?: { data?: unknown }; data?: unknown } | null | undefined;
  const body = (source?.response?.data ?? source?.data) as { message?: unknown } | null | undefined;
  const text = body?.message;
  return typeof text === 'string' && text.trim() ? text.trim() : undefined;
}

/** The machine-readable half of a refusal: where the server says the caller actually stands. */
export function serverStatus(err: unknown): string | undefined {
  const source = err as { response?: { data?: unknown }; data?: unknown } | null | undefined;
  const body = (source?.response?.data ?? source?.data) as { status?: unknown } | null | undefined;
  const status = body?.status;
  return typeof status === 'string' && status.trim() ? status.trim() : undefined;
}
