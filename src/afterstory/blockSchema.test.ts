import { describe, it, expect } from 'vitest';
import {
  parseBlocks,
  serializeBlocks,
  createBlock,
  isBlockEmpty,
  countPhotos,
  readingMinutes,
  plainTextToHtml,
  stripHtml,
} from './blockSchema';
import type { StoryBlock } from './types';

const wrap = (blocks: unknown[]) => JSON.stringify(blocks);

describe('parseBlocks: resilience', () => {
  it('returns an empty array rather than throwing on junk', () => {
    expect(parseBlocks(null)).toEqual([]);
    expect(parseBlocks(undefined)).toEqual([]);
    expect(parseBlocks('')).toEqual([]);
    expect(parseBlocks('not json')).toEqual([]);
    expect(parseBlocks('[{')).toEqual([]);
    expect(parseBlocks('{"not":"an array"}')).toEqual([]);
  });

  it('drops a block type it does not know instead of rendering it', () => {
    const blocks = parseBlocks(
      wrap([
        { id: 'a', type: 'divider' },
        { id: 'b', type: 'somethingNew', payload: 'from a newer server' },
        { id: 'c', type: 'divider' },
      ]),
    );
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === 'divider')).toBe(true);
  });

  it('drops unknown fields rather than carrying them through', () => {
    const blocks = parseBlocks(wrap([{ id: 'a', type: 'heading', text: 'Hi', level: 2, evil: '<script>' }]));
    expect(blocks[0]).toEqual({ id: 'a', type: 'heading', text: 'Hi', level: 2 });
  });

  it('replaces duplicate ids, which would otherwise break keys and reordering', () => {
    const blocks = parseBlocks(
      wrap([
        { id: 'same', type: 'divider' },
        { id: 'same', type: 'divider' },
      ]),
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).not.toBe(blocks[1].id);
  });

  it('mints an id when one is missing', () => {
    const blocks = parseBlocks(wrap([{ type: 'divider' }]));
    expect(blocks[0].id).toBeTruthy();
  });

  it('caps the block count', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ id: `b${i}`, type: 'divider' }));
    expect(parseBlocks(wrap(many)).length).toBeLessThanOrEqual(120);
  });
});

describe('parseBlocks: hostile content', () => {
  // Text html is intentionally passed through untouched here. It is sanitized
  // by the server on write and again by StoryTextBlock at the innerHTML sink,
  // which is the layer that has a DOM and the one that actually protects the
  // reader. Asserting it here would test the wrong boundary.
  it('leaves text html for the render layer to sanitize', () => {
    const blocks = parseBlocks(wrap([{ id: 'a', type: 'text', html: '<p>hi</p>' }]));
    const block = blocks[0] as Extract<StoryBlock, { type: 'text' }>;
    expect(block.html).toBe('<p>hi</p>');
  });

  const badUrls = ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', ''];

  it.each(badUrls)('drops a photo whose url is %s', (url) => {
    expect(parseBlocks(wrap([{ id: 'a', type: 'photo', url, width: 'inset' }]))).toEqual([]);
  });

  it.each(badUrls)('drops a gallery item whose url is %s', (url) => {
    expect(parseBlocks(wrap([{ id: 'a', type: 'gallery', items: [{ url }], layout: 'grid' }]))).toEqual([]);
  });

  it('drops an unsafe place mapsHref but keeps the place', () => {
    const blocks = parseBlocks(
      wrap([{ id: 'a', type: 'place', name: 'Fushimi Inari', mapsHref: 'javascript:alert(1)' }]),
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).not.toHaveProperty('mapsHref');
  });

  it('drops a related item with an unsafe url', () => {
    const blocks = parseBlocks(
      wrap([
        {
          id: 'a',
          type: 'related',
          items: [{ kind: 'video', url: 'javascript:alert(1)' }, { kind: 'link', url: 'https://ok.com' }],
        },
      ]),
    );
    const block = blocks[0] as Extract<StoryBlock, { type: 'related' }>;
    expect(block.items).toHaveLength(1);
    expect(block.items[0].url).toBe('https://ok.com/');
  });
});

describe('parseBlocks: value clamping', () => {
  it('rejects out of range coordinates on a map stop', () => {
    const blocks = parseBlocks(
      wrap([
        {
          id: 'a',
          type: 'map',
          stops: [
            { name: 'ok', lat: 35.01, lng: 135.76 },
            { name: 'bad lat', lat: 999, lng: 0 },
            { name: 'bad lng', lat: 0, lng: 999 },
          ],
        },
      ]),
    );
    const block = blocks[0] as Extract<StoryBlock, { type: 'map' }>;
    expect(block.stops).toHaveLength(1);
    expect(block.stops[0].name).toBe('ok');
  });

  it('drops a map with no usable stops', () => {
    expect(parseBlocks(wrap([{ id: 'a', type: 'map', stops: [{ name: 'x' }] }]))).toEqual([]);
  });

  it('normalises an unexpected heading level to 2', () => {
    const blocks = parseBlocks(wrap([{ id: 'a', type: 'heading', text: 'Hi', level: 7 }]));
    expect(blocks[0]).toMatchObject({ level: 2 });
  });

  it('normalises an unexpected photo width to inset', () => {
    const blocks = parseBlocks(wrap([{ id: 'a', type: 'photo', url: 'https://x.com/a.jpg', width: 'enormous' }]));
    expect(blocks[0]).toMatchObject({ width: 'inset' });
  });

  it('caps gallery items', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ url: `https://x.com/${i}.jpg` }));
    const blocks = parseBlocks(wrap([{ id: 'a', type: 'gallery', items, layout: 'grid' }]));
    const block = blocks[0] as Extract<StoryBlock, { type: 'gallery' }>;
    expect(block.items.length).toBeLessThanOrEqual(20);
  });

  it('caps related items', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ kind: 'link', url: `https://x.com/${i}` }));
    const blocks = parseBlocks(wrap([{ id: 'a', type: 'related', items }]));
    const block = blocks[0] as Extract<StoryBlock, { type: 'related' }>;
    expect(block.items.length).toBeLessThanOrEqual(8);
  });

  it('drops empty structural blocks so the reader never renders a hole', () => {
    expect(parseBlocks(wrap([{ id: 'a', type: 'heading', text: '   ' }]))).toEqual([]);
    expect(parseBlocks(wrap([{ id: 'a', type: 'place', name: '' }]))).toEqual([]);
    expect(parseBlocks(wrap([{ id: 'a', type: 'gallery', items: [], layout: 'grid' }]))).toEqual([]);
    expect(parseBlocks(wrap([{ id: 'a', type: 'list', style: 'tips', items: [] }]))).toEqual([]);
  });
});

