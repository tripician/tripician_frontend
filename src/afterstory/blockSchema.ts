/**
 * Block construction, parsing and normalisation.
 *
 * parseBlocks is deliberately forgiving in one direction only: a block it does
 * not recognise is dropped, never rendered as-is. A reader that crashes on one
 * bad block loses the whole story, and stories are read by people who did not
 * write them and cannot fix them.
 *
 * The server runs the same rules in StoryBodyValidator and is the authority.
 * This copy exists so the editor can give immediate feedback and so a response
 * from an older server version cannot break the reader.
 */

import { safeExternalUrl } from '../utils/sanitizeHtml';
import type {
  GalleryItem,
  MapStop,
  CostRow,
  RelatedItem,
  StoryBlock,
  StoryBlockType,
  PhotoWidth,
} from './types';
import { STORY_LIMITS } from './types';

/** Short, collision-free enough for a block key. Not a security boundary. */
export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function createBlock(type: StoryBlockType): StoryBlock {
  const id = newBlockId();
  switch (type) {
    case 'text':
      return { id, type: 'text', html: '' };
    case 'heading':
      return { id, type: 'heading', text: '', level: 2 };
    case 'quote':
      return { id, type: 'quote', text: '' };
    case 'photo':
      return { id, type: 'photo', url: '', width: 'inset' };
    case 'gallery':
      return { id, type: 'gallery', items: [], layout: 'grid' };
    case 'place':
      return { id, type: 'place', name: '' };
    case 'list':
      return { id, type: 'list', style: 'musttry', items: [''] };
    case 'map':
      return { id, type: 'map', stops: [] };
    case 'cost':
      return { id, type: 'cost', currency: 'USD', rows: [{ label: '', amount: 0 }] };
    case 'divider':
      return { id, type: 'divider' };
    case 'related':
      return { id, type: 'related', items: [] };
    default:
      return { id, type: 'divider' };
  }
}

/**
 * A block with nothing in it yet. Used to skip empties when counting progress
 * and to decide whether a story is worth publishing, without deleting anything
 * the author is midway through.
 */
export function isBlockEmpty(block: StoryBlock): boolean {
  switch (block.type) {
    case 'text':
      return stripHtml(block.html).trim().length === 0;
    case 'heading':
    case 'quote':
      return block.text.trim().length === 0;
    case 'photo':
      return block.url.trim().length === 0;
    case 'gallery':
      return block.items.length === 0;
    case 'place':
      return block.name.trim().length === 0;
    case 'list':
      return block.items.every((i) => i.trim().length === 0);
    case 'map':
      return block.stops.length === 0;
    case 'cost':
      return block.rows.every((r) => r.label.trim().length === 0);
    case 'related':
      return block.items.length === 0;
    case 'divider':
      return false;
    default:
      return true;
  }
}

/** Photos across the whole story, for the budget indicator and the limit check. */
export function countPhotos(blocks: StoryBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.type === 'photo') return total + 1;
    if (block.type === 'gallery') return total + block.items.length;
    if (block.type === 'place' && block.photoUrl) return total + 1;
    return total;
  }, 0);
}

/** Rough reading time, from prose only. Photos are not read, they are looked at. */
export function readingMinutes(blocks: StoryBlock[]): number {
  const words = blocks.reduce((total, block) => {
    if (block.type === 'text') return total + countWords(stripHtml(block.html));
    if (block.type === 'quote') return total + countWords(block.text);
    if (block.type === 'place' && block.note) return total + countWords(block.note);
    return total;
  }, 0);
  return Math.max(1, Math.round(words / 220));
}

export function parseBlocks(bodyJson: string | null | undefined): StoryBlock[] {
  if (!bodyJson) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(bodyJson);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const blocks: StoryBlock[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const block = normaliseBlock(item, seen);
    if (block) blocks.push(block);
    if (blocks.length >= STORY_LIMITS.maxBlocks) break;
  }

  return blocks;
}

export function serializeBlocks(blocks: StoryBlock[]): string {
  return JSON.stringify(blocks);
}

// ── normalisation ───────────────────────────────────────────────────────────

