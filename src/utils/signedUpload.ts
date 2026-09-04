/**
 * A signed direct-to-Cloudinary upload.
 *
 * The file never passes through our API: the server mints a signature after
 * checking the caller may write to that thing, and the browser posts straight to
 * Cloudinary. Lifted out of afterStoryService so organisations use exactly the
 * same path, including the error mapping, rather than a second copy that drifts.
 */

import axios from 'axios';
import { apiClient } from '../services/APIs/apiServices';
import { explainUploadFailure } from '../afterstory/uploadErrors';

export interface SignedUploadResult {
  folder: string;
  public_id: string;
  timestamp: number;
  signature: string;
  allowed_formats: string;
  apiKey: string;
  cloudName: string;
  uploadUrl: string;
}

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
  maxBytes: number;
  /** Extra body sent when asking for the signature, e.g. which slot this is. */
  signBody?: Record<string, unknown>;
}

/** What Cloudinary stored: where to show it, and the id needed to delete it. */
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
export async function uploadSignedAsset({ signUrl, file, maxBytes, signBody }: SignedUploadOptions): Promise<StoredAsset> {
  if (file.size > maxBytes) {
    throw new UploadError(
      `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${maxBytes / 1024 / 1024}MB.`,
      0,
    );
  }
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

  // Every signed field has to be echoed back exactly or Cloudinary rejects the
  // signature. No size field: max_file_size is an upload-preset setting, and
  // signing it makes every request fail.
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  form.append('signature', signed.signature);
  form.append('folder', signed.folder);
  form.append('public_id', signed.public_id);
  form.append('allowed_formats', signed.allowed_formats);

  try {
    const response = await axios.post<{ secure_url?: string; url?: string }>(signed.uploadUrl, form);
    const url = response.data.secure_url ?? response.data.url;
    if (!url) throw new Error('no url returned');
    return { url, publicId: `${signed.folder}/${signed.public_id}` };
  } catch (err) {
    const response = axios.isAxiosError(err) ? err.response : undefined;
    const body = response?.data as { error?: { message?: string } } | undefined;
    throw new UploadError(
      explainUploadFailure(body?.error?.message, response !== undefined),
      response?.status ?? 0,
    );
  }
}
