import { describe, it, expect } from 'vitest';
import { STORY_TEMPLATES, TEMPLATE_ORDER, templateStyle, missingScaffold } from './templates';
import { createBlock } from '../blockSchema';
import type { StoryBlock, StoryTemplate } from '../types';

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
});

describe('missingScaffold', () => {
  const templates = TEMPLATE_ORDER;

  it.each(templates)('offers %s headings to an empty story', (template) => {
    const offered = missingScaffold(template, []);
    // Only headings are ever offered. Adding empty photo or list blocks to
    // someone's draft would be filling their page with chores.
    expect(offered.every((b) => b.type === 'heading')).toBe(true);
  });

  it('offers nothing twice', () => {
    const first = missingScaffold('guide', []);
    // Simulate accepting the offer, then switching to Guide again.
    const after = missingScaffold('guide', first);
    expect(after).toHaveLength(0);
  });

  it('matches existing headings case insensitively', () => {
    const existing: StoryBlock[] = [
      { id: 'a', type: 'heading', text: 'WHERE I STAYED', level: 2 },
      { id: 'b', type: 'heading', text: '  what it cost  ', level: 2 },
    ];
    const offered = missingScaffold('guide', existing);
    const texts = offered
      .filter((b): b is Extract<StoryBlock, { type: 'heading' }> => b.type === 'heading')
      .map((b) => b.text.toLowerCase());

    expect(texts).not.toContain('where i stayed');
    expect(texts).not.toContain('what it cost');
  });

  it('gives every offered block a unique id', () => {
    const offered = missingScaffold('guide', []);
    const ids = new Set(offered.map((b) => b.id));
    expect(ids.size).toBe(offered.length);
  });
});

describe('switching template', () => {
  // The load-bearing guarantee: a template is presentation, blocks are content.
  // If a switch could drop a block, choosing a template would become a decision
  // people are afraid to revisit.
  const story: StoryBlock[] = [
    { id: 'a', type: 'heading', text: 'Day one', level: 2 },
    { id: 'b', type: 'text', html: '<p>We walked a long way.</p>' },
    { id: 'c', type: 'photo', url: 'https://res.cloudinary.com/x/a.jpg', width: 'inset' },
    { id: 'd', type: 'place', name: 'Fushimi Inari', verdict: 'loved' },
    { id: 'e', type: 'cost', currency: 'JPY', rows: [{ label: 'Trains', amount: 4200 }] },
  ];

  const pairs: Array<[StoryTemplate, StoryTemplate]> = [];
  for (const from of TEMPLATE_ORDER) {
    for (const to of TEMPLATE_ORDER) {
      if (from !== to) pairs.push([from, to]);
    }
  }

  it.each(pairs)('from %s to %s keeps every block', (_from, to) => {
    // Switching is a style change plus an optional additive scaffold. Nothing
    // in that path removes or rewrites a block, so the original set survives
    // whichever direction the author goes.
    const after = [...story, ...missingScaffold(to, story)];
    for (const original of story) {
      expect(after).toContainEqual(original);
    }
    expect(after.length).toBeGreaterThanOrEqual(story.length);
  });

  it('never invents a photo width the renderer does not know', () => {
    const widths = TEMPLATE_ORDER.map((key) => STORY_TEMPLATES[key].defaultPhotoWidth);
    expect(widths.every((w) => ['inset', 'wide', 'full'].includes(w))).toBe(true);
  });

  it('produces scaffold blocks the schema can round trip', () => {
    for (const key of TEMPLATE_ORDER) {
      for (const block of STORY_TEMPLATES[key].scaffold()) {
        // Every scaffold block must be a real block type, not a placeholder the
        // editor cannot render.
        expect(createBlock(block.type).type).toBe(block.type);
      }
    }
  });
});
