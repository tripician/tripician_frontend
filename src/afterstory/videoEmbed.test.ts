import { describe, it, expect } from 'vitest';
import {
  parseVideoUrl,
  embedUrl,
  isValidVideoId,
  defaultThumbUrl,
  watchUrl,
  toProviderKey,
  toProviderWire,
} from './videoEmbed';

describe('parseVideoUrl', () => {
  const youtube: Array<[string, string]> = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abcdef', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    // Pasted without a scheme, which is what copying from a phone often gives.
    ['www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ];

  it.each(youtube)('parses YouTube %s', (url, id) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'youtube', id });
  });

  const vimeo: Array<[string, string]> = [
    ['https://vimeo.com/123456789', '123456789'],
    ['https://www.vimeo.com/123456789', '123456789'],
    ['https://player.vimeo.com/video/123456789', '123456789'],
    ['https://vimeo.com/123456789?share=copy', '123456789'],
    ['vimeo.com/123456789', '123456789'],
  ];

  it.each(vimeo)('parses Vimeo %s', (url, id) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'vimeo', id });
  });

  const rejected: Array<[string, string | null | undefined]> = [
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/html,<script>alert(1)</script>'],
    ['file scheme', 'file:///etc/passwd'],
    ['unrelated host', 'https://evil.com/watch?v=dQw4w9WgXcQ'],
    // The important one: a host that merely starts with a provider name.
    ['lookalike host', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ'],
    ['lookalike suffix', 'https://notyoutube.com/watch?v=dQw4w9WgXcQ'],
    ['youtube without id', 'https://www.youtube.com/watch'],
    ['youtube empty id', 'https://www.youtube.com/watch?v='],
    ['youtube id with punctuation', 'https://www.youtube.com/watch?v=abc$%^&*()'],
    ['youtube id too short', 'https://www.youtube.com/watch?v=abc'],
    ['vimeo non numeric', 'https://vimeo.com/notanid'],
    ['vimeo too short', 'https://vimeo.com/12'],
    ['empty string', ''],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
    ['not a url', 'just some words'],
  ];

  it.each(rejected)('rejects %s', (_label, url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});

describe('isValidVideoId', () => {
  it('accepts well formed ids', () => {
    expect(isValidVideoId('youtube', 'dQw4w9WgXcQ')).toBe(true);
    expect(isValidVideoId('vimeo', '123456789')).toBe(true);
  });

  it('rejects ids that could break out of a URL', () => {
    expect(isValidVideoId('youtube', 'abc"><script>')).toBe(false);
    expect(isValidVideoId('youtube', 'abc/../../x')).toBe(false);
    expect(isValidVideoId('youtube', 'abc?autoplay=1')).toBe(false);
    expect(isValidVideoId('vimeo', '123abc')).toBe(false);
    expect(isValidVideoId('youtube', '')).toBe(false);
    expect(isValidVideoId('youtube', null)).toBe(false);
  });
});

describe('embedUrl', () => {
  it('mutes and loops a YouTube cover', () => {
    const url = embedUrl('youtube', 'dQw4w9WgXcQ');
    expect(url).toContain('mute=1');
    expect(url).toContain('loop=1');
    // YouTube ignores loop=1 unless playlist names the same video.
    expect(url).toContain('playlist=dQw4w9WgXcQ');
    expect(url).toContain('controls=0');
    expect(url.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?')).toBe(true);
  });

  it('mutes and loops a Vimeo cover', () => {
    const url = embedUrl('vimeo', '123456789');
    expect(url).toContain('background=1');
    expect(url).toContain('muted=1');
    expect(url).toContain('loop=1');
    expect(url.startsWith('https://player.vimeo.com/video/123456789?')).toBe(true);
  });

  it('unmutes and shows controls when the reader asks for sound', () => {
    const yt = embedUrl('youtube', 'dQw4w9WgXcQ', true);
    expect(yt).toContain('mute=0');
    expect(yt).toContain('controls=1');

    const vimeo = embedUrl('vimeo', '123456789', true);
    expect(vimeo).toContain('muted=0');
    // background=1 forces muted and chromeless, so it has to go with sound on.
    expect(vimeo).not.toContain('background=1');
  });

  it('returns an empty string for an invalid id rather than a malformed URL', () => {
    expect(embedUrl('youtube', 'abc"><script>')).toBe('');
    expect(embedUrl('vimeo', 'nope')).toBe('');
  });
});

describe('thumbnails and watch URLs', () => {
  it('derives a YouTube poster without a network call', () => {
    expect(defaultThumbUrl('youtube', 'dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    );
  });

  it('has no predictable Vimeo poster, so returns null', () => {
    expect(defaultThumbUrl('vimeo', '123456789')).toBeNull();
  });

  it('builds canonical watch URLs', () => {
    expect(watchUrl('youtube', 'dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(watchUrl('vimeo', '123456789')).toBe('https://vimeo.com/123456789');
  });
});

describe('provider casing', () => {
  it('round trips between wire and client casing', () => {
    expect(toProviderKey('YouTube')).toBe('youtube');
    expect(toProviderKey('Vimeo')).toBe('vimeo');
    expect(toProviderWire('youtube')).toBe('YouTube');
    expect(toProviderWire('vimeo')).toBe('Vimeo');
  });

  it('returns null for anything else', () => {
    expect(toProviderKey('twitch')).toBeNull();
    expect(toProviderKey(null)).toBeNull();
    expect(toProviderWire(null)).toBeNull();
  });
});
