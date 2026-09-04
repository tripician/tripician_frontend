import { describe, it, expect } from 'vitest';
import { slugifyStoryTitle, mintStorySlug, extractStoryId, storyPath, storyEditPath } from './storySlug';

const STORY_ID = '1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d';

describe('slugifyStoryTitle', () => {
  // These fixtures are shared with the backend harness for
  // AfterStoryServices/StorySlug.cs. If one side changes, both must.
  const cases: Array<[string, string]> = [
    ['Three Days in Kyoto', 'three-days-in-kyoto'],
    ['Café de Flore', 'cafe-de-flore'],
    ['A -- B  ,  C!', 'a-b-c'],
    ['  leading and trailing  ', 'leading-and-trailing'],
    ['Numbers 123 stay', 'numbers-123-stay'],
    ['MiXeD CaSe', 'mixed-case'],
  ];

  it.each(cases)('slugifies %s', (input, expected) => {
    expect(slugifyStoryTitle(input)).toBe(expected);
  });

  it('returns empty for input with no latin characters', () => {
    expect(slugifyStoryTitle('東京')).toBe('');
    expect(slugifyStoryTitle('   ')).toBe('');
    expect(slugifyStoryTitle('')).toBe('');
    expect(slugifyStoryTitle(null)).toBe('');
    expect(slugifyStoryTitle(undefined)).toBe('');
  });

  it('caps the title part and never ends on a separator', () => {
    const slug = slugifyStoryTitle('a '.repeat(200));
    expect(slug.length).toBeLessThanOrEqual(72);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('mintStorySlug', () => {
  it('appends a stable id suffix', () => {
    expect(mintStorySlug('Three Days in Kyoto', STORY_ID)).toBe('three-days-in-kyoto-1a2b3c4d');
  });

  it('falls back to the suffix alone when the title yields nothing', () => {
    expect(mintStorySlug('東京', STORY_ID)).toBe('1a2b3c4d');
  });

  it('is a pure function, so two publishes of the same title cannot contend', () => {
    expect(mintStorySlug('Same Title', STORY_ID)).toBe(mintStorySlug('Same Title', STORY_ID));
  });

  it('produces different slugs for the same title on different stories', () => {
    const other = 'ffffffff-5e6f-4a8b-9c0d-1e2f3a4b5c6d';
    expect(mintStorySlug('Same Title', STORY_ID)).not.toBe(mintStorySlug('Same Title', other));
  });

  it('fits the 90 character column', () => {
    expect(mintStorySlug('x'.repeat(500), STORY_ID).length).toBeLessThanOrEqual(90);
  });
});

describe('extractStoryId', () => {
  it('reads a bare id', () => {
    expect(extractStoryId(STORY_ID)).toBe(STORY_ID);
  });

  it('reads an id at the end of a slug, so pre-publish links keep working', () => {
    expect(extractStoryId(`kyoto-${STORY_ID}`)).toBe(STORY_ID);
  });

  it('returns null for a real slug, which the server then resolves', () => {
    expect(extractStoryId('three-days-in-kyoto-1a2b3c4d')).toBeNull();
  });

  it('returns null for junk', () => {
    expect(extractStoryId('')).toBeNull();
    expect(extractStoryId(null)).toBeNull();
    expect(extractStoryId(undefined)).toBeNull();
    expect(extractStoryId('not-a-guid-at-all')).toBeNull();
    // Right length, wrong shape.
    expect(extractStoryId('1a2b3c4d5e6f4a8b9c0d1e2f3a4b5c6dxxxx')).toBeNull();
  });
});

describe('paths', () => {
  it('prefers the slug once one exists', () => {
    expect(storyPath({ id: STORY_ID, slug: 'kyoto-1a2b3c4d' })).toBe('/story/kyoto-1a2b3c4d');
  });

  it('falls back to the id for an unpublished draft', () => {
    expect(storyPath({ id: STORY_ID, slug: null })).toBe(`/story/${STORY_ID}`);
    expect(storyPath({ id: STORY_ID })).toBe(`/story/${STORY_ID}`);
  });

  it('keys the editor by id, so renaming does not move it', () => {
    expect(storyEditPath(STORY_ID)).toBe(`/story/${STORY_ID}/edit`);
  });
});
