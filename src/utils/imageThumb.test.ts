import { describe, it, expect } from 'vitest';
import { squareThumb } from './imageThumb';

describe('squareThumb', () => {
  it('inserts a square fill after /image/upload/ on Cloudinary', () => {
    expect(squareThumb('https://res.cloudinary.com/demo/image/upload/v1712/posts/abc.jpg', 400))
      .toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_400,h_400,f_auto,q_auto/v1712/posts/abc.jpg');
  });

  it('is idempotent and leaves an existing Cloudinary transformation alone', () => {
    const once = squareThumb('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', 300)!;
    expect(squareThumb(once, 300)).toBe(once);
    const custom = 'https://res.cloudinary.com/demo/image/upload/w_900/v1/a.jpg';
    expect(squareThumb(custom, 300)).toBe(custom);
  });

  it('does not touch Cloudinary video', () => {
    const video = 'https://res.cloudinary.com/demo/video/upload/v1/clip.jpg';
    expect(squareThumb(video, 300)).toBe(video);
  });

  it('rewrites the size on Pexels and Unsplash', () => {
    const pexels = squareThumb('https://images.pexels.com/photos/1/p.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 360)!;
    const params = new URL(pexels).searchParams;
    expect([params.get('w'), params.get('h'), params.get('fit')]).toEqual(['360', '360', 'crop']);
    expect(new URL(squareThumb('https://images.unsplash.com/photo-1?w=1200', 200)!).searchParams.get('w')).toBe('200');
  });

  it('passes every other host through, and returns null for nothing', () => {
    expect(squareThumb('https://example.com/a.jpg', 300)).toBe('https://example.com/a.jpg');
    expect(squareThumb('  ', 300)).toBeNull();
    expect(squareThumb(null, 300)).toBeNull();
  });
});
