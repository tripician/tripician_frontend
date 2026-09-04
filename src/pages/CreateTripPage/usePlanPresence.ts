import React from 'react';
import * as signalR from '@microsoft/signalr';
import { getFreshToken } from '../../services/auth/tokenService';

// Same env var the chat hook reads. Not imported from it, because that module
// pulls the whole chat stack in behind it.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface PresentTraveller {
  userId: number;
  name: string;
  avatarUrl: string | null;
}

/**
 * Who else has this trip open.
 *
 * The planner replaces the whole plan on every save, so two people editing at
 * once is a fight one of them loses. Until the save is granular, the cheapest
 * real defence is telling them the other person is there: a version conflict
 * explains the loss afterwards, this prevents it beforehand.
 *
 * Its own connection rather than sharing the chat panel's. That one is mounted
 * conditionally, twice in two layouts, so leaning on it would make presence
 * appear and vanish with a side panel. The cost is a second socket per editor,
 * which is worth paying while this is one hook with one job.
 */
export function usePlanPresence(
  tripId: string | null | undefined,
  enabled: boolean,
): PresentTraveller[] {
  const [present, setPresent] = React.useState<PresentTraveller[]>([]);
  const mountedRef = React.useRef(false);

  React.useEffect(() => {
    if (!tripId || !enabled) { setPresent([]); return; }
    mountedRef.current = true;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/trip-chat`, {
        // Asked fresh on every attempt, for the reason spelled out in
        // useTripChat: a captured token dies and every reconnect resends it.
        accessTokenFactory: async () => (await getFreshToken()) ?? '',
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1500, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('PresenceChanged', (roster: PresentTraveller[]) => {
      if (mountedRef.current) setPresent(Array.isArray(roster) ? roster : []);
    });

    // Rejoin after a reconnect, or the server has us in no group and the roster
    // silently empties for everyone else while we sit there looking connected.
    connection.onreconnected(() => { void connection.invoke('JoinTrip', tripId).catch(() => {}); });

    void connection.start()
      .then(() => connection.invoke('JoinTrip', tripId))
      // A non-member is refused by the hub. Presence is an extra, so it fails quiet.
      .catch(() => { if (mountedRef.current) setPresent([]); });

    return () => {
      mountedRef.current = false;
      void connection.invoke('LeaveTrip', tripId)
        .catch(() => { /* going away anyway; OnDisconnected cleans up */ })
        .finally(() => { void connection.stop(); });
    };
  }, [tripId, enabled]);

  return present;
}
