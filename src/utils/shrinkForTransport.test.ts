import { describe, it, expect } from 'vitest';
import { shrinkForTransport } from './shrinkForTransport';

const bytes = (size: number) => new Uint8Array(size);

describe('shrinkForTransport', () => {
  it('leaves a photo under the transport limit untouched', async () => {
    const file = new File([bytes(2 * 1024 * 1024)], 'small.jpg', { type: 'image/jpeg' });
    const result = await shrinkForTransport(file);
    expect(result).toBe(file);
  });

  it('never re-encodes a GIF, even a large one, so its animation survives', async () => {
    const file = new File([bytes(11 * 1024 * 1024)], 'party.gif', { type: 'image/gif' });
    const result = await shrinkForTransport(file);
    expect(result).toBe(file);
  });

  it('leaves a large non-image file untouched', async () => {
    const file = new File([bytes(11 * 1024 * 1024)], 'notes.pdf', { type: 'application/pdf' });
    const result = await shrinkForTransport(file);
    expect(result).toBe(file);
  });

  it('falls back to the original file when the browser cannot decode images here', async () => {
    // This test environment has no createImageBitmap, which is exactly the fallback the function
    // takes for a format it cannot touch (HEIC, mostly). The real resize path needs a browser.
    expect(typeof (globalThis as { createImageBitmap?: unknown }).createImageBitmap).toBe('undefined');
    const file = new File([bytes(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    const result = await shrinkForTransport(file);
    expect(result).toBe(file);
  });
});
