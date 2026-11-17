/*
 * The arithmetic behind cropping a photo before it is uploaded.
 *
 * The picture is shown behind a fixed frame (square for a profile photo, 3:1 for
 * a cover) and can be dragged and zoomed, but never so far that the frame shows
 * anything outside the picture. What the frame shows is what is uploaded.
 *
 * Pure and measured in plain numbers, so it is tested without a browser.
 */

export interface Size {
  width: number;
  height: number;
}

/**
 * Where the picture sits behind the frame: `zoom` 1 is the smallest size that
 * still fills the frame, and `x`/`y` move the picture's centre away from the
 * frame's centre, in frame pixels.
 */
export interface CropView {
  zoom: number;
  x: number;
  y: number;
}

/** The part of the original picture to keep, in the picture's own pixels. */
export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The scale at which the picture just covers the frame (zoom 1). */
export function coverScale(image: Size, frame: Size): number {
  return Math.max(frame.width / image.width, frame.height / image.height);
}

/** The view pulled back inside its limits: a zoom between 1 and 4, and no gap at any edge of the frame. */
export function clampView(view: CropView, image: Size, frame: Size): CropView {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : MIN_ZOOM, MIN_ZOOM, MAX_ZOOM);
  const scale = coverScale(image, frame) * zoom;
  const maxX = Math.max(0, (image.width * scale - frame.width) / 2);
  const maxY = Math.max(0, (image.height * scale - frame.height) / 2);
  // `|| 0` turns the -0 a zero-width range gives back into a plain 0.
  return { zoom, x: clamp(view.x, -maxX, maxX) || 0, y: clamp(view.y, -maxY, maxY) || 0 };
}

/** A new zoom that keeps the same point of the picture in the middle of the frame. */
export function zoomTo(view: CropView, zoom: number, image: Size, frame: Size): CropView {
  const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const ratio = next / view.zoom;
  return clampView({ zoom: next, x: view.x * ratio, y: view.y * ratio }, image, frame);
}

/** The view moved by a drag of `dx`, `dy` frame pixels. */
export function panBy(view: CropView, dx: number, dy: number, image: Size, frame: Size): CropView {
  return clampView({ zoom: view.zoom, x: view.x + dx, y: view.y + dy }, image, frame);
}

/** Where the picture is drawn behind the frame, for display. */
export function displayBox(view: CropView, image: Size, frame: Size): { left: number; top: number; width: number; height: number } {
  const scale = coverScale(image, frame) * view.zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  return { left: (frame.width - width) / 2 + view.x, top: (frame.height - height) / 2 + view.y, width, height };
}

/** The part of the original picture the frame shows: exactly what gets uploaded. */
export function sourceRect(view: CropView, image: Size, frame: Size): SourceRect {
  const scale = coverScale(image, frame) * view.zoom;
  const sw = Math.min(image.width, frame.width / scale);
  const sh = Math.min(image.height, frame.height / scale);
  const sx = image.width / 2 - view.x / scale - sw / 2;
  const sy = image.height / 2 - view.y / scale - sh / 2;
  return { sx: clamp(sx, 0, image.width - sw), sy: clamp(sy, 0, image.height - sh), sw, sh };
}

/**
 * The size to upload: the selection at its own size, capped at the shape's
 * largest. A small selection is never enlarged, which would add bytes but no
 * detail; the server sets no minimum for a profile photo or cover.
 */
export function outputSize(source: SourceRect, aspect: number, maxWidth: number): Size {
  const width = Math.max(1, Math.round(Math.min(maxWidth, source.sw)));
  return { width, height: Math.max(1, Math.round(width / aspect)) };
}
