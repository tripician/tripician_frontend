import { useState, useEffect, useRef } from 'react';
import { useAuthToken } from './useAuth0Token';

export interface TripShareData {
  isLoading: boolean;
  cardImageUrl: string | null;
  error: string | null;
  shareText: string;
  tripUrl: string;
  /** Raw blob — use for downloading */
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

  const tripUrl = `${WEB_BASE.replace(/\/$/, '')}/trip/${tripId}`;

  const shareText = `Discover this amazing ${tripName} itinerary, created with Tripician 🌍 ${destinationCount} destination${destinationCount !== 1 ? 's' : ''}, ${totalNights} night${totalNights !== 1 ? 's' : ''}.`

  useEffect(() => {
    if (!tripId || !token) return;

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
        const response = await fetch(
          `${WEB_BASE.replace(/\/$/, '')}/api/trips/${tripId}/share-card`,
          { headers: { Authorization: `Bearer ${token}` } },
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
  }, [tripId, token]);

  return { isLoading, cardImageUrl, cardBlob, error, shareText, tripUrl };
}
