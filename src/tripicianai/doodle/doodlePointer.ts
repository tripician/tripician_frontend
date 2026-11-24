import { DOODLE } from './doodleStyle';

export interface Look {
  x: number;
  y: number;
}

/**
 * Where the doodle's eyes should look for a pointer `dx`, `dy` px from its
 * centre: towards it, all the way once it is `reach` px off, and straight
 * ahead (at you) when it is right on top of the doodle. Both -1 to 1.
 */
export function lookTowards(dx: number, dy: number, reach: number = DOODLE.reachPx): Look {
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 1 || reach <= 0) return { x: 0, y: 0 };
  const strength = Math.min(1, distance / reach);
  return { x: (dx / distance) * strength, y: (dy / distance) * strength };
}

interface Watcher {
  el: HTMLElement;
  /** `null` when the pointer has left the window. */
  onLook: (look: Look | null) => void;
}

/*
 * One pointer listener for every doodle on the page, at most once a frame.
 * All the boxes are measured before any eyes move, so a page with several
 * doodles reads layout once a frame instead of once per doodle.
 */
const watchers = new Set<Watcher>();
let frame = 0;
let pointer: { x: number; y: number } | null = null;

function flush() {
  frame = 0;
  const list = [...watchers];
  if (!pointer) {
    list.forEach((w) => w.onLook(null));
    return;
  }
  const { x, y } = pointer;
  const boxes = list.map((w) => w.el.getBoundingClientRect());
  list.forEach((w, i) => {
    const box = boxes[i];
    // Hidden (closed menu, display: none): nothing to look with.
    if (box.width === 0 && box.height === 0) return;
    w.onLook(lookTowards(x - (box.left + box.width / 2), y - (box.top + box.height / 2)));
  });
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(flush);
}

function onMove(e: PointerEvent) {
  if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  pointer = { x: e.clientX, y: e.clientY };
  schedule();
}

function onLeave(e: MouseEvent) {
  // Leaving the window, not just moving between elements.
  if (e.relatedTarget) return;
  pointer = null;
  schedule();
}

/** Can this device point (a mouse or trackpad) rather than only touch? */
export function canFollowPointer(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Calls `onLook` as the pointer moves around the page. Returns the unsubscribe. */
export function watchPointer(el: HTMLElement, onLook: Watcher['onLook']): () => void {
  const watcher: Watcher = { el, onLook };
  if (watchers.size === 0) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseout', onLeave);
  }
  watchers.add(watcher);
  if (pointer) schedule();
  return () => {
    watchers.delete(watcher);
    if (watchers.size === 0) {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onLeave);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
