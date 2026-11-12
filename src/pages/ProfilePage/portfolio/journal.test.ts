import { describe, expect, it } from 'vitest';
import type { AfterStorySummaryDto } from '../../../afterstory/types';
import type { TravelerPost } from '../../../posts/types';
import { mapTripVM } from '../tripViewModel';
import {
  buildJournal,
  journalAction,
  journalCounts,
  journalHref,
  journalTitle,
  journalWhen,
  type JournalInput,
} from './journal';

const OWNER = 42;

function trip(raw: Record<string, unknown>) {
  return mapTripVM({ ownerUserId: OWNER, ...raw }, { id: OWNER });
}

function story(id: string, publishedAt: string): AfterStorySummaryDto {
  return { id, title: `Story ${id}`, publishedAt, likeCount: 2, questionCount: 1 } as AfterStorySummaryDto;
}

function post(id: string, createdAt: string, extra: Partial<TravelerPost> = {}): TravelerPost {
  return {
    id,
    kind: 'note',
    body: `Note ${id}`,
    createdAt,
    media: [],
    parentPostId: null,
    attachment: null,
    likeCount: 3,
    replyCount: 4,
    ...extra,
  } as TravelerPost;
}

function input(over: Partial<JournalInput> = {}): JournalInput {
  return {
    profileUserId: OWNER,
    isOwner: true,
    trips: [],
    stories: [],
    posts: [],
    postsHasMore: false,
    filter: 'all',
    ...over,
  };
}

describe('buildJournal', () => {
  it('merges plans, stories and posts newest first', () => {
    const entries = buildJournal(input({
      trips: [trip({ id: 't1', name: 'Kyoto', published: true, publishedAt: '2026-03-01T00:00:00Z' })],
      stories: [story('s1', '2026-05-01T00:00:00Z')],
      posts: [post('p1', '2026-04-01T00:00:00Z')],
    }));
    expect(entries.map((e) => e.key)).toEqual(['story:s1', 'post:p1', 'plan:t1']);
  });

  it('dates a published plan by its publish date, a draft by when it was made', () => {
    const [published] = buildJournal(input({
      trips: [trip({ id: 't1', published: true, publishedAt: '2026-06-01T00:00:00Z', createdDate: '2026-01-01T00:00:00Z' })],
    }));
    expect(published.date).toBe('2026-06-01T00:00:00Z');
    const [draft] = buildJournal(input({ trips: [trip({ id: 't2', createdDate: '2026-01-01T00:00:00Z' })] }));
    expect(draft.date).toBe('2026-01-01T00:00:00Z');
    expect(draft.kind === 'plan' && draft.onlyYou).toBe(true);
  });

  it('shows a visitor published plans only', () => {
    const entries = buildJournal(input({
      isOwner: false,
      trips: [trip({ id: 'pub', published: true }), trip({ id: 'draft' })],
    }));
    expect(entries.map((e) => e.key)).toEqual(['plan:pub']);
  });

  it('marks somebody else’s plan as crew', () => {
    const [entry] = buildJournal(input({ trips: [trip({ id: 'c', ownerUserId: 7, owner: { id: 7, name: 'Ana Ruiz' } })] }));
    expect(entry.kind === 'plan' && entry.action).toBe('crew');
    expect(journalAction(entry)).toBe('Travel plan by Ana Ruiz');
  });

  it('leaves photo posts to the Photobook and replies to their thread', () => {
    const entries = buildJournal(input({
      posts: [
        post('photo', '2026-04-01T00:00:00Z', { media: [{ url: 'u', position: 0 }] }),
        post('reply', '2026-04-02T00:00:00Z', { parentPostId: 'x' }),
        post('text', '2026-04-03T00:00:00Z'),
      ],
    }));
    expect(entries.map((e) => e.key)).toEqual(['post:text']);
  });

  it('skips the caption-less card the server posts for a plan already in the journal', () => {
    const entries = buildJournal(input({
      trips: [trip({ id: 't1', published: true })],
      posts: [post('card', '2026-04-01T00:00:00Z', {
        body: '',
        attachment: { kind: 'plan', id: 't1', title: 'Kyoto', coverUrl: null, meta: null, href: '/trip/t1' },
      })],
    }));
    expect(entries.map((e) => e.key)).toEqual(['plan:t1']);
  });

  it('holds back older plans while more posts can still arrive above them', () => {
    const entries = buildJournal(input({
      trips: [trip({ id: 'old', published: true, publishedAt: '2025-01-01T00:00:00Z' })],
      posts: [post('p1', '2026-04-01T00:00:00Z')],
      postsHasMore: true,
    }));
    expect(entries.map((e) => e.key)).toEqual(['post:p1']);
  });

  it('filters by kind', () => {
    const base = {
      trips: [trip({ id: 't1', published: true })],
      stories: [story('s1', '2026-05-01T00:00:00Z')],
      posts: [post('p1', '2026-04-01T00:00:00Z')],
    };
    expect(buildJournal(input({ ...base, filter: 'plans' })).map((e) => e.kind)).toEqual(['plan']);
    expect(buildJournal(input({ ...base, filter: 'stories' })).map((e) => e.kind)).toEqual(['story']);
    expect(buildJournal(input({ ...base, filter: 'posts' })).map((e) => e.kind)).toEqual(['note']);
  });
});

describe('journal rows', () => {
  it('titles a question by its question, a note by its first line', () => {
    const [q] = buildJournal(input({ posts: [post('q', '2026-01-01T00:00:00Z', { kind: 'question', title: 'Is Lisbon safe?' })] }));
    expect(journalTitle(q)).toBe('Is Lisbon safe?');
    const [n] = buildJournal(input({ posts: [post('n', '2026-01-01T00:00:00Z', { body: '\n  First line\nsecond' })] }));
    expect(journalTitle(n)).toBe('First line');
  });

  it('counts likes and comments from the right fields', () => {
    const [s] = buildJournal(input({ stories: [story('s1', '2026-05-01T00:00:00Z')] }));
    expect(journalCounts(s)).toEqual({ likes: 2, comments: 1 });
    const [p] = buildJournal(input({ posts: [post('p', '2026-05-01T00:00:00Z')] }));
    expect(journalCounts(p)).toEqual({ likes: 3, comments: 4 });
  });

  it('links each kind to its own page', () => {
    const [p] = buildJournal(input({ posts: [post('abc', '2026-05-01T00:00:00Z')] }));
    expect(journalHref(p)).toBe('/post/abc');
  });

  it('says when in words', () => {
    const now = Date.parse('2026-11-09T12:00:00Z');
    expect(journalWhen('2026-11-09T11:59:40Z', now)).toBe('Just now');
    expect(journalWhen('2026-11-07T12:00:00Z', now)).toBe('2 days ago');
    expect(journalWhen('2026-10-26T12:00:00Z', now)).toBe('2 weeks ago');
    expect(journalWhen('2025-11-01T12:00:00Z', now)).toBe('1 year ago');
    expect(journalWhen(null, now)).toBe('');
  });
});
