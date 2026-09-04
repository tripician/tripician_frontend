/**
 * Cover video identity and embed URLs.
 *
 * Only a provider and a provider-native id are ever stored. The embed URL is
 * assembled from those two fields at render time, so no user-supplied string
 * reaches an iframe src. That is a structural guarantee rather than a filtering
 * one, which is why the original URL is discarded even though keeping it would
 * be convenient for showing the author what they pasted.
 *
 * Mirrors backend AfterStoryServices/StoryVideo.cs. The two are checked against
 * the same fixtures and must move together.
 */

import type { VideoProvider } from './types';

export interface ParsedVideo {
  provider: VideoProvider;
  id: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^\d{6,12}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/** Path segments that carry the id as the next segment. */
const YOUTUBE_PATH_KEYS = new Set(['embed', 'shorts', 'live', 'v']);

export function isValidVideoId(provider: VideoProvider, id: string | null | undefined): boolean {
  if (!id) return false;
  return provider === 'youtube' ? YOUTUBE_ID.test(id) : VIMEO_ID.test(id);
}

/**
 * Accepts every URL shape a traveller is likely to paste, and nothing else.
 * Returns null rather than throwing, because this runs on every keystroke in the
 * cover field.
 */
export function parseVideoUrl(raw: string | null | undefined): ParsedVideo | null {
  if (!raw || !raw.trim()) return null;

  let candidate = raw.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) candidate = `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (YOUTUBE_HOSTS.has(host)) {
    // youtu.be/<id>
    if (host.endsWith('youtu.be')) return accept('youtube', segments[0]);

    // /watch?v=<id>
    const v = url.searchParams.get('v');
    if (v) return accept('youtube', v);

    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    if (segments.length >= 2 && YOUTUBE_PATH_KEYS.has(segments[0].toLowerCase())) {
      return accept('youtube', segments[1]);
    }

    return null;
  }

  if (VIMEO_HOSTS.has(host)) {
    // player.vimeo.com/video/<id> and vimeo.com/<id>
    const id = segments[0]?.toLowerCase() === 'video' ? segments[1] : segments[0];
    return accept('vimeo', id);
  }

  return null;
}

function accept(provider: VideoProvider, id: string | undefined): ParsedVideo | null {
  if (!id) return null;
  const trimmed = id.trim();
  return isValidVideoId(provider, trimmed) ? { provider, id: trimmed } : null;
}

/**
 * The muted, looping, chromeless embed.
 *
 * YouTube ignores loop=1 unless playlist names the same video, which is why the
 * id appears twice. Vimeo folds muted, looping and chromeless into background=1.
 */
export function embedUrl(provider: VideoProvider, id: string, withSound = false): string {
  if (!isValidVideoId(provider, id)) return '';

  if (provider === 'youtube') {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: withSound ? '0' : '1',
      loop: '1',
      playlist: id,
      controls: withSound ? '1' : '0',
      modestbranding: '1',
      rel: '0',
      playsinline: '1',
      iv_load_policy: '3',
    });
    if (!withSound) params.set('disablekb', '1');
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  }

  const params = new URLSearchParams({
    autoplay: '1',
    loop: '1',
    muted: withSound ? '0' : '1',
    ...(withSound ? {} : { background: '1' }),
  });
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}

/**
 * Poster image. YouTube exposes a predictable thumbnail path; Vimeo does not and
 * is resolved server side at save time, so a Vimeo cover with no stored poster
 * renders a plain backdrop rather than a broken image.
 */
export function defaultThumbUrl(provider: VideoProvider, id: string): string | null {
  if (!isValidVideoId(provider, id)) return null;
  return provider === 'youtube' ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
}

/** Lower-resolution fallback, for when maxresdefault does not exist. */
export function fallbackThumbUrl(provider: VideoProvider, id: string): string | null {
  if (!isValidVideoId(provider, id)) return null;
  return provider === 'youtube' ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** Canonical watch URL, for share text and for related-content cards. */
export function watchUrl(provider: VideoProvider, id: string): string {
  return provider === 'youtube' ? `https://www.youtube.com/watch?v=${id}` : `https://vimeo.com/${id}`;
}

/** Wire casing ("YouTube") to the lowercase key used everywhere in the client. */
export function toProviderKey(wire: string | null | undefined): VideoProvider | null {
  if (!wire) return null;
  const lower = wire.toLowerCase();
  return lower === 'youtube' ? 'youtube' : lower === 'vimeo' ? 'vimeo' : null;
}

/** The reverse, for request bodies. */
export function toProviderWire(provider: VideoProvider | null | undefined): 'YouTube' | 'Vimeo' | null {
  if (!provider) return null;
  return provider === 'youtube' ? 'YouTube' : 'Vimeo';
}
