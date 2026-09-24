import { describe, it, expect } from 'vitest';
import type { AfterStorySummaryDto } from '../../afterstory/types';
import type { TravelerPost } from '../../posts/types';
import { buildExploreFeed, capRuns, MIN_REAL_TILES, postTile, type ExploreTile } from './exploreFeed';
import { arrangeExplore } from './exploreLayout';

const trip = (id: string, patch: Record<string, unknown> = {}) => ({
  id, name: `Trip ${id}`, countries: ['Japan'], bannerPhotoUrl: `https://img.example/${id}.jpg`,
  publishedAt: '2026-05-01T00:00:00Z', ...patch,
});

const story = (id: string, patch: Partial<AfterStorySummaryDto> = {}) => ({
  id, slug: `s-${id}`, title: `Story ${id}`, coverKind: 'Image', coverImageUrl: `https://img.example/s${id}.jpg`,
  publishedAt: '2026-05-02T00:00:00Z', ...patch,
} as AfterStorySummaryDto);

const post = (id: string, patch: Partial<TravelerPost> = {}) => ({
  id, kind: 'note', tripId: null, storyId: null, attachment: null, placeName: null,
  media: [{ url: `https://img.example/p${id}.jpg`, position: 0 }], createdAt: '2026-05-03T00:00:00Z', ...patch,
} as unknown as TravelerPost);

describe('postTile', () => {
  it('never turns a plan or story postcard into a tile, so nothing appears twice', () => {
    expect(postTile(post('1', { tripId: 't1' }))).toBeNull();
    expect(postTile(post('2', { storyId: 's1' }))).toBeNull();
    expect(postTile(post('3', { attachment: { kind: 'plan' } as any }))).toBeNull();
    expect(postTile(post('4', { kind: 'question' }))).toBeNull();
    expect(postTile(post('5', { media: [] }))).toBeNull();
    expect(postTile(post('6'))?.href).toBe('/post/6');
  });

  it('uses the first photo by position', () => {
    const p = post('7', { media: [{ url: 'https://img.example/b.jpg', position: 1 }, { url: 'https://img.example/a.jpg', position: 0 }] });
    expect(postTile(p)?.image).toBe('https://img.example/a.jpg');
  });
});

describe('buildExploreFeed', () => {
  it('orders everything newest first and leaves out plans with no photo of their own', () => {
    const feed = buildExploreFeed({
      trips: [trip('a', { publishedAt: '2026-05-10T00:00:00Z' }), trip('nobanner', { bannerPhotoUrl: null })],
      stories: [story('b', { publishedAt: '2026-05-09T00:00:00Z' })],
      posts: Array.from({ length: 10 }, (_, i) => post(`p${i}`, { createdAt: `2026-04-${String(10 + i).padStart(2, '0')}T00:00:00Z` })),
      postsExhausted: true,
    });
    expect(feed[0].key).toBe('plan-a');
    expect(feed[1].key).toBe('story-b');
    expect(feed.some((t) => t.key === 'plan-nobanner')).toBe(false);
  });

  it('holds back anything older than the oldest loaded post until more posts are read', () => {
    const input = {
      trips: [trip('old', { publishedAt: '2025-01-01T00:00:00Z' })],
      stories: [],
      posts: [post('new', { createdAt: '2026-05-03T00:00:00Z' })],
    };
    expect(buildExploreFeed({ ...input, postsExhausted: false }).map((t) => t.key)).toEqual(['post-new']);
    expect(buildExploreFeed({ ...input, postsExhausted: true }).map((t) => t.key)).toContain('plan-old');
  });

  it('shows one photo once, whichever source it came through', () => {
    const shared = 'https://img.example/same.jpg';
    const feed = buildExploreFeed({
      trips: [trip('a', { bannerPhotoUrl: `${shared}?w=900` })],
      stories: [story('b', { coverImageUrl: shared })],
      posts: [],
      postsExhausted: true,
    });
    expect(feed.filter((t) => !t.stock)).toHaveLength(1);
  });

  it('pads a thin grid with country covers, and only then', () => {
    const bare = Array.from({ length: 12 }, (_, i) => trip(`b${i}`, { bannerPhotoUrl: null, countries: [['Japan', 'Italy', 'Peru', 'Chile', 'Nepal', 'India', 'Spain', 'France', 'Greece', 'Egypt', 'Kenya', 'Mexico'][i]] }));
    const thin = buildExploreFeed({ trips: [trip('real'), ...bare], stories: [], posts: [], postsExhausted: true });
    expect(thin.filter((t) => !t.stock)).toHaveLength(1);
    expect(thin.length).toBeLessThanOrEqual(MIN_REAL_TILES);
    expect(thin.some((t) => t.stock)).toBe(true);

    const full = buildExploreFeed({
      trips: [...Array.from({ length: MIN_REAL_TILES }, (_, i) => trip(`r${i}`)), ...bare],
      stories: [], posts: [], postsExhausted: true,
    });
    expect(full.some((t) => t.stock)).toBe(false);
  });
});

