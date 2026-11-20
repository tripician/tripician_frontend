import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mentionFor, swapMention, writtenPart } from './replyMention';
import { hideComment, isCommentHidden, unhideComment } from './hiddenComments';

describe('replying to a comment', () => {
  it('mentions the commenter by first name, as the app does', () => {
    expect(mentionFor('Abhi Chef')).toBe('@Abhi ');
    expect(mentionFor('  Shreyas   Kar ')).toBe('@Shreyas ');
  });

  it('puts the mention in front of what is already typed', () => {
    expect(swapMention('', null, 'Abhi Chef')).toBe('@Abhi ');
    expect(swapMention('great shot', null, 'Abhi Chef')).toBe('@Abhi great shot');
  });

  it('swaps one mention for the next instead of stacking them', () => {
    expect(swapMention('@Abhi great shot', 'Abhi Chef', 'Shreyas Kar')).toBe('@Shreyas great shot');
  });

  it('takes the mention back out when the reply is cancelled', () => {
    expect(swapMention('@Abhi great shot', 'Abhi Chef', null)).toBe('great shot');
    expect(swapMention('typed over it', 'Abhi Chef', null)).toBe('typed over it');
  });

  it('does not count a bare mention as something written', () => {
    expect(writtenPart('@Abhi ', 'Abhi Chef').trim()).toBe('');
    expect(writtenPart('@Abhi thanks!', 'Abhi Chef')).toBe('thanks!');
    expect(writtenPart('a comment on the post', null)).toBe('a comment on the post');
  });
});

describe('hiding a comment', () => {
  const store = new Map<string, string>();
  const original = (globalThis as { window?: unknown }).window;

  beforeEach(() => {
    store.clear();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v); },
      },
    };
  });
  afterEach(() => { (globalThis as { window?: unknown }).window = original; });

  it('remembers it for this viewer only, and Undo brings it back', () => {
    hideComment('c1', '7');
    expect(isCommentHidden('c1', '7')).toBe(true);
    expect(isCommentHidden('c1', '8')).toBe(false);
    unhideComment('c1', '7');
    expect(isCommentHidden('c1', '7')).toBe(false);
  });

  it('treats unreadable storage as nothing hidden', () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } },
    };
    expect(() => hideComment('c1', '7')).not.toThrow();
    expect(isCommentHidden('c1', '7')).toBe(false);
  });
});
