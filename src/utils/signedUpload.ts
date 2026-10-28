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
  apiKey: string;
  cloudName: string;
  uploadUrl: string;
}

// The fields a sign endpoint issued, which the server needs to verify the upload.
export type SignedFields = Pick<SignedUploadResult, 'folder' | 'public_id' | 'timestamp' | 'signature' | 'allowed_formats'>;

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

  try {
    // The client default is JSON, which would serialise the form, so this request names multipart.
    const { data } = await apiClient.post<{ secure_url: string; public_id: string }>('/api/photos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { url: data.secure_url, publicId: data.public_id };
  } catch (err) {
    const response = axios.isAxiosError(err) ? err.response : undefined;
    const body = response?.data as { error?: { message?: string } } | undefined;
    throw new UploadError(
      explainUploadFailure(body?.error?.message, response !== undefined),
      response?.status ?? 0,
    );
  }
}
