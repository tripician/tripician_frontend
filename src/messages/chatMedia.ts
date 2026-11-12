import { useEffect, useState } from 'react';
import { chatApi } from './chatApi';
import { openFile, PHOTO_HOST, sealFile, toBase64, type LocationRef, type PhotoRef } from './e2ee/chatCrypto';

/**
 * Photos and places in chats, in the browser. The same as the app's
 * `features/messages/chatMedia.ts` and `shareLocation.ts`.
 *
 * A photo is drawn onto a canvas and written out as a fresh JPEG (no
 * metadata, so no GPS position), sealed with a key of its own, and uploaded as
 * unreadable bytes. The key travels only inside the sealed message. Opened
 * photos live in memory as blob URLs, never on disk.
 */

const MAX_SIDE = 1600;
const QUALITY = 0.82;

/** A photo ready to seal, and a URL to show it by while it sends. */
export type PreparedPhoto = { bytes: Uint8Array; width: number; height: number; mime: string; previewUrl: string };

/** Reads a picked file into an upright, scaled, metadata-free JPEG. Throws when it isn't a picture. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  // `from-image` turns a phone photo upright by its own orientation tag before
  // the tag is dropped with everything else.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas');
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('Could not write the photo');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { bytes, width, height, mime: 'image/jpeg', previewUrl: URL.createObjectURL(blob) };
  } finally {
    bitmap.close();
  }
}

// ─── Opened photos, in memory only ────────────────────────────────────────────

const MEMORY_LIMIT = 30;
const opened = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function remember(url: string, objectUrl: string) {
  const previous = opened.get(url);
  if (previous && previous !== objectUrl) URL.revokeObjectURL(previous);
  opened.delete(url);
  opened.set(url, objectUrl);
  while (opened.size > MEMORY_LIMIT) {
    const [oldest, gone] = opened.entries().next().value as [string, string];
    URL.revokeObjectURL(gone);
    opened.delete(oldest);
  }
}

/** The photo a message points to, opened, as a blob URL. Throws when it can't be fetched or opened. */
export function loadPhoto(photo: PhotoRef): Promise<string> {
  const hit = opened.get(photo.url);
  if (hit) return Promise.resolve(hit);
  let run = inflight.get(photo.url);
  if (!run) {
    run = (async () => {
      if (!photo.url.startsWith(PHOTO_HOST)) throw new Error('Not a chat photo');
      // No cookies or tokens: it is a public, unreadable file.
      const res = await fetch(photo.url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!res.ok) throw new Error(`Photo download failed (${res.status})`);
      const plain = openFile(new Uint8Array(await res.arrayBuffer()), photo.key, photo.nonce);
      const objectUrl = URL.createObjectURL(new Blob([plain as BlobPart], { type: photo.mime }));
      remember(photo.url, objectUrl);
      return objectUrl;
    })().finally(() => inflight.delete(photo.url));
    inflight.set(photo.url, run);
  }
  return run;
}

/** A message's photo for display: null while it opens, or 'failed'. */
export function usePhoto(photo: PhotoRef | undefined): string | null | 'failed' {
  const [url, setUrl] = useState<string | null | 'failed'>(() => (photo ? opened.get(photo.url) ?? null : null));
  useEffect(() => {
    let live = true;
    if (!photo) {
      setUrl(null);
      return undefined;
    }
    const hit = opened.get(photo.url);
    if (hit) {
      setUrl(hit);
      return undefined;
    }
    setUrl(null);
    loadPhoto(photo)
      .then((u) => live && setUrl(u))
      .catch(() => live && setUrl('failed'));
    return () => {
      live = false;
    };
  }, [photo]);
  return url;
}

/** Seals a prepared photo, uploads it to the chat, and returns what the message carries. */
export async function uploadChatPhoto(conversationId: string, photo: PreparedPhoto): Promise<PhotoRef> {
  const sealed = sealFile(photo.bytes);
  const { data } = await chatApi.uploadMedia(conversationId, toBase64(sealed.bytes));
  if (!data?.url || !data.url.startsWith(PHOTO_HOST)) throw new Error("That photo couldn't be sent.");
  // The sender's own copy, so their bubble needn't download it again.
  remember(data.url, URL.createObjectURL(new Blob([photo.bytes as BlobPart], { type: photo.mime })));
  return {
    url: data.url,
    key: sealed.key,
    nonce: sealed.nonce,
    w: photo.width,
    h: photo.height,
    mime: photo.mime,
    bytes: photo.bytes.length,
  };
}

/** Opened photos are this person's: dropped when they sign out. */
export function clearChatMedia() {
  opened.forEach((u) => URL.revokeObjectURL(u));
  opened.clear();
}

// ─── Places ───────────────────────────────────────────────────────────────────

export type ShareLocationFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export const SHARE_LOCATION_MESSAGES: Record<ShareLocationFailure, string> = {
  unsupported: "This browser can't share your location.",
  denied: 'Location access is blocked for Tripician. Allow it in your browser’s site settings, then try again.',
  unavailable: "Your device couldn't find your location. Try again.",
  timeout: 'Finding your location took too long. Try again.',
};

export class ShareLocationError extends Error {
  readonly reason: ShareLocationFailure;

  constructor(reason: ShareLocationFailure) {
    super(reason);
    this.reason = reason;
  }
}

/** Where this device is now, as precisely as it will say. The browser asks first. */
export function currentLocation(): Promise<LocationRef> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new ShareLocationError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
          ...(Number.isFinite(pos.coords.accuracy) ? { acc: Math.round(pos.coords.accuracy) } : {}),
        }),
      (err) =>
        reject(
          new ShareLocationError(
            err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
          ),
        ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30_000 },
    );
  });
}

/** "Within about 12 m", or a plainer word when the fix is rough. */
export function accuracyText(acc: number | undefined): string | null {
  if (acc == null) return null;
  if (acc > 1500) return 'Approximate area';
  if (acc >= 1000) return `Within about ${(acc / 1000).toFixed(1)} km`;
  return `Within about ${Math.max(5, Math.round(acc / 5) * 5)} m`;
}

/** A small map of the place with a pin (Mapbox Static Images, attribution drawn in). */
export function placeMapUrl(location: LocationRef, width: number, height: number): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  if (!token) return null;
  const w = Math.min(640, Math.max(80, Math.round(width)));
  const h = Math.min(640, Math.max(80, Math.round(height)));
  const zoom = location.acc != null && location.acc > 1500 ? 11 : location.acc != null && location.acc > 300 ? 13 : 15;
  const at = `${location.lng},${location.lat}`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+c4052f(${at})/${at},${zoom},0/${w}x${h}@2x?access_token=${encodeURIComponent(token)}`;
}

/** The place in Google Maps, in a new tab. */
export function mapsLink(location: LocationRef): string {
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
}

