import { describe, expect, it } from 'vitest';
import { featuredHref, featuredMeta, normalizeFeaturedItems } from './featuredItems';

describe('the Featured row on a web profile', () => {
  it('reads the server row: known kinds only, nothing twice, five at most', () => {
    const rows = [
      { type: 'PLAN', id: 't1', title: 'A Week in Italy', place: 'Italy', countries: ['Italy'] },
      { type: 'video', id: 'v' },
      { type: 'story', id: '' },
      { type: 'plan', id: 't1' },
      ...['s1', 's2', 's3', 's4', 's5'].map((id) => ({ type: 'story', id })),
    ];
    const items = normalizeFeaturedItems(rows);
    expect(items.map((i) => `${i.type}:${i.id}`)).toEqual(['plan:t1', 'story:s1', 'story:s2', 'story:s3', 'story:s4']);
    expect(items[0]).toMatchObject({ title: 'A Week in Italy', place: 'Italy', countries: ['Italy'] });
    expect(normalizeFeaturedItems({ items: [] })).toEqual([]);
    expect(normalizeFeaturedItems(null)).toEqual([]);
  });

  it('gives an untitled photo a title of its own', () => {
    expect(normalizeFeaturedItems([{ type: 'photo', id: 'p', postId: 'post-1' }])[0].title).toBe('A travel moment');
  });

  it('labels each card by kind and place', () => {
    expect(featuredMeta({ type: 'plan', place: 'Italy' })).toBe('Travel plan · Italy');
    expect(featuredMeta({ type: 'story', place: null })).toBe('Afterstory');
    expect(featuredMeta({ type: 'photo', place: 'Thailand' })).toBe('Photobook · Thailand');
  });

  it('opens the original: a photo its post, and nowhere without one', () => {
    const [photo, lost] = normalizeFeaturedItems([
      { type: 'photo', id: 'p1', postId: 'post-1' },
      { type: 'photo', id: 'p2' },
    ]);
    expect(featuredHref(photo)).toBe('/post/post-1');
    expect(featuredHref(lost)).toBeNull();
    const [plan, story] = normalizeFeaturedItems([
      { type: 'plan', id: 'abc', title: 'Trip to India' },
      { type: 'story', id: 's9', slug: 'kyoto-in-spring' },
    ]);
    expect(featuredHref(plan)).toContain('abc');
    expect(featuredHref(story)).toContain('kyoto-in-spring');
  });
});