describe('round trip', () => {
  it('survives serialize then parse unchanged', () => {
    const blocks: StoryBlock[] = [
      { id: 'a', type: 'heading', text: 'Day one', level: 2 },
      { id: 'b', type: 'text', html: '<p>We walked a long way.</p>' },
      { id: 'c', type: 'photo', url: 'https://res.cloudinary.com/x/a.jpg', caption: 'Dawn', width: 'wide' },
      { id: 'd', type: 'place', name: 'Fushimi Inari', verdict: 'loved', lat: 34.96, lng: 135.77 },
      { id: 'e', type: 'list', style: 'musttry', items: ['Yudofu', 'Matcha'] },
      { id: 'f', type: 'cost', currency: 'JPY', rows: [{ label: 'Trains', amount: 4200 }] },
      { id: 'g', type: 'divider' },
      {
        id: 'h',
        type: 'related',
        items: [{ kind: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube' }],
      },
    ];

    const parsed = parseBlocks(serializeBlocks(blocks));
    expect(parsed).toHaveLength(blocks.length);
    expect(parsed.map((b) => b.type)).toEqual(blocks.map((b) => b.type));
    expect(parsed[3]).toMatchObject({ name: 'Fushimi Inari', verdict: 'loved' });
    expect(parsed[5]).toMatchObject({ currency: 'JPY' });
  });
});

describe('createBlock', () => {
  const types: StoryBlock['type'][] = [
    'text', 'heading', 'quote', 'photo', 'gallery', 'place', 'list', 'map', 'cost', 'divider', 'related',
  ];

  it.each(types)('creates a %s block with a unique id', (type) => {
    const a = createBlock(type);
    const b = createBlock(type);
    expect(a.type).toBe(type);
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it('creates blocks that read as empty, except a divider which is always complete', () => {
    for (const type of types) {
      expect(isBlockEmpty(createBlock(type))).toBe(type !== 'divider');
    }
  });
});

describe('plainTextToHtml', () => {
  // This runs on Navia's proof-read output when an author accepts it, and the
  // result lands in a block that is eventually rendered through innerHTML. If a
  // model ever returned markup, it has to arrive as visible text, not as a tag.
  it('escapes markup rather than emitting it', () => {
    const html = plainTextToHtml('We saw <script>alert(1)</script> at the market');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes ampersands and angle brackets', () => {
    expect(plainTextToHtml('Fish & chips cost < 10')).toBe('<p>Fish &amp; chips cost &lt; 10</p>');
  });

  it('turns blank lines into paragraphs and single newlines into breaks', () => {
    expect(plainTextToHtml('One\nstill one\n\nTwo')).toBe('<p>One<br />still one</p><p>Two</p>');
  });

  it('drops empty paragraphs so a trailing newline adds nothing', () => {
    expect(plainTextToHtml('Only this\n\n\n')).toBe('<p>Only this</p>');
    expect(plainTextToHtml('')).toBe('');
    expect(plainTextToHtml('   ')).toBe('');
  });

  it('round trips back to the original text', () => {
    const original = 'We walked a long way.\n\nThen it rained.';
    expect(stripHtml(plainTextToHtml(original))).toBe('We walked a long way. Then it rained.');
  });
});

describe('counters', () => {
  it('counts photos across photo, gallery and place blocks', () => {
    const blocks: StoryBlock[] = [
      { id: 'a', type: 'photo', url: 'https://x.com/1.jpg', width: 'inset' },
      {
        id: 'b',
        type: 'gallery',
        items: [{ url: 'https://x.com/2.jpg' }, { url: 'https://x.com/3.jpg' }],
        layout: 'grid',
      },
      { id: 'c', type: 'place', name: 'Somewhere', photoUrl: 'https://x.com/4.jpg' },
      { id: 'd', type: 'place', name: 'No photo' },
      { id: 'e', type: 'divider' },
    ];
    expect(countPhotos(blocks)).toBe(4);
  });

  it('estimates reading time from prose only, never below a minute', () => {
    expect(readingMinutes([{ id: 'a', type: 'divider' }])).toBe(1);

    const long: StoryBlock[] = [{ id: 'a', type: 'text', html: `<p>${'word '.repeat(660)}</p>` }];
    expect(readingMinutes(long)).toBe(3);
  });
});
