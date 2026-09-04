import { describe, it, expect } from 'vitest';
import { STORY_TEMPLATES, TEMPLATE_ORDER, templateStyle, templateScaffold } from './templates';
import { createBlock } from '../blockSchema';

describe('templateStyle', () => {
  it('resolves every declared template', () => {
    for (const key of TEMPLATE_ORDER) {
      expect(templateStyle(key).key).toBe(key);
    }
  });

  it('falls back to journal for anything unrecognised', () => {
    // A story saved under a template a later build removed must still render.
    expect(templateStyle('nonsense').key).toBe('journal');
    expect(templateStyle(null).key).toBe('journal');
    expect(templateStyle(undefined).key).toBe('journal');
  });

  it('gives every template a readable prose measure', () => {
    for (const key of TEMPLATE_ORDER) {
      const style = templateStyle(key);
      // Past roughly 75 characters a line gets hard to track back to the next.
      expect(style.measure).toBeGreaterThanOrEqual(45);
      expect(style.measure).toBeLessThanOrEqual(75);
    }
  });

  it('describes each template by what it is good for', () => {
    for (const key of TEMPLATE_ORDER) {
      const style = templateStyle(key);
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.description.length).toBeGreaterThan(0);
    }
  });

  it('never invents a photo width the renderer does not know', () => {
    const widths = TEMPLATE_ORDER.map((key) => STORY_TEMPLATES[key].defaultPhotoWidth);
    expect(widths.every((w) => ['inset', 'wide', 'full'].includes(w))).toBe(true);
  });
});

describe('templateScaffold', () => {
  it.each(TEMPLATE_ORDER)('%s starts the author with real blocks, not a blank page', (key) => {
    const blocks = templateScaffold(key);
    expect(blocks.length).toBeGreaterThanOrEqual(4);
  });

  /*
   * The whole point of the rewrite. The old scaffold was filtered to headings on
   * the way in, so Photo essay and Postcard contributed literally nothing and
   * Journal contributed one word.
   */
  it.each(TEMPLATE_ORDER)('%s opens with the introduction prompt', (key) => {
    const first = templateScaffold(key)[0];
    expect(first.type).toBe('text');
    expect(first.type === 'text' && first.html).toContain('introduction');
  });

  it.each(TEMPLATE_ORDER)('%s includes at least one picture slot', (key) => {
    const blocks = templateScaffold(key);
    const hasImagery = blocks.some((b) => b.type === 'photo' || b.type === 'gallery');
    expect(hasImagery).toBe(true);
  });

  // Empty on purpose: an unfilled slot is a drop zone in the editor and nothing
  // at all to a reader. A url here would be a stock photo in someone's story.
  it.each(TEMPLATE_ORDER)('%s leaves every picture slot empty', (key) => {
    for (const block of templateScaffold(key)) {
      if (block.type === 'photo') expect(block.url).toBe('');
      if (block.type === 'gallery') expect(block.items).toHaveLength(0);
    }
  });

  it.each(TEMPLATE_ORDER)('%s produces blocks the schema can round trip', (key) => {
    for (const block of templateScaffold(key)) {
      expect(createBlock(block.type).type).toBe(block.type);
    }
  });

  it('gives every block a unique id, and fresh ids on every call', () => {
    const first = templateScaffold('guide');
    const second = templateScaffold('guide');
    const ids = new Set(first.map((b) => b.id));
    expect(ids.size).toBe(first.length);
    // Two stories created from the same template must not share block ids.
    expect(first.every((b, i) => b.id !== second[i].id)).toBe(true);
  });

  it('falls back to the journal skeleton for an unknown template', () => {
    expect(templateScaffold('nonsense').length).toBe(templateScaffold('journal').length);
  });
});
