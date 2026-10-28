import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/APIs/apiServices', () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from '../services/APIs/apiServices';
import { uploadSignedAsset, uploadSignedPhoto, UploadError } from './signedUpload';

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;

const signed = {
  folder: 'tripician/dev/users/5/profile',
  public_id: 'avatar',
  timestamp: 1700000000,
  signature: 'abc123',
};

const storedBody = {
  secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/tripician/dev/users/5/profile/avatar.jpg',
  public_id: 'tripician/dev/users/5/profile/avatar',
};

describe('uploadSignedPhoto', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('sends the signed photo to the server and returns where it was stored', async () => {
    post.mockResolvedValueOnce({ data: storedBody });
    const file = new File(['pixels'], 'me.jpg', { type: 'image/jpeg' });

    const stored = await uploadSignedPhoto(signed, file);

    expect(post).toHaveBeenCalledTimes(1);
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('/api/photos');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('public_id')).toBe('avatar');
    expect((body as FormData).get('signature')).toBe('abc123');
    expect((body as FormData).get('file')).toBeInstanceOf(File);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(stored.url).toBe(storedBody.secure_url);
    expect(stored.publicId).toBe(storedBody.public_id);
  });

  it('does not refuse a large photo in the browser before sending it', async () => {
    post.mockResolvedValueOnce({ data: signed });
    post.mockResolvedValueOnce({ data: storedBody });
    const big = new File([new Uint8Array(12 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });

    const stored = await uploadSignedAsset({ signUrl: '/api/posts/media/upload-url', file: big });

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][0]).toBe('/api/photos');
    expect(stored.url).toBe(storedBody.secure_url);
  });

  it('shows the server refusal exactly as the server wrote it', async () => {
    const refusal = 'That photo is too small to use. Its shortest side must be at least 600 pixels.';
    post.mockRejectedValueOnce(
      Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 422, data: { error: { message: refusal } } } }),
    );
    const file = new File(['x'], 'tiny.jpg', { type: 'image/jpeg' });

    await expect(uploadSignedPhoto(signed, file)).rejects.toBeInstanceOf(UploadError);
    post.mockRejectedValueOnce(
      Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 422, data: { error: { message: refusal } } } }),
    );
    await expect(uploadSignedPhoto(signed, file)).rejects.toMatchObject({ message: refusal, status: 422 });
  });

  it('refuses a non-image before any request is made', async () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });

    await expect(uploadSignedAsset({ signUrl: '/api/posts/media/upload-url', file: pdf })).rejects.toMatchObject({
      message: 'Only image files can be uploaded here.',
    });
    expect(post).not.toHaveBeenCalled();
  });
});