describe('capRuns', () => {
  const tile = (kind: ExploreTile['kind'], n: number): ExploreTile => ({ key: `${kind}${n}`, kind, image: `${kind}${n}`, title: '', href: '/', date: 0 });

  it('never lets three of a kind run, and keeps every tile', () => {
    const input = [tile('post', 1), tile('post', 2), tile('post', 3), tile('post', 4), tile('plan', 1), tile('story', 1)];
    const out = capRuns(input);
    expect(out).toHaveLength(input.length);
    expect(out.map((t) => t.key)).toEqual(['post1', 'post2', 'plan1', 'post3', 'post4', 'story1']);
  });

  it('allows a run when nothing else is left', () => {
    expect(capRuns([tile('post', 1), tile('post', 2), tile('post', 3)])).toHaveLength(3);
  });
});

describe('arrangeExplore', () => {
  const kinds = ['plan', 'story', 'post'];
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, kind: kinds[i % 3] }));
  const cellsOf = (placed: ReturnType<typeof arrangeExplore<{ id: number; kind: string }>>) => {
    const cells = new Set<string>();
    for (const { placement: p } of placed) {
      for (let dc = 0; dc < p.w; dc += 1) {
        for (let dr = 0; dr < p.h; dr += 1) {
          const cell = `${p.col + dc},${p.row + dr}`;
          expect(cells.has(cell)).toBe(false);
          cells.add(cell);
        }
      }
    }
    return cells;
  };

  it('never overlaps and never leaves a hole, for any count', () => {
    for (let n = 0; n <= 40; n += 1) {
      const placed = arrangeExplore(items(n), (x) => x.kind, false);
      expect(placed).toHaveLength(n);
      const cells = cellsOf(placed);
      const rows = n === 0 ? 0 : Math.max(...placed.map(({ placement: p }) => p.row + p.h - 1));
      expect(cells.size).toBe(rows * 3);
      expect(placed.every(({ placement: p }) => p.col + p.w - 1 <= 3)).toBe(true);
    }
  });

  it('shows only whole blocks while more can load, so nothing moves when the next page arrives', () => {
    expect(arrangeExplore(items(8), (x) => x.kind, true)).toHaveLength(5);
    expect(arrangeExplore(items(9), (x) => x.kind, true)).toHaveLength(9);
    expect(arrangeExplore(items(3), (x) => x.kind, true)).toHaveLength(0);
  });

  it('gives the feature slot to a story and the wide slot to a plan when the block has them', () => {
    const block = [{ id: 0, kind: 'plan' }, { id: 1, kind: 'post' }, { id: 2, kind: 'story' }, { id: 3, kind: 'post' }, { id: 4, kind: 'plan' }];
    const placed = arrangeExplore(block, (x) => x.kind, false);
    expect(placed.find((a) => a.placement.shape === 'feature')?.item.kind).toBe('story');
    expect(placed.find((a) => a.placement.shape === 'wide')?.item.kind).toBe('plan');
  });

  it('lists tiles in reading order and ends a short feed on a full-width banner', () => {
    const placed = arrangeExplore(items(6), (x) => x.kind, false);
    const order = placed.map(({ placement: p }) => p.row * 10 + p.col);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(placed[placed.length - 1].placement).toMatchObject({ shape: 'banner', w: 3 });
  });
});
