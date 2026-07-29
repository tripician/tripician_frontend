/**
 * Hover coordination between the stop cards and the map markers.
 *
 * **This module must import nothing.** `DestinationCardsPanel` imports it, and
 * `vite.config.ts` pins `mapbox-gl` into a `vendor-map` chunk that `MapPanel`
 * loads lazily. If anything reachable from the cards transitively imports
 * `mapbox-gl`, Rollup promotes that chunk to a static import and every planner
 * page view downloads the map bundle whether or not the map is ever opened.
 *
 * A window event rather than Redux or context: hover fires at pointer speed, and
 * putting it in the store would re-render the whole planner subtree - a
 * 3,600-line component with framer-motion cards - on every mouse move. The
 * codebase already uses window events for cross-tree signals
 * (`tripician:route-updated`, `navia:response`, `auth:401`).
 */

const EVENT = 'tripician:stop-hover';

/** Which side raised the event, so each side can ignore its own echo. */
export type HoverSource = 'card' | 'map';

export interface StopHoverDetail {
  id: string | null;
  source: HoverSource;
}

export function emitStopHover(id: string | null, source: HoverSource): void {
  window.dispatchEvent(new CustomEvent<StopHoverDetail>(EVENT, { detail: { id, source } }));
}

/**
 * Returns an unsubscribe function.
 *
 * Listeners are expected to ignore events matching their own `source` - without
 * that, card and map echo each other into an infinite loop.
 */
export function subscribeStopHover(
  handler: (detail: StopHoverDetail) => void,
): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<StopHoverDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
