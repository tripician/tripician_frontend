import { tripPath } from '../utils/tripSlug';

export interface TripShareData {
  /** The sentence that travels with the link into a chat or a post. */
  shareText: string;
  /** The link to hand out - server-rendered previews, redirects humans to the app. */
  tripUrl: string;
  /** The canonical in-app URL, for "open in Tripician" style affordances. */
  tripAppUrl: string;
}

interface UseTripShareOptions {
  tripName: string;
  destinationCount: number;
  totalNights: number;
}

/**
 * The links and the line of text a trip is shared with.
 *
 * It used to fetch a rendered share card as well, which cost a Playwright render
 * on the server every time the dialog opened. The dialog no longer shows a
 * picture, so nothing here touches the network.
 */
export function useTripShare(
  tripId: string,
  { tripName, destinationCount, totalNights }: UseTripShareOptions,
): TripShareData {
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

  // Only the figures that exist: a profile card shares a trip with no night count.
  const figures = [
    destinationCount > 0 ? `${destinationCount} ${destinationCount === 1 ? 'stop' : 'stops'}` : null,
    totalNights > 0 ? `${totalNights} ${totalNights === 1 ? 'night' : 'nights'}` : null,
  ].filter(Boolean).join(', ');

  const shareText = figures
    ? `${tripName}: ${figures}, planned on Tripician.`
    : `${tripName}, planned on Tripician.`;

  return { shareText, tripUrl, tripAppUrl };
}
