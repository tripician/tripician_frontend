import { describe, it, expect } from 'vitest';
import { resolveIntent } from './resolveIntent';

describe('resolveIntent', () => {
  it('routes attachments to plan, whatever the text says', () => {
    expect(resolveIntent('', true)).toEqual({ mode: 'plan', confident: true });
    expect(resolveIntent('is Lisbon safe?', true)).toEqual({ mode: 'plan', confident: true });
  });

  it.each([
    'how expensive is Tokyo',
    'What should I pack for Iceland',
    'is Lisbon safe in November?',
    'can I use my card in Vietnam',
    'anyone been to Georgia',
    '? best time for Kerala',
  ])('reads %s as a question', (text) => {
    expect(resolveIntent(text, false).mode).toBe('ask');
  });

  it.each([
    'we went to Sri Lanka in March',
    'I just got back from Peru',
    'our trip through Rajasthan',
    'write about the Kyoto trip',
  ])('reads %s as a story', (text) => {
    expect(resolveIntent(text, false).mode).toBe('story');
  });

  it('never routes to story when after stories are off', () => {
    expect(resolveIntent('we went to Sri Lanka', false, false).mode).not.toBe('story');
  });

  it.each([
    'three days in Lisbon, food and jazz',
    '5 days in Kyoto, temples and food',
    '2 weeks across Vietnam',
    '10 nights Portugal and Spain',
  ])('reads %s as a plan', (text) => {
    expect(resolveIntent(text, false)).toEqual({ mode: 'plan', confident: true });
  });

  it('lets a leading duration beat a trailing question mark', () => {
    expect(resolveIntent('3 days in Lisbon, what should I eat?', false).mode).toBe('plan');
  });

  it('lets a leading question word beat a duration', () => {
    expect(resolveIntent('what should I eat in Lisbon over 3 days?', false).mode).toBe('ask');
  });

  it('guesses plan from a bare place or vibe, and says it is not confident', () => {
    expect(resolveIntent('Portugal', false)).toEqual({ mode: 'plan', confident: false });
    expect(resolveIntent('somewhere romantic', false)).toEqual({ mode: 'plan', confident: false });
  });

  it('falls back to ask, not plan, when nothing matches', () => {
    // Naming neither a place, a length nor a travel word is not enough to justify
    // creating a trip. Answering costs a reply; guessing costs a database row.
    expect(resolveIntent('something cheap in October', false)).toEqual({ mode: 'ask', confident: false });
    expect(resolveIntent('', false)).toEqual({ mode: 'ask', confident: false });
  });
});

describe('resolveIntent duration shapes', () => {
  it.each([
    'three days in Lisbon, food and jazz',
    'a week in Vietnam',
    'long weekend in Rome',
    'weekend in Goa',
    'couple of nights in Bruges',
  ])('reads the spelled-out duration in %s', (text) => {
    expect(resolveIntent(text, false)).toEqual({ mode: 'plan', confident: true });
  });
});

describe('resolveIntent never builds a trip without a reason', () => {
  it.each([
    'Hey',
    'hey',
    'hello',
    'hi there',
    'thanks',
    'ok',
    'test',
    'yo',
    'good morning',
  ])('answers %s instead of creating a trip', (text) => {
    // draft-trip's prompt forbids returning an empty result for a vague request, so
    // routing chit-chat to plan invents a destination and creates a real trip.
    expect(resolveIntent(text, false).mode).toBe('ask');
  });

  it.each([
    'Tokyo trip',
    'visit Bali',
    'go to Patagonia',
    'plan something for October',
    'road trip up the coast',
    'honeymoon somewhere quiet',
  ])('still plans for %s, which names no country and no length', (text) => {
    expect(resolveIntent(text, false).mode).toBe('plan');
  });

  it('still plans from screenshots whatever the text says', () => {
    expect(resolveIntent('hey', true)).toEqual({ mode: 'plan', confident: true });
  });
});
