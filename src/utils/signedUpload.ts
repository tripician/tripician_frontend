// Signed photo uploads. The server checks each signature, then stores the photo it has made web-sized.

import axios from 'axios';
import { apiClient } from '../services/APIs/apiServices';
import { explainUploadFailure } from '../afterstory/uploadErrors';
import { shrinkForTransport } from './shrinkForTransport';

export interface SignedUploadResult {
  folder: string;
  public_id: string;
  timestamp: number;
  signature: string;
  allowed_formats?: string;
  /** An everyday post photo's compression, signed in; sent back exactly as issued. */
  transformation?: string | null;
  apiKey: string;
  cloudName: string;
  uploadUrl: string;
}

// The fields a sign endpoint issued, which the server needs to verify the upload.
export type SignedFields = Pick<SignedUploadResult, 'folder' | 'public_id' | 'timestamp' | 'signature' | 'allowed_formats' | 'transformation'>;

export class UploadError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

interface SignedUploadOptions {
  /** Where the server mints the signature. Must derive its folder from the route. */
  signUrl: string;
  file: File;
  /** Extra body sent when asking for the signature, e.g. which slot this is. */
  signBody?: Record<string, unknown>;
}

/** What the server stored: where to show it, and the id needed to delete it. */
export interface StoredAsset {
  url: string;
  /** Folder-qualified. Cloudinary cannot delete without it, and no URL parser recovers it. */
  publicId: string;
  /** The stored picture's size in pixels, as the server reports it. */
  width?: number;
  height?: number;
}

/** The URL only. Most callers never have to undo an upload. */
export async function uploadSigned(options: SignedUploadOptions): Promise<string> {
  return (await uploadSignedAsset(options)).url;
}

/**
 * The URL and the public id.
 *
 * Used where an upload may have to be UNDONE: a post refused by moderation has
 * already put its pictures in Cloudinary, and without the id they stay there.
 */
export async function uploadSignedAsset({ signUrl, file, signBody }: SignedUploadOptions): Promise<StoredAsset> {
  if (!file.type.startsWith('image/')) {
    throw new UploadError('Only image files can be uploaded here.', 0);
  }

  let signed: SignedUploadResult;
  try {
    const { data } = await apiClient.post<SignedUploadResult>(signUrl, { fileName: file.name, ...signBody });
    signed = data;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    throw new UploadError(
      status === 403 ? 'You do not have permission to upload here.' : 'Could not prepare that upload.',
      status,
    );
  }

  return uploadSignedPhoto(signed, file);
}

/**
 * A video, sent straight to Cloudinary with a signature our server issued.
 *
 * Not through /api/photos like a picture: Cloudflare refuses any request over
 * 10 MB, and a short screen recording is already more than that. The signature
 * pins the folder and the formats, so the browser can only put it where the
 * server said. `onProgress` gets 0 to 1 as the bytes go up.
 */
export async function uploadSignedVideo({
  signUrl,
  file,
  signBody,
  onProgress,
}: SignedUploadOptions & { onProgress?: (fraction: number) => void }): Promise<StoredAsset> {
  if (!file.type.startsWith('video/')) {
    throw new UploadError('Only video files can be uploaded here.', 0);
  }

  let signed: SignedUploadResult;
  try {
    const { data } = await apiClient.post<SignedUploadResult>(signUrl, { fileName: file.name, ...signBody });
    signed = data;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status ?? 0 : 0;
    throw new UploadError(
      status === 429 ? 'You have uploaded a lot this hour. Please try again later.' : 'Could not prepare that upload.',
      status,
    );
  }

  const form = new FormData();
  form.append('file', file, file.name);
  form.append('api_key', signed.apiKey);
  form.append('folder', signed.folder);
  form.append('public_id', signed.public_id);
  form.append('timestamp', String(signed.timestamp));
  form.append('signature', signed.signature);
  if (signed.allowed_formats) form.append('allowed_formats', signed.allowed_formats);

  try {
    // Plain axios, not apiClient: this goes to Cloudinary, and must not carry our token.
    const { data } = await axios.post<{ secure_url: string; public_id: string }>(signed.uploadUrl, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.min(1, e.loaded / e.total));
      },
    });
    return { url: data.secure_url, publicId: data.public_id };
  } catch (err) {
    const response = axios.isAxiosError(err) ? err.response : undefined;
    const body = response?.data as { error?: { message?: string } } | undefined;
    throw new UploadError(
      body?.error?.message?.toLowerCase().includes('format')
        ? 'That video format is not supported. Try MP4, MOV or WebM.'
        : response ? 'That video could not be uploaded.' : 'The upload stopped. Check your connection and try again.',
      response?.status ?? 0,
    );
  }
}

// Sends a signed photo through our server, which stores it and returns its URL and public id.
export async function uploadSignedPhoto(signed: SignedFields, file: File): Promise<StoredAsset> {
  // Cloudflare refuses a request over 10 MB, so an unusually large photo is shrunk just enough to
  // be delivered. The server still decides the real size, quality and metadata rules on what arrives.
  const payload = await shrinkForTransport(file);
  const form = new FormData();
  form.append('file', payload, file.name);
  form.append('folder', signed.folder);
  form.append('public_id', signed.public_id);
  form.append('timestamp', String(signed.timestamp));
  form.append('signature', signed.signature);
  if (signed.allowed_formats) form.append('allowed_formats', signed.allowed_formats);
  // An everyday post photo's compression, signed in: the server checks it with the rest, so it goes back as issued.
  if (signed.transformation) form.append('transformation', signed.transformation);

  try {
    // The client default is JSON, which would serialise the form, so this request names multipart.
    const { data } = await apiClient.post<{ secure_url: string; public_id: string; width?: number; height?: number }>('/api/photos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { url: data.secure_url, publicId: data.public_id, width: data.width, height: data.height };
  } catch (err) {
    const response = axios.isAxiosError(err) ? err.response : undefined;
    const body = response?.data as { error?: { message?: string } } | undefined;
    throw new UploadError(
      explainUploadFailure(body?.error?.message, response !== undefined),
      response?.status ?? 0,
    );
  }
}
