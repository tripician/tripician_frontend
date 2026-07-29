import { useState, useEffect, useRef } from 'react';
import { useAuthToken } from './useAuth0Token';
import { tripPath } from '../utils/tripSlug';

export interface TripShareData {
  isLoading: boolean;
  cardImageUrl: string | null;
  error: string | null;
  shareText: string;
  /** The link to hand out - server-rendered previews, redirects humans to the app. */
  tripUrl: string;
  /** The canonical in-app URL, for "open in Tripician" style affordances. */
  tripAppUrl: string;
  /** Raw blob - use for downloading */
  cardBlob: Blob | null;
}

interface UseTripShareOptions {
  tripName: string;
  destinationCount: number;
  totalNights: number;
}

export function useTripShare(
  tripId: string,
  { tripName, destinationCount, totalNights }: UseTripShareOptions,
): TripShareData {
  const { token } = useAuthToken();
  const [isLoading, setIsLoading] = useState(true);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track the current blob URL so we can revoke it on unmount / re-fetch
  const blobUrlRef = useRef<string | null>(null);

  const WEB_BASE = import.meta.env.VITE_WEB_BASE_URL as string;
  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || WEB_BASE;

  /**
   * Shared links point at the backend's /t/{id} route, not directly at the SPA.
   *
   * The SPA sets its meta tags with JavaScript, and Facebook, WhatsApp and
   * LinkedIn never run JavaScript - so a direct www link previewed as the same
   * generic card for every trip, with no image. /t/{id} is server-rendered: it
   * answers crawlers with that trip's real title, description and photo, and
   * redirects people straight into the app. Same link, works for both.
   *
   * VITE_SHARE_BASE_URL lets this move to a prettier host (go.tripician.com)
   * with a DNS record and no code change.
   */
  const SHARE_BASE = ((import.meta.env.VITE_SHARE_BASE_URL as string) || API_BASE).replace(/\/$/, '');
  const tripUrl = `${SHARE_BASE}/t/${tripId}`;

  /** The in-app URL, for "open" affordances and copy that should look canonical. */
  const tripAppUrl = `${WEB_BASE.replace(/\/$/, '')}${tripPath({ id: tripId, name: tripName })}`;

  const shareText = `Discover this amazing ${tripName} itinerary, created with Tripician 🌍 ${destinationCount} destination${destinationCount !== 1 ? 's' : ''}, ${totalNights} night${totalNights !== 1 ? 's' : ''}.`

  useEffect(() => {
    // Bail cleanly, never leave the caller stuck on a skeleton. `isLoading`
    // starts true, so an early return without this left guests staring at a
    // shimmer forever on public trips.
    if (!tripId) { setIsLoading(false); return; }

    let cancelled = false;

    let slowTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchCard = async () => {
      setIsLoading(true);
      setError(null);

      // Show "Generating your card..." message after 3 seconds
      slowTimer = setTimeout(() => {
        if (!cancelled) setError('generating');
      }, 3000);

      try {
        // Anonymous is allowed for published trips - send the token only if we
        // have one, so guests can share a public itinerary too.
        const response = await fetch(
          `${API_BASE.replace(/\/$/, '')}/api/trips/${tripId}/share-card`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        );

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const blob = await response.blob();

        if (cancelled) return;

        // Revoke any previous blob URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setCardBlob(blob);
        setCardImageUrl(url);
        setError(null);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load share card');
        }
      } finally {
        if (slowTimer) clearTimeout(slowTimer);
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCard();

    return () => {
      cancelled = true;
      if (slowTimer) clearTimeout(slowTimer);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [tripId, token, API_BASE]);

  return { isLoading, cardImageUrl, cardBlob, error, shareText, tripUrl, tripAppUrl };
}
