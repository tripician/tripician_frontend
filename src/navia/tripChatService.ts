/**
 * tripChatService.ts
 * Typed REST + SignalR helpers for the TripChat feature.
 *
 * REST endpoints:
 *   GET  /api/trip-chat/{tripId}         ? { tripId, messages: TripChatMessage[] }
 *   POST /api/trip-chat/send             ? { success, data: TripChatMessage }
 *   POST /api/proposals/{id}/accept      ? { success }
 *   POST /api/proposals/{id}/reject      ? { success }
 *
 * SignalR hub: /hubs/trip-chat
 *   Client joins group via JoinTrip(tripId)
 *   Server pushes "ReceiveMessage" ? TripChatMessage
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ??? Types ????????????????????????????????????????????????????????????????????

/** Maps to backend TripChat model */
export interface TripChatMessage {
  id: string;
  tripId: string;
  userId: number | null;
  messageType: 'User' | 'Navia' | 'Proposal' | 'System';
  message: string;
  metadata: string | null; // JSON string: OperationsEnvelope (Proposal) | ExecuteResult[] (System)
  sentAt: string;
  // Enriched client-side (added after fetch from member list)
  displayName?: string;
  avatarUrl?: string;
}

/** Parsed from Proposal metadata */
export interface OperationsEnvelope {
  version: number;
  operations: NaviaOperation[];
}

export interface NaviaOperation {
  action: string;
  destination?: string;
  place?: string;
  memberName?: string;
  startDate?: string;
  endDate?: string;
}

/** Parsed from System metadata */
export interface ExecuteResult {
  action: string;
  success: boolean;
  event?: string;
  destination?: string;
  place?: string;
  memberName?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
}

/** Minimal member shape returned by /api/trips/{id}/users */
export interface TripMember {
  id: number | string;
  name: string;
  profilePictureUrl?: string | null;
}

// ??? REST helpers ?????????????????????????????????????????????????????????????

async function authFetch(
  url: string,
  token: string | null | undefined,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
}

export async function fetchTripChatMessages(
  tripId: string,
  token: string | null | undefined,
): Promise<TripChatMessage[]> {
  const res = await authFetch(`/api/trip-chat/${tripId}`, token);
  if (!res.ok) throw new Error(`fetchTripChatMessages: ${res.status}`);
  const data = await res.json();
  return (data.messages ?? []) as TripChatMessage[];
}

export async function sendTripChatMessage(
  tripId: string,
  message: string,
  token: string | null | undefined,
): Promise<TripChatMessage> {
  const res = await authFetch('/api/trip-chat/send', token, {
    method: 'POST',
    body: JSON.stringify({ TripId: tripId, Message: message }),
  });
  if (!res.ok) throw new Error(`sendTripChatMessage: ${res.status}`);
  const data = await res.json();
  return data.data as TripChatMessage;
}

export async function acceptProposal(
  proposalId: number,
  token: string | null | undefined,
): Promise<void> {
  const res = await authFetch(`/api/proposals/${proposalId}/accept`, token, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`acceptProposal: ${res.status}`);
}

export async function rejectProposal(
  proposalId: number,
  token: string | null | undefined,
): Promise<void> {
  const res = await authFetch(`/api/proposals/${proposalId}/reject`, token, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`rejectProposal: ${res.status}`);
}

// ??? Metadata parsers ?????????????????????????????????????????????????????????

export function parseProposalMetadata(metadata: string | null): OperationsEnvelope | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    if (parsed?.version && Array.isArray(parsed?.operations)) return parsed as OperationsEnvelope;
    return null;
  } catch {
    return null;
  }
}

export function parseSystemMetadata(metadata: string | null): ExecuteResult[] {
  if (!metadata) return [];
  try {
    const parsed = JSON.parse(metadata);
    if (Array.isArray(parsed)) return parsed as ExecuteResult[];
    return [];
  } catch {
    return [];
  }
}

/** Extract proposal id from the first operation's context — the backend stores the id in the DB row.
 *  The chat message itself doesn't carry the proposal id, so we derive it from the chat message id
 *  by calling GET /api/proposals?chatMessageId={id} — or the caller resolves via a local lookup.
 *  For now expose a helper to look it up on demand. */
export async function fetchProposalIdByChatMessageId(
  chatMessageId: string,
  token: string | null | undefined,
): Promise<number | null> {
  try {
    const res = await authFetch(`/api/proposals/by-chat/${chatMessageId}`, token);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.id ?? null;
  } catch {
    return null;
  }
}