function normaliseBlock(input: unknown, seen: Set<string>): StoryBlock | null {
  if (!input || typeof input !== 'object') return null;
  const src = input as Record<string, unknown>;

  const type = str(src.type);
  if (!type) return null;

  let id = str(src.id) ?? '';
  if (!id || seen.has(id)) id = newBlockId();
  seen.add(id);

  switch (type) {
    // Text html is NOT sanitized here. The server sanitizes on write, and the
    // client sanitizes again in the one component that puts it into innerHTML.
    // Doing it at the sink rather than at the parser means any other path to
    // innerHTML is covered too, and it keeps this function pure.
    case 'text':
      return { id, type: 'text', html: (str(src.html) ?? '').slice(0, STORY_LIMITS.maxTextBlockChars * 4) };

    case 'heading': {
      const text = str(src.text);
      if (!text) return null;
      return { id, type: 'heading', text, level: num(src.level) === 3 ? 3 : 2 };
    }

    case 'quote': {
      const text = str(src.text);
      if (!text) return null;
      return { id, type: 'quote', text, ...optional('attribution', str(src.attribution)) };
    }

    case 'photo': {
      const url = safeExternalUrl(src.url);
      if (!url) return null;
      const width = (['inset', 'wide', 'full'] as PhotoWidth[]).includes(src.width as PhotoWidth)
        ? (src.width as PhotoWidth)
        : 'inset';
      return {
        id,
        type: 'photo',
        url,
        width,
        ...optional('caption', str(src.caption)),
        ...optional('alt', str(src.alt)),
      };
    }

    case 'gallery': {
      if (!Array.isArray(src.items)) return null;
      const items: GalleryItem[] = [];
      for (const raw of src.items) {
        if (!raw || typeof raw !== 'object') continue;
        const entry = raw as Record<string, unknown>;
        const url = safeExternalUrl(entry.url);
        if (!url) continue;
        items.push({ url, ...optional('caption', str(entry.caption)), ...optional('alt', str(entry.alt)) });
        if (items.length >= STORY_LIMITS.maxGalleryItems) break;
      }
      if (items.length === 0) return null;
      return { id, type: 'gallery', items, layout: src.layout === 'strip' ? 'strip' : 'grid' };
    }

    case 'place': {
      const name = str(src.name);
      if (!name) return null;
      const verdict = src.verdict;
      return {
        id,
        type: 'place',
        name,
        ...optional('note', str(src.note)),
        ...(verdict === 'loved' || verdict === 'liked' || verdict === 'skip' ? { verdict } : {}),
        ...optional('mapsHref', safeExternalUrl(src.mapsHref) ?? undefined),
        ...optional('placeId', str(src.placeId)),
        ...optional('photoUrl', safeExternalUrl(src.photoUrl) ?? undefined),
        ...coord('lat', num(src.lat), 90),
        ...coord('lng', num(src.lng), 180),
      };
    }

    case 'list': {
      if (!Array.isArray(src.items)) return null;
      const items = src.items
        .map((i) => str(i))
        .filter((i): i is string => Boolean(i))
        .slice(0, 40);
      if (items.length === 0) return null;
      const style = src.style === 'tips' ? 'tips' : src.style === 'plain' ? 'plain' : 'musttry';
      return { id, type: 'list', style, items, ...optional('title', str(src.title)) };
    }

    case 'map': {
      if (!Array.isArray(src.stops)) return null;
      const stops: MapStop[] = [];
      for (const raw of src.stops) {
        if (!raw || typeof raw !== 'object') continue;
        const entry = raw as Record<string, unknown>;
        const name = str(entry.name);
        const lat = num(entry.lat);
        const lng = num(entry.lng);
        if (!name || lat === null || lng === null) continue;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
        stops.push({ name, lat, lng });
        if (stops.length >= 60) break;
      }
      if (stops.length === 0) return null;
      return { id, type: 'map', stops };
    }

    case 'cost': {
      if (!Array.isArray(src.rows)) return null;
      const rows: CostRow[] = [];
      for (const raw of src.rows) {
        if (!raw || typeof raw !== 'object') continue;
        const entry = raw as Record<string, unknown>;
        const label = str(entry.label);
        const amount = num(entry.amount);
        if (!label || amount === null) continue;
        rows.push({ label, amount: Math.round(amount * 100) / 100 });
        if (rows.length >= 30) break;
      }
      if (rows.length === 0) return null;
      const currency = (str(src.currency) ?? 'USD').slice(0, 3).toUpperCase();
      return { id, type: 'cost', currency, rows, ...optional('note', str(src.note)) };
    }

    case 'divider':
      return { id, type: 'divider' };

    case 'related': {
      if (!Array.isArray(src.items)) return null;
      const items: RelatedItem[] = [];
      for (const raw of src.items) {
        if (!raw || typeof raw !== 'object') continue;
        const entry = raw as Record<string, unknown>;
        const url = safeExternalUrl(entry.url);
        if (!url) continue;
        const provider = entry.provider;
        items.push({
          kind: entry.kind === 'video' ? 'video' : 'link',
          url,
          ...optional('title', str(entry.title)),
          ...optional('thumbUrl', safeExternalUrl(entry.thumbUrl) ?? undefined),
          ...(provider === 'youtube' || provider === 'vimeo' ? { provider } : {}),
        });
        if (items.length >= STORY_LIMITS.maxRelatedItems) break;
      }
      if (items.length === 0) return null;
      return { id, type: 'related', items };
    }

    // Unknown types are dropped rather than passed through. A block the reader
    // cannot render is worse than a missing one.
    default:
      return null;
  }
}

// ── small helpers ───────────────────────────────────────────────────────────

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function num(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function optional<K extends string>(key: K, value: string | undefined): Record<K, string> | Record<string, never> {
  return value ? ({ [key]: value } as Record<K, string>) : {};
}

function coord<K extends string>(key: K, value: number | null, bound: number): Record<K, number> | Record<string, never> {
  return value !== null && Math.abs(value) <= bound ? ({ [key]: value } as Record<K, number>) : {};
}

/**
 * Plain text, for word counts and emptiness checks only.
 *
 * Never route output through this: it is a measurement helper, not a sanitizer.
 * Rendering goes through sanitizeHtml in the text block component. Kept regex
 * based so counting works without a DOM, which is also what makes it testable.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Plain text to paragraph html, escaping as it goes.
 *
 * Used when Navia's proof-read result is accepted: it is handed text and returns
 * text, so it has to become markup again before it lands in a block. That output
 * eventually reaches innerHTML, which is why the escape happens here rather than
 * being left to the sanitizer downstream. Blank lines become paragraphs and
 * single newlines become breaks, matching what someone typed.
 */
export function plainTextToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return text
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => `<p>${escape(para).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}
