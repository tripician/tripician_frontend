import { BRAND } from '../../theme';

/**
 * The numbered dot marking a stop on a map.
 *
 * One factory for every map in the app. There were two near-identical teardrop
 * builders before (MapPanel and ShowcaseMap), each emitting inline SVG with
 * `<defs>` gradient ids scoped only by index - `pgrad1`, `sgrad1`. Since the
 * planner map can be mounted twice at once (the side rail plus MapDrawer, which
 * keeps its copy mounted), those ids collided in the document and markers could
 * pick up the wrong gradient. A CSS circle needs no `<defs>` and no ids, so that
 * whole class of bug is gone with the SVG.
 *
 * A dot rather than a pin: teardrops are a store-locator idiom, they occlude the
 * map around the point they claim to mark, and at the size a route needs they
 * stop being legible. A small disc sits on its coordinate honestly.
 */

export interface StopMarkerOptions {
  /** Zero-based position in the itinerary; rendered as index + 1. */
  index: number;
  /** Raised, enlarged state - used for hover-sync with the stop cards. */
  active?: boolean;
}

const SIZE = 22;
const SIZE_ACTIVE = 28;

/** Applies the visual state to an existing marker element. */
export function setStopMarkerActive(el: HTMLElement, active: boolean) {
  const size = active ? SIZE_ACTIVE : SIZE;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.fontSize = active ? '12px' : '11px';
  el.style.zIndex = active ? '10' : '1';
  el.style.boxShadow = active
    ? `0 0 0 3px rgba(255,255,255,0.9), 0 6px 16px rgba(217,26,80,0.45)`
    : `0 0 0 2px rgba(255,255,255,0.9), 0 2px 6px rgba(16,16,20,0.35)`;
  el.dataset.active = active ? 'true' : 'false';
}

export function makeStopMarker({ index, active = false }: StopMarkerOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tp-stop-marker';
  el.textContent = String(index + 1);

  Object.assign(el.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: BRAND.gradient,
    color: '#fff',
    fontFamily: "'Plus Jakarta Sans, system-ui, sans-serif', system-ui, sans-serif",
    fontWeight: '700',
    lineHeight: '1',
    cursor: 'pointer',
    // Transition size and shadow only. Mapbox owns `transform` on the marker
    // element for positioning, so animating it here would fight the map.
    transition: 'width .18s ease, height .18s ease, box-shadow .18s ease, font-size .18s ease',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>);

  setStopMarkerActive(el, active);
  return el;
}

/** Renumbers a marker in place, so a reorder does not rebuild the element. */
export function setStopMarkerIndex(el: HTMLElement, index: number) {
  el.textContent = String(index + 1);
}
