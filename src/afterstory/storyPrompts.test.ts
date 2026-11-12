import { describe, expect, it } from 'vitest';
import { parseBlocks, serializeBlocks } from './blockSchema';
import { PROMPTS, insertedPrompt } from './storyPrompts';
import { fitWidth } from '../utils/imageThumb';

const CLOSING =
  'Guidance stops here. Everything above is an ordinary block: type over it, move it, or delete it and lay the rest out however you like.';

describe('story prompts', () => {
  it('recognises a template paragraph nobody wrote over, including the old closing hint', () => {
    expect(insertedPrompt(PROMPTS.journalFirst)).toBe(PROMPTS.journalFirst);
    expect(insertedPrompt(`${PROMPTS.journalHome} ${CLOSING}`)).toBe(PROMPTS.journalHome);
    expect(insertedPrompt(`  ${PROMPTS.intro.replace(/ /g, '  ')} `)).toBe(PROMPTS.intro);
  });

  it('never claims text the author actually wrote', () => {
    expect(insertedPrompt('Start with the thing you actually remember. We landed at dawn.')).toBeNull();
    expect(insertedPrompt('')).toBeNull();
  });

  it('turns an old inserted prompt back into a placeholder when a story is read', () => {
    const body = JSON.stringify([
      { id: 'a', type: 'text', html: `<p>${PROMPTS.journalMiddle}</p>` },
      { id: 'b', type: 'text', html: '<p>We missed the last train.</p>' },
    ]);
    const [prompt, written] = parseBlocks(body);
    expect(prompt).toEqual({ id: 'a', type: 'text', html: '', prompt: PROMPTS.journalMiddle });
    expect(written).toEqual({ id: 'b', type: 'text', html: '<p>We missed the last train.</p>' });
  });

  it('keeps a prompt through a save and keeps what was typed over it', () => {
    const typed = parseBlocks(serializeBlocks([{ id: 'a', type: 'text', html: '<p>Hello</p>', prompt: PROMPTS.intro }]));
    expect(typed[0]).toEqual({ id: 'a', type: 'text', html: '<p>Hello</p>', prompt: PROMPTS.intro });
  });
});

describe('fitWidth', () => {
  const raw = 'https://res.cloudinary.com/demo/image/upload/v1/tripician/prod/stories/x/a.png';

  it('asks Cloudinary for a limited, compressed copy', () => {
    expect(fitWidth(raw, 1440)).toBe('https://res.cloudinary.com/demo/image/upload/c_limit,w_1440,f_auto,q_auto/v1/tripician/prod/stories/x/a.png');
  });

  it('leaves other hosts and existing transformations alone', () => {
    expect(fitWidth('https://example.com/a.png', 800)).toBe('https://example.com/a.png');
    const transformed = 'https://res.cloudinary.com/demo/image/upload/w_200/v1/a.png';
    expect(fitWidth(transformed, 800)).toBe(transformed);
    expect(fitWidth(null, 800)).toBeNull();
  });
});
