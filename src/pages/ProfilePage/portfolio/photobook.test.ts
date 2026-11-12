import { describe, expect, it } from 'vitest';
import type { TravelerPost } from '../../../posts/types';
import {
  mergePhotos,
  normalizeAuthorPhotosPage,
  photobookPreview,
  photoCountLabel,
  photosFromPosts,
  type AuthorPhoto,
} from './photobook';

function photo(id: string): AuthorPhoto {
  return { id, postId: `p-${id}`, url: `https://x/${id}.jpg`, position: 0, caption: null, placeName: null, tripId: null, tripName: null, createdAt: '2026-01-01T00:00:00Z' };
}

describe('photobookPreview', () => {
  it('shows every photo when they fit', () => {
    const photos = Array.from({ length: 9 }, (_, i) => photo(String(i)));
    expect(photobookPreview(photos, 9)).toEqual({ tiles: photos, remaining: 0 });
  });

  it('gives the last place to +N, counting every photo not shown', () => {
    const photos = Array.from({ length: 12 }, (_, i) => photo(String(i)));
    const { tiles, remaining } = photobookPreview(photos, 24);
    expect(tiles).toHaveLength(8);
    expect(remaining).toBe(16);
  });
});

describe('reading pages', () => {
  it('drops rows it cannot open and keeps the total honest', () => {
    const page = normalizeAuthorPhotosPage({
      items: [{ id: 'a', postId: 'p', url: 'u', createdAt: '2026-01-01' }, { id: 'b' }],
      total: 0,
      hasMore: true,
    });
    expect(page.items.map((p) => p.id)).toEqual(['a']);
    expect(page.total).toBe(1);
    expect(page.hasMore).toBe(true);
  });

  it('never repeats a photo across a page boundary', () => {
    expect(mergePhotos([photo('a'), photo('b')], [photo('b'), photo('c')]).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('reads photos from top-level notes when the endpoint is missing', () => {
    const posts = [
      { id: 'n1', kind: 'note', parentPostId: null, createdAt: '2026-01-02', body: ' Sunset ', placeName: 'Goa', media: [{ url: 'b', position: 1 }, { url: 'a', position: 0 }] },
      { id: 'q1', kind: 'question', parentPostId: null, createdAt: '2026-01-01', body: '', media: [{ url: 'c', position: 0 }] },
      { id: 'r1', kind: 'note', parentPostId: 'n1', createdAt: '2026-01-01', body: '', media: [{ url: 'd', position: 0 }] },
    ] as unknown as TravelerPost[];
    const photos = photosFromPosts(posts);
    expect(photos.map((p) => p.url)).toEqual(['a', 'b']);
    expect(photos[0]).toMatchObject({ id: 'n1:0', caption: 'Sunset', placeName: 'Goa' });
  });

  it('labels the count', () => {
    expect(photoCountLabel(1)).toBe('1 photo');
    expect(photoCountLabel(24)).toBe('24 photos');
  });
});
